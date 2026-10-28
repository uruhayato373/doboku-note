// tests/demand-map.test.mjs
//
// 悩みと商品候補の地図（config/demand-map.json・scripts/lib/demand-map.mjs）: 軸ごとの実売の数え方（販売前を 0 円にしない・
// 売上の接頭辞と旧系統の id）・打ち手の悩みの参照・型の不変条件。実データが整合していることも固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildDemandView, loadDemandView } from '../scripts/lib/demand-map.mjs';
import { ConfigDemandMap } from '../scripts/lib/dataset-schemas.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const ev = { kind: 'gsc', summary: 's', source: 'x', observedAt: '2026-10-28' };
const candidate = (over) => ({
  id: 'PC-001', title: 't', qualification: 'pe-construction', pain: 'pass-exam', positions: ['consultant'], axis: 'similar', harm: ['A'],
  readerProblem: 'p', value: 'v', payReason: 'r', format: 'note', demandEvidence: [ev], unverified: [], metric: 'm',
  judgeDate: '2027-01-31', stopCondition: 's', nextCheck: 'n', status: 'idea', ...over,
});
const map = (candidates) => ({
  schemaVersion: 1, _doc: 'd', updatedAt: '2026-10-28',
  pains: [{ id: 'pass-exam', label: 'l', harm: ['A'], depth: 'core', why: 'w', phrases: [], evidence: [] }],
  positions: [{ id: 'consultant', label: 'l', status: 'candidate', pains: ['pass-exam'], evidence: [] }],
  candidates,
  research: { intervalDays: 90, rotation: ['pe-construction'], runs: [] },
});

test('実売は productIds と salesIds で引き、接頭辞を外す。販売前の候補は数えない（0 円にしない）', () => {
  const v = buildDemandView({
    map: map([
      candidate({ id: 'PC-001', status: 'live', productIds: ['a'], salesIds: ['bk-a'] }),
      candidate({ id: 'PC-002', axis: 'differentiated' }),
    ]),
    experiments: [],
    sales: [{ productId: 'article:a', price: 1000 }, { productId: 'bk-a', price: 500 }, { productId: 'other', price: 9 }],
  });
  assert.deepEqual(v.candidates[0].sold, { count: 2, yen: 1500 });
  assert.equal(v.candidates[1].sold, null);
  assert.deepEqual(v.axisTotals.differentiated, { candidates: 1, selling: 0, count: 0, yen: 0 });
});

test('打ち手の painId が地図に無いと不整合に出す', () => {
  const v = buildDemandView({ map: map([]), experiments: [{ id: 'EXP-001', demand: { painId: 'nope' } }], sales: [] });
  assert.equal(v.errors.length, 1);
});

test('型: 候補の悩み・立場の参照切れと、販売中なのに商品 id が無い候補を止める', () => {
  assert.equal(ConfigDemandMap.safeParse(map([candidate()])).success, true);
  assert.equal(ConfigDemandMap.safeParse(map([candidate({ pain: 'nope' })])).success, false);
  assert.equal(ConfigDemandMap.safeParse(map([candidate({ positions: ['nope'] })])).success, false);
  assert.equal(ConfigDemandMap.safeParse(map([candidate({ status: 'live' })])).success, false);
});

test('実データ: 地図が型を満たし、打ち手の悩みが全部地図にある', () => {
  const v = loadDemandView(ROOT);
  assert.ok(v, 'config/demand-map.json が読める');
  assert.deepEqual(v.errors, []);
  assert.ok(v.candidates.length > 0 && v.actions.length > 0);
});

test('四半期の調査: 最後の回の次の資格を rotation から一周で選び、間隔の日数で期限を出す', async () => {
  const { researchDue } = await import('../scripts/lib/demand-map.mjs');
  const research = (runs) => ({ research: { intervalDays: 90, rotation: ['a', 'b'], runs } });
  assert.deepEqual(researchDue(research([]), '2026-10-28'), { last: null, next: 'a', dueDate: '2026-10-28', intervalDays: 90, due: true });
  const r = researchDue(research([{ date: '2026-10-28', qualification: 'b', scope: 's' }]), '2027-01-25');
  assert.equal(r.next, 'a');
  assert.equal(r.dueDate, '2027-01-26');
  assert.equal(r.due, false);
});

test('月次: 判定日が来た未完の候補・打ち手だけを拾い、悩みの言い方は語がすべて入った検索語に当てる', async () => {
  const { dueJudgements, painSearchMetrics } = await import('../scripts/lib/demand-map.mjs');
  const view = {
    candidates: [{ id: 'PC-001', title: 't', status: 'idea', judgeDate: '2026-10-31', stopCondition: 's' }, { id: 'PC-002', title: 't', status: 'stopped', judgeDate: '2026-10-01', stopCondition: 's' }],
    actions: [{ id: 'EXP-001', title: 't', status: 'proposed', judgeDate: '2026-11-30', stopCondition: null }],
  };
  assert.deepEqual(dueJudgements(view, '2026-10-31').map((d) => d.id), ['PC-001']);
  const rows = [{ keys: ['土木施工管理技士年収'], impressions: 8, clicks: 0, position: 6.3 }, { keys: ['技術士 年収'], impressions: 3, clicks: 1, position: 9 }];
  const [m] = painSearchMetrics([{ id: 'raise-pay', label: 'l', phrases: ['土木施工管理技士 年収'] }], rows);
  assert.deepEqual([m.queries, m.impressions, m.clicks], [1, 8, 0]);
});
