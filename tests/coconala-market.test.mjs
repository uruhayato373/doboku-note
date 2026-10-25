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
  assert.equal(r.schemaVersion, RESEARCH_VERSION);
  assert.equal('version' in r, false);
  assert.deepEqual(r.queries.map((q) => q.keyword), ['a', 'b']);
  assert.ok(r.queries.every((q) => !('services' in q)), '語の側は出品を持たない');
  assert.deepEqual(r.services.map((s) => `${s.url}:${s.queries.join(',')}`), ['x:a', 'y:a,b', 'z:b']);
  assert.equal(r.services[1].priceYen, 1000, '先に取った値を採る');
  assert.ok(r.services.every((s) => !('excerpt' in s)));
  assert.ok(!('detail' in r.services[0]), 'null の detail は持たない');
  assert.deepEqual(r.services[2].detail, { totalSales: '5' }, '取った詳細は残す');
  assert.deepEqual(Object.keys(r), ['schemaVersion', 'fetchedAt', 'method', 'note', 'queries', 'services', 'updatedAt']);
});

test('toStoredResearch: 新形はそのまま返す（冪等）', () => {
  const once = toStoredResearch({ version: 1, fetchedAt: 'f', method: 'm', note: 'n', updatedAt: 'u', queries: [{ keyword: 'a', services: [svc('x')] }] });
  assert.equal(toStoredResearch(once), once);
  assert.deepEqual(toStoredResearch(JSON.parse(JSON.stringify(once))), once, 'ファイルに書いて読み直しても同じ');
});

test('toStoredResearch: 旧名 version: 2 の版 2 は schemaVersion に揃える（中身は変えない）', () => {
  const legacy = { version: 2, fetchedAt: 'f', method: 'm', note: 'n', queries: [{ keyword: 'a' }], services: [{ url: 'x', queries: ['a'] }], updatedAt: 'u' };
  const r = toStoredResearch(legacy);
  assert.deepEqual(Object.keys(r), ['schemaVersion', 'fetchedAt', 'method', 'note', 'queries', 'services', 'updatedAt']);
  assert.equal(r.schemaVersion, 2);
  assert.deepEqual(r.services, legacy.services);
  assert.equal(toStoredResearch(r), r, '揃えた後は冪等');
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

// 2026-10-25: CI の取り直しでヒット 195・1,091 件なのにカードを 0 件しか読めず、10/01 の 1,548 件を空で上書きした
test('unreadableQueries: ヒットがあるのに 0 件の語と、全部の語で 0 件を拾う・ヒット 0 の語は読めなくてよい', async () => {
  const { unreadableQueries } = await import('../scripts/lib/coconala-market.mjs');
  const counts = { a: 0, b: 0, c: 5, d: 0 };
  const n = (k) => counts[k];
  assert.deepEqual(unreadableQueries([{ keyword: 'a', totalHits: 195 }, { keyword: 'b', totalHits: 1091 }], n), { unreadable: ['a', 'b'], nothingAtAll: true });
  assert.deepEqual(unreadableQueries([{ keyword: 'a', totalHits: 195 }, { keyword: 'c', totalHits: 5 }], n), { unreadable: ['a'], nothingAtAll: false });
  assert.deepEqual(unreadableQueries([{ keyword: 'c', totalHits: 5 }, { keyword: 'd', totalHits: 0 }], n), { unreadable: [], nothingAtAll: false });
  // ヒット数すら読めない（ページの構造が丸ごと変わった）ときは、全部 0 件で止める
  assert.deepEqual(unreadableQueries([{ keyword: 'a', totalHits: null }, { keyword: 'd', totalHits: null }], n), { unreadable: [], nothingAtAll: true });
  assert.deepEqual(unreadableQueries([], n), { unreadable: [], nothingAtAll: false });
});
