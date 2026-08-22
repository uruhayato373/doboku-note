#!/usr/bin/env node
// note 記事ハッシュタグの下限ゲート。
//
// ルール:
//   note 記事の hashtags ファイル（<article dir>/hashtags.txt および型別 hashtags-<type>.txt）は
//   タグ 90 個以上を必須とする。下回るものは赤落ち。
//
// 背景: note のハッシュタグは記事の発見性（タグ面の露出・関連記事表示）を左右する。
//   1 タグ = 1 行・`#` 接頭辞・空行は無視。note-publish.mjs が公開時にこのファイルを読み込む
//   （tagsCandidates = hashtags-<type>.txt → hashtags.txt）。
//
// 使い方:
//   node scripts/check-note-hashtags.mjs            # content/note 配下の全 hashtags を検査（CI 用・exit 1）
//   node scripts/check-note-hashtags.mjs --staged   # git staged の hashtags のみ（pre-commit 用・exit 1）
//   node scripts/check-note-hashtags.mjs --all      # 全件を数の昇順で一覧（バーンダウン進捗・exit 0）
// 90 未満が 1 件でもあれば exit 1（--all は集計のみで exit 0）。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const THRESHOLD = 90;
const ROOT = 'content/note';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/^hashtags(-[^/]+)?\.txt$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

// タグ数 = 空行を除いた行数（1 行 1 タグ・# 接頭辞は問わない）。
function countTags(file) {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

let files;
if (STAGED) {
  let staged = [];
  try {
    // 日本語パス（content/note/技術士総監/...）は既定の core.quotepath で "\346..." に
    // エスケープされ startsWith('content/note/') が外れる＝staged 素通りになる。必ず無効化する。
    staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    staged = [];
  }
  files = staged.filter(
    (f) => f.startsWith(`${ROOT}/`) && /(^|\/)hashtags(-[^/]+)?\.txt$/.test(f) && existsSync(f),
  );
} else {
  files = walk(ROOT);
}

const rows = files.map((f) => ({ f, n: countTags(f) }));
const under = rows.filter((r) => r.n < THRESHOLD).sort((a, b) => a.n - b.n);

const scope = STAGED ? 'staged ' : ALL ? '全 ' : '';

if (ALL) {
  console.log(`=== note hashtags タグ数一覧（${rows.length} 件・昇順）===`);
  for (const r of rows.sort((a, b) => a.n - b.n)) {
    const mark = r.n < THRESHOLD ? '✗' : '✓';
    console.log(`  ${mark} ${String(r.n).padStart(3)}  ${r.f.replace(`${ROOT}/`, '')}`);
  }
  console.log(`\n90 未満: ${under.length} / ${rows.length}`);
  process.exit(0);
}

// 検査ゼロを PASS と呼ばない: 全量実行のはずが 0 件なら走査ロジックの故障を疑う
// （2026-07-28、他4ゲートが「対象0件のまま緑」で事故を隠していた。--staged は 0 件が正常）。
if (!STAGED && rows.length === 0) {
  console.error('[check-note-hashtags] ✗ 検査対象が 0 件。走査ロジックの故障を疑う（正常時は 700 件超）。');
  console.error(`  確認: ${ROOT} が存在するか／walk() のファイル名判定（hashtags*.txt）が壊れていないか。`);
  process.exit(1);
}

if (!under.length) {
  console.log(`[check-note-hashtags] ✓ ${scope}${rows.length} 件の hashtags は全て ${THRESHOLD} タグ以上`);
  process.exit(0);
}

console.error(`[check-note-hashtags] ✗ ${THRESHOLD} タグ未満が ${under.length} 件（${scope}${rows.length} 件中）:`);
for (const r of under) {
  console.error(`     ${String(r.n).padStart(3)} / ${THRESHOLD}  ${r.f.replace(`${ROOT}/`, '')}`);
}
console.error(`\n  各 hashtags.txt は 1 行 1 タグ（# 接頭辞）。${THRESHOLD} 個以上に補充してください。`);
process.exit(1);
