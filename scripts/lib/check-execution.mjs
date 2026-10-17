/** Bounded leaf checks, measured with both clocks. Aggregate runners use their children's limits. */
import { spawn } from 'node:child_process';
import { loadavg } from 'node:os';

export const UNIT_TEST_TIMEOUT_MS = 300_000;
export function commandTimeoutMs(command, fallbackMs = 180_000) {
  if (command === 'test') return UNIT_TEST_TIMEOUT_MS;
  // Each aggregate bounds its children. An outer 180s deadline used to kill healthy suites.
  if (['quality:audit:ci', 'quality:audit', 'check-backlog-verify', 'node:check-backlog-verify', 'review-checks', 'node:review-checks'].includes(command)) return 0;
  return fallbackMs;
}

export function classifyRun({ timedOut, exitStatus, wallMs, monoMs, sleepToleranceMs = 5_000 }) {
  const sleptMs = Math.max(0, Math.round(wallMs - monoMs));
  if (!timedOut && exitStatus === 0) return { status: 'pass', sleptMs };
  if (sleptMs > sleepToleranceMs) return { status: 'inconclusive', sleptMs };
  return { status: timedOut ? 'timeout' : 'fail', sleptMs };
}

/** Stops the entire process group on timeout, including npm's child processes. */
export function runCheckedCommand(cmd, args, { cwd, timeoutMs = 180_000, killGraceMs = 5_000, env = process.env } = {}) {
  const startedAt = new Date().toISOString();
  const wallStart = Date.now(), monoStart = process.hrtime.bigint();
  const loadavg1 = Math.round(loadavg()[0] * 100) / 100;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env, detached: process.platform !== 'win32', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false, error = null, killTimer;
    child.stdout.setEncoding('utf8').on('data', (s) => { stdout += s; });
    child.stderr.setEncoding('utf8').on('data', (s) => { stderr += s; });
    const stop = (signal) => {
      try {
        if (process.platform === 'win32') child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (e) { if (e.code !== 'ESRCH') error = e; }
    };
    const timer = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      stop('SIGTERM');
      killTimer = setTimeout(() => stop('SIGKILL'), killGraceMs);
    }, timeoutMs) : null;
    child.once('error', (e) => { error = e; });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer); clearTimeout(killTimer);
      const durationMs = Date.now() - wallStart;
      const monoMs = Math.round(Number(process.hrtime.bigint() - monoStart) / 1e6);
      const measured = classifyRun({ timedOut, exitStatus: exitCode, wallMs: durationMs, monoMs });
      const status = error || (!timedOut && (exitCode === 2 || signal)) ? 'inconclusive' : measured.status;
      resolve({ status, exitCode, signal, timeoutMs, startedAt, durationMs, monoMs, sleptMs: measured.sleptMs, loadavg1, stdout, stderr, error: error?.message ?? null });
    });
  });
}
