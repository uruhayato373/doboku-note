import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunk, judgeCdnCheck, PURGE_BATCH } from '../scripts/lib/r2-cdn-check.mjs';

test('purge は 30 URL ずつに分ける', () => {
  const urls = Array.from({ length: 65 }, (_, i) => `u${i}`);
  assert.equal(PURGE_BATCH, 30);
  assert.deepEqual(chunk(urls).map((b) => b.length), [30, 30, 5]);
});

test('照合の判定: 全件一致だけが 0、旧版が 1 件でもあれば 1、取れない URL があれば 2', () => {
  const r = (status) => ({ key: 'k', overwritten: true, status });
  assert.equal(judgeCdnCheck([r('match'), r('match')]).exitCode, 0);
  assert.equal(judgeCdnCheck([r('match'), r('mismatch')]).exitCode, 1);
  assert.equal(judgeCdnCheck([r('match'), r('fetch-failed')]).exitCode, 2);
  assert.equal(judgeCdnCheck([r('mismatch'), r('fetch-failed')]).exitCode, 1);
  // 全件取れないのは「異常なし」ではない
  const allFailed = judgeCdnCheck([r('fetch-failed')]);
  assert.equal(allFailed.exitCode, 2);
  assert.equal(allFailed.summary.checked, 0);
});

test('送った画像 0 件は照合するものが無いので 0（理由で区別する）', () => {
  const v = judgeCdnCheck([]);
  assert.equal(v.exitCode, 0);
  assert.equal(v.reason, 'no-targets');
});
