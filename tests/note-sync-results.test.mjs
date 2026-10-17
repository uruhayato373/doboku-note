import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyNoteSyncRun } from '../scripts/lib/note-sync-results.mjs';

const items = ['na1', 'nb2', 'nc3', 'nd4'].map((noteId) => ({ noteId, path: `article/${noteId}`, parts: ['body'] }));

test('quota stop retains actual failure and success while deferring the current and subsequent articles', () => {
  const result = classifyNoteSyncRun(items, '[article] na1\n[OK] saved\n[article] nb2\n[FAIL] UI mismatch\n[article] nc3\n[5] ABORT: quota\n[DEFER] nc3 attachment-daily-limit: retry tomorrow\n');
  assert.equal(result.attempted, 3);
  assert.equal(result.updated.length, 1);
  assert.equal(result.failed.length, 1);
  assert.deepEqual(result.deferred.map((x) => x.path), ['article/nc3', 'article/nd4']);
  assert.equal(result.dailyLimit, true);
});

test('missing output and ordinary failure are never turned into quota deferral or success', () => {
  const result = classifyNoteSyncRun(items, '[article] na1\n[OK] saved\n[article] nb2\n[FAIL] failed\n');
  assert.equal(result.attempted, 2);
  assert.equal(result.updated.length, 1);
  assert.equal(result.failed.length, 3);
  assert.equal(result.deferred.length, 0);
  assert.equal(result.dailyLimit, false);
});
