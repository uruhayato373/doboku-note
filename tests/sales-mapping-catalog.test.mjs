import test from 'node:test';
import assert from 'node:assert/strict';

import { publishedArticleProductIds } from '../scripts/lib/sales-mapping.mjs';

test('公開済み単品記事だけを sales productId へ変換する', () => {
  const source = `
    'paid-article': {
      id: 'paid-article',
      published: true,
      noteUrl: 'https://note.com/dobokunote/n/n123',
    },
    'draft-article': {
      id: 'draft-article',
      published: false,
      noteUrl: '',
    },
    'paid-magazine': {
      id: 'paid-magazine',
      published: true,
      noteUrl: 'https://note.com/dobokunote/m/m123',
    },
  `;

  assert.deepEqual(publishedArticleProductIds(source), ['article:paid-article']);
});

test('カタログの別フィールドに現れる /n/ URL を商品として誤検出しない', () => {
  const source = `
    'magazine': {
      id: 'magazine',
      published: true,
      noteUrl: 'https://note.com/dobokunote/m/m123',
      landingUrl: 'https://note.com/dobokunote/n/n456',
    },
  `;

  assert.deepEqual(publishedArticleProductIds(source), []);
});
