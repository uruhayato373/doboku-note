// DN-0277: note 本文のインラインのバッククォートを検出する（frontmatter・コードブロックは対象外）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findInlineCode } from '../scripts/lib/note-inline-code.mjs';

test('findInlineCode: 本文の `〇〇` を行番号つきで返す', () => {
  const md = ['---', 'title: "`x`"', '---', '施工量は`〇〇`m³', '【〇〇】は対象外'].join('\n');
  assert.deepEqual(findInlineCode(md), [{ line: 4, text: '`〇〇`' }]);
});

test('findInlineCode: コードブロックの中と CRLF', () => {
  const md = ['本文', '```', 'a `b` c', '```', '式は `1+1` です'].join('\r\n');
  assert.deepEqual(findInlineCode(md), [{ line: 5, text: '`1+1`' }]);
});
