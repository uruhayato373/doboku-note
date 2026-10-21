// tests/frontmatter-schema.test.mjs
//
// 回帰テスト目的:
// 既存 746 MDX との後方互換性を壊さないため、`parseFrontmatter` は
// - title 必須
// - キーは許可リスト（`.strict()`・DN-0796）で、未知フィールドは失敗にする
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

test('未知フィールドは失敗する（許可リスト・DN-0796。updated と updatedAt のような綴りの違いを黙って通さない）', () => {
  const result = parseFrontmatter({ title: 'x', customField: 'some-custom-value' });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((i) => i.code === 'unrecognized_keys'));
});

test('実データで使うキー（seoTitle・created・faqs の 2 つの形・ogp）は通る', () => {
  const result = parseFrontmatter({
    title: 'x', seoTitle: 'y', created: new Date('2026-05-21'), dateModified: '2026-08-26',
    faqs: [{ q: 'Q', a: 'A' }, { question: 'Q2', answer: 'A2' }], ogp: { title: 't' }, guide_order: 2.5,
  });
  assert.equal(result.success, true);
});

test('全記事の frontmatter が許可リストに収まる', async () => {
  const { default: matter } = await import('gray-matter');
  const { readFileSync } = await import('node:fs');
  const { listSiteMdx } = await import('../scripts/lib/mdx-files.mjs');
  const files = listSiteMdx();
  assert.ok(files.length > 1000);
  const bad = files.filter((f) => !parseFrontmatter(matter(readFileSync(f, 'utf8')).data).success);
  assert.deepEqual(bad, []);
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
