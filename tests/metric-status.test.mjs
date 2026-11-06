import test from 'node:test';
import assert from 'node:assert/strict';
import { auditPlanMetrics, judgeMetric, loadMetricStatuses } from '../scripts/lib/metric-status.mjs';
import { ConfigChannelAnnualPlan } from '../scripts/lib/dataset-schemas-content.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT as root } from '../scripts/lib/repository-paths.mjs';

const metric = (over = {}) => ({ id: 'm', label: '指標', definition: '定義', dataSource: { report: 'ga4.campaign', field: 'x' }, ...over });
const today = '2026-11-06';

test('実データから状態を決める。行が無いことと 0 と未計測を分ける', () => {
  assert.equal(judgeMetric(metric({ dataSource: undefined }), null, today).state, 'unmeasured');
  assert.equal(judgeMetric(metric(), null, today).state, 'missing');
  assert.equal(judgeMetric(metric(), { day: '2026-10-31', rows: 2, value: 5 }, today).state, 'measured');
  assert.equal(judgeMetric(metric(), { day: '2026-10-31', rows: 0, value: 0 }, today).state, 'no-rows');
  assert.equal(judgeMetric(metric(), { day: '2026-10-01', rows: 2, value: 5 }, today).state, 'stale');
});

test('計測できていない成功指標は検査に出る', () => {
  const statuses = new Map([
    ['a', { label: 'A', state: 'measured' }], ['b', { label: 'B', state: 'stale', day: '2026-10-01' }],
    ['c', { label: 'C', state: 'unmeasured' }], ['d', { label: 'D', state: 'missing' }], ['e', { label: 'E', state: 'no-rows', day: today }],
  ]);
  const { errors, warnings, pending } = auditPlanMetrics(['a', 'b', 'c', 'd', 'e', 'z'], statuses, 'X');
  assert.equal(errors.length, 2);
  assert.equal(warnings.length, 1);
  assert.equal(pending.length, 2);
});

test('年間計画は手書きの状態を受け付けない', () => {
  const p = readDataset(root, 'config.channel-annual-plan');
  assert.equal(ConfigChannelAnnualPlan.safeParse(p).success, true);
  const hand = [{ id: 'xUsers', label: 'X', definition: 'd', source: 's', status: 'unmeasured' }, 'xCampaignClicks'];
  const bad = { ...p, channels: { ...p.channels, x: { ...p.channels.x, metrics: { ...p.channels.x.metrics, primary: hand } } } };
  assert.equal(ConfigChannelAnnualPlan.safeParse(bad).success, false);
});

test('年間計画の成功指標は定義があり、取得元が無いのは決めて残したものだけ', () => {
  const p = readDataset(root, 'config.channel-annual-plan');
  const { metrics } = readDataset(root, 'config.business-direction');
  const ids = [...p.metrics.primary, ...p.channels.x.metrics.primary, ...p.channels.instagram.metrics.primary];
  const byId = new Map(metrics.map((m) => [m.id, m]));
  for (const id of ids) assert.ok(byId.has(id), id);
  assert.deepEqual(ids.filter((id) => !byId.get(id).dataSource), ['igSaves']);
});

test('実データで読める: SNS のサイト流入は未計測にならない', () => {
  const statuses = loadMetricStatuses(root, '2026-11-06');
  for (const id of ['youtubeUsers', 'xUsers', 'instagramUsers', 'youtubeCampaignClicks', 'xCampaignClicks', 'averageViewPercentage']) {
    assert.notEqual(statuses.get(id).state, 'unmeasured', id);
    assert.notEqual(statuses.get(id).state, 'missing', id);
  }
});
