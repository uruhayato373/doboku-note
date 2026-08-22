/**
 * 図版埋込寸法ガード — MDX の <ArticleImage> の width/height が
 * 参照先 SVG の実 viewBox と一致しているか検証する。
 *
 * 背景（2026-08-03）: 図版を 4:5 固定キャンバス（viewBox 400×500）へ移行した際、
 *   SVG 側の viewBox だけを揃え、記事 MDX に書かれた width/height が旧値のまま
 *   26 箇所取り残された（例: viewBox=400x500 なのに MDX が 380x160 / 400x870）。
 *   宣言アスペクト比と実物がずれた埋込メタデータは、
 *     - 予約領域の根拠として誤り（将来 width/height を出力に載せた時点で CLS になる）
 *     - 図の実寸を読む人・スクリプトを誤誘導する
 *   ため機械検知する。
 *
 * check-figure-canvas との違い（重要）:
 *   check-figure-canvas は **SVG 側の viewBox** しか見ない。MDX 側の埋込寸法は見ない。
 *   つまり「SVG は 400×500 に揃っているが MDX は旧寸法のまま」を素通りする。
 *   その穴を塞ぐのが本ゲート（SVG↔MDX の突合）。
 *
 * 判定:
 *   - 対象 = content/site/**\/*.mdx|*.md 内の <ArticleImage src="/posts/....svg">
 *   - width/height の両方を持つタグのみ比較対象（SVG 埋込で寸法未記載は違反としない）
 *   - viewBox="0 0 W H" の W/H（四捨五入）と width={W} height={H} が一致すれば OK
 *
 * 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）:
 *   候補タグ数 / SVG 解決数 / 実比較数 を必ず出力し、
 *   候補があるのに 1 件も解決できない（= パス解決やファイル走査の故障）場合は exit 1。
 *
 * Usage:
 *   node scripts/check-figure-embed-dims.mjs            全 MDX を検査
 *   node scripts/check-figure-embed-dims.mjs --staged   staged 分の MDX のみ（pre-commit 用）
 *   node scripts/check-figure-embed-dims.mjs --list     不一致一覧を出すだけ（exit 0）
 *   node scripts/check-figure-embed-dims.mjs --fix      MDX の width/height を viewBox に合わせて書き換える
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { readMdxFile, writeMdxFile } from "../.claude/scripts/lib/mdx-io.mjs";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = SITE_CONTENT_ROOT;
const staged = process.argv.includes("--staged");
const listOnly = process.argv.includes("--list");
const fix = process.argv.includes("--fix");

function relFromRoot(full) {
  return full.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", "");
}

/** 記事本文ファイル（.mdx / .md）。img/ 配下は対象外。 */
function isArticleFile(name) {
  return /\.mdx?$/.test(basename(name));
}

function listAllArticles() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => !p.includes("/img/") && isArticleFile(p))
    .map((rel) => join(POSTS, rel).replace(/\\/g, "/"));
}

function listStagedArticles() {
  let out = "";
  try {
    out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd: ROOT,
      encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null; // git 失敗 = 判定不能（呼び出し側でスキップ）
  }
  return out
    .split("\n")
    .map((l) => l.trim().replace(/\\/g, "/"))
    .filter((l) => l.startsWith("content/site/") && !l.includes("/img/") && isArticleFile(l))
    .map((rel) => join(ROOT, rel).replace(/\\/g, "/"))
    .filter((full) => existsSync(full));
}

/** src="/posts/..." → content/site/... の絶対パス */
function resolveSvgPath(src) {
  if (!src.startsWith("/posts/")) return null;
  return join(POSTS, src.slice("/posts/".length)).replace(/\\/g, "/");
}

function viewBoxOf(full) {
  let text;
  try {
    text = readFileSync(full, "utf8");
  } catch {
    return null;
  }
  const m = text.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
  if (!m) return null;
  return [Math.round(+m[3]), Math.round(+m[4])];
}

const TAG_RE = /<ArticleImage\b[^>]*?\/?>/g;

/** 1ファイルを走査して { candidates, resolved, compared, mismatches, fixedText, eol } を返す */
function scanFile(full) {
  const { raw: text, eol } = readMdxFile(full);
  let candidates = 0;
  let resolved = 0;
  let compared = 0;
  const mismatches = [];
  const edits = []; // { start, end, newTag }

  for (const m of text.matchAll(TAG_RE)) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc\s*=\s*"([^"]+)"/);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!/\.svg$/i.test(src)) continue; // SVG 埋込のみが対象（raster は viewBox を持たない）
    candidates++;

    const svgPath = resolveSvgPath(src);
    if (!svgPath || !existsSync(svgPath)) continue; // 実体なし参照は check-orphan-figures / pre-commit 側の担当
    const vb = viewBoxOf(svgPath);
    if (!vb) continue; // viewBox 無し SVG は check-figure-canvas の担当
    resolved++;

    const w = tag.match(/\bwidth=\{(\d+)\}/);
    const h = tag.match(/\bheight=\{(\d+)\}/);
    if (!w || !h) continue; // 寸法未記載は本ゲートの違反ではない
    compared++;

    const mdxW = Number(w[1]);
    const mdxH = Number(h[1]);
    if (mdxW === vb[0] && mdxH === vb[1]) continue;

    mismatches.push({
      file: relFromRoot(full),
      svg: basename(src),
      viewBox: `${vb[0]}x${vb[1]}`,
      mdx: `${mdxW}x${mdxH}`,
    });

    if (fix) {
      const newTag = tag
        .replace(/\bwidth=\{\d+\}/, `width={${vb[0]}}`)
        .replace(/\bheight=\{\d+\}/, `height={${vb[1]}}`);
      edits.push({ start: m.index, end: m.index + tag.length, newTag });
    }
  }

  let fixedText = null;
  if (fix && edits.length) {
    let out = text;
    // 後ろから適用してオフセットのずれを避ける
    for (const e of [...edits].reverse()) {
      out = out.slice(0, e.start) + e.newTag + out.slice(e.end);
    }
    fixedText = out;
  }

  return { candidates, resolved, compared, mismatches, fixedText, eol };
}

// --- 実行 ---
let articles;
if (staged) {
  articles = listStagedArticles();
  if (articles === null) {
    console.log("[check-figure-embed-dims] staged 取得不可のためスキップ");
    process.exit(0);
  }
} else {
  articles = listAllArticles();
}

let candidates = 0;
let resolved = 0;
let compared = 0;
let fixedFiles = 0;
const mismatches = [];

for (const full of articles) {
  let r;
  try {
    r = scanFile(full);
  } catch (e) {
    console.error(`[check-figure-embed-dims] 読み取り失敗 ${relFromRoot(full)}: ${e.message}`);
    process.exit(1);
  }
  candidates += r.candidates;
  resolved += r.resolved;
  compared += r.compared;
  mismatches.push(...r.mismatches);
  if (r.fixedText != null) {
    // 既存の改行コードを保持したまま書き戻す（CRLF 混在の防止・CLAUDE.md §3）
    writeMdxFile(full, r.fixedText, r.eol);
    fixedFiles++;
  }
}

const scope = staged ? "（staged）" : "";
const coverage = `記事 ${articles.length} 本 / SVG 埋込 ${candidates} 箇所 / SVG 解決 ${resolved} 箇所 / 実比較 ${compared} 箇所`;

// 「検査ゼロを PASS と呼ばない」: 候補があるのに 1 件も解決できていない = 走査/パス解決の故障
if (candidates > 0 && resolved === 0) {
  console.error(`\n[check-figure-embed-dims] ✗ 検査不成立: ${coverage}`);
  console.error(`  SVG 埋込 ${candidates} 箇所を見つけたが、SVG 実体を 1 件も解決できませんでした。`);
  console.error(`  想定原因: content/site のパス解決の破損 / src の接頭辞規約変更。`);
  process.exit(1);
}

if (fix) {
  console.log(`[check-figure-embed-dims] ${mismatches.length} 箇所を修正（${fixedFiles} ファイル）`);
  for (const x of mismatches) console.log(`  ${x.file} ${x.svg}: ${x.mdx} → ${x.viewBox}`);
  console.log(`  ${coverage}`);
  process.exit(0);
}

if (listOnly) {
  for (const x of mismatches) console.log(`${x.file}\t${x.svg}\tviewBox=${x.viewBox}\tMDX=${x.mdx}`);
  console.log(`\n[check-figure-embed-dims] 不一致 ${mismatches.length} 箇所 / ${coverage}`);
  process.exit(0);
}

if (mismatches.length) {
  console.error(`\n[check-figure-embed-dims] ✗ ${mismatches.length} 箇所で埋込寸法が SVG の viewBox と不一致:\n`);
  for (const x of mismatches) {
    console.error(`  ${x.file}`);
    console.error(`    ${x.svg}  viewBox=${x.viewBox}  MDX=${x.mdx}`);
  }
  console.error(`\n  修正: npm run check-figure-embed-dims -- --fix`);
  console.error(`  背景: check-figure-canvas は SVG 側 viewBox しか見ないため、`);
  console.error(`        キャンバス移行で MDX の width/height が旧値のまま残る穴を本ゲートが塞ぐ。`);
  console.error(`  真実源: .claude/knowledge/reference/figure-canvas-policy.md §3\n`);
  console.error(`  ${coverage}`);
  process.exit(1);
}

console.log(`[check-figure-embed-dims] OK（不一致なし${scope}）— ${coverage}`);
