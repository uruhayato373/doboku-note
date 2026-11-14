import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const [script, args] of [
  ['affiliate-status.mjs', ['--write', '--asp', 'invalid']],
  ['moshimo-report.mjs', ['--month', 'invalid']],
]) {
  for (const flag of ['--help', '-h']) test(`${script} ${flag} は照合・書込・認証を開始しない`, () => {
    const output = execFileSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}`, import.meta.url)), ...args, flag], { encoding: 'utf8', timeout: 10000 });
    assert.match(output, /^Usage:/);
    assert.doesNotMatch(output, /アフィリ状態照合|検査不成立|ログイン|サイト帰属|unknown/);
  });
}
