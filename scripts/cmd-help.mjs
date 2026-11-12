#!/usr/bin/env node
// cmd-help — コマンドの用途と罠を、package.json の scripts と各スクリプトの冒頭コメントから引く。
//
//   npm run cmd -- deploy            # 名前・実コマンド・冒頭コメントのどれかに「deploy」を含む script
//   npm run cmd -- note 価格         # 語を並べると全部を含むものだけ
//   npm run cmd -- deploy --full     # 冒頭コメントを省略せず全部出す
//
// 一覧の文書（commands.md）は持たない。script を足すときは、起動するファイルの冒頭コメントに用途と罠を書く
// （無いと check-command-guidance が止める）。
// exit: 0 見つかった / 1 該当なし / 2 語が無い
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { parseCliArgs } from './lib/cli-args.mjs';
import { searchCommands } from './lib/cmd-help.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const HEADER_LINES = 14;
const args = parseCliArgs({ full: { type: 'boolean' } });
const query = args._.join(' ');

if (!query.trim()) {
  console.error('使い方: npm run cmd -- <語> [<語> …] [--full]');
  console.error('  package.json の scripts の名前・実コマンドと、起動するスクリプトの冒頭コメントから探す。');
  process.exitCode = 2;
} else {
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts ?? {};
  const readFile = (rel) => { try { return readFileSync(join(ROOT, rel), 'utf8'); } catch { return null; } };
  const hits = searchCommands({ scripts, readFile, query });
  console.log(`[cmd] 「${query}」: ${Object.keys(scripts).length} 件の script のうち ${hits.length} 件`);
  for (const hit of hits) {
    console.log(`\nnpm run ${hit.name}`);
    console.log(`  実コマンド: ${hit.command}`);
    const shown = args.full ? hit.header : hit.header.slice(0, HEADER_LINES);
    for (const line of shown) console.log(`  ${line}`);
    if (shown.length < hit.header.length) console.log(`  …（残り ${hit.header.length - shown.length} 行は ${hit.file}・--full で全部出す）`);
    if (hit.file && !hit.header.length) console.log(`  （${hit.file} に冒頭コメントが無い）`);
  }
  if (!hits.length) process.exitCode = 1;
}
