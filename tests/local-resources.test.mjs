import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safePath, scanTree, acquireLock, warningsFor, GiB } from '../scripts/lib/local-resources.mjs';
import { canClean } from '../scripts/local-resource-clean.mjs';
import { spawnSync } from 'node:child_process';

function fixture(t) { const root = mkdtempSync(join(tmpdir(), 'resource-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
test('scanner counts files and never reads their contents; missing differs from failed', t => {
  const root = fixture(t); mkdirSync(join(root, 'data')); writeFileSync(join(root, 'data/a'), '123');
  const result = scanTree(root, 'data'); assert.equal(result.bytes, 3); assert.equal(result.files, 1);
  assert.equal(scanTree(root, 'missing').files, 0);
  assert.equal(scanTree(root, 'data', 0).errors.length, 1);
});
test('cleanup paths reject traversal, workspace root and junction escapes', t => {
  const root = fixture(t), other = fixture(t);
  assert.throws(() => safePath(root, '../outside')); assert.throws(() => safePath(root, '.'));
  symlinkSync(other, join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => safePath(root, 'link/file'));
});
test('lock excludes concurrent invocations and is reusable after release', t => {
  const root = fixture(t); const release = acquireLock(root, 'test');
  assert.throws(() => acquireLock(root, 'test')); release(); acquireLock(root, 'test')();
});
test('age alone never overrides active process, links or incomplete inspection', () => {
  const row = { files: 1, errors: [], links: 0, newestMs: 0 };
  const idle = { complete: true, rows: [] };
  assert.equal(canClean(row, 7, idle, 'build'), true);
  assert.equal(canClean(row, 7, { complete: false, rows: [] }, 'build'), false);
  assert.equal(canClean(row, 7, { complete: true, rows: [{ kind: 'next' }] }, 'build'), false);
  assert.equal(canClean(row, 7, { complete: true, rows: [{ kind: 'preview' }] }, 'build'), false);
  assert.equal(canClean(row, 7, { complete: true, rows: [{ kind: 'browser' }] }, 'browser-cache'), false);
  assert.equal(canClean({ ...row, links: 1 }, 7, idle, 'scratch'), false);
  assert.equal(canClean({ ...row, errors: ['denied'] }, 7, idle, 'scratch'), false);
  assert.equal(canClean({ ...row, newestMs: Date.now() }, 7, idle, 'scratch'), false);
});
test('warning thresholds and growth distinguish LFS and multiple tool processes', () => {
  const policy = { minFreeDiskGiB: 20, minFreeMemoryGiB: 3, growthWarnGiB: 1, budgetsGiB: { '.git/lfs': 2 } };
  const snapshot = { machine: { freeDiskBytes: 10 * GiB, freeMemoryBytes: 2 * GiB }, directories: [{ path: '.git/lfs', bytes: 3 * GiB }], processes: { rows: [{ kind: 'mcp:github' }, { kind: 'mcp:github' }] } };
  assert.deepEqual(warningsFor(snapshot, policy, { directories: [{ path: '.git/lfs', bytes: GiB }] }), ['low-disk', 'low-memory', 'budget:.git/lfs', 'growth:.git/lfs', 'multiple:mcp:github:2']);
});
test('heavy-work wrapper propagates child failure and releases its lock', () => {
  const run = () => spawnSync(process.execPath, ['scripts/local-resource-run.mjs', '--', 'node', '-e', 'process.exit(7)'], { encoding: 'utf8', env: { ...process.env, CI: 'true' }, timeout: 10000 });
  assert.equal(run().status, 7);
  assert.equal(run().status, 7);
});
