import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPsiReport, fieldVerdict, judgeRegression, lcpPattern, median } from '../scripts/reports/report-psi-regression.mjs';
import { exitCodeOf } from '../scripts/lib/run-audit.mjs';

const TH = { performance_score_min: 70, LCP_ms_max: 2500, CLS_max: 0.1 };
const res = (perf, lcp, cat = 'FAST', over = {}) => ({
  url: 'https://x/a', strategy: 'mobile', scores: { performance: perf }, lab_data: { LCP_ms: lcp, CLS: 0 },
  field_data: cat ? { LCP: { category: cat }, INP: { category: 'FAST' }, CLS: { category: 'FAST' } } : null, lcp_element: null, ...over,
});
const batches = (list) => list.map((r, i) => ({ file: `b${i}.json`, results: [r] }));

test('median と lcpPattern と fieldVerdict', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(lcpPattern({ snippet: '<img loading="lazy" src=a>' }).kind, 'img-lazy');
  assert.equal(lcpPattern({ snippet: '<p>x</p>' }).kind, 'text');
  assert.equal(lcpPattern(null).kind, 'unknown');
  assert.equal(fieldVerdict(null).state, 'unknown');
  assert.deepEqual(fieldVerdict({ LCP: { category: 'SLOW' } }).bad, ['LCP']);
});

test('Critical は field が AVERAGE/SLOW のときだけ。lab が悪くても field FAST なら Medium（exit 0）', () => {
  const fast = buildPsiReport({ batches: batches(Array(7).fill(0).map(() => res(40, 6000, 'FAST'))), thresholds: TH });
  assert.equal(fast.counts.Critical, 0);
  assert.equal(fast.items[0].severity, 'Medium');
  assert.equal(exitCodeOf({ checked: fast.judged, fail: fast.counts.Critical ? ['x'] : [] }), 0);
  const bad = buildPsiReport({ batches: batches(Array(7).fill(0).map(() => res(95, 1000, 'SLOW'))), thresholds: TH });
  assert.equal(bad.items[0].severity, 'Critical');
  assert.equal(exitCodeOf({ checked: bad.judged, fail: ['x'] }), 1);
  const unknown = buildPsiReport({ batches: batches(Array(7).fill(0).map(() => res(40, 6000, null))), thresholds: TH });
  assert.equal(unknown.items[0].severity, 'High');
});

test('回帰は直近 5 件の中央値で判定し、母数不足は判定不能（劣化なしと書かない）', () => {
  const rows = [...Array(5).fill(0).map(() => res(95, 1000)), ...Array(5).fill(0).map(() => res(70, 2000))];
  const g = judgeRegression(rows);
  assert.ok(g.judgeable);
  assert.deepEqual(g.regressions.map((x) => x.metric), ['Performance', 'LCP']);
  assert.equal(judgeRegression([res(95, 1000), res(40, 9000)]).judgeable, false);
  const one = buildPsiReport({ batches: batches([res(95, 1000), res(40, 9000), res(40, 9000)]), thresholds: TH });
  assert.equal(one.unjudgeable, 1);
});

test('単発の外れ値だけなら回帰にしない', () => {
  const rows = [...Array(6).fill(0).map(() => res(95, 1000)), res(30, 9000), ...Array(3).fill(0).map(() => res(95, 1000))];
  assert.deepEqual(judgeRegression(rows).regressions, []);
});

test('欠測（期待 URL 数に満たないバッチ・error の行）を数え、計測 0 件は検査不成立 exit 2', () => {
  const r = buildPsiReport({ batches: [{ file: 'b0.json', results: [res(95, 1000), { url: 'https://x/b', strategy: 'mobile', error: '500' }] }], thresholds: TH, expectedUrls: 3 });
  assert.equal(r.missing[0].measured, 1);
  const none = buildPsiReport({ batches: [{ file: 'b0.json', results: [{ url: 'u', strategy: 'mobile', error: 'x' }] }], thresholds: TH });
  assert.equal(none.judged, 0);
  assert.equal(exitCodeOf({ checked: none.judged, fail: [] }), 2);
});
