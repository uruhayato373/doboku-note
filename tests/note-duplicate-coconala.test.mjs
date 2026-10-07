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

test('有料ラインより後ろの cta:coconala-buyer ブロックは重複に数えない（2026-10-07）', () => {
  const md = ['---', 'paidBoundary: "模範答案"', '---', 'https://coconala.com/services/1', '## 模範答案', '本文',
    '<!-- cta:coconala-buyer -->', '添削します。', '', 'https://coconala.com/services/1'].join('\n');
  assert.deepEqual(findDuplicateCoconala(md), []);
});

test('有料ラインより前の buyer マーカーと、paidBoundary の無い記事では例外にしない', () => {
  const before = ['---', 'paidBoundary: "模範答案"', '---', 'https://coconala.com/services/1',
    '<!-- cta:coconala-buyer -->', 'https://coconala.com/services/1', '## 模範答案'].join('\n');
  assert.deepEqual(findDuplicateCoconala(before), [{ line: 6, id: '1', firstLine: 4 }]);
  const free = ['---', 'title: x', '---', 'https://coconala.com/services/1', '## 模範答案',
    '<!-- cta:coconala-buyer -->', 'https://coconala.com/services/1'].join('\n');
  assert.deepEqual(findDuplicateCoconala(free), [{ line: 7, id: '1', firstLine: 4 }]);
});

test('buyer ブロックは次の見出しで終わり、その後の重複は数える', () => {
  const md = ['---', 'paidBoundary: 模範答案', '---', 'https://coconala.com/services/1', '## 模範答案',
    '<!-- cta:coconala-buyer -->', 'https://coconala.com/services/1', '## 次', 'https://coconala.com/services/1'].join('\n');
  assert.deepEqual(findDuplicateCoconala(md), [{ line: 9, id: '1', firstLine: 4 }]);
});
