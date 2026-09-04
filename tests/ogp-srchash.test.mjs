import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeOgpSrcHash } from '../scripts/lib/ogp-srchash.mjs';

const base = {
  title: '記事タイトル A',
  category: '技術士',
  tags: ['総合技術監理'],
  ogp: { title: 'OGP 専用タイトル', subtitle: '副題', template: 'mono-tag' },
};

test('明示的な ogp.title がある場合は記事 title の変更を無視する', () => {
  const before = computeOgpSrcHash(base);
  const after = computeOgpSrcHash({ ...base, title: '記事タイトル B' });
  assert.equal(after, before);
});

test('ogp.title がない場合は記事 title の変更を検知する', () => {
  const withoutOgpTitle = { ...base, ogp: { ...base.ogp, title: undefined } };
  const before = computeOgpSrcHash(withoutOgpTitle);
  const after = computeOgpSrcHash({ ...withoutOgpTitle, title: '記事タイトル B' });
  assert.notEqual(after, before);
});

test('空の ogp.title はレンダラーと同様に記事 title へフォールバックする', () => {
  const withEmptyOgpTitle = { ...base, ogp: { ...base.ogp, title: '' } };
  const before = computeOgpSrcHash(withEmptyOgpTitle);
  const after = computeOgpSrcHash({ ...withEmptyOgpTitle, title: '記事タイトル B' });
  assert.notEqual(after, before);
});

test('OGP の表示入力が変わればハッシュも変わる', () => {
  const before = computeOgpSrcHash(base);
  assert.notEqual(computeOgpSrcHash({ ...base, ogp: { ...base.ogp, title: '別タイトル' } }), before);
  assert.notEqual(computeOgpSrcHash({ ...base, ogp: { ...base.ogp, subtitle: '別の副題' } }), before);
});
