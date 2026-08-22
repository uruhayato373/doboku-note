#!/usr/bin/env node
/**
 * note-meta-lint.mjs
 * 全マガジンの note掲載文.txt を文字数制限（タイトル30 / 説明400 / アピール250）で検査し、
 * 機械ブロック（セット価格/単品価格）の有無も確認する。
 *
 * note の制限を超えると編集画面の「更新」が無効化＝保存不可になるため、push 前のゲート。
 *   npm run note-meta-lint            # 検査（違反があれば exit 2）
 * 真実源: .claude/knowledge/reference/note-api-verification.md
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { parseNoteText, checkLimits } from './lib/note-meta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// node:fs/promises の glob は Node 22+ の API で、CI/ローカルの Node 20 では
// `does not provide an export named 'glob'` で **import 時点でクラッシュ**する。
// 2026-07-25 以降ずっとこの状態で、quality-audit 上は FAIL と出ていたが report 扱い
// （ci:false）のため誰も見ておらず、実態は「3 週間 1 件も検査していない」だった
// （2026-08-16 発覚）。依存を増やさず readdirSync の再帰で置き換える。
const TARGET = 'note掲載文.txt';
function collect(dir, acc = []) {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) collect(rel, acc);
    else if (e.name === TARGET) acc.push(rel);
  }
  return acc;
}
const files = collect('content/note').sort();

// 検査ゼロを PASS と呼ばない（CLAUDE.md §9）。対象 0 件は「違反なし」ではなく
// 「走査が壊れている」可能性が高い＝この lint が 3 週間沈黙した失敗そのもの。
if (files.length === 0) {
  console.error('[note-meta-lint] 検査不成立: content/note 配下に note掲載文.txt が 1 件も見つかりません。');
  console.error('  走査ロジックかディレクトリ構成の破損を疑ってください（「違反なし」ではありません）。');
  process.exit(2);
}

let violations = 0, noMachine = 0;
console.log(`=== note掲載文.txt 文字数 lint（${files.length} 件）===`);
for (const rel of files) {
  const m = parseNoteText(readFileSync(join(ROOT, rel), 'utf-8'));
  const v = checkLimits(m);
  const name = rel.split(/[\\/]/).slice(-2, -1)[0];
  const noMach = !m.setPrice;
  if (v.length) { violations++; console.log(`  ✗ ${name}\n      ${v.join(' / ')}`); }
  if (noMach) { noMachine++; }
  if (process.env.VERBOSE && !v.length) console.log(`  ✓ ${name}  (T${m.title.length}/D${m.description.length}/A${m.appealPoint.length} set¥${m.setPrice || '-'} art¥${m.articlePrice || '-'})`);
}
console.log(`\n違反: ${violations} 件 / 機械ブロック未整備: ${noMachine} 件`);
if (noMachine) console.log('（機械ブロック未整備は note-meta-to-txt で付与）');
process.exit(violations ? 2 : 0);
