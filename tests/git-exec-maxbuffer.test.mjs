import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * git の一覧・差分・履歴を同期で読む箇所は maxBuffer を明示する。
 *
 * 既定は 1MB しかなく、大規模なコミット（数千ファイルの移動など）で ENOBUFS 例外になる。
 * そのとき落ちるのは「検査が不合格」ではなく **検査が実行不能**で、しかも例外なので
 * pre-commit ごと止まる。2026-08-18 の情報アーキテクチャ移行で check-doc-coupling と
 * check-handoff-extraction が実際にこれで落ち、commit が通らなくなった。
 *
 * 「緑」と「そもそも走っていない」を区別できない状態を作らない（CLAUDE.md §9）。
 */

/** git を同期実行し、かつ一覧/差分/履歴を読んでいる呼び出しを抽出する。 */
function findGitCalls(source) {
  const CALL = /exec(?:File)?Sync\(\s*(?:"git"|'git')[\s\S]{0,400}?\)/g;
  return [...(source.match(CALL) ?? [])].filter((c) =>
    /--cached|ls-files|name-only|name-status|\bdiff\b|\blog\b|ls-tree|rev-list/.test(c),
  );
}

test('git の一覧・差分・履歴を読む同期呼び出しは maxBuffer を明示している', () => {
  const files = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'ls-files', '-z', 'scripts', '.claude/scripts', 'tests'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).split('\0').filter(Boolean).filter((f) => f.endsWith('.mjs'));

  let inspected = 0;
  const missing = [];
  for (const rel of files) {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    for (const call of findGitCalls(source)) {
      inspected += 1;
      if (!/maxBuffer/.test(call)) {
        const line = source.slice(0, source.indexOf(call)).split('\n').length;
        missing.push(`${rel}:${line}`);
      }
    }
  }

  // 検査ゼロを PASS と呼ばない: 抽出そのものが壊れていないことを先に確かめる
  assert.ok(inspected > 30, `git 呼び出しの抽出が異常に少ない（正規表現の破損を疑う）: ${inspected}`);
  assert.deepEqual(missing, [], `maxBuffer 未指定: ${missing.join(', ')}`);
});

test('抽出は「maxBuffer が無い呼び出し」を実際に検出できる（負検証）', () => {
  // フィクスチャは**連結して組み立てる**。ベタ書きするとこのファイル自身が上のテストに
  // 引っかかる（実際に、このテストを追跡下へ入れた瞬間に自分で自分を落とした）。
  const CALL = (opts) => `exec${'File'}Sync(${"'git'"}, ['diff', '--cached', '--name-only'], { ${opts} })`;
  const bad = CALL("encoding: 'utf8'");
  const good = CALL("encoding: 'utf8', maxBuffer: 1");
  assert.equal(findGitCalls(bad).length, 1);
  assert.equal(/maxBuffer/.test(findGitCalls(bad)[0]), false);
  assert.equal(/maxBuffer/.test(findGitCalls(good)[0]), true);
  // git 以外や、一覧/差分を読まない git 呼び出しは対象外
  assert.deepEqual(findGitCalls(`exec${'File'}Sync('node', ['-e', 'diff'], { encoding: 'utf8' })`), []);
  assert.deepEqual(findGitCalls(`exec${'File'}Sync(${"'git'"}, ['rev-parse', 'HEAD'], { encoding: 'utf8' })`), []);
});
