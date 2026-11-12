import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessOwnFreshness } from '../scripts/check-youtube-own-freshness.mjs';
import { freshnessDays } from '../scripts/lib/datasets.mjs';

test('月次の記録は台帳の warnDays（35 日）を超えると失敗し、記録 0 件も緑にしない', () => {
  const max = freshnessDays('youtube.own-videos', 'warnDays');
  assert.equal(max, 35);
  assert.equal(assessOwnFreshness('2026-11-01', '2026-11-12', max).ok, true);
  assert.equal(assessOwnFreshness('2026-10-08', '2026-11-12', max).ok, true);
  assert.equal(assessOwnFreshness('2026-10-08', '2026-11-13', max).ageDays, 36);
  assert.match(assessOwnFreshness('2026-10-08', '2026-11-13', max).reason, /36 日前/);
  assert.equal(assessOwnFreshness(null, '2026-11-12', max).ok, false);
  assert.equal(assessOwnFreshness('2026-11-20', '2026-11-12', max).ok, false);
});
