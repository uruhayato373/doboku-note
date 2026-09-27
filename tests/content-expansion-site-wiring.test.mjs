import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteSlugOf } from '../scripts/lib/content-expansion.mjs';

test('siteSlugOf は Convention A/B の記事パスを論理 slug に写し、記事以外は null', () => {
  assert.equal(siteSlugOf('content/site/pe-comprehensive-management/risk/article.mdx'), 'pe-comprehensive-management-risk');
  assert.equal(siteSlugOf('content/site/civil-construction-1/guide-1-vs-2.mdx'), 'civil-construction-1-guide-1-vs-2');
  assert.equal(siteSlugOf('content/site/civil-construction-1/img/figure-a.svg'), null);
  assert.equal(siteSlugOf('content/sns/x/foo/tweets.md'), null);
});
