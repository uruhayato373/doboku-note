import './lib/isolate-git-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commitStageRecords } from '../scripts/lib/weekly-collect-commit.mjs';

const git = (root, a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });

/** 中身に BAD を含むファイルの commit を止める pre-commit を持つ一時リポジトリ（staged 全体を見る本物の pre-commit と同じ形） */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'wc-commit-'));
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 't@example.com']);
  git(root, ['config', 'user.name', 't']);
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'data/a8.json'), '{"v":0}\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'init']);
  const hook = join(root, '.git/hooks/pre-commit');
  writeFileSync(hook, '#!/bin/sh\nif git diff --cached -U0 | grep -q BAD; then echo "[pre-commit] qualification-market: 未分類 1 件" >&2; exit 1; fi\n');
  chmodSync(hook, 0o755);
  return root;
}

const stageAll = (root) => () => { git(root, ['add', '-A', 'data']); return null; };

test('2 段のうち 1 段の記録だけが検査で落ちても、もう 1 段の記録は commit され、落ちた段は理由つきで退避される（DN-1195）', () => {
  const root = repo();
  const keep = join(root, '..', `${root.split('/').pop()}-keep`);
  // 段 1: 売上（検査で落ちる）。追跡済みの変更と新規ファイル
  writeFileSync(join(root, 'data/a8.json'), '{"v":"BAD"}\n');
  writeFileSync(join(root, 'data/sales.json'), '{"BAD":1}\n');
  const r1 = commitStageRecords({ root, message: 'sales', stage: stageAll(root), keepDir: keep });
  assert.equal(r1.status, 'set-aside');
  assert.match(r1.problem, /qualification-market/);
  assert.deepEqual(r1.files.sort(), ['data/a8.json', 'data/sales.json']);
  // 作業ツリーと index は HEAD に戻り、退避先に中身が残る
  assert.equal(git(root, ['status', '--porcelain']).stdout, '');
  assert.equal(readFileSync(join(root, 'data/a8.json'), 'utf8'), '{"v":0}\n');
  assert.equal(readFileSync(join(keep, 'data/sales.json'), 'utf8'), '{"BAD":1}\n');
  assert.match(readFileSync(join(keep, 'reason.txt'), 'utf8'), /qualification-market/);

  // 段 2: ココナラ（通る）。段 1 の違反が staged に残っていないので commit できる
  writeFileSync(join(root, 'data/coconala.json'), '{"ok":1}\n');
  let pushed = 0;
  const r2 = commitStageRecords({ root, message: 'coconala', stage: stageAll(root), keepDir: `${keep}-2`, push: () => { pushed += 1; return {}; } });
  assert.equal(r2.status, 'committed');
  assert.deepEqual(r2.files, ['data/coconala.json']);
  assert.equal(pushed, 1);
  assert.equal(git(root, ['log', '-1', '--format=%s']).stdout.trim(), 'coconala');
  assert.ok(!existsSync(`${keep}-2`));
  rmSync(root, { recursive: true }); rmSync(keep, { recursive: true });
});

test('記録が無い段は何もしない・add の型の違反も退避して次を止めない', () => {
  const root = repo();
  assert.equal(commitStageRecords({ root, message: 'x', stage: stageAll(root), keepDir: join(root, 'k') }).status, 'clean');
  writeFileSync(join(root, 'data/kdp.json'), '{"bad-type":1}\n');
  const keep = join(tmpdir(), `wc-keep-${process.pid}`);
  const r = commitStageRecords({ root, message: 'kdp', keepDir: keep, stage: () => { git(root, ['add', '-A', 'data']); return 'ci-data add が exit 1（型の違反か git の失敗）'; } });
  assert.equal(r.status, 'set-aside');
  assert.equal(git(root, ['status', '--porcelain']).stdout, '');
  assert.ok(existsSync(join(keep, 'data/kdp.json')));
  rmSync(root, { recursive: true }); rmSync(keep, { recursive: true });
});
