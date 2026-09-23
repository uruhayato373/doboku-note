/**
 * findDuplicateImages: note 記事で同じ画像を 2 回使うと、2 枚目が CDN 確定に至らず全文更新が
 * 中断する（2026-09-23・経験記述の無料記事で末尾の著者バナーが 2 枚）。判定を固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { findDuplicateImages } from '../scripts/lib/note-duplicate-images.mjs';

test('同じ画像の 2 回目以降を元ファイルの行番号つきで返す（./ の有無は同一視）', () => {
  const md = ['---', 'title: x', '---', '![](img/a.png)', '本文', '![バナー](./img/a.png)', '![](img/b.png)', '![](img/a.png)'].join('\n');
  assert.deepEqual(findDuplicateImages(md), [
    { line: 6, path: 'img/a.png', firstLine: 4 },
    { line: 8, path: 'img/a.png', firstLine: 4 },
  ]);
});

test('frontmatter・コードブロック・外部 URL の画像は数えない', () => {
  const md = ['---', 'cover: "![](img/a.png)"', '---', '![](img/a.png)', '```', '![](img/a.png)', '```',
    '![](https://example.com/x.png)', '![](https://example.com/x.png)'].join('\n');
  assert.deepEqual(findDuplicateImages(md), []);
});

test('CRLF の記事でも行番号がずれない', () => {
  assert.deepEqual(findDuplicateImages('![](img/a.png)\r\nx\r\n![](img/a.png)\r\n'), [{ line: 3, path: 'img/a.png', firstLine: 1 }]);
});
