import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinListings, lengthBuckets, median, summarize, titleSignals } from '../scripts/lib/youtube-listing.mjs';
import { buildOwnSnapshot, formatOf, packIndex } from '../scripts/youtube-own-metrics.mjs';
import { buildRow, computeDrift } from '../scripts/scout-youtube-competitors.mjs';
import { YoutubeCompetitors, YoutubeOwnVideos } from '../scripts/lib/dataset-schemas.mjs';

test('median: 偶数は平均を丸め、数でない値は除き、空は null', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 3);
  assert.equal(median([null, 5, undefined]), 5);
  assert.equal(median([]), null);
});

test('joinListings: 題名は日本語の一覧、再生数は英語の一覧（日本語の「万」は null になる）', () => {
  const ja = [{ id: 'a', title: '聞き流し 総まとめ', view_count: null, duration: 1800.4 }, { id: 'b', title: '経験記述', view_count: 900, duration: 300 }];
  const en = [{ id: 'a', title: 'Listen', view_count: 12000, duration: 1800 }];
  assert.deepEqual(joinListings(ja, en), [
    { id: 'a', title: '聞き流し 総まとめ', views: 12000, durationSec: 1800 },
    { id: 'b', title: '経験記述', views: 900, durationSec: 300 },
  ]);
});

const videos = [
  { id: '1', title: '聞き流し 総まとめ', views: 30000, durationSec: 2400 },
  { id: '2', title: '経験記述の型', views: 10000, durationSec: 600 },
  { id: '3', title: '経験記述 NG例', views: 6000, durationSec: 700 },
  { id: '4', title: '短い', views: null, durationSec: 120 },
];

test('lengthBuckets・titleSignals・summarize: 再生数の無い動画は中央値に入れない', () => {
  const b = Object.fromEntries(lengthBuckets(videos).map((x) => [x.key, x]));
  assert.deepEqual(b['30to60'], { key: '30to60', videos: 1, medianViews: 30000 });
  assert.deepEqual(b['5to15'], { key: '5to15', videos: 2, medianViews: 8000 });
  assert.deepEqual(b.under5, { key: 'under5', videos: 0, medianViews: null });
  assert.deepEqual(titleSignals(videos, ['経験記述', '一問一答']), [
    { word: '経験記述', videos: 2, medianViews: 8000 },
    { word: '一問一答', videos: 0, medianViews: null },
  ]);
  assert.deepEqual(summarize(videos), { sampled: 4, withViews: 3, totalViews: 46000, medianViews: 10000, medianDurationSec: 650 });
});

test('自社: 動画パックと型を videoId で当て、型の記録が台帳の型に合う', () => {
  const status = { packs: { p1: { derivatives: { longform: { videoId: '2' }, shorts: [{ videoId: 's1' }] } }, z1: { derivatives: { longform: { videoId: '3' } } } } };
  const index = packIndex(status);
  const formats = [{ id: 'single-topic-zukai', packIds: ['z1'] }];
  assert.equal(formatOf({ kind: 'longform' }, index.get('2'), formats), 'single-topic-text');
  assert.equal(formatOf({ kind: 'longform' }, index.get('3'), formats), 'single-topic-zukai');
  assert.equal(formatOf({ kind: 'short' }, index.get('s1'), formats), 'pack-shorts');
  assert.equal(formatOf({ kind: 'longform' }, undefined, formats), null);
  const snap = buildOwnSnapshot({
    fetchedAt: '2026-10-08T00:00:00.000Z',
    channel: { id: 'UCHRnXPqoc0Hls8nXiK_ZYqA', handle: '@doboku-note' },
    subscriberCount: 7,
    longform: videos,
    shorts: [{ id: 's1', title: 'short', views: 236, durationSec: null }],
    index,
    formats,
    signals: ['経験記述'],
  });
  assert.equal(snap.videos.find((v) => v.id === '3').format, 'single-topic-zukai');
  assert.equal(snap.summary.shorts.sampled, 1);
  const r = YoutubeOwnVideos.safeParse(snap);
  assert.ok(r.success, JSON.stringify(r.error?.issues?.slice(0, 3)));
});

test('競合: 行の組み立てと前回比（登録者・新しい動画・追加・除外）が台帳の型に合う', () => {
  const entry = { handle: 'UCxxxxxxxxxxxxxxxxxxxxxx', label: 'A', exams: ['civil-construction-1'], note: null };
  const prevRow = buildRow(entry, { title: 'A', subscriberCount: 100, videos: videos.slice(1) }, ['経験記述']);
  const nowRow = buildRow(entry, { title: 'A', subscriberCount: 120, videos }, ['経験記述']);
  assert.deepEqual(nowRow.platformExtra.top.map((v) => v.id), ['1', '2', '3']);
  const added = { handle: 'UCyyyyyyyyyyyyyyyyyyyyyy', label: 'B', exams: [], note: null, profile: null, error: 'x' };
  const previous = { competitors: [prevRow, { handle: 'UCzzzzzzzzzzzzzzzzzzzzzz', label: 'C' }] };
  const drift = computeDrift([nowRow, added], previous);
  assert.deepEqual(drift.map((d) => d.type).sort(), ['dropped', 'new-entrant', 'new-videos', 'subscribers']);
  assert.equal(drift.find((d) => d.type === 'new-videos').after, 1);
  assert.deepEqual(computeDrift([nowRow], null), []);
  const snapshot = { schemaVersion: 1, fetchedAt: '2026-10-08T00:00:00.000Z', platform: 'youtube', source: 's', caveat: 'c', driftBasis: '2026-07-01.json', drift, competitors: [nowRow, added] };
  const r = YoutubeCompetitors.safeParse(snapshot);
  assert.ok(r.success, JSON.stringify(r.error?.issues?.slice(0, 3)));
});
