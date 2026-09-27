import test from 'node:test';
import assert from 'node:assert/strict';
import { documentDomain, frontmatterDomain, domainIndex } from '../scripts/lib/domains.mjs';

const cfg = {
  domains: [{ id: 'product', label: '商品' }, { id: 'site', label: 'サイト' }],
  documents: { 'docs/strategy/': 'site', 'docs/strategy/09.md': 'product' },
};

test('documentDomain: 長い一致（ファイル指定）がディレクトリ指定より優先', () => {
  assert.equal(documentDomain(cfg, 'docs/strategy/09.md'), 'product');
  assert.equal(documentDomain(cfg, 'docs/strategy/01.md'), 'site');
  assert.equal(documentDomain(cfg, 'docs/other/x.md'), null);
});

test('frontmatterDomain: CRLF でも domain を読む・無ければ null', () => {
  assert.equal(frontmatterDomain('---\r\nname: a\r\ndomain: sns\r\n---\r\n本文'), 'sns');
  assert.equal(frontmatterDomain('---\nname: a\n---\n'), null);
});

test('domainIndex: id と日本語ラベルの両方で引ける', () => {
  const idx = domainIndex(cfg);
  assert.equal(idx.get('商品').id, 'product');
  assert.equal(idx.get('site').label, 'サイト');
});
