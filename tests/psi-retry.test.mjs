import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetryPsi } from '../.claude/scripts/fetch-psi-data.mjs';

/**
 * PSI 収集のリトライ契約。
 *
 * リトライで隠していいのは**相手側の一過性の失敗（5xx とネットワーク断）だけ**。
 * 4xx を再送すると設定ミスやクォータ枯渇を隠したまま時間だけ延び、
 * 「測れていない」と「違反が無い」の区別がさらに付かなくなる（DN-0024 の動機そのもの）。
 */

test('5xx とネットワーク断だけリトライする', () => {
  for (const s of [500, 502, 503, 504, 599, null]) {
    assert.equal(shouldRetryPsi(s), true, `${s} はリトライすべき`);
  }
});

test('4xx はリトライしない（設定ミス・クォータを隠さない）', () => {
  for (const s of [400, 401, 403, 404, 429]) {
    assert.equal(shouldRetryPsi(s), false, `${s} はリトライしてはいけない`);
  }
});

test('2xx/3xx もリトライ対象にしない', () => {
  for (const s of [200, 204, 301, 304]) assert.equal(shouldRetryPsi(s), false);
});
