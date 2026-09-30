/**
 * findDuplicateCoconala: 同じココナラ出品を冒頭と末尾に重ねて載せない（2026-09-30・57 記事で重複）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { findDuplicateCoconala } from '../scripts/lib/note-duplicate-coconala.mjs';

test('同じ出品の 2 回目以降を元ファイルの行番号つきで返す', () => {
  const md = ['---', 'title: x', '---', 'https://coconala.com/services/1', 'https://coconala.com/services/2', '本文',
    '[添削](https://coconala.com/services/1)'].join('\n');
  assert.deepEqual(findDuplicateCoconala(md), [{ line: 7, id: '1', firstLine: 4 }]);
});

test('frontmatter・コードブロックは数えず、別の出品は重複としない', () => {
  const md = ['---', 'url: https://coconala.com/services/1', '---', 'https://coconala.com/services/1', '```',
    'https://coconala.com/services/1', '```', 'https://coconala.com/services/3'].join('\n');
  assert.deepEqual(findDuplicateCoconala(md), []);
});
