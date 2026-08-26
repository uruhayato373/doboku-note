/**
 * 図版キャンバス標準ガード — figure-*.svg の viewBox が固定キャンバスに一致するか検証する。
 *
 * 真実源: .claude/config/figure-canvas.json（人間向け: .claude/knowledge/reference/figure-canvas-policy.md）
 *   - figure-N.svg          → feed      viewBox == 400 500 (4:5)
 *   - figure-N--wide.svg    → landscape viewBox == 640 360 (16:9)
 *
 * 段階バックフィル中は config.guard.migrationAllowlist のパスを免除する
 * （fitStatus=conforming になった図から allowlist を外す）。新規ファイルは最初から対象。
 *
 * Usage:
 *   node scripts/check-figure-canvas.mjs                 全 figure-*.svg を検査
 *   node scripts/check-figure-canvas.mjs --staged        staged 分のみ（pre-commit 用）
 *   node scripts/check-figure-canvas.mjs --sync-allowlist 現状の不適合図で migrationAllowlist を再生成（移行完了図を自動除外）
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = SITE_CONTENT_ROOT;
const CONFIG = join(ROOT, ".claude", "config", "figure-canvas.json");
const staged = process.argv.includes("--staged");
const syncAllowlist = process.argv.includes("--sync-allowlist");

const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
const FEED = cfg.canvases.feed.viewBox; // [400,500]
const WIDE = cfg.canvases.landscape.viewBox; // [640,360]
const allow = new Set((cfg.guard?.migrationAllowlist || []).map((p) => p.replace(/\\/g, "/")));

function relFromRoot(full) {
  return full.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", "");
}

function listAll() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/img\/figure-[^/]*\.svg$/.test(p))
    .map((rel) => join(POSTS, rel).replace(/\\/g, "/"));
}

function listStaged() {
  let out = "";
  try {
    out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd: ROOT,
      encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return [];
  }
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /\content\/site\/.*\/img\/figure-[^/]*\.svg$/.test(l))
    .map((rel) => join(ROOT, rel).replace(/\\/g, "/"));
}

function viewBoxOf(full) {
  const m = readFileSync(full, "utf8").match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/);
  if (!m) return null;
  return [Math.round(+m[3]), Math.round(+m[4])];
}

// --- allowlist 再同期モード: 現状の不適合 figure を allowlist に書き戻す ---
if (syncAllowlist) {
  const nonconf = [];
  for (const full of listAll()) {
    const isWide = /--wide\.svg$/.test(full);
    const exp = isWide ? WIDE : FEED;
    const vb = viewBoxOf(full);
    if (!vb || vb[0] !== exp[0] || vb[1] !== exp[1]) nonconf.push(relFromRoot(full));
  }
  nonconf.sort();
  cfg.guard.migrationAllowlist = nonconf;
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");
  console.log(`[check-figure-canvas] migrationAllowlist 再同期: 移行待ち ${nonconf.length} 件`);
  process.exit(0);
}

// --- 命名規則チェック: figure- プレフィックスなし SVG を検出 ---
// 過去問専用ディレクトリ（h24-primary, primary-h26-b, primary-exercise-01, primary-production-qc 等）は免除。
// 設問図は原図の縦横比に従うため固定キャンバス（4:5 / 16:9）を適用しない。
// `primary-` プレフィックスは site 全体で過去問（1次・択一）ディレクトリにのみ使われる
// （civil-construction-1/2・concrete-chief-engineer・concrete-diagnostician・pe-comprehensive-management
// で確認済み・2026-08-25）。年度サフィックス型（primary-h26-a）と科目サフィックス型
// （primary-production-qc）の両方をまとめて `primary-[^/]+` で免除する。
const EXAM_DIR_RE = /\/(h\d+-primary|primary-[^/]+)\//;

function listNonFigureSvgs() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/img\/[^/]+\.svg$/.test(p) && !/\/img\/figure-[^/]*\.svg$/.test(p))
    .filter((p) => !EXAM_DIR_RE.test(p))
    .map((rel) => join(POSTS, rel).replace(/\\/g, "/"));
}

function listStagedNonFigureSvgs() {
  let out = "";
  try {
    out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd: ROOT,
      encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return [];
  }
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /\content\/site\/.*\/img\/[^/]+\.svg$/.test(l))
    .filter((l) => !/\/img\/figure-[^/]*\.svg$/.test(l))
    .filter((l) => !EXAM_DIR_RE.test(l))
    .map((rel) => join(ROOT, rel).replace(/\\/g, "/"));
}

const namingErrors = [];
for (const full of staged ? listStagedNonFigureSvgs() : listNonFigureSvgs()) {
  namingErrors.push(relFromRoot(full));
}

if (namingErrors.length) {
  console.error(`\n[check-figure-canvas] ${namingErrors.length} 件の命名規則違反（figure-*.svg にしてください）:\n`);
  for (const e of namingErrors) console.error("  " + e);
  console.error(`\n  修正: ファイル名に figure- プレフィックスを付け、MDX 参照も更新する。`);
  console.error(`  真実源: .claude/knowledge/reference/figure-canvas-policy.md\n`);
  process.exit(1);
}

const files = staged ? listStaged() : listAll();
const errors = [];
let checked = 0;

for (const full of files) {
  const rel = relFromRoot(full);
  if (allow.has(rel)) continue;
  checked++;
  const isWide = /--wide\.svg$/.test(full);
  const expected = isWide ? WIDE : FEED;
  const vb = viewBoxOf(full);
  if (!vb) {
    errors.push(`${rel}\n    viewBox が読み取れません`);
    continue;
  }
  if (vb[0] !== expected[0] || vb[1] !== expected[1]) {
    const canvas = isWide ? "landscape(16:9)" : "feed(4:5)";
    errors.push(
      `${rel}\n    viewBox ${vb[0]}×${vb[1]} → 期待 ${expected[0]}×${expected[1]}（${canvas}）`
    );
  }
  // XMLコメント内の '--' は不正（resvg/ブラウザでパース不能＝SNSレンダリング無音破綻）。
  // 正規表現ベースの svg audit では拾えないため、ここで機械検出する。
  const content = readFileSync(full, "utf8");
  for (const m of content.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (m[1].includes("--")) {
      errors.push(`${rel}\n    XMLコメント内に '--' があり SVG がパース不能（コメントを修正）`);
      break;
    }
  }
}

if (errors.length) {
  console.error(`\n[check-figure-canvas] ${errors.length} 件のキャンバス不適合:\n`);
  for (const e of errors) console.error("  " + e);
  console.error(
    `\n  修正: viewBox を ${FEED[0]}×${FEED[1]}(figure-N.svg) / ${WIDE[0]}×${WIDE[1]}(figure-N--wide.svg) に。`
  );
  console.error(`  移行待ちなら .claude/config/figure-canvas.json の guard.migrationAllowlist に追加。`);
  console.error(`  真実源: .claude/knowledge/reference/figure-canvas-policy.md\n`);
  process.exit(1);
}

console.log(`[check-figure-canvas] OK（${checked} 枚検査${staged ? "（staged）" : ""}・allowlist ${allow.size} 件免除）`);
