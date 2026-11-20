// scripts/lib/strip-markup.mjs の結果を固定する。期待値は正規表現の置換（コメントは `<!--…-->` を最短で、
// タグは `<` から次の `>` まで 1 文字以上）と同じ値（実装時に content・docs・.claude の 9869 件でも一致を確かめた）。
// 正規表現そのものをテストの基準に置くと CodeQL が「不完全な除去」と止めるので、値の表で持つ。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtmlComments, stripTags } from '../scripts/lib/strip-markup.mjs';

// [入力, コメント除去, コメント除去＋直後の改行, タグ除去]
const CASES = [
  ["", "", "", ""],
  ["plain", "plain", "plain", "plain"],
  ["a<b>c", "a<b>c", "a<b>c", "ac"],
  ["a<>b<c>d", "a<>b<c>d", "a<>b<c>d", "a<>bd"],
  ["<<a>b>", "<<a>b>", "<<a>b>", "b>"],
  ["1 < 2 > 0", "1 < 2 > 0", "1 < 2 > 0", "1  0"],
  ["x<!-- y -->z", "xz", "xz", "xz"],
  ["x<!--a<!--b-->c-->y", "xc-->y", "xc-->y", "xc-->y"],
  ["<!-- open", "<!-- open", "<!-- open", "<!-- open"],
  ["<!---->\n\nz", "\n\nz", "\nz", "\n\nz"],
  ["<!--a-->\r\nq", "\r\nq", "q", "\r\nq"],
  ["<!--a-->\n\nq", "\n\nq", "\nq", "\n\nq"],
  ["<p>本文</p><!-- メモ -->\n続き", "<p>本文</p>\n続き", "<p>本文</p>続き", "本文\n続き"],
  ["<mo>(<mrow><mi>a</mi></mrow>)</mo>", "<mo>(<mrow><mi>a</mi></mrow>)</mo>", "<mo>(<mrow><mi>a</mi></mrow>)</mo>", "(a)"],
];

test('stripHtmlComments・stripTags は表の期待値を返す', () => {
  for (const [input, comments, commentsEat, tags] of CASES) {
    assert.equal(stripHtmlComments(input), comments, JSON.stringify(input));
    assert.equal(stripHtmlComments(input, { eatNewline: true }), commentsEat, JSON.stringify(input));
    assert.equal(stripTags(input), tags, JSON.stringify(input));
  }
});
