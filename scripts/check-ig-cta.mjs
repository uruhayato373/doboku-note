#!/usr/bin/env node
// IG figure-pack の CTA スライド（content/sns/instagram/**/carousel/img/NN-cta.svg）が
// 確定テンプレ（SSOT: .claude/skills/social/ig-figure-pack/templates/03-cta.template.svg）に
// 準拠しているかを検証する。
//
// 背景: CTA は表紙（check-ig-cover）と違い SSOT も機械ゲートも無く、コピー元の逸脱を
// 引き継いで 4 種以上のバリアントに分裂していた（2026-06-25 発覚：maslow 系汎用文言・
// 画像内ハッシュタグ・「もっと学びたい方へ」第3型・risk-perception 独自第4型）。
// 表紙と同様に機械ゲートで赤落ちさせ、新標準（テーマ別「完全解説」）へ収束させる。
//
// 検証する不変条件:
//   1. viewBox="0 0 400 500"
//   2. 見出し「もっと深く学びたい方へ」を含む（新標準。旧「もっと解きたい/学びたい方へ」は NG）
//   3. URL ボタン文言 "doboku-note.com" を含む
//   4. 誘導文「プロフィールのリンクから」「総監キーワード集へアクセス」を両方含む
//   5. フッター "@doboku-note"
//   6. 画像内にハッシュタグ（<text> 内の "#"）を含まない（クリック・検索不可で無意味。タグは caption.txt のみ）
//
// 使い方:
//   node scripts/check-ig-cta.mjs            # 全 CTA を検証
//   node scripts/check-ig-cta.mjs --staged   # git staged のみ（pre-commit 用）
// 違反が 1 件でもあれば exit 1。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const ROOT = 'content/sns/instagram';
const CTA_RE = /\d{2}-cta\.svg$/;
// 実パック（{exam}/.../carousel/img/）のみ対象。_dev 等のスクラッチは除外
const isPack = (f) => CTA_RE.test(f) && f.includes('/carousel/') && !f.includes('/_dev/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else {
      const rel = p.split('\\').join('/');
      if (isPack(rel)) out.push(rel);
    }
  }
  return out;
}

let files;
if (STAGED) {
  const staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  files = staged.filter((f) => existsSync(f) && f.startsWith(`${ROOT}/`) && isPack(f));
} else {
  files = walk(ROOT);
}

const problems = [];
for (const f of files) {
  const svg = readFileSync(f, 'utf8');
  if (!/viewBox="0 0 400 500"/.test(svg)) problems.push(`${f}: viewBox="0 0 400 500" が必要`);
  if (!svg.includes('もっと深く学びたい方へ')) problems.push(`${f}: 見出し「もっと深く学びたい方へ」が無い（旧 maslow 系 CTA の様式。新標準テンプレを使う）`);
  if (!svg.includes('doboku-note.com')) problems.push(`${f}: URL ボタン "doboku-note.com" が無い`);
  if (!svg.includes('プロフィールのリンクから') || !svg.includes('総監キーワード集へアクセス')) {
    problems.push(`${f}: 誘導文「プロフィールのリンクから／総監キーワード集へアクセス」が無い`);
  }
  if (!svg.includes('@doboku-note')) problems.push(`${f}: フッター "@doboku-note" が無い`);
  // 画像内ハッシュタグ（<text>要素内の "#"）は禁止
  if (/<text[^>]*>[^<]*#/.test(svg)) problems.push(`${f}: 画像内にハッシュタグがある（クリック・検索不可で無意味。タグは caption.txt のみに書く）`);
}

if (problems.length) {
  console.error(`[check-ig-cta] ✗ ${problems.length} 件のテンプレ逸脱:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`  → SSOT: .claude/skills/social/ig-figure-pack/templates/03-cta.template.svg をコピーして {{...}} だけ差し替える`);
  process.exit(1);
}
console.log(`[check-ig-cta] ✓ ${files.length} パックの CTA が新標準テンプレに準拠`);
