/**
 * check-x-length --pending-only: 投稿済み（posted / replaced）を CI の対象から外し、未投稿だけを止める。
 * 2026-09-23 まで CI に無く、投稿済みの 1 件が 290 字だった（X 上で確定済みなので原稿を直しても意味がない）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { pendingOnly } from '../scripts/check-x-length.mjs';

test('posted と replaced は除き、queued・scheduled・draft・status 無しは残す', () => {
  const rows = [1, 2, 3, 4, 5, 6].map((num) => ({ num: String(num).padStart(2, '0') }));
  const status = { 1: 'posted', 2: 'replaced', 3: 'queued', 4: 'scheduled', 5: 'draft' };
  assert.deepEqual(pendingOnly(rows, status).map((r) => Number(r.num)), [3, 4, 5, 6]);
});
