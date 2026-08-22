// tests/sns-mdx-extract.test.mjs
//
// MDX → SNS 投稿素材抽出の回帰テスト。
// 実在する技術士総監キーワードページ（pe-comprehensive-management/followership）をサンプルとする。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractMdx } from '#lib/sns-common/mdx-extract.mjs';

const SAMPLE = { category: 'pe-comprehensive-management', slug: 'followership' };

test('extractMdx: frontmatter から title / category / tags を取得', () => {
  const data = extractMdx(SAMPLE);
  assert.equal(data.title, 'フォロワーシップ');
  assert.equal(data.category, 'pe-comprehensive-management');
  assert.ok(Array.isArray(data.tags));
  assert.ok(data.tags.includes('keyword'));
});

test('extractMdx: description は frontmatter の description', () => {
  const data = extractMdx(SAMPLE);
  assert.ok(typeof data.description === 'string');
  assert.ok(data.description.length > 0);
});

test('extractMdx: seoTitle と section が抽出される', () => {
  const data = extractMdx(SAMPLE);
  assert.ok(data.seoTitle);
  assert.ok(data.section); // 例: '3.1'
});

test('extractMdx: definition は「〜とは」セクションのリード文', () => {
  const data = extractMdx(SAMPLE);
  assert.ok(data.definition);
  // followership は「ロバート・ケリー」の定義から始まる
  assert.match(data.definition, /ケリー|フォロワーシップ/);
});

test('extractMdx: sections に H2 が複数含まれる', () => {
  const data = extractMdx(SAMPLE);
  assert.ok(Array.isArray(data.sections));
  assert.ok(data.sections.length >= 2);
  assert.ok(data.sections.every(s => typeof s.heading === 'string'));
  assert.ok(data.sections.every(s => s.level === 2));
});

test('extractMdx: rawContent には frontmatter が含まれない', () => {
  const data = extractMdx(SAMPLE);
  // gray-matter が frontmatter を削除した本文
  assert.ok(!data.rawContent.startsWith('---'));
  assert.ok(data.rawContent.includes('# フォロワーシップ'));
});

test('extractMdx: 存在しない slug は readFileSync で throw する', () => {
  assert.throws(() => extractMdx({ category: 'pe-comprehensive-management', slug: '__nonexistent__' }), /ENOENT/);
});

test('extractMdx: path 直接指定でも動作する', () => {
  const data = extractMdx({ path: 'content/site/pe-comprehensive-management/followership/article.mdx' });
  assert.equal(data.title, 'フォロワーシップ');
});
