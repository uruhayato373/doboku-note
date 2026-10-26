import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUnpublishedMdx } from '../scripts/lib/mdx-published.mjs';

test('published: false の下書きを非公開と判定する', () => {
  assert.equal(isUnpublishedMdx('---\ntitle: 平成25年度\npublished: false\n---\n\n本文'), true);
  assert.equal(isUnpublishedMdx('---\r\ntitle: x\r\npublished: false\r\n---\r\n本文'), true);
});

test('公開中・frontmatter なし・本文中の記述は非公開と判定しない', () => {
  assert.equal(isUnpublishedMdx('---\ntitle: x\npublished: true\n---\n本文'), false);
  assert.equal(isUnpublishedMdx('本文だけ'), false);
  assert.equal(isUnpublishedMdx('---\ntitle: x\n---\n\npublished: false は本文'), false);
});
