// ops-write.test.mjs — ops-write.mjs（plan/exec CLI）の回帰テスト。fake spawn で子プロセスを起動しない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from '../scripts/ops-write.mjs';
import { WRITE_PLAN_HASH_ENV, buildPlan, operationFromCatalog, loadCatalog } from '../scripts/lib/ci-write-gate.mjs';

/** 最小の一時 repo: カタログ + registry + 入力ファイル。 */
function makeRepo({ verify = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ops-write-'));
  mkdirSync(join(root, '.claude/config'), { recursive: true });
  mkdirSync(join(root, 'content/note/a'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'content/note/a/article.md'), '# v1\n');
  writeFileSync(join(root, 'scripts/note-publish.mjs'), '// stub\n');
  for (const v of verify) writeFileSync(join(root, v), '// stub verify\n');

  writeFileSync(
    join(root, '.claude/config/playwright-auth-profiles.json'),
    JSON.stringify({
      version: 2,
      services: {
        note: {
          ci: {
            mode: 'encrypted-state',
            enabled: false,
            canary: false,
            operations: ['read', 'write'],
            readOnlyScripts: [],
            writeScripts: ['scripts/note-publish.mjs'],
            stateDomains: ['note.com'],
          },
          stateFileName: 'note.json',
        },
      },
    }),
  );

  const catalog = {
    version: 1,
    operations: {
      'note.publish': {
        service: 'note',
        script: 'scripts/note-publish.mjs',
        risk: 'high',
        argsSchema: { article: 'string' },
        inputs: ['{article}'],
        commitArgs: ['--commit'],
        verify,
        ledger: [],
      },
    },
  };
  writeFileSync(join(root, '.claude/config/ci-write-operations.json'), JSON.stringify(catalog));
  return root;
}

function collector() {
  const out = [];
  const err = [];
  return { out, err, stdout: (s) => out.push(s), stderr: (s) => err.push(s) };
}

function fakeSpawn(calls, rcMap = {}) {
  return (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    const key = [cmd, ...args].join(' ');
    return { status: rcMap[key] ?? 0 };
  };
}

test('plan: hash と gh コマンドを出す', () => {
  const root = makeRepo();
  try {
    const io = collector();
    const code = run(['plan', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}'], { root, env: {}, ...io });
    assert.equal(code, 0);
    const text = io.out.join('\n');
    assert.match(text, /hash: [0-9a-f]{64}/);
    assert.match(text, /gh workflow run ops-write\.yml --ref develop -f operation=note\.publish/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('exec: 非 CI 環境では拒否される（前提不成立・exit 2）', () => {
  const root = makeRepo();
  try {
    const io = collector();
    const calls = [];
    const code = run(
      ['exec', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}', '--plan-sha256', 'a'.repeat(64), '--commit'],
      { root, env: {}, spawn: fakeSpawn(calls), ...io },
    );
    assert.equal(code, 2);
    assert.equal(calls.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('exec: CI で hash 不一致は exit 2 で spawn を呼ばない', () => {
  const root = makeRepo();
  try {
    const io = collector();
    const calls = [];
    const code = run(
      ['exec', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}', '--plan-sha256', 'a'.repeat(64), '--commit'],
      { root, env: { GITHUB_ACTIONS: 'true' }, spawn: fakeSpawn(calls), ...io },
    );
    assert.equal(code, 2);
    assert.equal(calls.length, 0);
    assert.match(io.err.join('\n'), /hash mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('exec: hash 一致 + commit で spawn が commitArgs と env(hash) で1回呼ばれる（verify無し）', () => {
  const root = makeRepo();
  try {
    const catalog = loadCatalog(root, { registry: { services: { note: { ci: { mode: 'encrypted-state', operations: ['read', 'write'], readOnlyScripts: [], writeScripts: ['scripts/note-publish.mjs'] } } } } });
    const op = operationFromCatalog(catalog, 'note.publish');
    const { hash } = buildPlan(root, op, { article: 'content/note/a/article.md' });

    const io = collector();
    const calls = [];
    const code = run(
      ['exec', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}', '--plan-sha256', hash, '--commit'],
      { root, env: { GITHUB_ACTIONS: 'true', PATH: '/usr/bin' }, spawn: fakeSpawn(calls), ...io },
    );
    assert.equal(code, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].cmd, 'node');
    assert.deepEqual(calls[0].args, ['scripts/note-publish.mjs', '--commit', '--article', 'content/note/a/article.md']);
    assert.equal(calls[0].opts.env[WRITE_PLAN_HASH_ENV], hash);
    assert.equal(calls[0].opts.env.PATH, '/usr/bin');
    const result = JSON.parse(io.out.find((l) => l.startsWith('{')));
    assert.deepEqual(result, { operation: 'note.publish', hash, executed: true, rc: 0, verify: [] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('exec: commit 無しは plan-only で spawn を呼ばない', () => {
  const root = makeRepo();
  try {
    const io = collector();
    const calls = [];
    const code = run(
      ['exec', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}', '--plan-sha256', 'a'.repeat(64)],
      { root, env: { GITHUB_ACTIONS: 'true' }, spawn: fakeSpawn(calls), ...io },
    );
    assert.equal(code, 0);
    assert.equal(calls.length, 0);
    assert.match(io.out.join('\n'), /plan-only/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('exec: verify 失敗で exit 1（本体は成功していても）', () => {
  const root = makeRepo({ verify: ['scripts/verify-note.mjs'] });
  try {
    const catalog = loadCatalog(root, { registry: { services: { note: { ci: { mode: 'encrypted-state', operations: ['read', 'write'], readOnlyScripts: [], writeScripts: ['scripts/note-publish.mjs'] } } } } });
    const op = operationFromCatalog(catalog, 'note.publish');
    const { hash } = buildPlan(root, op, { article: 'content/note/a/article.md' });

    const io = collector();
    const calls = [];
    const rcMap = { 'node scripts/verify-note.mjs': 1 };
    const code = run(
      ['exec', '--operation', 'note.publish', '--args', '{"article":"content/note/a/article.md"}', '--plan-sha256', hash, '--commit'],
      { root, env: { GITHUB_ACTIONS: 'true' }, spawn: fakeSpawn(calls, rcMap), ...io },
    );
    assert.equal(code, 1);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].args, ['scripts/verify-note.mjs']);
    const result = JSON.parse(io.out.find((l) => l.startsWith('{')));
    assert.deepEqual(result.verify, [{ script: 'scripts/verify-note.mjs', rc: 1 }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
