/**
 * cloudflare-analytics.mjs の純関数を固定する。fetch はしない（scripts/lib/cloudflare-analytics.mjs 参照）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  buildZoneQuery,
  pruneQueryFields,
  summarizeDays,
  spikeFlag,
  assessCloudflareMetrics,
  DEFAULT_SUM_FIELDS,
} from '../scripts/lib/cloudflare-analytics.mjs';

test('buildZoneQuery: zoneTag/since/until を埋め込み、フィールドは sum{} に入る', () => {
  const q = buildZoneQuery({ zoneTag: 'abc123', since: '2026-09-01', until: '2026-09-07' });
  assert.match(q, /zoneTag: "abc123"/);
  assert.match(q, /date_geq: "2026-09-01"/);
  assert.match(q, /date_leq: "2026-09-07"/);
  assert.match(q, /sum \{ requests pageViews/);
  assert.match(q, /uniq \{ uniques \}/);
  assert.throws(() => buildZoneQuery({ since: '2026-09-01', until: '2026-09-07' }), /zoneTag/);
  assert.throws(() => buildZoneQuery({ zoneTag: 'z' }), /since\/until/);
});

test('pruneQueryFields: 指名フィールドだけ落とし dropped を返す', () => {
  const errors = [{ message: 'Cannot query field "threats" on type "httpRequests1dGroupsAdaptiveSum"' }];
  const { fields, dropped } = pruneQueryFields(DEFAULT_SUM_FIELDS, errors);
  assert.deepEqual(dropped, ['threats']);
  assert.ok(!fields.includes('threats'));
  assert.equal(fields.length, DEFAULT_SUM_FIELDS.length - 1);
  // 残りのフィールドは無傷
  assert.ok(fields.includes('requests'));
  assert.ok(fields.some((f) => f.startsWith('countryMap')));
});

test('pruneQueryFields: 特定できないエラーは fields をそのまま返し dropped: []', () => {
  const { fields, dropped } = pruneQueryFields(DEFAULT_SUM_FIELDS, [{ message: 'rate limited' }]);
  assert.equal(fields, DEFAULT_SUM_FIELDS);
  assert.deepEqual(dropped, []);
});

test('summarizeDays: JP/other 分割と status 4 区分', () => {
  const groups = [
    {
      dimensions: { date: '2026-09-01' },
      sum: {
        requests: 1000,
        pageViews: 400,
        bytes: 5_000_000,
        cachedRequests: 600,
        threats: 3,
        countryMap: [
          { clientCountryName: 'JP', requests: 800, bytes: 4_000_000 },
          { clientCountryName: 'US', requests: 150, bytes: 800_000 },
          { clientCountryName: 'CN', requests: 50, bytes: 200_000 },
        ],
        responseStatusMap: [
          { edgeResponseStatus: 200, requests: 900 },
          { edgeResponseStatus: 301, requests: 50 },
          { edgeResponseStatus: 404, requests: 40 },
          { edgeResponseStatus: 500, requests: 10 },
        ],
      },
      uniq: { uniques: 300 },
    },
  ];
  const [day] = summarizeDays(groups);
  assert.equal(day.date, '2026-09-01');
  assert.equal(day.requests, 1000);
  assert.equal(day.uniques, 300);
  assert.deepEqual(day.jp, { requests: 800, bytes: 4_000_000 });
  assert.deepEqual(day.other, { requests: 200, bytes: 1_000_000 });
  assert.deepEqual(day.status, { '2xx': 900, '3xx': 50, '4xx': 40, '5xx': 10 });
  assert.deepEqual(day.topOther, [
    { country: 'US', requests: 150 },
    { country: 'CN', requests: 50 },
  ]);
});

const dayOf = (date, jpRequests, otherRequests = 0) => ({
  date,
  jp: { requests: jpRequests, bytes: 0 },
  other: { requests: otherRequests, bytes: 0 },
});

test('spikeFlag: 直前 6 日中央値の 3 倍以上でフラグ', () => {
  const daily = [
    dayOf('2026-09-01', 100), dayOf('2026-09-02', 100), dayOf('2026-09-03', 100),
    dayOf('2026-09-04', 100), dayOf('2026-09-05', 100), dayOf('2026-09-06', 100),
    dayOf('2026-09-07', 400),
  ];
  const r = spikeFlag(daily);
  assert.equal(r.flagged, true);
  assert.equal(r.reason, 'jp-spike');
  assert.equal(r.median6Jp, 100);
  assert.equal(r.yesterdayJp, 400);
});

test('spikeFlag: 海外リクエストが国内以上でフラグ', () => {
  const daily = [
    dayOf('2026-09-01', 100), dayOf('2026-09-02', 100), dayOf('2026-09-03', 100),
    dayOf('2026-09-04', 50, 60),
  ];
  const r = spikeFlag(daily);
  assert.equal(r.flagged, true);
  assert.equal(r.reason, 'other-over-jp');
  assert.equal(r.otherOverJp, true);
});

test('spikeFlag: 日数不足は判定不能', () => {
  const r = spikeFlag([dayOf('2026-09-01', 100), dayOf('2026-09-02', 100)]);
  assert.equal(r.flagged, false);
  assert.equal(r.reason, 'insufficient-days');
});

test('assessCloudflareMetrics: 4 日超で FAIL、daysReturned 0 で FAIL、正常時 OK', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  const stale = { fetchedAt: '2026-09-16T00:00:00Z', counts: { daysReturned: 7 } };
  const staleResult = assessCloudflareMetrics(stale, now);
  assert.equal(staleResult.status, 'FAIL');
  assert.match(staleResult.reasons.join(), /古い/);

  const empty = { fetchedAt: '2026-09-20T00:00:00Z', counts: { daysReturned: 0 } };
  const emptyResult = assessCloudflareMetrics(empty, now);
  assert.equal(emptyResult.status, 'FAIL');
  assert.match(emptyResult.reasons.join(), /daysReturned/);

  const ok = { fetchedAt: '2026-09-20T00:00:00Z', counts: { daysReturned: 7 } };
  const okResult = assessCloudflareMetrics(ok, now);
  assert.equal(okResult.status, 'OK');
  assert.deepEqual(okResult.reasons, []);
  assert.equal(okResult.inspected, 7);

  assert.equal(assessCloudflareMetrics(null, now).status, 'FAIL');
});
