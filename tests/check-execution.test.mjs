import test from 'node:test';
import assert from 'node:assert/strict';
import { commandTimeoutMs, runCheckedCommand, UNIT_TEST_TIMEOUT_MS } from '../scripts/lib/check-execution.mjs';

test('aggregate runners use child limits; unit tests share the quality-audit limit', () => {
  assert.equal(commandTimeoutMs('test'), UNIT_TEST_TIMEOUT_MS);
  assert.equal(commandTimeoutMs('quality:audit:ci'), 0);
  assert.equal(commandTimeoutMs('node:check-backlog-verify'), 0);
  assert.equal(commandTimeoutMs('node:review-checks'), 0);
  assert.equal(commandTimeoutMs('check-video-content'), 180_000);
});

test('records measured execution and keeps failed / inconclusive distinct', async () => {
  for (const [code, status] of [[0, 'pass'], [1, 'fail'], [2, 'inconclusive']]) {
    const r = await runCheckedCommand(process.execPath, ['-e', `console.log('checked=3');process.exitCode=${code}`]);
    assert.equal(r.status, status);
    assert.equal(r.exitCode, code);
    assert.match(r.stdout, /checked=3/);
    assert.ok(r.monoMs >= 0);
    assert.ok(r.durationMs >= 0);
  }
});

test('timeout terminates npm-like descendants, including a child ignoring SIGTERM', { timeout: 30_000 }, async () => {
  const r = await runCheckedCommand(process.execPath, ['-e', `
    const {spawn}=require('node:child_process');
    spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'inherit'});
    setInterval(()=>{},1000);
  `], { timeoutMs: 500, killGraceMs: 200 });
  assert.equal(r.status, 'timeout');
  assert.equal(r.exitCode, null);
});

test('missing executable is inconclusive rather than a failed check', async () => {
  const r = await runCheckedCommand('/nonexistent-weekly-test-executable', []);
  assert.equal(r.status, 'inconclusive');
  assert.match(r.error, /ENOENT/);
});
