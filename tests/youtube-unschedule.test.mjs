import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectScheduled, unscheduledStatus, decide, isUnscheduled } from '../scripts/lib/youtube-unschedule.mjs';

const NOW = Date.parse('2026-10-13T00:00:00Z');
const pub = (o) => ({ channel: 'youtube', status: 'scheduled', publishAt: '2026-10-20T11:00:00Z', platform: { id: 'v1' }, id: 'x/y/youtube.longform', ...o });

test('selectScheduled: YouTube・scheduled・未来・外部 ID ありだけを日時順に選ぶ', () => {
  const rows = [
    pub({ id: 'b', publishAt: '2026-11-01T11:00:00Z' }),
    pub({ id: 'a' }),
    pub({ id: 'past', publishAt: '2026-10-01T11:00:00Z' }),
    pub({ id: 'ig', channel: 'instagram' }),
    pub({ id: 'pub', status: 'published' }),
    pub({ id: 'noid', platform: null }),
  ];
  assert.deepEqual(selectScheduled(rows, NOW).map((p) => p.id), ['a', 'b']);
});

test('unscheduledStatus: publishAt と読み取り専用の欄を送らず、private で書き戻せる欄は今の値を保つ', () => {
  const s = unscheduledStatus({ privacyStatus: 'private', publishAt: '2026-10-20T11:00:00Z', uploadStatus: 'processed', madeForKids: false, selfDeclaredMadeForKids: false, embeddable: false, license: 'youtube', publicStatsViewable: true, containsSyntheticMedia: true });
  assert.equal(s.privacyStatus, 'private');
  assert.equal('publishAt' in s, false);
  assert.equal('uploadStatus' in s, false);
  assert.equal('madeForKids' in s, false);
  assert.equal(s.embeddable, false);
  assert.equal(s.containsSyntheticMedia, true);
});

test('decide: 予約あり→外す・予約なし→済み・公開済みやチャンネル違いは外さない', () => {
  const v = (status, ch = 'C') => ({ snippet: { channelId: ch }, status });
  assert.equal(decide(v({ privacyStatus: 'private', publishAt: 'x' }), 'C').action, 'unschedule');
  assert.equal(decide(v({ privacyStatus: 'private' }), 'C').action, 'already');
  assert.equal(decide(v({ privacyStatus: 'public' }), 'C').action, 'error');
  assert.equal(decide(v({ privacyStatus: 'private', publishAt: 'x' }, 'OTHER'), 'C').action, 'error');
  assert.equal(decide(undefined, 'C').action, 'error');
});

test('isUnscheduled: private で publishAt が無いときだけ真', () => {
  assert.equal(isUnscheduled({ status: { privacyStatus: 'private' } }), true);
  assert.equal(isUnscheduled({ status: { privacyStatus: 'private', publishAt: 'x' } }), false);
  assert.equal(isUnscheduled({ status: { privacyStatus: 'public' } }), false);
});

test('指定した公開だけを選ぶ', () => {
  const row = (id) => ({ id, channel: 'youtube', status: 'scheduled', publishAt: '2026-11-09T11:30:00Z', platform: { id: 'x' } });
  const now = Date.parse('2026-11-06T00:00:00Z');
  assert.deepEqual(selectScheduled([row('a'), row('b')], now, ['b']).map((p) => p.id), ['b']);
  assert.equal(selectScheduled([row('a'), row('b')], now).length, 2);
});
