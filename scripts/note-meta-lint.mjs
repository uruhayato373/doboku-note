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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { glob } from 'node:fs/promises';
import { parseNoteText, checkLimits } from './lib/note-meta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = [];
for await (const f of glob('docs/note/**/note掲載文.txt', { cwd: ROOT })) files.push(f);
files.sort();

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
