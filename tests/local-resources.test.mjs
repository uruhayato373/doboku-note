import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safePath, scanTree, acquireLock, warningsFor, GiB, ensureGitMaintenance, renderCleanupWrapper } from '../scripts/lib/local-resources.mjs';
import { pruneTmp } from '../scripts/prune-tmp.mjs';
import { applyFixes } from '../scripts/disk-hygiene.mjs';
import { canClean, cleanMain } from '../scripts/local-resource-clean.mjs';
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
test('quick startup probe remains available while a full audit holds its lock', () => {
  const release = acquireLock(process.cwd(), 'audit');
  try {
    const result = spawnSync(process.execPath, ['scripts/local-resource-audit.mjs', '--quick'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
  } finally { release(); }
});

function cleanupFixture(t) {
  const root = fixture(t);
  for (const dir of ['.claude/config', '.claude/state/assets', '.tmp/scratch']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, '.claude/config/local-resources.json'), JSON.stringify({ scanTimeoutMs: 10000, cleanup: { scratch: { roots: ['.tmp/scratch'], minAgeDays: 7 } } }));
  for (const name of ['manifest.json', 'drive-manifest.json']) writeFileSync(join(root, '.claude/state/assets', name), '{"entries":{}}');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  const age = (Date.now() - 20 * 86400000) / 1000;
  const expire = () => { for (const path of ['.tmp/scratch/a', '.tmp/scratch']) utimesSync(join(root, path), age, age); };
  writeFileSync(join(root, '.tmp/scratch/a'), '123'); expire();
  const options = { root, quiet: true, inspectProcesses: () => ({ complete: true, rows: [] }) };
  return { root, options, expire };
}
test('shared cleanup defaults to dry-run and removes only expired scratch, leaving sibling output', t => {
  const { root, options } = cleanupFixture(t);
  writeFileSync(join(root, '.tmp/keep'), 'source');
  const preview = cleanMain([], options);
  assert.equal(preview.rows[0].eligible, true); assert.equal(preview.deleted, 0);
  const result = cleanMain(['--commit'], options);
  assert.equal(result.deleted, 1); assert.equal(result.freedBytes, 3);
  assert.equal(existsSync(join(root, '.tmp/keep')), true);
});
test('shared cleanup protects tracked and registered scratch even with include-recent', t => {
  const { root, options, expire } = cleanupFixture(t);
  assert.equal(spawnSync('git', ['add', '.tmp/scratch/a'], { cwd: root }).status, 0);
  assert.equal(cleanMain(['--commit', '--include-recent'], options).deleted, 0);
  assert.equal(spawnSync('git', ['rm', '--cached', '.tmp/scratch/a'], { cwd: root }).status, 0);
  writeFileSync(join(root, '.claude/state/assets/drive-manifest.json'), '{"entries":{".tmp/scratch/a":{}}}'); expire();
  assert.equal(cleanMain(['--commit'], options).deleted, 0);
});
test('shared cleanup protects nested worktrees and rejects incomplete live inspection', t => {
  const { root, options } = cleanupFixture(t);
  writeFileSync(join(root, '.tmp/scratch/.git'), 'gitdir: elsewhere');
  assert.equal(cleanMain(['--commit', '--include-recent'], options).deleted, 0);
  rmSync(join(root, '.tmp/scratch/.git'));
  const result = cleanMain(['--commit', '--include-recent'], { ...options, inspectProcesses: () => ({ complete: false, rows: [] }) });
  assert.equal(result.complete, false); assert.equal(result.deleted, 0);
});
test('shared cleanup rechecks live processes before deleting', t => {
  const { root, options } = cleanupFixture(t);
  let calls = 0;
  assert.throws(() => cleanMain(['--commit'], { ...options, inspectProcesses: () => ({ complete: ++calls === 1, rows: [] }) }), /Became active/);
  assert.equal(existsSync(join(root, '.tmp/scratch/a')), true);
});

test('Git maintenance installation propagates registration failure', () => {
  let args;
  ensureGitMaintenance('repo', (...values) => { args = values; return { status: 0 }; });
  assert.deepEqual(args.slice(0, 2), ['git', ['maintenance', 'start']]);
  assert.equal(args[2].cwd, 'repo');
  assert.throws(() => ensureGitMaintenance('repo', () => ({ status: 1, stderr: 'scheduler unavailable' })), /scheduler unavailable/);
});
test('Windows inventory distinguishes agents, WebView and shell text from running Next', { skip: process.platform !== 'win32' }, t => {
  const root = fixture(t);
  const sample = [
    ['ChatGPT.exe', 'app', 'agent:chatgpt'], ['claude.exe', 'app', 'agent:claude'], ['codex.exe', 'app', 'agent:codex'],
    ['msedgewebview2.exe', 'embedded', 'webview'], ['node.exe', 'node node_modules/next/dist/bin/next dev', 'next'],
    ['powershell.exe', 'Get-Content node_modules/next/test', null], ['node.exe', 'local-resource-clean --only .next/dev-backup-20260908-102304', 'runtime'],
    ['node.exe', null, 'unknown-runtime']
  ];
  const rows = sample.map(([Name, CommandLine], i) => ({ Name, CommandLine, ProcessId: i + 1, ParentProcessId: 0, WorkingSetSize: 123 }));
  const script = join(root, 'fixture.ps1');
  const target = join(process.cwd(), 'scripts/local-resource-processes.ps1').replaceAll("'", "''");
  writeFileSync(script, `function Get-CimInstance { $sampleRows = '${JSON.stringify(rows).replaceAll("'", "''")}' | ConvertFrom-Json; foreach ($sampleRow in $sampleRows) { $sampleRow } }\n. '${target}'`);
  const run = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', script], { encoding: 'utf8', windowsHide: true });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.deepEqual(result.map(r => r.kind), sample.map(r => r[2]).filter(Boolean));
  assert.ok(result.every(r => !('CommandLine' in r)));
});

test('legacy prune entry is dry-run by default and rejects arbitrary path selection', t => {
  const { root, options } = cleanupFixture(t);
  assert.equal(pruneTmp(options).deleted, 0);
  assert.equal(existsSync(join(root, '.tmp/scratch/a')), true);
  assert.throws(() => cleanMain(['--only', '../outside', '--commit'], options), /configured cleanup target/);
});
test('daily cleanup does not report success when process inspection failed', () => {
  const result = applyFixes([{ id: 'process-inspection', actions: [{ kind: 'inspection-failed', path: 'processes' }] }], { dryRun: false, log: () => {} });
  assert.equal(result.ok, false); assert.equal(result.failures, 1); assert.equal(result.removed, 0);
});

test('Windows scheduled wrapper preserves cleanup failure exit code', { skip: process.platform !== 'win32' }, t => {
  const root = fixture(t), script = join(root, 'failure.mjs'), wrapper = join(root, 'cleanup.cmd');
  writeFileSync(script, 'process.exit(7)');
  writeFileSync(wrapper, renderCleanupWrapper({ root, node: process.execPath, script, log: join(root, 'cleanup.log') }));
  const result = spawnSync('cmd.exe', ['/d', '/c', wrapper], { windowsHide: true });
  assert.equal(result.status, 7);
});
