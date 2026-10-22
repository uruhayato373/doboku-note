/**
 * Playwright認証操作のservice単位排他ロック。
 * ロック内容は診断用の非secretメタデータだけ。既存lockの自動削除やprocess killは行わない。
 * ただし同じホストで持ち主の pid が動いていないロックは「古いロック」とエラーに出す（2026-10-22: 10/13 の login の
 * ロックが残り、moshimo の日次のログイン維持が 9 日間「使用中」で止まり続けた）。消すかどうかは人が決める。
 */
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { hostname as readHostname } from 'node:os';
import { resolveLockPath } from './playwright-auth-profile.mjs';

const ALLOWED_COMMANDS = new Set(['login', 'status', 'migrate', 'export', 'ci-restore', 'ci-writeback', 'auto-login']);

export class AuthLockError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuthLockError';
    this.code = details.code ?? 'AUTH_LOCK_ERROR';
    this.lockPath = details.lockPath ?? null;
    this.existing = details.existing ?? null;
  }
}

export function readAuthLock(serviceId, options = {}) {
  const lockPath = options.lockPath ?? resolveLockPath(serviceId, options.authOptions);
  if (!existsSync(lockPath)) return { exists: false, lockPath, metadata: null };
  try {
    const raw = JSON.parse(readFileSync(lockPath, 'utf8'));
    const metadata = {
      service: String(raw.service ?? ''),
      hostname: String(raw.hostname ?? ''),
      pid: Number.isInteger(raw.pid) ? raw.pid : null,
      startedAt: String(raw.startedAt ?? ''),
      command: String(raw.command ?? ''),
    };
    return { exists: true, lockPath, metadata };
  } catch {
    return { exists: true, lockPath, metadata: null, unreadable: true };
  }
}

/** pid のプロセスが動いているか（kill 0 で確かめるだけ。シグナルは送らない） */
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === 'EPERM'; }
}

/**
 * 同じホストで持ち主の pid が動いていないロックか。別ホスト・pid 不明・読めないロックは古いと決めない。
 * @param {{ hostname?: string, pid?: number | null } | null} existing
 * @param {{ hostname: string, isAlive?: (pid: number) => boolean }} ctx
 */
export function isStaleLock(existing, { hostname, isAlive = pidAlive }) {
  if (!existing || !Number.isInteger(existing.pid) || existing.hostname !== hostname) return false;
  return !isAlive(existing.pid);
}

export function acquireAuthLock(serviceId, options = {}) {
  const command = ALLOWED_COMMANDS.has(options.command) ? options.command : 'status';
  const lockPath = options.lockPath ?? resolveLockPath(serviceId, options.authOptions);
  mkdirSync(dirname(lockPath), { recursive: true });
  const metadata = {
    service: serviceId,
    hostname: options.hostname ?? readHostname(),
    pid: options.pid ?? process.pid,
    startedAt: (options.now ?? new Date()).toISOString(),
    command,
  };
  const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
  let fd;
  try {
    fd = openSync(lockPath, 'wx', 0o600);
    writeFileSync(fd, serialized, 'utf8');
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    if (error?.code === 'EEXIST') {
      const existing = readAuthLock(serviceId, { lockPath });
      const stale = isStaleLock(existing.metadata, { hostname: metadata.hostname, isAlive: options.isAlive });
      if (stale) {
        throw new AuthLockError(`${serviceId} のロックは古い（${existing.metadata.startedAt} の ${existing.metadata.command}・pid ${existing.metadata.pid} はもう動いていない）。中身を確かめて ${lockPath} を消す`, {
          code: 'AUTH_LOCK_STALE',
          lockPath,
          existing: existing.metadata,
        });
      }
      throw new AuthLockError(`${serviceId} は別の認証操作が使用中です`, {
        code: 'AUTH_LOCK_EXISTS',
        lockPath,
        existing: existing.metadata,
      });
    }
    throw error;
  }
  closeSync(fd);

  let released = false;
  return {
    lockPath,
    metadata,
    release() {
      if (released) return false;
      if (!existsSync(lockPath)) {
        released = true;
        return false;
      }
      const current = readFileSync(lockPath, 'utf8');
      if (current !== serialized) {
        throw new AuthLockError(`${serviceId} のlock所有者が変わったため解放しません`, {
          code: 'AUTH_LOCK_OWNERSHIP_MISMATCH',
          lockPath,
        });
      }
      unlinkSync(lockPath);
      released = true;
      return true;
    },
  };
}

export async function withAuthLock(serviceId, options, work) {
  const lock = acquireAuthLock(serviceId, options);
  try {
    return await work(lock);
  } finally {
    lock.release();
  }
}
