import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packPeriods, normPath, sourceGroup, foldLanding, foldEvents, foldGsc } from '../scripts/lib/growth-pack.mjs';
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
});
