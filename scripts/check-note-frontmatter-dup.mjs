#!/usr/bin/env node
/**
 * check-note-frontmatter-dup.mjs
 * ---------------------------------------------------------------------------
 * note 記事 frontmatter のトップレベルキー重複を検出する。network 不要・creds 不要。
 *
 * 背景（2026-07-31）: `工事04-高速道路路体盛土` の frontmatter に `price: 1980` と
 * `price: ""` が併存していた。YAML は重複キーを許さない実装が多く、gray-matter を使う
 * magazine-to-pdf.mjs がパースで停止し、完全攻略パック 104 本の PDF 生成が丸ごと落ちた。
 * 寛容なパーサでは後勝ちになるため、価格が空文字として読まれて価格系ゲートを素通りする
 * 危険もあった（ライブは ¥1,980 で正しかったので実害は出ていない）。
 *
 * 既存ゲート（note-lint / check-note-price-consistency / check-note-boundary）は
 * どれも「1 キー 1 回」を前提に正規表現で先頭一致を取るため、重複を 1 件も検出できない。
 *
 * 使い方:
 *   node scripts/check-note-frontmatter-dup.mjs            # content/note 全量
 *   node scripts/check-note-frontmatter-dup.mjs --staged   # staged のみ（pre-commit 用）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT, NOTE_CONTENT_ROOT as ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';

const ROOT_REL = relative(REPO_ROOT, ROOT).split('\\').join('/');
const STAGED = process.argv.includes('--staged');

let files;
if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { staged = []; }
  files = staged.filter((f) => f.startsWith(`${ROOT_REL}/`) && f.endsWith('.md') && existsSync(join(REPO_ROOT, f))).map((f) => join(REPO_ROOT, f));
} else {
  files = listFiles(ROOT, { ext: '.md', allowMissing: true, followLinks: true });
}

const violations = [];
let checked = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;              // frontmatter 無しは対象外
  checked++;
  const seen = new Map();
  m[1].split(/\r?\n/).forEach((line, i) => {
    // トップレベルキーのみ（インデントされた入れ子は対象外）
    const k = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (!k) return;
    if (!seen.has(k[1])) seen.set(k[1], []);
    seen.get(k[1]).push(i + 2);  // frontmatter 開始 `---` の次行が 2 行目
  });
  const dups = [...seen.entries()].filter(([, lines]) => lines.length > 1);
  if (dups.length) violations.push({ f: relative(REPO_ROOT, f).split('\\').join('/'), dups });
}

console.log(`[check-note-frontmatter-dup] frontmatter を持つ .md ${checked} 件を実検査${STAGED ? '（staged）' : ''}`);

if (violations.length) {
  console.error(`\n✗ トップレベルキーの重複: ${violations.length} 件`);
  for (const v of violations) {
    console.error(`  ${v.f}`);
    for (const [k, lines] of v.dups) console.error(`      ${k} が ${lines.length} 回（L${lines.join(', L')}）`);
  }
  console.error('\n  → 正しい 1 行だけ残して削除する。YAML の重複キーはパーサによって停止/後勝ちが分かれ、');
  console.error('    magazine-to-pdf.mjs は停止する（2026-07-31 に PDF 生成 104 本が落ちた）。');
  process.exit(1);
}

console.log('✓ 重複キーなし');
