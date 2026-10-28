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
