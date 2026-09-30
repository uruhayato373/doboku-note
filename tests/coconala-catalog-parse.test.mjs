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
