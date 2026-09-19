/**
 * backfill-mdx-dates --staged（pre-commit）がマージ commit では日付を打たないことを固定する。
 *
 * 背景（2026-09-19）: 他 branch を merge するとき「相手側の変更」が staged に載るだけで、この端末で
 * 記事を編集したわけではない。従来の hook はそれを今日の編集と見なし、#517 のマージで 20 記事の
 * dateModified がマージ日に動いた（sitemap lastmod の偽更新＝クロール枠の無駄。#517 自身が止めよう
 * としていた事象）。MERGE_HEAD がある間は据え置く。
 */
import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, '.claude/scripts/backfill-mdx-dates.mjs');

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'mdx-dates-merge-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@x' } });
  git('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'content/site/a'), { recursive: true });
  const mdx = join(dir, 'content/site/a/article.mdx');
  writeFileSync(mdx, '---\ntitle: t\ncreated: 2026-01-01\ndateModified: 2026-01-02\n---\n\nbody\n');
  git('add', '.'); git('commit', '-q', '-m', 'base');
  return { dir, git, mdx };
}

test('MERGE_HEAD があるときは staged の MDX に日付を打たず据え置きを明示する', () => {
  const { dir, git, mdx } = makeRepo();
  try {
    // 相手 branch で本文を変え、main へ --no-commit で merge（MERGE_HEAD が立つ）
    git('checkout', '-q', '-b', 'other');
    writeFileSync(mdx, readFileSync(mdx, 'utf8') + '\nmore\n');
    git('commit', '-q', '-am', 'other edit');
    git('checkout', '-q', 'main');
    writeFileSync(join(dir, 'README.md'), 'x\n'); git('add', 'README.md'); git('commit', '-q', '-m', 'diverge');
    git('merge', '--no-commit', '--no-ff', 'other');
    const r = spawnSync(process.execPath, [SCRIPT, '--staged'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /マージ commit のため据え置き/);
    assert.match(readFileSync(mdx, 'utf8'), /^dateModified: 2026-01-02$/m, 'マージ中に dateModified が書き換えられた');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('通常の commit（MERGE_HEAD 無し）では従来どおり staged の MDX に今日を打つ', () => {
  const { dir, git, mdx } = makeRepo();
  try {
    writeFileSync(mdx, readFileSync(mdx, 'utf8') + '\nedit\n');
    git('add', 'content/site/a/article.mdx');
    const r = spawnSync(process.execPath, [SCRIPT, '--staged'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(readFileSync(mdx, 'utf8'), /^dateModified: 2026-01-02$/m, '通常 commit で dateModified が更新されていない');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
