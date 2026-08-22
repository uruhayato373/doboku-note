#!/usr/bin/env node
// IG figure-pack の表紙（content/sns/instagram/**/carousel/img/00-cover.svg）が
// 確定テンプレ（SSOT: .claude/skills/social/ig-figure-pack/templates/00-cover.template.svg）に
// 準拠しているかを検証する。
//
// 背景: figure-pack の表紙は手書き SVG で SSOT が無く、新規作者が一から書くと chrome
// （2ピル / 固定バッジ / フッター文言 / 保存パス）がドリフトする（2026-06-24 発覚、
// herzberg / patent-vs-utility の表紙が maslow 以前のテンプレと不一致＋ cem/ 配下から外れた）。
// 機械ゲートが無くドリフトが pre-commit を素通りしていた。本チェックで赤落ちさせる。
//
// 検証する不変条件:
//   1. viewBox="0 0 400 500"
//   2. 資格ピル「技術士 総監」を含む（塗りピル）
//   3. 管理区分ピルの枠 stroke を含む（2ピル構造）
//   4. 固定バッジ「択一 頻出テーマ」を含む
//   5. フッター文言が "doboku-note.com"（"@doboku-note" は旧仕様 = NG）
//   6. パスが content/sns/instagram/{exam}/... 配下（exam 試験dir直下に置かない）
//
// 使い方:
//   node scripts/check-ig-cover.mjs            # 全 00-cover.svg を検証
//   node scripts/check-ig-cover.mjs --staged   # git staged のみ（pre-commit 用）
// 違反が 1 件でもあれば exit 1。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const ROOT = 'content/sns/instagram';
// 試験dir以外（非パック）は対象外
const NON_EXAM = new Set(['_dev', 'highlights', 'stories', 'profile.md', 'README.md', '_keyword-findings.md']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === '00-cover.svg') out.push(p.split('\\').join('/'));
  }
  return out;
}

let files;
if (STAGED) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  files = staged.filter((f) => existsSync(f) && f.startsWith(`${ROOT}/`) && f.endsWith('00-cover.svg'));
} else {
  files = walk(ROOT);
}

const problems = [];
for (const f of files) {
  const svg = readFileSync(f, 'utf8');
  const rel = f.slice(`${ROOT}/`.length); // 例: cem/herzberg-.../carousel/img/00-cover.svg
  const examDir = rel.split('/')[0];

  // 6. パス規約: 試験dir配下か（instagram 直下の {slug}/carousel/... は NG）
  const segs = rel.split('/');
  if (NON_EXAM.has(examDir) || !/^[a-z0-9-]+$/.test(examDir) || segs.length < 4 || segs[1] === 'carousel') {
    problems.push(`${f}: パスが試験dir配下でない（content/sns/instagram/{exam}/{slug}/carousel/img/ に置く）`);
  }

  // 1. viewBox
  if (!/viewBox="0 0 400 500"/.test(svg)) problems.push(`${f}: viewBox="0 0 400 500" が必要`);
  // 2. 資格ピル
  if (!svg.includes('技術士 総監')) problems.push(`${f}: 資格ピル「技術士 総監」が無い`);
  // 3. 2ピル構造（枠ピルの stroke）
  if (!/<rect[^>]*stroke="#a36b2c"/.test(svg)) problems.push(`${f}: 管理区分の枠ピル（stroke="#a36b2c"）が無い＝2ピル構造でない`);
  // 4. 固定バッジ
  if (!svg.includes('択一 頻出テーマ')) problems.push(`${f}: 固定バッジ「択一 頻出テーマ」が無い`);
  // 5. フッター文言
  if (!svg.includes('doboku-note.com')) problems.push(`${f}: フッターが "doboku-note.com" でない`);
  if (svg.includes('@doboku-note')) problems.push(`${f}: 旧フッター "@doboku-note" を使用（"doboku-note.com" に統一）`);
  // 8. カバー背景色（管理区分によらず全パック共通 navy）
  // svg-base.mjs の MGMT_COLORS を誤参照して管理区分別色を使うドリフトを防ぐ（2026-06-25）
  if (!/<rect[^>]*fill="#1a3a5c"/.test(svg)) problems.push(`${f}: カバー背景色が #1a3a5c でない（管理区分によらず全パック navy 統一。MGMT_COLORS は過去問スクリプト専用）`);

  // 7. 同パックの 01-figure.svg は全面背景rectが必須
  //    サイト図はページ白背景前提で背景を持たない → PNG化で透明 → Instagram が黒表示（2026-06-24 発覚、8中5パック）
  const figPath = f.replace('00-cover.svg', '01-figure.svg');
  if (existsSync(figPath)) {
    const fig = readFileSync(figPath, 'utf8');
    if (!/<rect[^>]*width="400"[^>]*height="500"[^>]*fill="#(fff|ffffff)"|<rect[^>]*fill="#(fff|ffffff)"[^>]*width="400"[^>]*height="500"/.test(fig)) {
      problems.push(`${figPath}: 全面の白背景rectが無い（透明PNG→Instagramで黒地に。<rect width="400" height="500" fill="#ffffff"/> を <svg> 直後に追加）`);
    }
  }
}

if (problems.length) {
  console.error(`[check-ig-cover] ✗ ${problems.length} 件のテンプレ逸脱:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`  → SSOT: .claude/skills/social/ig-figure-pack/templates/00-cover.template.svg をコピーして文言だけ差し替える`);
  process.exit(1);
}
console.log(`[check-ig-cover] ✓ ${files.length} パックの表紙テンプレ＋図解の白背景が規約準拠`);
