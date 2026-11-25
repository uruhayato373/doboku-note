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

test('空きメモリの関所で起動しなかった回は、全記事を失敗でなく low-memory の延期にする（DN-0954）', () => {
  const out = 'LaunchGuardError: 空きメモリ 1055MB < 閾値 1200MB。Claude Desktop / ChatGPT / Chrome のタブを閉じてから再実行\n    at guardBrowserLaunch\n';
  const result = classifyNoteSyncRun(items, out);
  assert.equal(result.lowMemory, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.deferred.length, 4);
  assert.match(result.deferred[0].reason, /^low-memory: 空きメモリ不足でブラウザを起動しなかった（1055MB < 閾値 1200MB）$/);
});

test('空きメモリの印が無ければ、記事の行の無い記事は従来どおり「結果なし」の失敗', () => {
  const result = classifyNoteSyncRun(items, '');
  assert.equal(result.lowMemory, false);
  assert.equal(result.failed.length, 4);
  assert.match(result.failed[0].reason, /^結果なし/);
});
