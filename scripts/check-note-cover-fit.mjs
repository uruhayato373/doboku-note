#!/usr/bin/env node
/**
 * check-note-cover-fit.mjs
 *
 * note カバー（G2「全幅バナー帯」）のテキストが**キャンバス外へ溢れて切れる**回帰を防ぐゲート。
 *
 * 設計判断（真実源: docs/design-system/note-cover.md / note-cover-tokens.json）:
 *   banner は「3工事名の列挙」「選択科目II-1 専門知識｜模範解答」等、意味的に縮められない
 *   descriptive テキストが正規であり、bannerFontSize は 48px まで自動縮小して**フル 1280 幅**には
 *   必ず収める。よって「7〜11字推奨」は正方形 630 クロップでの可読性目安であって、超過＝NG ではない
 *   （実態で 8 割が超過＝形骸化）。本ゲートが検出するのは "真の溢れ"＝48px floor でもフル 1280 幅
 *   （上段は左右 padding 60px を除いた 1160px）に収まらず、画像の外で切れるケースのみ。
 *
 * 検出（renderNoteCoverG2 のレイアウト式をミラー）:
 *   - banner   : ec(banner) * bannerFontSize(banner) * 1.03  > 1280
 *   - 上段(hi+hiSuffix): hiBox幅 + 14 + ec(hiSuffix)*58      > 1160
 *   - leadIn   : ec(leadIn) * 37                              > 1160
 *
 * 使い方:
 *   node scripts/check-note-cover-fit.mjs            # 全 note 記事（CI 用・溢れあれば exit 1）
 *   node scripts/check-note-cover-fit.mjs --staged   # git staged の article*.md のみ（pre-commit 用）
 *   node scripts/check-note-cover-fit.mjs --all       # 推定幅の一覧（バーンダウン・exit 0）
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = 'docs/note';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

// キャンバス幾何（renderNoteCoverG2 / note-cover-tokens.json と一致）
const CANVAS_W = 1280;
const UPPER_W = CANVAS_W - 60 * 2; // upper は padding 0 60px
const SAFETY_WIDTH = 590; // bannerFontSize が狙う中央 630 クロップ安全幅
const LS = 1.03; // banner letterSpacing 0.03em 余裕

// 実効文字数（全角=1.0 / 半角英数記号=0.55）— テンプレ effectiveCharCount と同義
const ec = (t) => {
  let w = 0;
  for (const ch of String(t || '')) w += /[\x00-\x7F]/.test(ch) ? 0.55 : 1.0;
  return w;
};
// バナー帯フォント（テンプレ bannerFontSize と同義）
const bannerFontSize = (t) => Math.max(48, Math.min(110, Math.floor((SAFETY_WIDTH - 8) / ((ec(t) || 1) * LS))));
// HiBox フォント（テンプレ hiFontSize と同義）
const hiFontSize = (t) => {
  const e = ec(t) || 1;
  if (e <= 3) return 112;
  if (e <= 5) return 92;
  return 76;
};

// 各要素の推定描画幅と、収めるべき上限を返す。溢れ要素だけ列挙。
function overflowsOf(cover) {
  const c = cover || {};
  const issues = [];
  if (c.banner) {
    const w = ec(c.banner) * bannerFontSize(c.banner) * LS;
    if (w > CANVAS_W) issues.push(`banner "${c.banner}" 推定${Math.round(w)}px > ${CANVAS_W}px`);
  }
  if (c.hi || c.hiSuffix) {
    const hiW = c.hi ? ec(c.hi) * hiFontSize(c.hi) + 32 : 0; // HiBox padding 0 16px
    const sufW = c.hiSuffix ? ec(c.hiSuffix) * 58 : 0; // hiSuffix 58px
    const gap = c.hi && c.hiSuffix ? 14 : 0; // marginRight
    const w = hiW + gap + sufW;
    if (w > UPPER_W) issues.push(`上段(hi+hiSuffix) 推定${Math.round(w)}px > ${UPPER_W}px`);
  }
  if (c.leadIn) {
    const w = ec(c.leadIn) * 37;
    if (w > UPPER_W) issues.push(`leadIn "${c.leadIn}" 推定${Math.round(w)}px > ${UPPER_W}px`);
  }
  return issues;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && /^article(-[A-Za-z0-9-]+)?\.md$/.test(e.name)) out.push(join(dir, e.name).split('\\').join('/'));
    else if (e.isDirectory() && e.name !== 'img') walk(join(dir, e.name), out);
  }
  return out;
}
function stagedMd() {
  try {
    // -c core.quotepath=false: 日本語パスを生UTF-8で出力（既定は "docs/note/1\347..." と
    // 引用符付き8進エスケープになり startsWith('docs/note') に不一致→日本語パス記事が素通りする）
    return execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
      .split('\n').map((s) => s.trim())
      .filter((s) => s.startsWith(ROOT) && /\/article(-[A-Za-z0-9-]+)?\.md$/.test(s));
  } catch {
    return [];
  }
}

const files = STAGED ? stagedMd() : walk(ROOT);
const ng = [];
let g2 = 0;
for (const fp of files) {
  if (!existsSync(fp)) continue;
  let data;
  try { data = matter(readFileSync(fp, 'utf8')).data; } catch { continue; }
  const c = data.cover;
  if (!c || !(c.banner || c.hi || c.leadIn)) continue; // G2 のみ
  g2++;
  const issues = overflowsOf(c);
  if (issues.length) ng.push({ slug: fp.replace(`${ROOT}/`, ''), issues });
}

if (ALL) {
  console.log(`[check-note-cover-fit] G2 ${g2} 件 / キャンバス外溢れ ${ng.length} 件`);
  ng.forEach((r) => r.issues.forEach((i) => console.log(`  ✗ ${r.slug}  ${i}`)));
  process.exit(0);
}
if (ng.length === 0) {
  console.log(`[check-note-cover-fit] ✓ ${STAGED ? 'staged ' : ''}note カバー(G2 ${g2}件) はキャンバス内に収まる`);
  process.exit(0);
}
console.error(`[check-note-cover-fit] ✗ ${ng.length} 件の note カバーがキャンバス外で切れます`);
console.error('  真実源: docs/design-system/note-cover.md → banner/hi/hiSuffix/leadIn を短縮し再生成 (node scripts/generate-note-covers.mjs <slug>)');
ng.forEach((r) => r.issues.forEach((i) => console.error(`  ${r.slug}  ${i}`)));
process.exit(1);
