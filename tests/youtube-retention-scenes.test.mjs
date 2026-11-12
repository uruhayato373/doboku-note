import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RETENTION_MIN_VIEWS, judgeVideo, sceneDropOff, summarizeRetention, watchRatioAt } from '../scripts/lib/youtube-retention-scenes.mjs';
import { storyboardLoader } from '../scripts/youtube-retention-summary.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

// 100 点の直線: 動画の頭 1.0 から終わり 0.0 へ（ratio 0.01〜1.0）
const line = Array.from({ length: 100 }, (_, i) => ({ ratio: (i + 1) / 100, audienceWatchRatio: 1 - (i + 1) / 100, relativeRetentionPerformance: 0.5 }));
const scenes = [{ sceneId: 'cover', start: 0, end: 10 }, { sceneId: 'premise', start: 10, end: 50 }, { sceneId: 'cta', start: 50, end: 100 }];
const measured = (over = {}) => ({ packId: 'p', videoId: 'v', kind: 'longform', state: 'measured', views: 80, retention: { state: 'measured', points: line }, ...over });

test('曲線は線形補間し、両端は端の点の値で延ばす', () => {
  assert.equal(watchRatioAt([], 0.5), null);
  assert.equal(watchRatioAt(line, 0), 0.99);
  assert.ok(Math.abs(watchRatioAt(line, 0.505) - 0.495) < 1e-9);
  assert.equal(watchRatioAt(line, 1.2), 0);
});

test('storyboard の場面の秒数に曲線を重ね、場面ごとの失う視聴者を出す', () => {
  const r = sceneDropOff(scenes, line);
  assert.deepEqual(r.map((s) => s.sceneId), ['cover', 'premise', 'cta']);
  assert.deepEqual(r.map((s) => s.dropPoints), [9, 40, 50]); // 最初の点（ratio 0.01）より前は端の値 0.99 で延ばす
  assert.equal(r[2].watchAtStart, 50);
  assert.equal(r[2].lostShare, 100);
  assert.throws(() => sceneDropOff([], line), /長さ/);
});

test('視聴回数が基準に届かない・Shorts・行なし・失敗・旧記録・storyboard なしは判断できないと理由を返し、曲線は出さない', () => {
  const sb = { scenes };
  assert.equal(judgeVideo(measured(), sb).state, 'ok');
  const cases = [
    [measured({ views: RETENTION_MIN_VIEWS - 1 }), /基準/], [measured({ kind: 'short' }), /Shorts/], [measured({ state: 'no-data' }), /基本指標/],
    [measured({ retention: undefined }), /取り始める前/], [measured({ retention: { state: 'no-data', points: [] } }), /行が無い/], [measured({ retention: { state: 'error', points: [], error: 'x' } }), /失敗/],
  ];
  for (const [video, reason] of cases) {
    const j = judgeVideo(video, sb);
    assert.equal(j.state, 'undetermined');
    assert.match(j.reason, reason);
    assert.equal(j.scenes, undefined);
  }
  assert.match(judgeVideo(measured(), null).reason, /storyboard/);
});

test('型ごとの要約は判断できる動画だけを場面の id で平均し、離脱の多い順に並べる', () => {
  const snapshot = { period: { startDate: '2026-10-01', endDate: '2026-10-28' }, fetchedAt: 'x', videos: [measured({ packId: 'a' }), measured({ packId: 'b', views: 3 }), measured({ packId: 'c', kind: 'short' })] };
  const out = summarizeRetention(snapshot, { formatOf: () => 'single-topic-text', storyboardOf: () => ({ scenes }) });
  assert.deepEqual(out.counts, { videos: 3, ok: 1, undetermined: 2 });
  assert.equal(out.byFormat.length, 1);
  assert.deepEqual(out.byFormat[0].scenes.map((s) => [s.sceneId, s.meanDropPoints, s.packs]), [['cta', 50, 1], ['premise', 40, 1], ['cover', 9, 1]]);
  const none = summarizeRetention({ ...snapshot, videos: [measured({ views: 1 })] }, { formatOf: () => null, storyboardOf: () => ({ scenes }) });
  assert.deepEqual(none.byFormat, []);
});

test('実リポジトリの storyboard を packId で引ける', () => {
  const load = storyboardLoader(REPO_ROOT);
  const sb = load('c1-keiken-anzen-kakikata');
  assert.ok(sb.scenes.length > 3);
  assert.equal(load('no-such-pack'), null);
});
