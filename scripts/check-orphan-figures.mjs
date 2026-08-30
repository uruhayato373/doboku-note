/**
 * 孤立 figure ガード — figure-*.svg が同記事の本文から一度も参照されていないと検知する。
 *
 * 背景: figure-*.svg が img/ に存在するのに、同ディレクトリの記事（.mdx/.md）本文から
 *   <ArticleImage> 等で参照されていないと、SVG はサイトに一切表示されない（孤立 figure）。
 *   2026-06-29 に pe-comprehensive-management で 49 枚（figure 総数 182 の 27%）を検出。
 *   再発防止のため、未参照の figure を機械検知してコミットを止める。
 *
 * 判定:
 *   - 対象 = content/site/**\/img/figure-*.svg
 *   - 記事 = その figure の親（img/ の 1 つ上）ディレクトリ直下の *.mdx / *.md
 *   - 参照あり = いずれかの記事本文に「basename（figure-N.svg）」または「stem（figure-N）」が含まれる
 *     → 別拡張子参照（figure-N.png 等を貼っている）も stem 一致で許容する
 *   - 参照なし = 孤立 → エラー
 *
 * 除外:
 *   - 過去問クロップ専用ディレクトリ（h24-primary, primary-h26-b 等）は figure 命名対象外なので免除
 *   - quiz-figures:start〜end ブロックは自動管理領域だが、ブロック内の <ArticleImage> も
 *     本文参照として有効（孤立ではない）。除外せず通常通り「参照あり」と数える。
 *
 * Usage:
 *   node scripts/check-orphan-figures.mjs                全 figure-*.svg を検査
 *   node scripts/check-orphan-figures.mjs --staged       staged 分の記事/figure に関係する記事のみ
 *   node scripts/check-orphan-figures.mjs --list         孤立一覧を出すだけ（exit 0）
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = SITE_CONTENT_ROOT;
const staged = process.argv.includes("--staged");
const listOnly = process.argv.includes("--list");

// 過去問クロップ専用ディレクトリは figure 命名規約の対象外（check-figure-canvas と同じ免除）
const EXAM_DIR_RE = /\/(h\d+-primary|primary-h\d+[^/]*)\//;

function relFromRoot(full) {
  return full.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", "");
}

function listAllFigures() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/img\/figure-[^/]*\.svg$/.test(p))
    .map((rel) => join(POSTS, rel).replace(/\\/g, "/"))
    .filter((full) => !EXAM_DIR_RE.test(full));
}

// staged モード: staged された figure-*.svg もしくは記事(.mdx/.md)に関係する記事ディレクトリを対象に絞る
function stagedArticleDirs() {
  let out = "";
  try {
    out = execFileSync("git", ['-c', 'core.quotepath=false', "diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd: ROOT,
      encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return null;
  }
  const dirs = new Set();
  for (const line of out.split("\n").map((l) => l.trim())) {
    if (!line) continue;
    const norm = line.replace(/\\/g, "/");
    // figure svg が staged → その記事ディレクトリ
    let m = norm.match(/^(\content\/site\/.+?)\/img\/figure-[^/]*\.svg$/);
    if (m) {
      dirs.add(join(ROOT, m[1]).replace(/\\/g, "/"));
      continue;
    }
    // 記事 mdx/md が staged → その記事ディレクトリ（参照を外した可能性）
    m = norm.match(/^(\content\/site\/.+?)\/[^/]+\.(mdx|md)$/);
    if (m && !/\/img\//.test(norm)) {
      dirs.add(join(ROOT, m[1]).replace(/\\/g, "/"));
    }
  }
  return dirs;
}

function articleDirOf(figureFull) {
  // .../{articleDir}/img/figure-N.svg → {articleDir}
  return dirname(dirname(figureFull));
}

function articleTextOf(articleDir) {
  let text = "";
  let files = [];
  try {
    files = readdirSync(articleDir, { withFileTypes: true })
      .filter((d) => d.isFile() && /\.(mdx|md)$/.test(d.name))
      .map((d) => join(articleDir, d.name));
  } catch {
    return "";
  }
  for (const f of files) {
    try {
      text += readFileSync(f, "utf8") + "\n";
    } catch {
      /* skip */
    }
  }
  return text;
}

function isReferenced(figureFull, articleText) {
  const base = basename(figureFull); // figure-1.svg
  if (articleText.includes(base)) return true;
  // stem 一致（別拡張子参照を許容）: figure-1 の直後が「.」かつ拡張子が続く形だけを参照とみなす
  const stem = base.replace(/\.svg$/, ""); // figure-1
  // figure-1.（png|webp|jpg|svg...）の形で本文に出ていれば参照
  const re = new RegExp(stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.[a-z0-9]+", "i");
  return re.test(articleText);
}

const allFigures = listAllFigures();
let figures = allFigures;

if (staged) {
  const dirs = stagedArticleDirs();
  if (dirs === null) {
    // git 失敗時は何もしない（pre-commit を壊さない）
    console.log("[check-orphan-figures] staged 取得不可のためスキップ");
    process.exit(0);
  }
  figures = allFigures.filter((f) => dirs.has(articleDirOf(f).replace(/\\/g, "/")));
}

const orphans = [];
const textCache = new Map();
for (const fig of figures) {
  const artDir = articleDirOf(fig);
  if (!textCache.has(artDir)) textCache.set(artDir, articleTextOf(artDir));
  const text = textCache.get(artDir);
  if (!isReferenced(fig, text)) orphans.push(relFromRoot(fig));
}

orphans.sort();

if (listOnly) {
  for (const o of orphans) console.log(o);
  console.log(`\n[check-orphan-figures] 孤立 ${orphans.length} 枚 / 検査 ${figures.length} 枚`);
  process.exit(0);
}

if (orphans.length) {
  console.error(`\n[check-orphan-figures] ${orphans.length} 件の孤立 figure（同記事の本文から未参照）:\n`);
  for (const o of orphans) console.error("  " + o);
  console.error(
    `\n  修正: 記事本文の見出し直後に <ArticleImage src="/posts/.../img/figure-N.svg" alt="..." /> で結線する。`
  );
  console.error(`  別拡張子（figure-N.png 等）で参照していれば許容されます。`);
  console.error(`  記事内容と合致しない古い図なら、図を削除するか記事を作成して結線してください。`);
  console.error(`  真実源: .claude/knowledge/reference/figure-canvas-policy.md / content-authoring.md\n`);
  process.exit(1);
}

console.log(`[check-orphan-figures] OK（孤立なし・${figures.length} 枚検査${staged ? "（staged）" : ""}）`);
