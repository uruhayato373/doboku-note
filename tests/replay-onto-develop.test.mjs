/**
 * scripts/replay-onto-develop.mjs（DN-0559）: 同じパッチ・衝突・commit 失敗の後に呼ばれた、の 3 通りを
 * 一時の git リポジトリ（origin も一時の bare）で固定する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts', 'replay-onto-develop.mjs');
const g = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 24 }).trim();

/** origin（bare）と作業用クローン。develop に a.txt、別セッションの先行 commit 用に 2 つ目のクローンも返す */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'replay-'));
  const origin = join(dir, 'origin.git');
  const work = join(dir, 'work');
  const other = join(dir, 'other');
  g(dir, 'init', '-q', '--bare', '-b', 'develop', origin);
  for (const p of [work, other]) {
    g(dir, 'clone', '-q', origin, p);
    g(p, 'config', 'user.email', 't@example.com');
    g(p, 'config', 'user.name', 't');
    g(p, 'config', 'commit.gpgsign', 'false');
  }
  writeFileSync(join(work, 'a.txt'), 'one\ntwo\nthree\n');
  g(work, 'add', 'a.txt');
  g(work, 'commit', '-q', '-m', 'init');
  g(work, 'push', '-q', 'origin', 'develop');
  g(other, 'pull', '-q', 'origin', 'develop');
  return { dir, origin, work, other };
}
const run = (cwd, ...args) => spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
const commitFile = (cwd, file, text, msg) => {
  writeFileSync(join(cwd, file), text);
  g(cwd, 'add', file);
  g(cwd, 'commit', '-q', '-m', msg);
  return g(cwd, 'rev-parse', 'HEAD');
};

test('同じパッチ: develop が進んでいても載せ直し、--push で origin に届く', () => {
  const { dir, origin, work, other } = setup();
  try {
    g(work, 'checkout', '-q', '-b', 'feature');
    const c1 = commitFile(work, 'b.txt', 'b\n', 'add b');
    const c2 = commitFile(work, 'c.txt', 'c\n', 'add c');
    commitFile(other, 'z.txt', 'z\n', 'other session');
    g(other, 'push', '-q', 'origin', 'develop');

    const r = run(work, c1, c2, '--push');
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /パッチ照合 OK（2 本/);
    assert.equal(g(work, 'log', '--format=%s', 'origin/develop..HEAD'), 'add c\nadd b');
    assert.equal(g(work, 'rev-parse', 'HEAD'), g(origin, 'rev-parse', 'feature'));
    assert.equal(g(work, 'merge-base', 'HEAD', 'origin/develop'), g(origin, 'rev-parse', 'develop'));
    assert.equal(readFileSync(join(work, 'z.txt'), 'utf8'), 'z\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('衝突: cherry-pick が止まったら非 0・--quit で抜け・push しない（作業ツリーは触らない）', () => {
  const { dir, origin, work, other } = setup();
  try {
    g(work, 'checkout', '-q', '-b', 'feature');
    const c1 = commitFile(work, 'a.txt', 'one\nMINE\nthree\n', 'edit a (mine)');
    const before = g(work, 'rev-parse', 'HEAD');
    commitFile(other, 'a.txt', 'one\nTHEIRS\nthree\n', 'edit a (theirs)');
    g(other, 'push', '-q', 'origin', 'develop');

    const r = run(work, c1, '--push');
    assert.equal(r.status, 1, r.stderr + r.stdout);
    assert.match(r.stderr, /cherry-pick が止まりました/);
    assert.match(r.stderr, new RegExp(`git reset --keep ${before}`));
    assert.equal(spawnSync('git', ['rev-parse', '--verify', '--quiet', 'CHERRY_PICK_HEAD'], { cwd: work }).status, 1, 'cherry-pick を --quit で抜けている');
    assert.equal(spawnSync('git', ['ls-remote', '--exit-code', origin, 'feature']).status, 2, 'push していない');
    assert.match(readFileSync(join(work, 'a.txt'), 'utf8'), /<<<<<<<|THEIRS/, '衝突したファイルは触らない');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('commit 失敗の後に呼ばれた: 無い sha で止まり、HEAD も origin も動かさない', () => {
  const { dir, origin, work } = setup();
  try {
    g(work, 'checkout', '-q', '-b', 'feature');
    const good = commitFile(work, 'b.txt', 'b\n', 'add b');
    const head = g(work, 'rev-parse', 'HEAD');
    const missing = 'deadbeef'.repeat(5);

    const r = run(work, good, missing, '--push');
    assert.equal(r.status, 2, r.stderr + r.stdout);
    assert.match(r.stderr, /commit が在りません/);
    assert.equal(g(work, 'rev-parse', 'HEAD'), head);
    assert.equal(spawnSync('git', ['ls-remote', '--exit-code', origin, 'feature']).status, 2);
    assert.equal(run(work).status, 2, 'sha なしは使い方の誤り');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
