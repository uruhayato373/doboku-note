#!/usr/bin/env node
// check-command-guidance.mjs — スクリプトが案内するコマンドが実在するかのゲート。
//
// 守りたい事故: **検査が「これを実行しろ」と案内するのに、そのコマンドが動かない。**
// 2026-08-22 に check-asset-storage が `asset-offload --group sns-archived-media --commit` を
// 案内していたが、その group は gitignore 済みで asset-offload は追跡ファイルしか見ないため
// 「対象 0 件」で exit 1 になっていた。案内どおりに動かした人が詰まる。
//
// もう一つは移設の置き去り。ファイルが scripts/ から .claude/scripts/ へ移っても
// usage コメントの `node scripts/foo.mjs` が残り、コピーすると Cannot find module になる。
//
// 検査するもの（.mjs のソース内の文字列・コメントを問わず）:
//   1. `npm run <name>` の <name> が package.json の scripts に実在するか
//   2. `node <path>.mjs` の <path> が実在するか
//
// 引数の妥当性（フラグの組み合わせが実際に通るか）までは見ない。そこは各検査の責任。
//
// 使い方: node scripts/check-command-guidance.mjs [--json]
// exit 0 = 健全 / 1 = 壊れた案内あり・検査不成立

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const JSON_OUT = process.argv.includes('--json');

const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', 'scripts', '.claude/scripts'], {
  cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
}).split('\0').filter((f) => f && f.endsWith('.mjs'));

const pkgScripts = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).scripts || {};

const broken = [];
let refNpm = 0;
let refPath = 0;
for (const f of files) {
  const src = readFileSync(join(REPO_ROOT, f), 'utf8');
  const seen = new Set();
  for (const m of src.matchAll(/npm run ([a-z0-9][a-z0-9:-]*)/g)) {
    refNpm += 1;
    if (pkgScripts[m[1]] || seen.has('n' + m[1])) continue;
    seen.add('n' + m[1]);
    broken.push({ file: f, kind: 'npm', ref: 'npm run ' + m[1] });
  }
  for (const m of src.matchAll(/node ((?:scripts|\.claude\/scripts)\/[A-Za-z0-9._/-]+\.mjs)/g)) {
    refPath += 1;
    if (existsSync(join(REPO_ROOT, m[1])) || seen.has('p' + m[1])) continue;
    seen.add('p' + m[1]);
    broken.push({ file: f, kind: 'path', ref: 'node ' + m[1] });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ files: files.length, refNpm, refPath, broken }, null, 2));
} else {
  console.log('[check-command-guidance] ' + files.length + ' スクリプトを実検査 / 案内 '
    + (refNpm + refPath) + ' 件（npm run ' + refNpm + ' / node パス ' + refPath + '）');
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
  if (files.length < 100 || refNpm + refPath < 100) {
    console.error('✗ 走査結果が異常に少ない＝抽出が壊れている疑い（検査不成立）');
    process.exit(1);
  }
  for (const b of broken.slice(0, 25)) console.error('  [壊れ] ' + b.file + ': ' + b.ref);
  if (broken.length > 25) console.error('  ... ほか ' + (broken.length - 25) + ' 件');
  if (broken.length === 0) {
    console.log('  ✓ 案内されているコマンドはすべて実在する');
  } else {
    console.error('\n✗ 存在しないコマンドを案内している箇所が ' + broken.length + ' 件');
    console.error('  案内どおりに実行した人が詰まる。移設したら usage も直すこと。');
  }
}
process.exit(broken.length ? 1 : 0);
