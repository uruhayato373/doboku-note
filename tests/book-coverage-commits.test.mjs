/**
 * 書籍の網羅で「展開済み」と数えるコミット（scripts/lib/book-coverage-commits.mjs）のテスト。一時の git リポジトリで確かめる。
 *
 * 守りたい事故（DN-0659）: 判定し直す前の展開コミットを、新しい計画の展開として数え、`--status` が進んだように見える。
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { expansionCommits, headSha } from '../scripts/lib/book-coverage-commits.mjs';

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'book-coverage-commits-'));
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  let n = 0;
  const commit = (msg, file = 'content/site/x/a/article.mdx') => {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), `${n += 1}\n`);
    git('add', '--', file);
    git('commit', '-q', '-m', msg);
    return git('rev-parse', '--short', 'HEAD').trim();
  };
  return { root, commit, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('expansionCommits: since より後の展開だけを数える（判定し直す前のコミットは数えない）', () => {
  const r = repo();
  try {
    const before = r.commit('content: 前の判定からの展開\n\nBook-Coverage: book-a');
    const judged = headSha(r.root);
    const after = r.commit('content: 判定し直したあとの展開\n\nBook-Coverage: book-a,book-b');
    const dir = 'content/site/x/a/';
    assert.deepEqual(expansionCommits({ root: r.root, dir, sourceId: 'book-a' }), [after, before], 'since が無ければ全部数える（従来どおり）');
    assert.deepEqual(expansionCommits({ root: r.root, dir, sourceId: 'book-a', since: judged }), [after]);
    assert.deepEqual(expansionCommits({ root: r.root, dir, sourceId: 'book-b', since: judged }), [after], '「,」区切りの複数 id');
  } finally {
    r.done();
  }
});

test('expansionCommits: ほかの書籍の trailer・trailer の無いコミット・ほかの記事は数えない', () => {
  const r = repo();
  try {
    const judged = r.commit('chore: 判定');
    r.commit('content: ほかの本\n\nBook-Coverage: book-z');
    r.commit('content: trailer なしの修正');
    r.commit('content: ほかの記事\n\nBook-Coverage: book-a', 'content/site/x/b/article.mdx');
    assert.deepEqual(expansionCommits({ root: r.root, dir: 'content/site/x/a/', sourceId: 'book-a', since: judged }), []);
  } finally {
    r.done();
  }
});
