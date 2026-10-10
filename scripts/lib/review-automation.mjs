/**
 * review-automation.mjs — レビューの回を支える自動化の状態を、管理画面（戦略 ＞ レビュー）が読む形にまとめる。
 *
 *   - 金曜の下書き（.claude/state/weekly-review/draft.json・build-weekly-review-draft・weekly-review-draft.yml）
 *   - 土曜の自動実行（Mac の launchd com.doboku-note.weekly-review・scripts/scheduled/weekly-review.sh のログ）
 *   - 点検と Issue（review-checks の記録）と、レポートの「点検と Issue」での行き先
 *
 * 判定は既存の部品（latestChecks・checksRouting）を使い、ここでは並べ直すだけ（同じ判定を 2 か所に書かない）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { latestChecks, checksRouting } from './review-wiring.mjs';

export const WEEKLY_REVIEW_LOG = join(homedir(), 'Library', 'Logs', 'doboku-note', 'weekly-review.log');

/**
 * 金曜の下書き。無ければ null。week が指定の回と違えば stale
 * @param {string} root
 * @param {string | null} [runKey]
 * @returns {{ broken: true } | { week: string, window: { week: string, startDate: string, endDate: string } | null, generatedAt: string | null, missing: string[], failedInputs: string[], stale: boolean } | null}
 */
export function readWeeklyDraft(root, runKey = null) {
  const abs = join(root, datasetPath('state.weekly-review-draft'));
  if (!existsSync(abs)) return null;
  let d;
  try { d = JSON.parse(readFileSync(abs, 'utf8')); } catch { return { broken: true }; }
  return {
    week: d.week,
    window: d.window ?? null,
    generatedAt: d.generatedAt ?? null,
    missing: d.missing ?? [],
    failedInputs: (d.inputs ?? []).filter((i) => i.rc !== 0).map((i) => i.id),
    stale: Boolean(runKey && d.week !== runKey),
  };
}

/** ログの末尾から最後の実行（start と ok / FAILED / 何もしない）を拾う（純関数） */
export function lastLaunchdRun(logText) {
  const lines = String(logText).split(/\r?\n/);
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (/\[weekly-review\] start/.test(lines[i])) { start = i; break; }
  if (start < 0) return null;
  const at = /^=== (\S+)/.exec(lines[start])?.[1] ?? null;
  const tail = lines.slice(start + 1);
  const ok = tail.find((l) => /\[weekly-review\] ok/.test(l));
  const failed = tail.find((l) => /\[weekly-review\] FAILED/.test(l));
  const skipped = tail.find((l) => /既にある。何もしない/.test(l));
  const result = failed ? 'failed' : ok ? 'ok' : skipped ? 'skipped' : 'running';
  return { at, result, line: (failed ?? ok ?? skipped ?? lines[start]).replace(/^=== |===$/g, '').trim() };
}

/**
 * 土曜の自動実行（launchd）の登録状況と最後の実行。macOS 以外は null
 * @param {string} root
 * @returns {{ installed: boolean, last: { at: string | null, result: 'ok' | 'failed' | 'skipped' | 'running', line: string } | null } | null}
 */
export function weeklyLaunchd(root) {
  if (process.platform !== 'darwin') return null;
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'install-weekly-review-launchd.mjs'), '--status'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
  const installed = r.status === 0;
  let last = null;
  try { if (existsSync(WEEKLY_REVIEW_LOG)) last = lastLaunchdRun(readFileSync(WEEKLY_REVIEW_LOG, 'utf8').slice(-20_000)); } catch { /* 読めなければ不明 */ }
  return { installed, last };
}

/**
 * その回の点検と Issue。各項目に、レポートの「点検と Issue」で行き先が書かれているか
 * @param {string} root @param {string} cadenceId @param {string} runKey @param {string} [reportText]
 * @returns {{ ranAt: string, checks: { command: string, label: string, state: string, summary: string }[], items: { key: string, label: string, routed: boolean }[], issuesError: string | null } | null}
 */
export function reviewChecks(root, cadenceId, runKey, reportText = '') {
  const result = latestChecks(root, cadenceId, runKey);
  if (!result) return null;
  const { hasSection, pending, unrouted } = checksRouting(result, reportText);
  const unroutedKeys = new Set(unrouted.map((u) => u.key));
  return {
    ranAt: result.ranAt,
    checks: (result.checks ?? []).map((c) => ({ command: c.command, label: c.label, state: c.state, summary: c.summary })),
    items: pending.map((p) => ({ ...p, routed: hasSection && !unroutedKeys.has(p.key) })),
    issuesError: result.issuesError ?? null,
  };
}
