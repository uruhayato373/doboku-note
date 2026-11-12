import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { basicMetrics, trafficSources, analyticsSnapshot, queryVideoAnalytics, retentionCurve } from '../scripts/lib/youtube-analytics-report.mjs';
import { analyticsTargets, reportPeriod } from '../scripts/youtube-analytics.mjs';
import { YoutubeAnalytics } from '../scripts/lib/dataset-schemas.mjs';
import { resolveDataset } from '../scripts/lib/datasets.mjs';
import { checkAnalyticsSnapshot } from '../scripts/check-youtube-analytics.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const target = { publicationId: 'pe-first-stage/pe1-zentaizou/youtube.longform', videoId: 'abc', packId: 'pe1-zentaizou', kind: 'longform' };
const basic = { data: { columnHeaders: [{ name: 'views' }, { name: 'averageViewDuration' }, { name: 'averageViewPercentage' }], rows: [[0, 0, 0]] } };
const traffic = { data: { columnHeaders: [{ name: 'insightTrafficSourceType' }, { name: 'views' }], rows: [['YT_SEARCH', 0]] } };

test('計測契約は台帳のIDから単一のzod型へ解決する', () => {
  const dataset = resolveDataset('youtube.analytics');
  assert.equal(dataset.schema, 'YoutubeAnalytics');
  assert.equal(dataset.path, 'data/youtube/analytics/{date}.json');
});

test('0回のAPI行とAPI行なしを区別し、列欠落と負数を止める', () => {
  assert.deepEqual(basicMetrics(basic), { state: 'measured', views: 0, averageViewDurationSec: 0, averageViewPercentage: 0 });
  assert.deepEqual(basicMetrics({ data: { rows: [] } }), { state: 'no-data', views: null, averageViewDurationSec: null, averageViewPercentage: null });
  assert.deepEqual(trafficSources(traffic), [{ type: 'YT_SEARCH', views: 0 }]);
  assert.throws(() => basicMetrics({ data: { columnHeaders: [{ name: 'views' }], rows: [[1]] } }), /averageViewDuration/);
  assert.throws(() => trafficSources({ data: { columnHeaders: [{ name: 'insightTrafficSourceType' }, { name: 'views' }], rows: [['YT_SEARCH', -1]] } }), /非負/);
});

const curve = { data: { columnHeaders: [{ name: 'elapsedVideoTimeRatio' }, { name: 'audienceWatchRatio' }, { name: 'relativeRetentionPerformance' }], rows: [[0.02, 0.9, 0.5], [0.01, 1, 0.6], [1, 0.3, 0.4]] } };

test('公式に許された基本指標と流入元と維持率曲線を別のレポートで照会する', async () => {
  const calls = [];
  const api = { reports: { query: async (p) => { calls.push(p); return [basic, traffic, curve][calls.length - 1]; } } };
  const period = { startDate: '2026-10-01', endDate: '2026-10-25' };
  const row = await queryVideoAnalytics(api, 'UCtest', 'abc', period);
  assert.equal(row.state, 'measured');
  assert.deepEqual(calls.map((x) => x.metrics), ['views,averageViewDuration,averageViewPercentage', 'views', 'audienceWatchRatio,relativeRetentionPerformance']);
  assert.equal(calls[2].dimensions, 'elapsedVideoTimeRatio');
  assert.equal(calls[2].filters, 'video==abc');
  assert.equal(row.retention.state, 'measured');
  assert.deepEqual(row.retention.points.map((p) => p.ratio), [0.01, 0.02, 1]);
  assert.equal(calls[1].dimensions, 'insightTrafficSourceType');
  assert.equal(calls[0].ids, 'channel==UCtest');
  assert.equal(calls[0].filters, 'video==abc');
});

test('公開中の動画パックだけを選び、欠測数・行数・重複を型で検査する', () => {
  const targets = analyticsTargets([
    { ...target, id: target.publicationId, work: target.packId, format: 'longform', status: 'published', legacy: false },
    { id: 'old', videoId: 'old', work: 'old', format: 'short', status: 'stopped', legacy: false },
    { id: 'legacy', videoId: 'legacy', work: 'legacy', format: 'short', status: 'published', legacy: true },
  ]);
  assert.deepEqual(targets, [target]);
  const snapshot = analyticsSnapshot({ channelId: 'UCtest', period: { startDate: '2026-10-01', endDate: '2026-10-25' }, fetchedAt: '2026-10-26T00:00:00.000Z', videos: [{ ...target, ...basicMetrics(basic), trafficSources: trafficSources(traffic) }] });
  assert.equal(YoutubeAnalytics.safeParse(snapshot).success, true);
  assert.equal(YoutubeAnalytics.safeParse({ ...snapshot, coverage: { ...snapshot.coverage, targets: 0 } }).success, false);
  assert.equal(YoutubeAnalytics.safeParse({ ...snapshot, videos: [snapshot.videos[0], snapshot.videos[0]], coverage: { targets: 2, measured: 2, noData: 0 } }).success, false);
  assert.equal(YoutubeAnalytics.safeParse({ ...snapshot, videos: [{ ...snapshot.videos[0], state: 'no-data' }] }).success, false);
});

test('28日窓はJSTで2日前までを読む', () => {
  assert.deepEqual(reportPeriod(Date.parse('2026-10-26T03:00:00Z')), { startDate: '2026-09-27', endDate: '2026-10-24' });
});

test('品質ゲートは未取得・未記録の現役動画・古い記録・チャンネル違いを検出する', () => {
  const now = Date.parse('2026-10-26T00:00:00Z');
  const good = analyticsSnapshot({ channelId: 'UCtest', period: { startDate: '2026-09-27', endDate: '2026-10-24' }, fetchedAt: '2026-10-26T00:00:00Z', videos: [{ ...target, ...basicMetrics(basic), trafficSources: [] }] });
  assert.equal(checkAnalyticsSnapshot(good, [target], { channelId: 'UCtest', now }).errors.length, 0);
  assert.match(checkAnalyticsSnapshot(null, [target], { channelId: 'UCtest', now }).errors[0], /未取得/);
  assert.ok(checkAnalyticsSnapshot(good, [target, { ...target, videoId: 'other' }], { channelId: 'UCtest', now }).errors.some((x) => x.includes('未計測')));
  assert.ok(checkAnalyticsSnapshot(good, [{ ...target, packId: 'different' }], { channelId: 'UCtest', now }).errors.some((x) => x.includes('packId')));
  assert.ok(checkAnalyticsSnapshot(good, [target], { channelId: 'wrong', now }).errors.some((x) => x.includes('チャンネル')));
  assert.ok(checkAnalyticsSnapshot({ ...good, period: { startDate: '2026-10-01', endDate: '2026-10-24' } }, [target], { channelId: 'UCtest', now }).errors.some((x) => x.includes('対象期間')));
  assert.ok(checkAnalyticsSnapshot({ ...good, fetchedAt: '2026-10-01T00:00:00Z' }, [target], { channelId: 'UCtest', now }).errors.some((x) => x.includes('古い')));
});

test('管理画面の読取経路をtsxで読み込み、公開計測の型を返せる', () => {
  const script = 'import { videoOutcomes } from "./tools/admin-app/src/lib/video-outcomes.ts"; const a = videoOutcomes().youtubeAnalytics; console.log(JSON.stringify({ok:a.ok,targets:a.targets,measured:a.measured}));';
  const result = spawnSync('./node_modules/.bin/tsx', ['-e', script], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(typeof value.ok, 'boolean');
  assert.equal(typeof value.targets, 'number');
  assert.equal(typeof value.measured, 'number');
});

test('維持率曲線: API の空行は欠測、API の失敗は error として残し、基本指標の行が無い動画は照会しない', async () => {
  const period = { startDate: '2026-10-01', endDate: '2026-10-25' };
  assert.deepEqual(retentionCurve({ data: { rows: [] } }), { state: 'no-data', points: [] });
  assert.throws(() => retentionCurve({ data: { columnHeaders: [{ name: 'elapsedVideoTimeRatio' }, { name: 'audienceWatchRatio' }], rows: [[0.1, 1]] } }), /relativeRetentionPerformance/);
  assert.throws(() => retentionCurve({ data: { columnHeaders: curve.data.columnHeaders, rows: [[1.5, 1, 1]] } }), /1 を超える/);
  assert.throws(() => retentionCurve({ data: { columnHeaders: curve.data.columnHeaders, rows: [[0.5, 1, 1], [0.5, 1, 1]] } }), /重複/);
  let n = 0;
  const failing = { reports: { query: async () => { n++; if (n === 3) throw new Error('forbidden: insufficient data'); return [basic, traffic][n - 1]; } } };
  const row = await queryVideoAnalytics(failing, 'UCtest', 'abc', period);
  assert.equal(row.state, 'measured');
  assert.equal(row.retention.state, 'error');
  assert.match(row.retention.error, /forbidden/);
  let m = 0;
  const empty = { reports: { query: async () => { m++; return { data: { rows: [] } }; } } };
  const none = await queryVideoAnalytics(empty, 'UCtest', 'abc', period);
  assert.equal(m, 2);
  assert.deepEqual(none.retention, { state: 'no-data', points: [] });
});

test('維持率曲線の記録: 取得数の集計が動画行と合い、古い記録（維持率なし）も通り、対象数・API失敗を品質ゲートが止める', async () => {
  const period = { startDate: '2026-09-27', endDate: '2026-10-24' };
  const ok = { ...target, ...basicMetrics(basic), trafficSources: [], retention: retentionCurve(curve) };
  const snap = analyticsSnapshot({ channelId: 'UCtest', period, fetchedAt: '2026-10-26T00:00:00.000Z', videos: [ok] });
  assert.deepEqual(snap.coverage.retention, { targets: 1, measured: 1, noData: 0, failed: 0 });
  assert.equal(YoutubeAnalytics.safeParse(snap).success, true);
  assert.equal(YoutubeAnalytics.safeParse({ ...snap, coverage: { ...snap.coverage, retention: { targets: 1, measured: 0, noData: 1, failed: 0 } } }).success, false);
  assert.equal(YoutubeAnalytics.safeParse({ ...snap, videos: [{ ...ok, retention: { state: 'measured', points: [] } }] }).success, false);
  assert.equal(YoutubeAnalytics.safeParse({ ...snap, videos: [{ ...ok, retention: { state: 'error', points: [] } }] }).success, false);
  const old = analyticsSnapshot({ channelId: 'UCtest', period, fetchedAt: '2026-10-26T00:00:00.000Z', videos: [{ ...ok, retention: undefined }] });
  assert.equal(old.coverage.retention, undefined);
  assert.equal(YoutubeAnalytics.safeParse(old).success, true);
  const now = Date.parse('2026-10-26T00:00:00Z');
  const good = checkAnalyticsSnapshot(snap, [target], { channelId: 'UCtest', now });
  assert.deepEqual([good.errors.length, good.retention.measured, good.retention.targets], [0, 1, 1]);
  assert.equal(checkAnalyticsSnapshot(old, [target], { channelId: 'UCtest', now }).retention, null);
  const failed = analyticsSnapshot({ channelId: 'UCtest', period, fetchedAt: '2026-10-26T00:00:00.000Z', videos: [{ ...ok, retention: { state: 'error', points: [], error: 'x' } }] });
  assert.ok(checkAnalyticsSnapshot(failed, [target], { channelId: 'UCtest', now }).errors.some((x) => x.includes('失敗')));
  assert.ok(checkAnalyticsSnapshot(snap, [target, { ...target, videoId: 'other' }], { channelId: 'UCtest', now }).errors.some((x) => x.includes('維持率曲線の対象数')));
});
