import test from 'node:test';
import assert from 'node:assert/strict';

import { catalogMagazines, publishedArticleProductIds } from '../scripts/lib/sales-mapping.mjs';

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

test('catalogMagazines: noteTitle・title・shortTitle・単品かどうかをエントリごとに取る（隣のエントリの値を取り違えない）', () => {
  const source = `
export const MAGAZINES_RAW = {
  'pack': {
    id: 'pack',
    published: true,
    noteUrl: 'https://note.com/dobokunote/m/m1',
    noteTitle: '建設部門2次｜土質基礎まるごと合格パック',
    title: '技術士 建設部門 2次｜土質基礎 まるごと合格パック',
    description: '説明の途中に title: という語が入っても、行頭の title だけを題名として取る',
    shortTitle: '土質基礎 合格パック',
  },
  'single': {
    id: 'single',
    published: true,
    noteUrl: 'https://note.com/dobokunote/n/n2',
    title: 'It\\'s 単品',
  },
};
`;
  const [pack, single] = catalogMagazines(source);
  assert.deepEqual(pack, {
    id: 'pack',
    title: '技術士 建設部門 2次｜土質基礎 まるごと合格パック',
    shortTitle: '土質基礎 合格パック',
    noteTitle: '建設部門2次｜土質基礎まるごと合格パック',
    single: false,
  });
  assert.deepEqual(single, { id: 'single', title: "It's 単品", shortTitle: undefined, noteTitle: undefined, single: true });
});

test('catalogMagazines: 実カタログを読める（空なら検査不成立）', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { REPO_ROOT } = await import('../scripts/lib/repository-paths.mjs');
  const all = catalogMagazines(readFileSync(join(REPO_ROOT, 'src/lib/note-magazines.ts'), 'utf8'));
  assert.ok(all.length >= 100, `カタログが ${all.length} 件しか読めない`);
  assert.ok(all.some((m) => m.id === 'pe-construction-geotechnical-pack' && m.noteTitle === '建設部門2次｜土質基礎まるごと合格パック'));
});
