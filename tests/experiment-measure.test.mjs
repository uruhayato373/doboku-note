import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specErrors, specHash, measureWindows, verdictHint, deltaPct, sumSales, sumGscPages, alreadyMeasured, inScope } from '../scripts/lib/experiment-measure.mjs';
import { judgeExperiment } from '../scripts/lib/experiment-due.mjs';

const spec = (over = {}) => ({ specVersion: 1, metric: 'gsc.clicks', scope: { pagePrefix: '/exam/rccm/' }, preDays: 28, postDays: 28, lagDays: 3, direction: 'increase', minEffect: 0.1, minVolume: 20, ...over });

test('specErrors rejects incomplete specs', () => {
  assert.deepEqual(specErrors(spec()), []);
  assert.ok(specErrors({}).length);
  assert.ok(specErrors(spec({ metric: 'ga4.whatever' })).length);
  assert.ok(specErrors(spec({ metric: 'sales.revenue', scope: {} })).length);
  assert.deepEqual(specErrors(spec({ metric: 'sales.revenue', scope: { productIds: ['a'] } })), []);
  assert.ok(specErrors(spec({ scope: {} })).length);
  assert.ok(specErrors(spec({ target: -1 })).length);
});

test('windows: pre ends the day before the anchor, post starts after the lag and is cut at the GSC final line', () => {
  const w = measureWindows(spec(), '2026-09-01T00:00:00Z', '2026-09-20');
  assert.deepEqual(w.pre, { startDate: '2026-08-04', endDate: '2026-08-31' });
  assert.deepEqual(w.post, { startDate: '2026-09-04', endDate: '2026-09-16' });
  assert.equal(w.complete, false);
  assert.equal(measureWindows(spec(), '2026-09-01', '2026-10-05').complete, true);
  assert.equal(measureWindows(spec(), '2026-09-18', '2026-09-20'), null, '事後窓が GSC 確定前なら測らない');
  assert.equal(measureWindows(spec({ anchor: '2026-08-01' }), '2026-09-18', '2026-09-20').anchor, '2026-08-01');
});

test('verdictHint compares daily rates, honours direction, volume and absolute targets', () => {
  const w = measureWindows(spec(), '2026-09-01', '2026-10-05');
  assert.equal(verdictHint(spec(), { value: 28, volume: 28 }, { value: 56, volume: 56 }, w), 'improved');
  assert.equal(verdictHint(spec(), { value: 56, volume: 56 }, { value: 28, volume: 28 }, w), 'worse');
  assert.equal(verdictHint(spec(), { value: 50, volume: 50 }, { value: 52, volume: 52 }, w), 'no-effect');
  assert.equal(verdictHint(spec(), { value: 5, volume: 5 }, { value: 50, volume: 50 }, w), 'insufficient-data');
  assert.equal(verdictHint(spec({ metric: 'gsc.position', direction: 'decrease' }), { value: 12, volume: 500 }, { value: 8, volume: 500 }, w), 'improved');
  assert.equal(verdictHint(spec({ target: 30000 }), { value: 0, volume: 0 }, { value: 31000, volume: 9 }, w), 'target-met');
  assert.equal(verdictHint(spec({ target: 30000 }), { value: 0, volume: 0 }, { value: 9000, volume: 3 }, w), 'target-missed');
  assert.equal(verdictHint(spec(), { value: 1, volume: 99 }, { value: 1, volume: 99 }, { ...w, complete: false }), 'in-progress');
  assert.equal(deltaPct(spec(), { value: 28 }, { value: 56 }, w), 100);
});

test('sales and GSC aggregation follow the scope', () => {
  const sales = [
    { date: '2026-09-20', productId: 'rccm-mondai3-magazine', price: 5980 },
    { date: '2026-09-21', productId: 'article:rccm-x', price: 500 },
    { date: '2026-09-21', productId: 'civil-1-chokuzen-pack', price: 2980 },
    { date: '2026-08-01', productId: 'rccm-old', price: 100 },
  ];
  const window = { startDate: '2026-09-16', endDate: '2026-10-31' };
  assert.deepEqual(sumSales(sales, spec({ metric: 'sales.revenue', scope: { productPrefix: 'rccm-' } }), window), { value: 6480, volume: 2 });
  assert.deepEqual(sumSales(sales, spec({ metric: 'sales.count', scope: { productIds: ['civil-1-chokuzen-pack'] } }), window), { value: 1, volume: 1 });
  const rows = [{ page: '/exam/rccm/a', clicks: 3, impressions: 100, position: 10 }, { page: '/exam/rccm/b', clicks: 1, impressions: 300, position: 6 }, { page: '/x', clicks: 9, impressions: 9, position: 1 }];
  assert.deepEqual(sumGscPages(rows, spec()), { value: 4, volume: 4 });
  assert.deepEqual(sumGscPages(rows, spec({ metric: 'gsc.position' })), { value: 7, volume: 400 });
  assert.equal(inScope('/exam/rccm/a', { pages: ['/x'] }), false);
});

test('measurements are idempotent per spec and post window, and a final one makes the verdict due', () => {
  const s = spec();
  const e = { id: 'EXP-9', status: 'running', baseline: { a: 1 }, started_at: '2026-09-01', measure: s, measurements: [] };
  assert.equal(alreadyMeasured(e, specHash(s), { endDate: '2026-09-28' }), false);
  e.measurements.push({ source: 'auto', specHash: specHash(s), post: { endDate: '2026-09-28' }, complete: false, metric: 'gsc.clicks', verdictHint: 'in-progress' });
  assert.equal(alreadyMeasured(e, specHash(s), { endDate: '2026-09-28' }), true);
  const now = Date.parse('2026-09-20T00:00:00+09:00');
  assert.ok(!judgeExperiment(e, now).reasons.some((r) => r.kind === 'VERDICT_DUE'), '途中経過では裁定を求めない');
  e.measurements.push({ source: 'auto', specHash: specHash(s), post: { endDate: '2026-10-01' }, complete: true, metric: 'gsc.clicks', pre: { value: 10 }, post: { value: 20 }, verdictHint: 'improved' });
  const j = judgeExperiment(e, now);
  assert.ok(j.reasons.some((r) => r.kind === 'VERDICT_DUE' && /improved/.test(r.detail)));
  assert.match(j.review, /close EXP-9/);
});
