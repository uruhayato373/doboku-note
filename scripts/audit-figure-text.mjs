#!/usr/bin/env node
/**
 * audit-figure-text.mjs
 *
 * .local/r2/posts/**\/img/ のラスタ図（png/webp/jpg）を tesseract(jpn) で OCR し、
 * 図内の「文章テキスト写り込み」を分類して .claude/state/figure-text-audit.json に永続化する。
 * 管理画面（tools/admin）の記事図版タブが読み込み、各図に品質バッジ/フィルタを付ける。
 *
 * 分類:
 *   leak  … 答えを明示する語（「したがって」「正解」）を含む＝答え漏らし（最優先・image-policy 違反）
 *   prose … 句点(。)を 2 つ以上含む＝本文写り込み（要タイト切り直し）
 *   maybe … 句点 1 つ＝要目視
 *   clean … ラベルのみ（句点なし・答え語なし）＝良好
 *
 * png/webp ペアは同一内容なので basename（拡張子抜き）で 1 回だけ OCR し両方に適用する。
 * webp/jpg は tesseract が直接読めないことがあるので magick で一時 png へ変換して OCR。
 *
 * Usage:
 *   node scripts/audit-figure-text.mjs            # 全ラスタ図を監査して JSON 出力
 *   node scripts/audit-figure-text.mjs --limit 20 # 先頭 20 base のみ（動作確認用）
 *   node scripts/audit-figure-text.mjs --json     # 進捗を出さず結果サマリのみ
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const POSTS = path.join(ROOT, ".local", "r2", "posts");
const OUT = path.join(ROOT, ".claude", "state", "figure-text-audit.json");
const args = process.argv.slice(2);
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const quiet = args.includes("--json");

const LEAK = /したがって|正\s*解/; // 答えを明示する語
const IMG_RE = /\/img\/[^/]+\.(png|webp|jpg|jpeg)$/i;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

if (!fs.existsSync(POSTS)) {
  console.error(`[audit-figure-text] posts dir 不在: ${POSTS}`);
  process.exit(2);
}

// ラスタ図を basename（{dir}/{name拡張子抜き}）で dedupe。ogp は除外。
const all = walk(POSTS)
  .map((p) => path.relative(POSTS, p).split(path.sep).join("/"))
  .filter((rel) => IMG_RE.test(rel) && !/\/ogp\.(png|webp)$/i.test(rel));

const byBase = new Map(); // baseRel -> [rel,...]
for (const rel of all) {
  const baseRel = rel.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  if (!byBase.has(baseRel)) byBase.set(baseRel, []);
  byBase.get(baseRel).push(rel);
}

const bases = [...byBase.keys()].sort().slice(0, limit);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "figtext-"));
const figures = {};
const summary = { leak: 0, prose: 0, maybe: 0, clean: 0 };
let done = 0;

for (const baseRel of bases) {
  const variants = byBase.get(baseRel);
  // OCR ソース: png 優先。無ければ webp/jpg を一時 png へ変換。
  const png = variants.find((v) => /\.png$/i.test(v));
  let src = png ? path.join(POSTS, png) : null;
  if (!src) {
    const other = variants[0];
    src = path.join(tmpDir, baseRel.replace(/\//g, "__") + ".png");
    try {
      execSync(`magick "${path.join(POSTS, other)}" "${src}"`, { stdio: "pipe" });
    } catch {
      src = null;
    }
  }
  let status = "clean", periods = 0, markers = [];
  if (src) {
    let text = "";
    try {
      text = execSync(`tesseract "${src}" - -l jpn --psm 6 2>/dev/null`, {
        encoding: "utf8",
        maxBuffer: 1 << 24,
      });
    } catch {
      text = "";
    }
    const clean = text.replace(/\s+/g, "");
    periods = (clean.match(/。/g) || []).length;
    const leakHit = LEAK.test(clean);
    if (leakHit) markers = clean.match(/したがって|正\s*解/g) || [];
    if (leakHit) status = "leak";
    else if (periods >= 2) status = "prose";
    else if (periods === 1) status = "maybe";
    else status = "clean";
  }
  figures[baseRel] = { status, periods, markers, variants: variants.length };
  summary[status]++;
  done++;
  if (!quiet && done % 50 === 0) process.stderr.write(`\r  ...${done}/${bases.length} 監査済み`);
}
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* noop */ }

const payload = {
  generated_at: new Date().toISOString(),
  tool: "tesseract jpn --psm 6",
  base_count: bases.length,
  file_count: all.length,
  summary,
  figures,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

if (!quiet) process.stderr.write("\r");
console.log(`[audit-figure-text] ${bases.length} base（${all.length} ファイル）監査 → ${path.relative(ROOT, OUT)}`);
console.log(`  leak(答え漏らし): ${summary.leak} / prose(写り込み): ${summary.prose} / maybe(要確認): ${summary.maybe} / clean: ${summary.clean}`);
