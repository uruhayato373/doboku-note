import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAdsenseFreshness } from '../scripts/checks/check-adsense-revenue-freshness.mjs';

const report = (stamp, impressions) => ({ stamp, data: { meta: { startDate: '2026-11-23', endDate: '2026-11-29' }, rows: [{ page: '/', publisherAdImpressions: impressions }] } });

test('取得開始前はレポートが無くても通し、それ以降は失敗にする', () => {
  assert.equal(assessAdsenseFreshness(null, '2026-11-25', 10).ok, true);
  assert.equal(assessAdsenseFreshness(null, '2026-12-01', 10).ok, false);
});

test('上限を超えて古い取得は失敗', () => {
  assert.equal(assessAdsenseFreshness(report('2026-12-04T21:00:00Z', 5), '2026-12-10', 10).ok, true);
  assert.equal(assessAdsenseFreshness(report('2026-12-04T21:00:00Z', 5), '2026-12-20', 10).ok, false);
});

test('広告の表示が 0 回ならリンク切れの疑いで失敗（0 円を正常と読まない）', () => {
  const r = assessAdsenseFreshness(report('2026-12-04T21:00:00Z', 0), '2026-12-05', 10);
  assert.equal(r.ok, false);
  assert.match(r.reason, /リンク/);
});
