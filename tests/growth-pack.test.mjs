import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { packPeriods, normPath, sourceGroup, foldLanding, foldEvents, foldGsc, foldGscTotal, foldGscCoverage } from '../scripts/lib/growth-pack.mjs';
import { GrowthPack } from '../scripts/lib/dataset-schemas-analysis.mjs';
import { isoWeekKey, weekPeriod } from '../scripts/lib/business-direction.mjs';

const row = (dims, mets) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: mets.map((value) => ({ value: String(value) })) });

test('week keys and periods round-trip on ISO boundaries', () => {
  assert.equal(isoWeekKey('2026-09-14'), '2026-W38');
  assert.equal(isoWeekKey('2026-09-20'), '2026-W38');
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53');
  assert.deepEqual(weekPeriod('2026-W38'), { startDate: '2026-09-14', endDate: '2026-09-20' });
  assert.deepEqual(weekPeriod('2026-W53'), { startDate: '2026-12-28', endDate: '2027-01-03' });
  assert.throws(() => weekPeriod('2026-38'));
});

test('the Saturday review week maps to the previous completed Mon–Sun with a 28-day baseline', () => {
  const p = packPeriods({ today: '2026-09-26' });
  assert.equal(p.week, '2026-W38');
  assert.deepEqual(p.period, { startDate: '2026-09-14', endDate: '2026-09-20' });
  assert.deepEqual(p.baseline, { startDate: '2026-08-17', endDate: '2026-09-13', days: 28 });
  assert.equal(packPeriods({ week: '2026-W38' }).period.startDate, '2026-09-14');
});

test('paths and source groups normalise for joining GA4 with GSC', () => {
  assert.equal(normPath('https://doboku-note.com/exam/x/?utm=1#a'), '/exam/x');
  assert.equal(normPath('/'), '/');
  assert.equal(sourceGroup('Organic Search', 'google'), 'google');
  assert.equal(sourceGroup('Organic Search', 'duckduckgo'), 'organic-other');
  assert.equal(sourceGroup('Organic Social', 'x'), 'organic-social');
});

test('foldLanding sums week/base per page×group via the named dateRange column', () => {
  const report = {
    dimensionHeaders: ['landingPage', 'sessionSource', 'sessionDefaultChannelGroup', 'dateRange'],
    metricHeaders: ['sessions', 'engagedSessions'],
    rows: [
      row(['/a/', 'google', 'Organic Search', 'week'], [10, 6]),
      row(['/a', 'google', 'Organic Search', 'base'], [30, 20]),
      row(['/a', 'bing', 'Organic Search', 'week'], [5, 1]),
      row(['/a', 'yahoo', 'Organic Search', 'week'], [2, 1]),
    ],
  };
  const out = foldLanding(report);
  const g = out.find((r) => r.page === '/a' && r.group === 'google');
  assert.deepEqual(g, { page: '/a', group: 'google', week: { sessions: 10, engagedSessions: 6 }, base: { sessions: 30, engagedSessions: 20 } });
  assert.equal(out.length, 3);
  assert.throws(() => foldLanding({ ...report, dimensionHeaders: ['landingPage', 'sessionSource', 'sessionDefaultChannelGroup'] }), /dateRange/);
});

test('foldEvents keeps count and users per page×event', () => {
  const report = {
    dimensionHeaders: ['pagePath', 'eventName', 'dateRange'],
    metricHeaders: ['eventCount', 'totalUsers'],
    rows: [row(['/a', 'note_cta_click', 'week'], [3, 2]), row(['/a', 'note_cta_click', 'base'], [8, 5])],
  };
  assert.deepEqual(foldEvents(report), [{ page: '/a', event: 'note_cta_click', week: { count: 3, users: 2 }, base: { count: 8, users: 5 } }]);
});

test('foldGsc compacts rows and keeps truncation', () => {
  const out = foldGsc({
    meta: { dimensions: ['page', 'query'], startDate: '2026-09-14', endDate: '2026-09-20', row_count: 1, truncated: false },
    rows: [{ keys: ['https://doboku-note.com/a/', 'q'], clicks: 1, impressions: 20, ctr: 0.05, position: 7.4444 }],
  });
  assert.deepEqual(out.rows, [{ page: '/a', query: 'q', clicks: 1, impressions: 20, position: 7.4 }]);
  assert.equal(out.truncated, false);
  assert.equal(out.meta.row_count, 1);
});

test('GSC 全体の空応答・指標欠測は 0 集計へ変換しない', () => {
  const meta = { dimensions: [], startDate: '2026-10-05', endDate: '2026-10-11', row_count: 1, truncated: false };
  const row = { clicks: 303, impressions: 5000, ctr: 0.0606, position: 10 };
  assert.deepEqual(foldGscTotal({ meta, rows: [row] }).rows, [row]);
  assert.throws(() => foldGscTotal({ meta, rows: [] }), /取得 0 行/);
  assert.throws(() => foldGscTotal({ meta, rows: [{ ...row, clicks: undefined }] }), /数値の欠測/);
});

test('ページ別の取り方ごとの合計を byPage 全体と並べる（国の行だけを足す取り方を含む・DN-0806）', () => {
  const res = (dimensions, rows, filters = []) => ({ meta: { dimensions, filters, truncated: false }, rows });
  const cov = foldGscCoverage({
    startDate: '2026-10-05', endDate: '2026-10-11', byPageTotal: { clicks: 306, impressions: 7946 },
    variants: [
      { name: '国で絞る', result: res(['page'], [{ keys: ['/a'], clicks: 20, impressions: 1500 }, { keys: ['/b'], clicks: 3, impressions: 227 }], [{ dimension: 'country', operator: 'equals', expression: 'jpn' }]) },
      { name: '条件なし', result: res(['page'], [{ keys: ['/a'], clicks: 350, impressions: 9000 }]) },
      { name: 'page×country', country: 'jpn', result: res(['page', 'country'], [{ keys: ['/a', 'jpn'], clicks: 290, impressions: 7600 }, { keys: ['/a', 'usa'], clicks: 40, impressions: 900 }]) },
    ],
  });
  assert.deepEqual(cov.variants.map((v) => [v.rowCount, v.clicks, v.clickSharePct]), [[2, 23, 7.5], [1, 350, 114.4], [1, 290, 94.8]]);
  assert.equal(cov.variants[2].keepCountry, 'jpn');
  assert.equal(cov.variants[0].filters[0].expression, 'jpn');
  assert.equal(foldGscCoverage({ startDate: '2026-10-05', endDate: '2026-10-11', byPageTotal: null, variants: [{ name: 'x', result: res(['page'], []) }] }).variants[0].clickSharePct, null);

  // 実際の W41 のパックに足しても型に合う（取れなかったときの ok:false も）
  const pack = JSON.parse(readFileSync('data/analysis/growth/pack-2026-W41.json', 'utf8'));
  assert.ok(GrowthPack.safeParse({ ...pack, sections: { ...pack.sections, gscPageCoverageWeek: { ok: true, ...cov } } }).success);
  assert.ok(GrowthPack.safeParse({ ...pack, sections: { ...pack.sections, gscPageCoverageWeek: { ok: false, error: 'quota' } } }).success);
});
