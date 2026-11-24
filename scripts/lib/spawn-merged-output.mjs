/**
 * spawn-merged-output.mjs — 子の node を起動し、stdout と stderr を書かれた順のまま 1 本の出力として返す。
 *
 * なぜ: spawnSync の stdout と stderr を `stdout + stderr` でつなぐと、stderr の行がすべて末尾へ回る。
 * note-update-body は `[article] <noteId>` を stdout に、ABORT を stderr に出すので、つないだ出力を
 * 記事ごとに読むと失敗が最後の記事に結び付き、ほかは「結果なし」になった（2026-11-24 の下水道の 8 本・DN-1301）。
 * 両方を同じファイル記述子へ向けると、OS が書かれた順に並べる。
 */
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * @param {string[]} args node に渡す引数（先頭はスクリプトのパス）
 * @param {{ cwd: string, log?: string|null, timeout?: number, env?: NodeJS.ProcessEnv }} opts
 *   log を渡せばそこへ残す（渡さなければ一時ファイルに書いて消す）
 * @returns {{ status: number|null, out: string, timedOut: boolean }}
 */
export function runNodeMerged(args, { cwd, log = null, timeout, env = process.env }) {
  const tmp = log ? null : mkdtempSync(join(tmpdir(), 'spawn-merged-'));
  const path = log || join(tmp, 'out.log');
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, 'w');
  let r;
  try {
    r = spawnSync(process.execPath, args, { cwd, env, stdio: ['ignore', fd, fd], ...(timeout ? { timeout, killSignal: 'SIGKILL' } : {}) });
  } finally {
    closeSync(fd);
  }
  const out = readFileSync(path, 'utf8');
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  return { status: r.status, out, timedOut: r.error?.code === 'ETIMEDOUT' };
}
