#!/usr/bin/env node
/**
 * check-magazine-wiring.mjs — keiken マガジン配線もれ 再発防止ゲート
 * ---------------------------------------------------------------------------
 * 背景: 新しい keiken マガジン（1級・2級土木 施工経験記述系）を追加したのに、
 *   字数ツール `scripts/keiken-charcount.mjs` の探索フィルタ更新を忘れると、
 *   そのマガジンの答案が解答欄字数チェックを **素通り** する
 *   （2026-07-01 想定工事バンクで実際に発生：dir 名に「経験記述」が無く一括スキップ）。
 *
 * 本ガードは keiken 記事を「答案マーカー（**(N) / ### 記述例 / 条件提示型見出し）を持つ
 *   article.md」で内容判定し、keiken-charcount の許可リスト（'経験記述' || '想定工事バンク'）で
 *   カバーされないマガジン dir を検出して落とす。
 *   → keiken-charcount のフィルタと本ガードの COVERED を同期し続けることを強制する。
 *
 * 使い方:
 *   node scripts/check-magazine-wiring.mjs            # 全 keiken マガジンを検査
 *   node scripts/check-magazine-wiring.mjs --staged   # 関連 staged がある時だけ検査（pre-commit 用）
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const BASES = [
  'docs/note/1級・2級土木/1級土木/magazines',
  'docs/note/1級・2級土木/2級土木/magazines',
];

// keiken-charcount.mjs の defaultTargets フィルタと同一の許可リスト。
// ★ ここを増やしたら keiken-charcount 側（defaultTargets / isKeikenArticle）も必ず同期する。
const COVERED = (p) => p.includes('経験記述') || p.includes('想定工事バンク');

// keiken 答案マーカー（いずれかを持てば keiken 記事とみなす・内容判定で名前に依存しない）
const KEIKEN_MARKER = /(^|\n)\s*\*\*\(\d\)\s|(^|\n)###\s+記述例|(^|\n)###\s[^\n]*（\d）/;

const staged = process.argv.includes('--staged');
if (staged) {
  let changed = '';
  try {
    changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf-8' });
  } catch { changed = ''; }
  const relevant = changed.split('\n').some((p) =>
    /docs\/note\/1級・2級土木\/[12]級土木\/magazines\//.test(p)
    || p.includes('src/lib/note-magazines.ts')
    || p.includes('scripts/keiken-charcount.mjs'));
  if (!relevant) process.exit(0); // keiken マガジン/字数ツールに無関係な commit → スキップ
}

function articleMdsOf(dir, acc) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) articleMdsOf(p, acc);
    else if (name === 'article.md') acc.push(p);
  }
}

const violations = [];
let keikenMagCount = 0;
for (const base of BASES) {
  const abs = join(ROOT, base);
  if (!existsSync(abs)) continue;
  for (const mag of readdirSync(abs)) {
    const magDir = join(abs, mag);
    if (!statSync(magDir).isDirectory()) continue;
    const arts = [];
    articleMdsOf(magDir, arts);
    if (arts.length === 0) continue;
    const isKeiken = arts.some((p) => KEIKEN_MARKER.test(readFileSync(p, 'utf-8')));
    if (!isKeiken) continue;
    keikenMagCount++;
    // 答案を持つ記事がすべて keiken-charcount のフィルタでカバーされているか
    const covered = arts.every((p) => COVERED(p.replace(/\\/g, '/')));
    if (!covered) violations.push(`${base}/${mag}`);
  }
}

if (violations.length) {
  console.error('[check-magazine-wiring] ✗ keiken マガジンが keiken-charcount の探索対象から漏れています:');
  for (const v of violations) console.error(`  - ${v}`);
  console.error('\n対処: scripts/keiken-charcount.mjs の defaultTargets フィルタ（と isKeikenArticle）に');
  console.error('  このマガジン名の判別語を追加し、本ガード（check-magazine-wiring.mjs）の COVERED も同期する。');
  console.error('  漏れると答案の解答欄字数超過が pre-commit で検知されず素通りします（2026-07-01 再発防止）。');
  process.exit(1);
}
console.log(`[check-magazine-wiring] ✓ keiken マガジン ${keikenMagCount} 件はすべて keiken-charcount の探索対象に含まれる`);
