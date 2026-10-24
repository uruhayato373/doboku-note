import { datasetPath } from '../../../../scripts/lib/datasets.mjs';
import { readJsonIf } from '../../../../scripts/lib/json-io.mjs';
import { findRepoRoot } from './repo-root';

/** 自動化の台帳の 1 行（データセット config.automations・型は scripts/lib/dataset-schemas-config-ops.mjs の ConfigAutomations） */
export interface Automation {
  id: string;
  runner: 'github-actions' | 'mac-launchd';
  source: string;
  title: string;
  triggers: string[];
  schedule: string[];
  scheduleJst?: string;
  login: string[];
  purpose: string;
  readers: string[];
  writes?: string[];
}

export interface CollectStage { id: string; title: string; status: 'ok' | 'warn' | 'skipped' | 'failed'; reason: string; durationSec: number }
export interface CollectRun { phase: string; startedAt: string; finishedAt: string; stages: CollectStage[]; commit?: { problem?: string }; leftover?: string[] }

export interface AutomationsView {
  automations: Automation[];
  lastPre: CollectRun | null;
  lastPost: CollectRun | null;
  ledgerPath: string;
  runsPath: string;
  error: string | null;
}

/** 台帳と、土曜の収集（state.weekly-collect）の最新の前・後の回 */
export function loadAutomations(): AutomationsView {
  const root = findRepoRoot();
  const ledgerPath = datasetPath('config.automations');
  const runsPath = datasetPath('state.weekly-collect');
  try {
    const ledger = readJsonIf(root, ledgerPath) as { automations: Automation[] } | null;
    const runs = (readJsonIf(root, runsPath) as { runs: CollectRun[] } | null)?.runs ?? [];
    return {
      automations: ledger?.automations ?? [],
      lastPre: runs.filter((r) => r.phase === 'pre').at(-1) ?? null,
      lastPost: runs.filter((r) => r.phase === 'post').at(-1) ?? null,
      ledgerPath,
      runsPath,
      error: ledger ? null : `${ledgerPath} が無い`,
    };
  } catch (e) {
    return { automations: [], lastPre: null, lastPost: null, ledgerPath, runsPath, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 回の合否（scripts/lib/weekly-collect-plan.mjs の runPassed と同じ判定） */
export const runPassed = (run: CollectRun) =>
  run.stages.every((s) => s.status !== 'failed') && !run.commit?.problem && !(run.leftover?.length);
