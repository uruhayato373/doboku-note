import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_VERSION, addService, indexServices, queryServices, toStoredResearch } from '../scripts/lib/coconala-market.mjs';

const svc = (url, extra = {}) => ({ title: `t-${url}`, catchphrase: null, excerpt: '抜粋', seller: 's', rating: 4.5, reviews: 3, priceYen: 1000, url, segment: 'tensaku', detail: null, ...extra });

test('toStoredResearch: 語ごとに重なる出品を URL で 1 件にし、見つかった語を queries に持つ。excerpt と null の detail は落とす', () => {
  const raw = {
    version: 1, fetchedAt: 'f', method: 'm', note: 'n', updatedAt: 'u',
    queries: [
      { keyword: 'a', pageType: 'search', totalHits: 2, pagesScanned: 1, complete: true, services: [svc('x'), svc('y')] },
      { keyword: 'b', pageType: 'search', totalHits: 2, pagesScanned: 1, complete: true, services: [svc('y', { priceYen: 999 }), svc('z', { detail: { totalSales: '5' } })] },
    ],
  };
  const r = toStoredResearch(raw);
  assert.equal(r.version, RESEARCH_VERSION);
  assert.deepEqual(r.queries.map((q) => q.keyword), ['a', 'b']);
  assert.ok(r.queries.every((q) => !('services' in q)), '語の側は出品を持たない');
  assert.deepEqual(r.services.map((s) => `${s.url}:${s.queries.join(',')}`), ['x:a', 'y:a,b', 'z:b']);
  assert.equal(r.services[1].priceYen, 1000, '先に取った値を採る');
  assert.ok(r.services.every((s) => !('excerpt' in s)));
  assert.ok(!('detail' in r.services[0]), 'null の detail は持たない');
  assert.deepEqual(r.services[2].detail, { totalSales: '5' }, '取った詳細は残す');
  assert.deepEqual(Object.keys(r), ['version', 'fetchedAt', 'method', 'note', 'queries', 'services', 'updatedAt']);
});

test('toStoredResearch: 新形はそのまま返す（冪等）', () => {
  const once = toStoredResearch({ version: 1, fetchedAt: 'f', method: 'm', note: 'n', updatedAt: 'u', queries: [{ keyword: 'a', services: [svc('x')] }] });
  assert.equal(toStoredResearch(once), once);
  assert.deepEqual(toStoredResearch(JSON.parse(JSON.stringify(once))), once, 'ファイルに書いて読み直しても同じ');
});

test('addService・queryServices: 既知の URL は語だけ足し、語ごとの出品を引ける', () => {
  const research = { queries: [], services: [] };
  const index = indexServices(research);
  assert.equal(addService(research, index, 'a', svc('x')), true);
  assert.equal(addService(research, index, 'b', svc('x')), false);
  assert.equal(addService(research, index, 'b', svc('x')), false, '同じ語を重ねない');
  assert.equal(addService(research, index, 'b', svc('y')), true);
  assert.deepEqual(research.services.map((s) => s.queries), [['a', 'b'], ['b']]);
  assert.deepEqual(queryServices(research, 'b').map((s) => s.url), ['x', 'y']);
  assert.deepEqual(queryServices(research, 'a').map((s) => s.url), ['x']);
  assert.deepEqual(queryServices(research, 'none'), []);
});
