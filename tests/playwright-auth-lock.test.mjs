import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import { acquireAuthLock, AuthLockError, withAuthLock } from '../scripts/lib/playwright-auth-lock.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'doboku-auth-lock-'));
  return {
    root,
    authOptions: { cwd: REPO_ROOT, repoRoot: REPO_ROOT, overrideRoot: root, homeDir: '/home/tester' },
  };
}

test('lockはatomic createされ、非secret metadataだけを0600で保持する', () => {
  const f = fixture();
  try {
    const lock = acquireAuthLock('note', {
      command: 'status',
      authOptions: f.authOptions,
      hostname: 'test-host',
      pid: 1234,
      now: new Date('2026-09-05T00:00:00Z'),
    });
    const data = JSON.parse(readFileSync(lock.lockPath, 'utf8'));
    assert.deepEqual(Object.keys(data), ['service', 'hostname', 'pid', 'startedAt', 'command']);
    assert.equal(data.service, 'note');
    assert.equal(statSync(lock.lockPath).mode & 0o777, 0o600);
    assert.equal(lock.release(), true);
    assert.equal(existsSync(lock.lockPath), false);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('同一serviceの2重取得は既存lockを残したまま停止する', () => {
  const f = fixture();
  try {
    const first = acquireAuthLock('x', { command: 'login', authOptions: f.authOptions });
    assert.throws(
      () => acquireAuthLock('x', { command: 'status', authOptions: f.authOptions }),
      (error) => error instanceof AuthLockError && error.code === 'AUTH_LOCK_EXISTS',
    );
    assert.equal(existsSync(first.lockPath), true);
    first.release();
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('withAuthLockは処理が例外でもfinallyで自分のlockを解放する', async () => {
  const f = fixture();
  let path;
  try {
    await assert.rejects(
      withAuthLock('instagram', { command: 'status', authOptions: f.authOptions }, async (lock) => {
        path = lock.lockPath;
        throw new Error('fixture failure');
      }),
      /fixture failure/,
    );
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('lock内容が変わった場合は他所有者とみなし自動削除しない', () => {
  const f = fixture();
  try {
    const lock = acquireAuthLock('google', { command: 'status', authOptions: f.authOptions });
    writeFileSync(lock.lockPath, '{"service":"google","hostname":"other","pid":9,"startedAt":"x","command":"status"}\n');
    assert.throws(() => lock.release(), /lock所有者が変わった/);
    assert.equal(existsSync(lock.lockPath), true);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
