import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveParents, slotProblems, qualityProblems } from '../scripts/lib/shorts-release.mjs';

const NOW = Date.parse('2026-11-11T00:00:00Z');
const row = (o) => ({ channel: 'youtube', format: 'longform', status: 'scheduled', platform: { id: 'abcdefghijk' }, ...o });

test('liveParents: 同じ作品の予約済みか公開済みの通常動画だけ（改訂版を含む・外部 ID が要る）', () => {
  const pubs = [
    row({ id: 'e/w/youtube.longform', status: 'uploaded_private' }),
    row({ id: 'e/w/youtube.longform.fix', revisionOf: 'e/w/youtube.longform' }),
    row({ id: 'e/other/youtube.longform' }),
    row({ id: 'e/w/youtube.longform.old', revisionOf: 'e/w/youtube.longform', status: 'stopped' }),
    row({ id: 'e/w/youtube.longform.noid', revisionOf: 'e/w/youtube.longform', platform: {} }),
  ];
  assert.deepEqual(liveParents(pubs, 'e', 'w').map((p) => p.id), ['e/w/youtube.longform.fix']);
});

test('slotProblems: 親の公開より後・余裕 24 時間・同時刻なし・1 日 3 本まで', () => {
  const parent = row({ id: 'e/w/youtube.longform', publishAt: '2026-11-12T11:30:00Z' });
  const pub = { id: 'e/w/youtube.short.k' };
  const pubs = [parent,
    row({ id: 'a', publishAt: '2026-11-13T05:30:00Z' }), row({ id: 'b', publishAt: '2026-11-13T11:30:00Z' }), row({ id: 'c', publishAt: '2026-11-13T00:00:00Z' })];
  assert.deepEqual(slotProblems(pubs, pub, '2026-11-14T14:30:00+09:00', parent, { now: NOW }), []);
  assert.match(slotProblems(pubs, pub, '2026-11-11T14:30:00+09:00', parent, { now: NOW }).join(), /近すぎる/);
  assert.match(slotProblems(pubs, pub, '2026-11-12T14:30:00+09:00', parent, { now: NOW }).join(), /親の通常動画/);
  assert.match(slotProblems(pubs, pub, '2026-11-13T20:30:00+09:00', parent, { now: NOW }).join(), /別の動画/);
  assert.match(slotProblems(pubs, pub, '2026-11-13T22:30:00+09:00', parent, { now: NOW }).join(), /3 本まで/);
  assert.match(slotProblems(pubs, pub, '2026-11-14 14:30', parent, { now: NOW }).join(), /時差つき/);
});

test('qualityProblems: 描画・画面確認・在庫が今の動画のものでなければ止める', () => {
  const sha = 'a'.repeat(64);
  const policy = { audio: { minSimilarity: 0.85, minMaxVolumeDb: -12, maxMaxVolumeDb: -0.1, maxDurationGapSec: 2 } };
  const good = { render: { videoSha256: sha }, screenReview: { verdict: 'pass', videoSha256: sha }, audio: { videoSha256: sha, similarity: 0.95, maxVolumeDb: -5, durationGapSec: 0 }, stock: { cloudVerified: true } };
  assert.deepEqual(qualityProblems(good, sha, policy), []);
  assert.match(qualityProblems({ ...good, screenReview: { verdict: 'pass', videoSha256: 'b'.repeat(64) } }, sha, policy).join(), /画面確認/);
  assert.match(qualityProblems({ ...good, stock: undefined }, sha, policy).join(), /在庫/);
});
