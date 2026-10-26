import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicMetrics, trafficSources, analyticsSnapshot, queryVideoAnalytics } from '../scripts/lib/youtube-analytics-report.mjs';
import { analyticsTargets, reportPeriod } from '../scripts/youtube-analytics.mjs';
import { YoutubeAnalytics } from '../scripts/lib/dataset-schemas.mjs';
import { resolveDataset } from '../scripts/lib/datasets.mjs';
import { checkAnalyticsSnapshot } from '../scripts/check-youtube-analytics.mjs';

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

test('公式に許された基本指標と流入元を別のレポートで照会する', async () => {
  const calls = [];
  const api = { reports: { query: async (p) => { calls.push(p); return calls.length === 1 ? basic : traffic; } } };
  const period = { startDate: '2026-10-01', endDate: '2026-10-25' };
  const row = await queryVideoAnalytics(api, 'UCtest', 'abc', period);
  assert.equal(row.state, 'measured');
  assert.deepEqual(calls.map((x) => x.metrics), ['views,averageViewDuration,averageViewPercentage', 'views']);
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
