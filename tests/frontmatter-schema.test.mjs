// tests/frontmatter-schema.test.mjs
//
// 回帰テスト目的:
// 既存 746 MDX との後方互換性を壊さないため、`parseFrontmatter` は
// - title 必須
// - `.passthrough()` で未知フィールドを受け入れ
// - `published` boolean / `publishedAt` string|Date / enum 系の既知値を通す
// を維持する。schema 変更時に巨大リグレッションを起こさないための最小ガード。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseFrontmatter } from '../.claude/scripts/lib/frontmatter-schema.mjs';

test('title が無いと parse に失敗する', () => {
  const result = parseFrontmatter({ description: 'no title' });
  assert.equal(result.success, false);
});

test('空文字の title は parse に失敗する（min(1)）', () => {
  const result = parseFrontmatter({ title: '' });
  assert.equal(result.success, false);
});

test('title のみでも parse 成功（他は optional）', () => {
  const result = parseFrontmatter({ title: 'hello' });
  assert.equal(result.success, true);
  assert.equal(result.data.title, 'hello');
});

test('published: false は parse 成功（ドラフト判定用）', () => {
  const result = parseFrontmatter({
    title: 'draft page',
    published: false,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.published, false);
});

test('未知フィールドは passthrough で保持される（既存 746 MDX 後方互換）', () => {
  const result = parseFrontmatter({
    title: 'x',
    customField: 'some-custom-value',
    anotherUnknown: 42,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.customField, 'some-custom-value');
  assert.equal(result.data.anotherUnknown, 42);
});

test('publishedAt は string / Date どちらも受け入れる', () => {
  const asString = parseFrontmatter({
    title: 'x',
    publishedAt: '2026-04-18',
  });
  assert.equal(asString.success, true);

  const asDate = parseFrontmatter({
    title: 'x',
    publishedAt: new Date('2026-04-18'),
  });
  assert.equal(asDate.success, true);
});

test('既知の exams (civil-construction-1, pe-comprehensive-management) を受け入れる', () => {
  const result = parseFrontmatter({
    title: 'x',
    exams: ['civil-construction-1', 'pe-comprehensive-management'],
  });
  assert.equal(result.success, true);
});

test('未知の exam id は parse に失敗する（enum 厳密）', () => {
  const result = parseFrontmatter({
    title: 'x',
    exams: ['unknown-exam'],
  });
  assert.equal(result.success, false);
});

test('description が 500 文字を超えると parse に失敗する', () => {
  const result = parseFrontmatter({
    title: 'x',
    description: 'a'.repeat(501),
  });
  assert.equal(result.success, false);
});

test('既知の group (guide, primary, secondary, keyword, past-exam, textbook) を受け入れる', () => {
  for (const group of ['guide', 'primary', 'secondary', 'keyword', 'past-exam', 'textbook']) {
    const result = parseFrontmatter({ title: 'x', group });
    assert.equal(result.success, true, `group=${group} should be accepted`);
  }
});
