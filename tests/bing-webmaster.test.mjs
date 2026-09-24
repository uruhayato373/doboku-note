import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBingDate, normalizeBing, redactKey } from '../scripts/lib/bing-webmaster.mjs';

test('parseBingDate applies the WCF offset to the local calendar day', () => {
  // 2026-09-14T00:00:00-07:00 = 2026-09-14T07:00:00Z
  assert.equal(parseBingDate('/Date(1789369200000-0700)/'), '2026-09-14');
  assert.equal(parseBingDate('/Date(1789369200000)/'), '2026-09-14');
  assert.equal(parseBingDate('garbage'), null);
});

test('normalizeBing keeps query/page rows since the cutoff and sorts by date', () => {
  const body = { d: [
    { Date: '/Date(1789369200000-0700)/', Query: '1級土木 過去問', Clicks: 3, Impressions: 40, AvgClickPosition: 4.2, AvgImpressionPosition: 6.1 },
    { Date: '/Date(1780000000000-0700)/', Query: 'old', Clicks: 1, Impressions: 2 },
  ] };
  const rows = normalizeBing('query', body, { since: '2026-08-01' });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { date: '2026-09-14', clicks: 3, impressions: 40, query: '1級土木 過去問', avgClickPosition: 4.2, avgImpressionPosition: 6.1 });
  assert.equal(normalizeBing('page', body)[1].page, '1級土木 過去問');
  assert.deepEqual(normalizeBing('traffic', { d: [{ Date: '/Date(1789369200000-0700)/', Clicks: 5, Impressions: 9 }] }), [{ date: '2026-09-14', clicks: 5, impressions: 9 }]);
  assert.deepEqual(normalizeBing('query', null), []);
});

test('redactKey hides the API key in URLs and errors', () => {
  assert.equal(redactKey('GET https://x/y?siteUrl=a&apikey=SECRET123 failed'), 'GET https://x/y?siteUrl=a&apikey=*** failed');
});
