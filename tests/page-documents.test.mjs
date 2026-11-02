import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPageDocuments, documentLink } from '../scripts/lib/page-documents.mjs';

const map = {
  '/': ['docs/strategy/15_KPIツリー.md'],
  '/metrics/business': ['docs/strategy/01_プロダクト戦略.md'],
  '/strategy/channels': ['docs/strategy/22_チャネル別商品設計2026-11.md'],
};

test('matchPageDocuments: 段の区切りで長い一致が優先し、クエリは無視する', () => {
  assert.deepEqual(matchPageDocuments(map, '/strategy/channels?tab=mix'), map['/strategy/channels']);
  assert.deepEqual(matchPageDocuments(map, '/metrics/business/weekly'), map['/metrics/business']);
  assert.deepEqual(matchPageDocuments(map, '/'), map['/']);
  assert.deepEqual(matchPageDocuments(map, '/metrics/business-x'), [], '段の途中では当てない');
  assert.deepEqual(matchPageDocuments(map, '/sns'), [], 'トップ（/）は他の画面に当てない');
});

test('documentLink: 文書ビューアの URL と、番号を外した短い名前', () => {
  assert.deepEqual(documentLink('docs/strategy/22_チャネル別商品設計2026-11.md'), { href: '/docs/strategy/22_チャネル別商品設計2026-11', label: 'チャネル別商品設計2026-11' });
  assert.deepEqual(documentLink('docs/marketing/05a_YouTube競合分析_技術士総監_2026-06.md').label, 'YouTube競合分析_技術士総監_2026-06');
  assert.equal(documentLink('docs/strategy/README.md').label, 'strategy の索引');
});
