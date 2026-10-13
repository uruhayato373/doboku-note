import { strict as assert } from 'node:assert';
import test from 'node:test';
import { assessNoteSyncFreshness } from '../scripts/check-note-sync-freshness.mjs';

const now = Date.parse('2026-10-10T12:00:00Z');

test('note の同期の記録: 最新の startedAt が上限以内なら OK、超えたら FAIL（並びは問わない）', () => {
  const log = { runs: [{ startedAt: '2026-10-01T17:04:30Z' }, { startedAt: '2026-10-07T07:56:00Z' }] };
  assert.equal(assessNoteSyncFreshness(log, now, { maxAgeDays: 8 }).status, 'OK');
  const r = assessNoteSyncFreshness(log, Date.parse('2026-10-16T12:00:00Z'), { maxAgeDays: 8 });
  assert.equal(r.status, 'FAIL');
  assert.match(r.reasons[0], /9 日前（上限 8 日）/);
});

test('note の同期の記録: 記録が無い・日時が読めないのは FAIL（静かなのを OK と呼ばない）', () => {
  assert.equal(assessNoteSyncFreshness(null, now, { maxAgeDays: 8 }).status, 'FAIL');
  assert.equal(assessNoteSyncFreshness({ runs: [] }, now, { maxAgeDays: 8 }).status, 'FAIL');
  assert.equal(assessNoteSyncFreshness({ runs: [{ startedAt: 'x' }] }, now, { maxAgeDays: 8 }).status, 'FAIL');
});

test('note の同期の記録: 上限の既定は台帳 note.sync-log の freshness.failDays', () => {
  assert.equal(assessNoteSyncFreshness({ runs: [{ startedAt: '2026-10-07T07:56:00Z' }] }, now).inspected.maxAgeDays, 8);
});
