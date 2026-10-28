import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReschedulePlan } from '../scripts/lib/youtube-reschedule-plan.mjs';

const pub = (n) => `pe-first-stage/pack-${n}/youtube.longform`;
const slot = (time) => `2026-10-29T${time}:00+09:00`;
const plan = () => ({ schemaVersion: 1, channelId: 'UCHRnXPqoc0Hls8nXiK_ZYqA', moves: [
  { publicationId: pub(1), videoId: 'Abcdefghi01', from: '2026-11-01T20:00:00+09:00', to: slot('08:30') },
  { publicationId: pub(2), videoId: 'Abcdefghi02', from: '2026-11-02T20:00:00+09:00', to: slot('14:30') },
], newUploads: [{ publicationId: pub(3), to: slot('20:30') }] });

test('accepts three distinct slots with exact source identities', () => {
  assert.deepEqual(validateReschedulePlan(plan(), Date.parse('2026-10-28T19:00:00+09:00')), { moves: 2, newUploads: 1, days: 1 });
});
test('rejects duplicate slots and fewer than three releases per day', () => {
  const duplicate = plan(); duplicate.newUploads[0].to = slot('14:30');
  assert.throws(() => validateReschedulePlan(duplicate, Date.parse('2026-10-28T19:00:00+09:00')), /重複/);
  const short = plan(); short.newUploads = [];
  assert.throws(() => validateReschedulePlan(short, Date.parse('2026-10-28T19:00:00+09:00')), /1日3本/);
});
test('rejects a slot that could publish immediately', () => {
  assert.throws(() => validateReschedulePlan(plan(), Date.parse('2026-10-29T08:10:00+09:00')), /近すぎる/);
});
