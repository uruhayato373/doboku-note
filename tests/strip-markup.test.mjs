// scripts/lib/strip-markup.mjs は、正規表現の置換（CodeQL が「不完全な除去」と止める形）と同じ結果を返す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtmlComments, stripTags } from '../scripts/lib/strip-markup.mjs';

const CASES = [
  '', 'plain', 'a<b>c', 'a<>b<c>d', '<<a>b>', '1 < 2 > 0', 'x<!-- y -->z', 'x<!--a<!--b-->c-->y',
  '<!-- open', '<!---->\n\nz', '<!--a-->\r\nq', '<!--a-->\n\nq', '<p>本文</p><!-- メモ -->\n続き', '<mo>(<mrow><mi>a</mi></mrow>)</mo>',
];

test('stripHtmlComments は /<!--[\\s\\S]*?-->/g と同じ', () => {
  for (const t of CASES) {
    assert.equal(stripHtmlComments(t), t.replace(/<!--[\s\S]*?-->/g, ''), JSON.stringify(t));
    assert.equal(stripHtmlComments(t, { eatNewline: true }), t.replace(/<!--[\s\S]*?-->\r?\n?/g, ''), JSON.stringify(t));
  }
});

test('stripTags は /<[^>]+>/g と同じ', () => {
  for (const t of CASES) assert.equal(stripTags(t), t.replace(/<[^>]+>/g, ''), JSON.stringify(t));
});
