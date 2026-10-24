import { datasetPath, freshnessDays } from '../../../../scripts/lib/datasets.mjs';
import { readJsonIf } from '../../../../scripts/lib/json-io.mjs';
import { buildStages, judgeRuns } from '../../../../scripts/lib/weekly-collect-plan.mjs';
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

/** 段ごとの最新の結果（運営者の --only の取り直しを含む）。判定は scripts/lib/weekly-collect-plan.mjs の judgeRuns（check-weekly-collect と同じ） */
export interface LatestStage { id: string; title: string; phase: string; status: CollectStage['status'] | 'missing'; reason: string; at: string | null; runPhase: string | null }
export interface CollectVerdict { stages: LatestStage[]; phases: { phase: string; finishedAt: string; ageDays: number }[]; problems: string[]; failDays: number }

export interface AutomationsView {
  automations: Automation[];
  collect: CollectVerdict | null;
  ledgerPath: string;
  runsPath: string;
  error: string | null;
}

function judgeCollect(runs: CollectRun[]): CollectVerdict {
  const plan = buildStages();
  const failDays = freshnessDays('state.weekly-collect', 'failDays');
  const r = judgeRuns({ runs, stageIds: plan.map((s) => s.id), failDays, now: Date.now() });
  const stages = r.stages.map((s) => {
    const def = plan.find((p) => p.id === s.id);
    return { id: s.id, title: def?.title ?? s.id, phase: def?.phase ?? '', status: s.status, reason: s.reason, at: s.at, runPhase: s.phase };
  });
  return { stages, phases: r.phases, problems: r.problems, failDays };
}

/** 台帳と、土曜の収集（state.weekly-collect）の段ごとの最新の結果 */
export function loadAutomations(): AutomationsView {
  const root = findRepoRoot();
  const ledgerPath = datasetPath('config.automations');
  const runsPath = datasetPath('state.weekly-collect');
  try {
    const ledger = readJsonIf(root, ledgerPath) as { automations: Automation[] } | null;
    const runs = (readJsonIf(root, runsPath) as { runs: CollectRun[] } | null)?.runs ?? [];
    return {
      automations: ledger?.automations ?? [],
      collect: runs.length ? judgeCollect(runs) : null,
      ledgerPath,
      runsPath,
      error: ledger ? null : `${ledgerPath} が無い`,
    };
  } catch (e) {
    return { automations: [], collect: null, ledgerPath, runsPath, error: e instanceof Error ? e.message : String(e) };
  }
}
