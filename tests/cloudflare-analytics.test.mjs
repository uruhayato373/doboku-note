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

test('アカウント使用量: R2 の操作を課金区分に分け、無料枠・含まれる量を差し引いて見込み額を出す', async () => {
  const { summarizeAccountUsage, r2OperationClass } = await import('../scripts/lib/cloudflare-analytics.mjs');
  assert.equal(r2OperationClass('PutObject'), 'classA');
  assert.equal(r2OperationClass('HeadObject'), 'classB');
  assert.equal(r2OperationClass('DeleteObject'), 'free');
  assert.equal(r2OperationClass('SomethingNew'), 'unknown');
  const account = {
    storage: [
      { max: { objectCount: 10, payloadSize: 5e9, metadataSize: 0 }, dimensions: { bucketName: 'a', date: '2026-10-01' } },
      { max: { objectCount: 12, payloadSize: 12e9, metadataSize: 0 }, dimensions: { bucketName: 'a', date: '2026-10-19' } },
    ],
    operations: [
      { sum: { requests: 2_000_000 }, dimensions: { bucketName: 'a', actionType: 'PutObject' } },
      { sum: { requests: 12_000_000 }, dimensions: { bucketName: 'a', actionType: 'GetObject' } },
      { sum: { requests: 5 }, dimensions: { bucketName: 'a', actionType: 'DeleteObject' } },
    ],
    workers: [{ sum: { requests: 1_000, cpuTimeUs: 40_000_000_000 }, dimensions: { scriptName: 'w' } }],
  };
  const pricing = { r2: { freeGb: 10, storagePerGbMonth: 0.015, freeClassA: 1e6, classAPerMillion: 4.5, freeClassB: 1e7, classBPerMillion: 0.36 }, workers: { paidBasePerMonth: 5, includedRequests: 1e7, requestsPerMillion: 0.3, includedCpuMs: 3e7, cpuPerMillionMs: 0.02 } };
  const s = summarizeAccountUsage(account, pricing);
  // 保管量は最終日の値（12GB）
  assert.equal(s.buckets.a.gb, 12);
  assert.equal(s.buckets.a.classA, 2_000_000);
  assert.equal(s.buckets.a.free, 5);
  assert.equal(s.workers.w.cpuMs, 40_000_000);
  assert.deepEqual(s.estimateUsd, { r2Storage: 0.03, r2ClassA: 4.5, r2ClassB: 0.72, workersBase: 5, workersRequests: 0, workersCpu: 0.2, total: 10.45 });
  // 料金表が無ければ見込みは出さない
  assert.equal(summarizeAccountUsage(account, null).estimateUsd, null);
});
