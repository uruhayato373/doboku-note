/**
 * YouTube 公開ページの見え方検査（scripts/lib/youtube-public-view.mjs）の判定を固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { collectPublicVideos, watchUrl, evaluateYoutubePage, pickYoutubeRepresentatives } from '../scripts/lib/youtube-public-view.mjs';

const now = new Date('2026-09-23T12:00:00Z');

test('台帳から公開中の動画を集める: 予約は publishAt 経過分だけ、制作台帳は public だけ、videoId で重複除去', () => {
  const schedule = { items: [
    { status: 'uploaded', videoId: 'A', title: '総監 択一 #Shorts', publishAt: '2026-06-09T07:30:00+09:00' },
    { status: 'uploaded', videoId: 'B', title: 'まだ #Shorts', publishAt: '2026-10-01T07:30:00+09:00' },
    { status: 'retired', videoId: 'C', title: 'x', publishAt: '2026-06-01T00:00:00Z' },
  ] };
  const content = { packs: { p: { derivatives: {
    longform: { videoId: 'L', privacyStatus: 'public', publishedAt: '2026-09-05T00:40:57Z' },
    shorts: [{ key: 's1', videoId: 'S', privacyStatus: 'public', uploadedAt: '2026-09-05T00:42:30Z' }, { videoId: 'P', privacyStatus: 'private' }, { videoId: 'A', privacyStatus: 'public' }],
  } } } };
  const got = collectPublicVideos(schedule, content, now);
  assert.deepEqual(got.map((v) => `${v.videoId}:${v.kind}`).sort(), ['A:shorts', 'L:long', 'S:shorts']);
});

test('視聴ページの URL: Shorts は /shorts/、通常動画は /watch', () => {
  assert.equal(watchUrl({ videoId: 'x', kind: 'shorts' }), 'https://www.youtube.com/shorts/x');
  assert.equal(watchUrl({ videoId: 'y', kind: 'long' }), 'https://www.youtube.com/watch?v=y');
});

test('視聴ページ: 非公開・削除の表示は BAD、bot 確認は「検査できない」、正常は空', () => {
  assert.match(evaluateYoutubePage({ status: 200, text: 'この動画は非公開です' }).bad[0], /非公開/);
  assert.match(evaluateYoutubePage({ status: 200, text: 'Video unavailable' }).bad[0], /unavailable/);
  const b = evaluateYoutubePage({ status: 200, text: 'Sign in to confirm you’re not a bot' });
  assert.equal(b.blocked, true); assert.deepEqual(b.bad, []);
  assert.deepEqual(evaluateYoutubePage({ status: 200, text: '技術士総監 令和3年度 択一' }), { bad: [], warn: [], blocked: false });
});

test('代表動画: 種類ごとに公開がいちばん新しい 1 本', () => {
  const reps = pickYoutubeRepresentatives([
    { videoId: 'a', kind: 'shorts', date: '2026-06-09' },
    { videoId: 'b', kind: 'shorts', date: '2026-09-05' },
    { videoId: 'c', kind: 'long', date: '2026-09-05' },
  ]);
  assert.deepEqual(reps.map((r) => r.videoId), ['c', 'b']);
});
