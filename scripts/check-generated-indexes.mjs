#!/usr/bin/env node
/**
 * check-generated-indexes.mjs — `npm run refresh-indexes` の生成物がコミットと一致しているかを検査する。
 *
 * MDX を足して refresh-indexes を回さずにコミットすると、src/config の索引（タグ・横断キーワード・
 * 人気記事など）が古いまま残り、次に誰かがビルドした手元にだけ差分が出る（2026-09-26: 6 ファイルの
 * 差分を他人の変更と取り違えた）。ここで refresh-indexes を実際に回し、実行前はきれいだったのに
 * 実行後に変わった追跡ファイルを「コミット漏れ」として exit 1 にする。
 * 生成時刻だけの再生成は scripts/lib/write-generated.mjs が書かないので差分にならない。
 *
 * 実行前から手元で変更中のファイルは判定できないので「未判定」と出す（CI はきれいな checkout）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' });
const changed = () => new Set(git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean));

const before = changed();
const run = spawnSync('npm', ['run', '-s', 'refresh-indexes'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
if (run.status !== 0) {
  console.error('[check-generated-indexes] ✗ 検査不成立: refresh-indexes が失敗した');
  console.error((run.stderr || run.stdout || '').split('\n').slice(-10).join('\n'));
  process.exit(2);
}
const after = changed();
const stale = [...after].filter((f) => !before.has(f));
const undecided = [...before].filter((f) => after.has(f));

console.log(`[check-generated-indexes] refresh-indexes を実行 / 実行後に変わった追跡ファイル ${stale.length} 件 / 実行前から変更中で未判定 ${undecided.length} 件`);
if (stale.length) {
  console.error('  ✗ 生成物がコミットと一致しない（refresh-indexes を回してコミットする）:');
  for (const f of stale) console.error(`    ${f}`);
  process.exit(1);
}
console.log('[check-generated-indexes] ✓ 生成物はコミットと一致');
