// staged のパスから検査の対象を選ぶ判定（check-table-references・check-orphan-figures の --staged）。
// 2026-11-13 まで両方の正規表現の先頭が「バックスラッシュ＋content」で、バックスラッシュ＋c＋o が制御文字として読まれ、
// 実在のパスに一度も一致しなかった。commit 時は毎回 0 件の検査で「OK」を出していた（全量は CI で回っていた）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { isStagedArticlePath } from '../scripts/check-table-references.mjs';
import { stagedArticleDir } from '../scripts/check-orphan-figures.mjs';

test('表の参照: staged の記事（.mdx・.md）を対象にし、図・逐語の文字起こし・サイト外は対象にしない', () => {
  assert.equal(isStagedArticlePath('content/site/civil-construction-1/textbook-concrete-placement/article.mdx'), true);
  assert.equal(isStagedArticlePath('content/site/pe-construction/guide-x/article.md'), true);
  assert.equal(isStagedArticlePath('content/site/civil-construction-1/textbook-x/img/figure-1.svg'), false);
  assert.equal(isStagedArticlePath('content/site/civil-construction-1/textbook-x/img/notes.md'), false);
  assert.equal(isStagedArticlePath('content/site/standards-library/a/b/article.mdx'), false);
  assert.equal(isStagedArticlePath('content/site/standards-articles/a/b/article.mdx'), false);
  assert.equal(isStagedArticlePath('content/note/x/y/article.md'), false);
  assert.equal(isStagedArticlePath('docs/README.md'), false);
});

test('孤立図: staged の図・記事から、検査する記事ディレクトリを返す', () => {
  assert.equal(stagedArticleDir('content/site/civil-construction-1/textbook-x/img/figure-1.svg'), 'content/site/civil-construction-1/textbook-x');
  assert.equal(stagedArticleDir('content/site/civil-construction-1/textbook-x/img/figure-2--wide.svg'), 'content/site/civil-construction-1/textbook-x');
  assert.equal(stagedArticleDir('content/site/civil-construction-1/textbook-x/article.mdx'), 'content/site/civil-construction-1/textbook-x');
  // 図でないファイル・サイト外は関係しない
  assert.equal(stagedArticleDir('content/site/civil-construction-1/textbook-x/img/photo-1.webp'), null);
  assert.equal(stagedArticleDir('content/note/x/y/article.md'), null);
  assert.equal(stagedArticleDir('scripts/check-orphan-figures.mjs'), null);
});
