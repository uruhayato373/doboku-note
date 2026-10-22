// 2026-10-22: 索引（doc-meta-index）が MDX の公開記事と食い違うかを、索引を読む報告が先に確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffPublishedSlugs } from '../scripts/lib/published-docs.mjs';

test('一致していれば両方空', () => {
  assert.deepEqual(diffPublishedSlugs(['a', 'b'], ['b', 'a']), { missing: [], extra: [] });
});

test('MDX にあって索引に無い記事（pull 後に作り直していない）と、索引にだけある記事（非公開・削除）を分けて返す', () => {
  assert.deepEqual(diffPublishedSlugs(['a', 'old'], ['a', 'new2', 'new1']), { missing: ['new1', 'new2'], extra: ['old'] });
});
