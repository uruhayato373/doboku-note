// check-workflow-hygiene ルール 8（errexit 下の $? 取りこぼし）の回帰ゲート。
// 2026-09 まで fetch-metrics.yml ほか 5 本が `node x; echo "exit_code=$?"` を bash -e のまま書き、
// x が非 0 のとき exit_code が出力されず、GA4 整合性・日次異常アラートが一度も発火しなかった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUnguardedExitCaptures } from '../scripts/check-workflow-hygiene.mjs';

test('bash -e のまま $? を読む形を検出する', () => {
  const run = 'mkdir -p /tmp/r\nnode check.mjs --report /tmp/r/a.md\necho "exit_code=$?" >> $GITHUB_OUTPUT';
  assert.equal(findUnguardedExitCaptures(run).length, 1);
});

test('pipefail だけでは errexit は外れない', () => {
  const run = 'set -o pipefail\nnode x.mjs 2>&1 | tee log\necho "exit_code=$?" >> "$GITHUB_OUTPUT"';
  assert.equal(findUnguardedExitCaptures(run).length, 1);
});

test('先行する set +e があれば許す', () => {
  const run = 'set -o pipefail\nset +e\nnode x.mjs | tee log\necho "exit_code=$?" >> "$GITHUB_OUTPUT"';
  assert.deepEqual(findUnguardedExitCaptures(run), []);
});

test('set +e の後に set -e へ戻した場合は検出する', () => {
  const run = 'set +e\nnode a.mjs\na=$?\nset -euo pipefail\nnode b.mjs\nb=$?';
  const hits = findUnguardedExitCaptures(run);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 6);
});

test('cmd || rc=$? 形とコメント内の $? は許す', () => {
  const run = 'rc=0\nnode x.mjs || rc=$?\n# echo "exit_code=$?" の説明\necho "rc=$rc"';
  assert.deepEqual(findUnguardedExitCaptures(run), []);
});
