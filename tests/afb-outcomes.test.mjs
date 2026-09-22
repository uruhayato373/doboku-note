import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { afbPeriod, afbRequest, parseAfbOutcomes, collectAfbOutcomes } from '../.claude/scripts/fetch-afb-outcomes.mjs';
import { SiteAttributionError } from '../scripts/lib/asp-site-guard.mjs';

const config = JSON.parse(readFileSync('.claude/config/affiliate-asp.json', 'utf8'));
const now = new Date('2026-09-22T04:00:00Z');
const period = { start: '2026-08-25', end: '2026-09-21' };
const request = afbRequest(config, period, 'occurrence', now);
const row = {
  commit_id: '123',
  adv_id: '456',
  partner_site_id: '984453',
  partner_site_name: 'doboku-note',
  visit_time: '2026-08-24 09:00:00',
  commit_time: '2026-09-03 09:01:00',
  recognition_time: '2026-09-11 10:00:00',
  margin: '100.29',
  commit_flg: '1',
  ref: 'private-ref',
  keyword: 'private-keyword',
};
const payload = (rows = [row]) => rows;
const fakeKey = 'TEST_ONLY_NOT_A_REAL_KEY_123456789';

test('afb request is an exact partner/site-scoped GET with a bounded previous-28-day window', () => {
  assert.deepEqual(afbPeriod(now), period);
  assert.deepEqual(afbPeriod(new Date('2026-09-21T15:00:00Z')), period);
  assert.equal(request.url.origin, 'https://api.afi-b.com');
  assert.equal(request.url.pathname, `/partners/${config.asps.afb.api.partnerId}/conversion`);
  assert.equal(request.url.searchParams.get('partner_site_id'), '984453');
  assert.equal(request.url.searchParams.get('conversion_date_type'), '2');
  assert.equal(request.url.searchParams.has('status'), false);
  assert.equal(afbRequest(config, period, 'recognition', now).url.searchParams.get('conversion_date_type'), '3');
  for (const invalid of [
    { start: '2026-08-22', end: period.end },
    { start: '2026-08-25', end: '2026-09-22' },
    { start: '2026-09-21', end: '2026-09-20' },
    { start: '2026-02-30', end: period.end },
  ]) {
    assert.throws(() => afbRequest(config, invalid, 'occurrence', now));
  }
  assert.throws(() => afbRequest({ ...config, targetSiteName: 'stats47' }, period, 'occurrence', now), /account_mismatch/);
  assert.throws(() => afbRequest(config, period, 'click', now));
});

test('zero is only an explicit empty response; pending/approved/rejected totals stay separate', () => {
  assert.equal(parseAfbOutcomes(payload([]), request).rowCount, 0);
  const result = parseAfbOutcomes(
    payload([
      row,
      { ...row, commit_id: '124', margin: '0.29', commit_flg: '0', recognition_time: null },
      { ...row, commit_id: '125', margin: '5000', commit_flg: '2' },
    ]),
    request,
  );
  assert.deepEqual(result.totals, {
    pending: { count: 1, reportedMargin: 0.29 },
    approved: { count: 1, reportedMargin: 100.29 },
    rejected: { count: 1, reportedMargin: 5000 },
  });
  assert.equal(JSON.stringify(result).includes('private-ref'), false);
  assert.equal(JSON.stringify(result).includes('private-keyword'), false);
});

test('wrong site, missing schema, duplicate IDs, wrong date/status and malformed amounts fail closed', () => {
  for (const change of [
    { partner_site_id: '959426' }, // stats47 の SID（同居口座）を doboku-note と誤認しない
    { partner_site_id: null },
    { commit_id: '' },
    { adv_id: null },
    { commit_flg: '3' },
    { commit_flg: null },
    { margin: '' },
    { margin: null },
    { margin: -1 },
    { margin: 'NaN' },
    { margin: '1,000' },
    { margin: '1.123' },
    { margin: '9007199254740991' },
    { commit_time: '2026-08-24' },
    { commit_time: '2026-09-22' },
    { commit_time: '2026-02-30' },
  ]) {
    assert.throws(() => parseAfbOutcomes(payload([{ ...row, ...change }]), request));
  }
  assert.throws(() => parseAfbOutcomes(payload([{ ...row, partner_site_id: '959426' }]), request), (error) => error instanceof SiteAttributionError);
  assert.throws(() => parseAfbOutcomes(payload([row, row]), request), /duplicate/);
  for (const bad of [null, {}, { response: null }, { response: [], error_message: '' }, { error_message: 'error' }]) {
    assert.throws(() => parseAfbOutcomes(bad, request), /report_schema_changed/);
  }
  assert.throws(
    () => parseAfbOutcomes(payload([{ ...row, commit_flg: '0' }]), afbRequest(config, period, 'recognition', now)),
    /basis_or_period/,
  );
});

test('collectAfbOutcomes makes exactly two bounded requests, never sends cookies, and never follows redirects', async () => {
  const calls = [];
  const result = await collectAfbOutcomes({
    config,
    now,
    apiKey: fakeKey,
    fetchImpl: async (url, options) => {
      calls.push(url);
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.authorizationtoken, fakeKey);
      assert.equal(options.headers.Cookie, undefined);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify(payload()), { headers: { 'content-type': 'application/json' } });
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(result.source, 'afb');
  assert.equal(result.siteId, '984453');
  assert.equal(result.basis.occurrence.rows, 1);
  assert.equal(result.basis.recognition.rows, 1);
  assert.equal(result.basis.occurrence.totals.approved.reportedMargin, 100.29);
  assert.equal(result.basis.recognition.totals.approved.reportedMargin, 100.29);
  // 同一コンバージョンが両基準に出ても records は 1 行（重複排除・二重計上しない）
  assert.equal(result.records.length, 1);
  assert.equal(JSON.stringify(result).includes(fakeKey), false);
});

test('API failures never become empty successes or leak the authentication header', async () => {
  for (const [fetchImpl, code] of [
    [async () => new Response('private', { status: 401 }), 'api_auth_required'],
    [async () => new Response('private', { status: 403 }), 'api_auth_required'],
    [async () => new Response('private', { status: 429 }), 'api_rate_limited'],
    [async () => new Response('private', { status: 500 }), 'api_unavailable'],
    [
      async () => {
        throw new Error(`redirect ${fakeKey}`);
      },
      'api_unavailable',
    ],
    [async () => new Response('<html>login</html>'), 'report_schema_changed'],
    [async () => new Response('not json', { headers: { 'content-type': 'application/json' } }), 'report_schema_changed'],
  ]) {
    await assert.rejects(
      collectAfbOutcomes({ config, now, apiKey: fakeKey, fetchImpl }),
      (error) => error.message.startsWith(code) && !error.message.includes(fakeKey),
    );
  }
  await assert.rejects(collectAfbOutcomes({ config, now, apiKey: '' }), /api_key_missing/);
});

test('commit_flg 0/1/2 maps to pending/approved/rejected', () => {
  const result = parseAfbOutcomes(
    payload([
      { ...row, commit_id: '1', commit_flg: '0', recognition_time: null },
      { ...row, commit_id: '2', commit_flg: '1' },
      { ...row, commit_id: '3', commit_flg: '2' },
    ]),
    request,
  );
  assert.deepEqual(
    result.records.map((r) => [r.conversionId, r.status]),
    [
      ['1', 'pending'],
      ['2', 'approved'],
      ['3', 'rejected'],
    ],
  );
});
