// dependabot のセキュリティ更新 PR が main 向きに開いても develop へ付け替える（DN-0637）。
// workflow の if 式と run 本文を取り出し、偽の gh を PATH に置いて実際に走らせる（実際の PR は作らない）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { load } from 'js-yaml';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const wf = load(readFileSync(join(ROOT, '.github/workflows/dependabot-retarget.yml'), 'utf8'));
const job = wf.jobs.retarget;
const step = job.steps[0];

const pr = (login, base) => ({ pull_request: { user: { login }, base: { ref: base }, number: 7 } });
const fires = (login, base) => new Function('github', `return (${job.if});`)({ event: pr(login, base) });

test('main 向きの dependabot の PR だけが対象（develop 向き・人の PR は対象外）', () => {
  assert.equal(fires('dependabot[bot]', 'main'), true);
  assert.equal(fires('dependabot[bot]', 'develop'), false);
  assert.equal(fires('uruhayato373', 'main'), false);
});

test('pull_request_target・main 向き・PR の head を checkout しない・権限は PR の編集だけ', () => {
  assert.deepEqual(Object.keys(wf.on), ['pull_request_target']);
  assert.deepEqual(wf.on.pull_request_target.branches, ['main']);
  assert.deepEqual(wf.permissions, { 'pull-requests': 'write' });
  assert.ok(!job.steps.some((s) => s.uses), '3rd party action を使わない（checkout もしない）');
  assert.ok(!/\$\{\{/.test(step.run), 'run に式を直接埋め込まない（env 経由）');
});

test('run を実行すると gh pr edit --base develop とコメントが呼ばれる', () => {
  const dir = mkdtempSync(join(tmpdir(), 'retarget-'));
  try {
    const log = join(dir, 'calls.log');
    writeFileSync(join(dir, 'gh'), `#!/bin/sh\necho "$@" >> "${log}"\n`);
    chmodSync(join(dir, 'gh'), 0o755);
    const r = spawnSync('bash', ['-c', step.run], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, REPO: 'o/r', PR: '7' },
    });
    assert.equal(r.status, 0, r.stderr);
    const calls = readFileSync(log, 'utf8').trim().split('\n');
    assert.equal(calls[0], 'pr edit 7 --repo o/r --base develop');
    assert.match(calls[1], /^pr comment 7 --repo o\/r --body /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('付け替えに失敗したら job も失敗する（黙って main 向きのまま残さない）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'retarget-'));
  try {
    writeFileSync(join(dir, 'gh'), '#!/bin/sh\nexit 1\n');
    chmodSync(join(dir, 'gh'), 0o755);
    const r = spawnSync('bash', ['-c', step.run], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, REPO: 'o/r', PR: '7' },
    });
    assert.notEqual(r.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
