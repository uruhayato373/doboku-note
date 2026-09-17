import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStagedDiff, frontmatterEndLine } from '../.claude/scripts/lib/staged-diff-kind.mjs';

const raw = ['---', 'title: A', 'tags:', '  - x', 'dateModified: 2026-09-01', '---', '', '## 本文', 'text'].join('\n');
const FM_END = 6;

test('frontmatter の閉じ行を 1 始まりで返し、無ければ 0', () => {
  assert.equal(frontmatterEndLine(raw), FM_END);
  assert.equal(frontmatterEndLine(raw.replace(/\n/g, '\r\n')), FM_END);
  assert.equal(frontmatterEndLine('## no frontmatter'), 0);
});

test('tags や sources だけの変更は meta-only（lastmod を動かさない）', () => {
  const diff = ['@@ -3,1 +3,2 @@', '+  - y', '+  - z'].join('\n');
  assert.equal(classifyStagedDiff(diff, FM_END), 'meta-only');
});

test('title / seoTitle / description の変更は meta-significant', () => {
  assert.equal(classifyStagedDiff('@@ -2,1 +2,1 @@\n-title: A\n+title: B', FM_END), 'meta-significant');
  assert.equal(classifyStagedDiff('@@ -2,0 +3,1 @@\n+description: 新しい要約', FM_END), 'meta-significant');
});

test('本文に 1 行でも触れば body（frontmatter 変更と混在しても）', () => {
  const diff = ['@@ -3,1 +3,1 @@', '-  - x', '+  - y', '@@ -9,1 +9,1 @@', '-text', '+text2'].join('\n');
  assert.equal(classifyStagedDiff(diff, FM_END), 'body');
});

test('本文行の削除だけ（新側 0 行の hunk）も body', () => {
  assert.equal(classifyStagedDiff('@@ -9,1 +8,0 @@\n-text', FM_END), 'body');
});

test('frontmatter が無いファイルは常に body、hunk が無ければ none', () => {
  assert.equal(classifyStagedDiff('@@ -1,1 +1,1 @@\n-a\n+b', 0), 'body');
  assert.equal(classifyStagedDiff('', FM_END), 'none');
});
