// DN-0830: note 本文の Markdown タスクリスト（- [ ]）を検出する（frontmatter・コードブロックは対象外）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTaskLists } from '../scripts/lib/note-task-list.mjs';

test('findTaskLists: - [ ] / - [x] / * [X] を行番号つきで返す', () => {
  const md = ['---', 'title: "- [ ] x"', '---', '- [ ] 一つ目', '- [x] 二つ目', '  * [X] 三つ目', '- □ 直した書き方'].join('\n');
  assert.deepEqual(findTaskLists(md).map((h) => h.line), [4, 5, 6]);
});

test('findTaskLists: 「□ 」付きの箇条書き・通常の角括弧・リンクは拾わない', () => {
  const md = ['- □ 確認する', '- [リンク](https://example.com)', '- [1] 注記', '配列は [ ] と書く'].join('\n');
  assert.deepEqual(findTaskLists(md), []);
});

test('findTaskLists: コードブロックの中と CRLF', () => {
  const md = ['本文', '```', '- [ ] a', '```', '- [ ] b'].join('\r\n');
  assert.deepEqual(findTaskLists(md), [{ line: 5, text: '- [ ] b' }]);
});
