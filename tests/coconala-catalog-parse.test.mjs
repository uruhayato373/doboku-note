import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalog } from '../scripts/lib/coconala-catalog.mjs';

// status と serviceUrl の間に別フィールドがあってもエントリを落とさない（2026-09-30 の取りこぼし）
test('parseCatalog はフィールド順に依存しない', () => {
  const ts = `const SERVICES_RAW = {
  'a': {
    id: 'a',
    status: 'paused',
    pauseReason: 'retired',
    serviceUrl: 'https://coconala.com/services/1',
    priceYen: 3000,
  },
  'b': {
    id: 'b',
    status: 'listed',
    serviceUrl: 'https://coconala.com/services/2',
  },
};`;
  const c = parseCatalog(ts);
  assert.deepEqual(Object.keys(c), ['a', 'b']);
  assert.equal(c.a.status, 'paused');
  assert.equal(c.a.pauseReason, 'retired');
  assert.equal(c.a.serviceUrl, 'https://coconala.com/services/1');
  assert.equal(c.a.priceYen, 3000);
  assert.equal(c.b.status, 'listed');
});

// serviceUrl をエントリの末尾に置いても拾う（2026-11-14: check-coconala-analytics の独自の読み方が
// 技術士の添削 4 件を「カタログに無い」と誤判定した。検算も parseCatalog を使う）
test('parseCatalog はエントリ末尾の serviceUrl を拾う', () => {
  const ts = `const SERVICES_RAW = {
  'c': {
    id: 'c',
    status: 'listed',
    title: 'x',
    priceYen: 3000,
    listedAt: '2026-11-12',
    serviceUrl: 'https://coconala.com/services/3',
  },
};`;
  assert.equal(parseCatalog(ts).c.serviceUrl, 'https://coconala.com/services/3');
});
