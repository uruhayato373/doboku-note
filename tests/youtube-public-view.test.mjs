/**
 * YouTube 公開ページの見え方検査（scripts/lib/youtube-public-view.mjs）の判定を固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { collectPublicVideos, watchUrl, classifyOembed, pickYoutubeRepresentatives } from '../scripts/lib/youtube-public-view.mjs';

const now = new Date('2026-09-23T12:00:00Z');

test('台帳から公開中の動画だけを集め、停止済み動画のpublic履歴と未来の予定を除外する', () => {
  const schedule = [
    { status: 'published', privacy: 'public', videoId: 'A', title: '総監 択一', publishAt: '2026-06-09T07:30:00+09:00' },
    { status: 'published', privacy: 'public', videoId: 'B', title: 'まだ', publishAt: '2026-10-01T07:30:00+09:00' },
    { status: 'stopped', privacy: null, videoId: 'C', title: 'x', publishAt: '2026-06-01T00:00:00Z' },
    { status: 'published', privacy: 'private', videoId: 'D', title: 'y', publishAt: null },
    { status: 'published', privacy: 'public', videoId: null, title: 'z', publishAt: null },
  ];
  const content = { packs: { p: { derivatives: {
    longform: { status: 'published', videoId: 'L', privacyStatus: 'public', publishedAt: '2026-09-05T00:40:57Z' },
    shorts: [
      { status: 'published', key: 's1', videoId: 'S', privacyStatus: 'public', uploadedAt: '2026-09-05T00:42:30Z' },
      { status: 'published', videoId: 'P', privacyStatus: 'private' },
      { status: 'published', videoId: 'A', privacyStatus: 'public' },
      { status: 'stopped', videoId: 'REMOVED', privacyStatus: 'public' },
      { status: 'draft', videoId: 'DRAFT', privacyStatus: 'public' },
      { videoId: 'UNKNOWN', privacyStatus: 'public' },
      { status: 'published', videoId: 'FUTURE', privacyStatus: 'public', publishAt: '2026-10-01T00:00:00Z' },
    ],
  } } } };
  const got = collectPublicVideos(schedule, content, now);
  assert.deepEqual(got.map((v) => `${v.videoId}:${v.kind}`).sort(), ['A:shorts', 'L:long', 'S:shorts']);
});

test('視聴ページの URL: Shorts は /shorts/、通常動画は /watch', () => {
  assert.equal(watchUrl({ videoId: 'x', kind: 'shorts' }), 'https://www.youtube.com/shorts/x');
  assert.equal(watchUrl({ videoId: 'y', kind: 'long' }), 'https://www.youtube.com/watch?v=y');
});

test('oEmbed: 200 は公開、404 は削除・再生不可、403 は非公開で BAD、401 は WARN、それ以外は判定できない', () => {
  assert.deepEqual(classifyOembed(200), { bad: [], warn: [], unknown: false });
  assert.match(classifyOembed(404).bad[0], /削除/);
  assert.match(classifyOembed(403).bad[0], /非公開/);
  assert.match(classifyOembed(401).warn[0], /埋め込み/);
  assert.equal(classifyOembed(0).unknown, true);
  assert.equal(classifyOembed(429).unknown, true);
});

test('代表動画: 種類ごとに公開がいちばん新しい 1 本', () => {
  const reps = pickYoutubeRepresentatives([
    { videoId: 'a', kind: 'shorts', date: '2026-06-09' },
    { videoId: 'b', kind: 'shorts', date: '2026-09-05' },
    { videoId: 'c', kind: 'long', date: '2026-09-05' },
  ]);
  assert.deepEqual(reps.map((r) => r.videoId), ['c', 'b']);
});
