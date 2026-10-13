// dispatch-log.json の merge driver（DN-0635）。一時の git リポジトリで、末尾に別々の記録を足した 2 本を合わせる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { formatJson } from '../scripts/lib/json-io.mjs';
import { mergeDispatchLog } from '../scripts/merge-dispatch-log.mjs';

const LOG = '.claude/state/dispatch/dispatch-log.json';
const e = (id, task = `t-${id}`) => ({ id, at: '2026-10-12', task, outcome: 'done' });
const doc = (...ids) => ({ _doc: 'd', entries: ids.map((i) => e(i)) });

test('mergeDispatchLog: 両側の末尾の記録を残し、同じ記録は 1 件にする', () => {
  const r = mergeDispatchLog(doc('DN-1'), doc('DN-1', 'DN-2', 'DN-4'), doc('DN-1', 'DN-3', 'DN-4'));
  assert.deepEqual(r.merged.entries.map((x) => x.id), ['DN-1', 'DN-2', 'DN-4', 'DN-3']);
});

test('mergeDispatchLog: 取り込む側が祖先の記録を消している／entries が無い／欄が両側で別々なら衝突', () => {
  assert.ok(mergeDispatchLog(doc('DN-1', 'DN-2'), doc('DN-1', 'DN-2'), doc('DN-1')).conflict);
  assert.ok(mergeDispatchLog(doc('DN-1'), { _doc: 'd' }, doc('DN-1')).conflict);
  const b = doc('DN-1');
  assert.ok(mergeDispatchLog(b, { ...b, _doc: 'x' }, { ...b, _doc: 'y' }).conflict);
  assert.equal(mergeDispatchLog(b, b, { ...b, _doc: 'y' }).merged._doc, 'y');
});

function git(repo, ...args) {
  return spawnSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8' });
}
function commit(repo, ids, msg) {
  writeFileSync(join(repo, LOG), formatJson(doc(...ids)));
  git(repo, 'commit', '-qam', msg);
}
function setup({ register }) {
  const repo = mkdtempSync(join(tmpdir(), 'dispatch-merge-'));
  mkdirSync(join(repo, 'scripts/lib'), { recursive: true });
  mkdirSync(join(repo, '.claude/state/dispatch'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts/merge-dispatch-log.mjs'), join(repo, 'scripts/merge-dispatch-log.mjs'));
  copyFileSync(join(ROOT, 'scripts/lib/json-io.mjs'), join(repo, 'scripts/lib/json-io.mjs'));
  git(repo, 'init', '-q', '-b', 'develop');
  const attrs = readFileSync(join(ROOT, '.gitattributes'), 'utf8').split('\n').filter((l) => l.includes('merge=dispatch-log'));
  assert.equal(attrs.length, 1, '.gitattributes に merge=dispatch-log が 1 行ある');
  writeFileSync(join(repo, '.gitattributes'), `${attrs[0]}\n`);
  if (register) git(repo, 'config', 'merge.dispatch-log.driver', 'node scripts/merge-dispatch-log.mjs %O %A %B');
  writeFileSync(join(repo, LOG), formatJson(doc('DN-1')));
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'base');
  git(repo, 'checkout', '-qb', 'a');
  commit(repo, ['DN-1', 'DN-2'], 'a');
  git(repo, 'checkout', '-q', 'develop');
  git(repo, 'checkout', '-qb', 'b');
  commit(repo, ['DN-1', 'DN-3'], 'b');
  return repo;
}

test('driver 登録あり: 末尾に別々の記録を足した 2 本を合わせても衝突せず、両方の記録が残り書式が保たれる', () => {
  const repo = setup({ register: true });
  try {
    const m = git(repo, 'merge', '--no-edit', 'a');
    assert.equal(m.status, 0, m.stdout + m.stderr);
    const text = readFileSync(join(repo, LOG), 'utf8');
    assert.deepEqual(JSON.parse(text).entries.map((x) => x.id), ['DN-1', 'DN-3', 'DN-2']);
    assert.equal(text, formatJson(JSON.parse(text)));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('driver 未登録: 従来どおり衝突として止まり、片方を黙って捨てない', () => {
  const repo = setup({ register: false });
  try {
    const m = git(repo, 'merge', '--no-edit', 'a');
    assert.notEqual(m.status, 0);
    const text = readFileSync(join(repo, LOG), 'utf8');
    assert.match(text, /<<<<<<<|>>>>>>>/);
    assert.ok(text.includes('DN-2') && text.includes('DN-3'));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('driver 登録あり・合わせられない入力は衝突で止まる', () => {
  const repo = setup({ register: true });
  try {
    git(repo, 'checkout', '-q', 'a');
    writeFileSync(join(repo, LOG), '{ broken');
    git(repo, 'commit', '-qam', 'broken');
    git(repo, 'checkout', '-q', 'b');
    const m = git(repo, 'merge', '--no-edit', 'a');
    assert.notEqual(m.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('install-pre-commit.mjs が driver を登録する（.gitattributes の merge=dispatch-log と同じ名前）', () => {
  const src = readFileSync(join(ROOT, 'scripts/install-pre-commit.mjs'), 'utf8');
  assert.match(src, /merge\.dispatch-log\.driver/);
  assert.match(src, /merge-dispatch-log\.mjs %O %A %B/);
});
