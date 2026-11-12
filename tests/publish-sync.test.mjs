// tests/publish-sync.test.mjs — publish の事前検査・drive-manifest のマージ・run の選び方（DN-1103・DN-1072）
import './lib/isolate-git-env.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serializeDriveManifest } from '../scripts/lib/drive-vault.mjs';
import { DRIVE_MANIFEST_REL, assertCleanTree, dispatchAndWatch, mergeDriveManifests, pickNewerRun, pullRebaseResolvingManifest } from '../scripts/lib/publish-sync.mjs';

const man = (entries, extra = {}) => ({ version: 1, note: 'n', ...extra, entries });
const e = (n) => ({ group: 'repo-archive', sha256: String(n).padStart(64, '0') });

test('マージ: 両側が別のキーを足しただけなら両方を残す', () => {
  const m = mergeDriveManifests(man({ a: e(1) }), man({ a: e(1), b: e(2) }), man({ a: e(1), c: e(3) }));
  assert.deepEqual(Object.keys(m.entries).sort(), ['a', 'b', 'c']);
});
test('マージ: 同じキーが別の値なら解かない', () => {
  assert.throws(() => mergeDriveManifests(man({}), man({ k: e(1) }), man({ k: e(2) })), /同じキーで食い違う.*k/);
  assert.deepEqual(mergeDriveManifests(man({}), man({ k: e(1) }), man({ k: e(1) })).entries, { k: e(1) });
});
test('マージ: ヘッダが両側で別に変わっていたら解かない', () => {
  assert.throws(() => mergeDriveManifests(man({}), man({}, { note: 'x' }), man({}, { note: 'y' })), /header:note/);
});

test('未コミットの変更があれば何もしないうちに止まる', () => {
  assert.throws(() => assertCleanTree('/x', { git: () => ' M scripts/a.mjs\n M b.json\n' }), /未コミットの変更がある（2 件）/);
  assert.doesNotThrow(() => assertCleanTree('/x', { git: (...a) => { assert.ok(a.includes('--untracked-files=no')); return ''; } }));
});

test('dispatch の前に控えた run id より新しい run を待つ（直前の完了済みの run を拾わない）', () => {
  assert.equal(pickNewerRun([{ databaseId: 100 }, { databaseId: 99 }], 100), null);
  assert.equal(pickNewerRun([{ databaseId: 101 }, { databaseId: 100 }], 100).databaseId, 101);
  const calls = [];
  let listed = 0;
  const gh = (args) => {
    calls.push(args[0] + ':' + args[1]);
    if (args[0] === 'workflow') return null;
    listed += 1;
    // 1 回目＝dispatch 前、2 回目＝まだ登録されていない、3 回目＝新しい run
    return JSON.stringify(listed < 3 ? [{ databaseId: 100 }] : [{ databaseId: 105 }, { databaseId: 100 }]);
  };
  const watched = [];
  const r = dispatchAndWatch('/x', { pub: 'e/w/youtube.longform', digest: 'd', gh, sleep: () => {}, watch: (id) => { watched.push(id); return { status: 0 }; } });
  assert.deepEqual(watched, ['105']);
  assert.equal(r.run, '105');
  assert.equal(calls[0], 'run:list', 'dispatch の前に最新を控える');
  assert.equal(calls[1], 'workflow:run');
  assert.throws(() => dispatchAndWatch('/x', { pub: 'p', digest: 'd', gh: (a) => (a[0] === 'workflow' ? null : '[{"databaseId":1}]'), sleep: () => {}, attempts: 2, watch: () => ({ status: 0 }) }), /run が現れない/);
});

// 実 git で rebase の競合を作る
const sh = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function repoWith(oursEntries, theirsEntries) {
  const dir = mkdtempSync(join(tmpdir(), 'publish-sync-'));
  const origin = join(dir, 'origin.git'), work = join(dir, 'work'), other = join(dir, 'other');
  sh(dir, 'init', '--bare', '-b', 'develop', origin);
  for (const d of [work, other]) { sh(dir, 'clone', origin, d); sh(d, 'config', 'user.email', 't@t'); sh(d, 'config', 'user.name', 't'); sh(d, 'checkout', '-B', 'develop'); }
  const write = (d, entries) => { mkdirSync(join(d, '.claude/state/assets'), { recursive: true }); writeFileSync(join(d, DRIVE_MANIFEST_REL), serializeDriveManifest(man(entries))); };
  write(work, { base: e(1) }); sh(work, 'add', '.'); sh(work, 'commit', '-m', 'base'); sh(work, 'push', 'origin', 'develop');
  sh(other, 'pull', 'origin', 'develop');
  write(other, { base: e(1), ...theirsEntries }); sh(other, 'commit', '-am', 'theirs'); sh(other, 'push', 'origin', 'develop');
  write(work, { base: e(1), ...oursEntries }); sh(work, 'commit', '-am', 'ours');
  return { dir, work };
}

test('git pull --rebase で drive-manifest が競合しても、両側が足しただけなら解いて続ける', () => {
  const r = repoWith({ ours: e(2) }, { theirs: e(3) });
  try {
    assert.equal(pullRebaseResolvingManifest(r.work).resolved, 1);
    const m = JSON.parse(readFileSync(join(r.work, DRIVE_MANIFEST_REL), 'utf8'));
    assert.deepEqual(Object.keys(m.entries).sort(), ['base', 'ours', 'theirs']);
    assert.equal(sh(r.work, 'status', '--porcelain').trim(), '');
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('同じキーが別の値なら rebase は解かず例外になる', () => {
  const r = repoWith({ k: e(2) }, { k: e(3) });
  try {
    assert.throws(() => pullRebaseResolvingManifest(r.work), /同じキーで食い違う/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});
