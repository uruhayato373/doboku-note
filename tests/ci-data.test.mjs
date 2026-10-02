import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { add, changedFiles, latest, restore, save, staticPathOf } from '../scripts/ci-data.mjs';

const git = (root, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'core.autocrlf=false', ...args], { cwd: root, encoding: 'utf8' });
const put = (root, rel, body) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
};

const OLD_PSI = 'data/metrics/psi/psi-batch-2026-09-01T00-00-00.json';
const NEW_PSI = 'data/metrics/psi/psi-batch-2026-10-01T00-00-00.json';
const EXPERIMENTS = 'data/experiments.json';
const NOTE_HISTORY = 'data/note/history/competitors-2026-10-01.json';

/** CI の流れ（書く → 退避 → develop の先頭へ戻す → 書き戻す）を一時リポジトリで再現する */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'ci-data-'));
  git(root, 'init', '-q');
  put(root, OLD_PSI, '{"v":1}\n');
  put(root, EXPERIMENTS, '{"v":1}\n');
  put(root, 'data/note/competitors-snapshot.json', '{"v":1}\n');
  put(root, 'content/a.txt', 'a\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  // ジョブが書いたもの: 新しい batch・既存の書き換え・古い batch の削除・別チャネルの履歴
  put(root, NEW_PSI, '{"v":2}\n');
  put(root, EXPERIMENTS, '{"v":2}\n');
  rmSync(join(root, OLD_PSI));
  put(root, NOTE_HISTORY, '{"n":1}\n');
  put(root, 'content/a.txt', 'changed\n');
  return root;
}

test('changedFiles: 追加・変更・削除・未追跡を拾い、根の外は拾わない', () => {
  const root = repo();
  try {
    const got = Object.fromEntries(changedFiles(root, ['data']).map((e) => [e.path, e.deleted]));
    assert.deepEqual(got, { [NEW_PSI]: false, [EXPERIMENTS]: false, [OLD_PSI]: true, [NOTE_HISTORY]: false });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('save → 先頭へ戻す → restore: 書いたものと削除が戻り、除外したデータセットは戻さない', () => {
  const root = repo();
  const dir = mkdtempSync(join(tmpdir(), 'ci-data-out-'));
  try {
    const s = save(root, dir, { paths: ['data'] });
    assert.deepEqual(s, { files: 3, deleted: 1 });
    git(root, 'checkout', '-q', '-f', 'HEAD');
    git(root, 'clean', '-q', '-fd');
    assert.ok(existsSync(join(root, OLD_PSI)) && !existsSync(join(root, NEW_PSI)));

    const r = restore(root, dir, { excludeDatasets: ['business.experiments'] });
    assert.equal(r.files, 2);
    assert.equal(r.deleted, 1);
    assert.equal(r.skipped, 1);
    assert.equal(readFileSync(join(root, NEW_PSI), 'utf8'), '{"v":2}\n');
    assert.ok(!existsSync(join(root, OLD_PSI)), '削除が反映される');
    assert.equal(readFileSync(join(root, EXPERIMENTS), 'utf8'), '{"v":1}\n', '除外したものは develop の版のまま');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('save: datasets を指定すると、そのデータセットの変更だけを退避する（同じ dir に複数回保存できる）', () => {
  const root = repo();
  const dir = mkdtempSync(join(tmpdir(), 'ci-data-out-'));
  try {
    assert.deepEqual(save(root, dir, { datasets: ['note.competitors'], name: 'note' }), { files: 1, deleted: 0 });
    assert.deepEqual(save(root, dir, { datasets: ['psi.batch'], name: 'psi' }), { files: 1, deleted: 1 });
    git(root, 'checkout', '-q', '-f', 'HEAD');
    git(root, 'clean', '-q', '-fd');
    const r = restore(root, dir);
    assert.equal(r.manifests, 2);
    assert.ok(existsSync(join(root, NOTE_HISTORY)) && existsSync(join(root, NEW_PSI)) && !existsSync(join(root, OLD_PSI)));
    assert.equal(readFileSync(join(root, EXPERIMENTS), 'utf8'), '{"v":1}\n', '指定外は退避しない');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('add: 無いパスは飛ばし（失敗しない）、削除も stage する。datasets は当たる変更だけ', () => {
  const root = repo();
  try {
    const r = add(root, { paths: ['data/metrics', '.claude/state/x-repost'] });
    assert.deepEqual(r.skipped, ['.claude/state/x-repost']);
    const staged = git(root, 'diff', '--cached', '--name-status').trim().split('\n').sort();
    assert.deepEqual(staged, [`A\t${NEW_PSI}`, `D\t${OLD_PSI}`].sort());

    git(root, 'reset', '-q');
    add(root, { datasets: ['note.competitors'] });
    assert.deepEqual(git(root, 'diff', '--cached', '--name-only').trim().split('\n'), [NOTE_HISTORY]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('latest・staticPathOf: 台帳からパスを引く', () => {
  const root = repo();
  try {
    assert.equal(latest(root, 'psi.batch'), NEW_PSI);
    assert.equal(latest(root, 'gsc.page'), null);
    assert.equal(staticPathOf('psi.batch'), 'data/metrics/psi');
    assert.equal(staticPathOf('psi.report'), 'data/metrics/psi/latest-report.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
