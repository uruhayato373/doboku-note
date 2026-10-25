import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { auditRuns, healthTargets, latestRun, runListArgs } from '../../../../scripts/check-workflow-health.mjs';
import { channelOfTitle, LABEL as ISSUE_LABEL } from '../../../../scripts/report-automation-failure.mjs';
import { datasetPath, freshnessDays } from '../../../../scripts/lib/datasets.mjs';
import { readJsonIf } from '../../../../scripts/lib/json-io.mjs';
import { readWeeklyDraft, WEEKLY_REVIEW_LOG, weeklyLaunchd } from '../../../../scripts/lib/review-automation.mjs';
import { buildStages, judgeRuns } from '../../../../scripts/lib/weekly-collect-plan.mjs';
import { findRepoRoot } from './repo-root';

const execFileAsync = promisify(execFile);

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
  /** 監視の閾値（check-workflow-health）の置き場 */
  healthPath: string;
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
  const healthPath = datasetPath('config.workflow-health');
  try {
    const ledger = readJsonIf(root, ledgerPath) as { automations: Automation[] } | null;
    const runs = (readJsonIf(root, runsPath) as { runs: CollectRun[] } | null)?.runs ?? [];
    return {
      automations: ledger?.automations ?? [],
      collect: runs.length ? judgeCollect(runs) : null,
      ledgerPath,
      runsPath,
      healthPath,
      error: ledger ? null : `${ledgerPath} が無い`,
    };
  } catch (e) {
    return { automations: [], collect: null, ledgerPath, runsPath, healthPath, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * GitHub Actions の 1 本の直近の実行（gh run list）。取得と判定は scripts/check-workflow-health.mjs と同じ関数を使い、
 * 判定を写さない。監視の設定（config/workflow-health.json）に無い workflow は判定を付けない（月次・手動起動を
 * 「最後の成功が古い」で赤くしない）。取れなければ error を持たせ、成功と読み替えない。
 */
export interface WorkflowRunStatus {
  workflow: string;
  latest: { status: string; conclusion: string | null; createdAt: string; event: string; databaseId: number } | null;
  consecutiveFailures: number | null;
  /** 監視中なら健全か・理由。監視対象外は null */
  health: { ok: boolean; detail: string } | null;
  error: string | null;
}

const RUN_CONCURRENCY = 10;
const UNMONITORED_LIMIT = 10;

async function fetchWorkflowStatus(root: string, workflow: string, targets: Map<string, Record<string, unknown>>, now: number): Promise<WorkflowRunStatus> {
  const cfg = targets.get(workflow) as ({ branch?: string; limit?: number; maxAgeDays: number; maxConsecutiveFailures: number } | undefined);
  try {
    const { stdout } = await execFileAsync('gh', runListArgs(workflow, cfg?.branch, cfg?.limit ?? (cfg ? 30 : UNMONITORED_LIMIT)), { cwd: root, timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
    const runs = JSON.parse(stdout);
    const latest = latestRun(runs);
    // 連続失敗の数え方は閾値に依らないので、監視対象外も既定の閾値で数えるだけ数える
    const audit = auditRuns(workflow, runs, cfg ?? { maxAgeDays: Number.POSITIVE_INFINITY, maxConsecutiveFailures: Number.POSITIVE_INFINITY }, now);
    return {
      workflow,
      latest,
      consecutiveFailures: audit.consecutiveFailures ?? null,
      health: cfg ? { ok: audit.ok, detail: audit.detail } : null,
      error: null,
    };
  } catch (e) {
    return { workflow, latest: null, consecutiveFailures: null, health: null, error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) };
  }
}

/** 台帳の GitHub Actions 全部の直近の実行を、gh で並行して取る（最大 RUN_CONCURRENCY 本ずつ） */
export async function loadWorkflowRuns(automations: Automation[]): Promise<Map<string, WorkflowRunStatus>> {
  const root = findRepoRoot();
  const targets = healthTargets(readJsonIf(root, datasetPath('config.workflow-health')));
  const files = automations.filter((a) => a.runner === 'github-actions').map((a) => a.source.split('/').pop() as string);
  const now = Date.now();
  const out = new Map<string, WorkflowRunStatus>();
  let next = 0;
  await Promise.all(Array.from({ length: RUN_CONCURRENCY }, async () => {
    while (next < files.length) {
      const file = files[next++];
      out.set(file, await fetchWorkflowStatus(root, file, targets, now));
    }
  }));
  return out;
}

/** GSC の記録層（週次観測・coverage）の要否。scripts/check-gsc-auto-review.mjs --json の gates をそのまま使う（判定を写さない） */
export interface GscRecordGates {
  gscDataStale: boolean;
  weeklyAlreadyLogged: boolean;
  monthlyAlreadyLogged: boolean;
  latestWeeklyEntry: string | null;
  latestMonthlyEntry: string | null;
}

/** 土曜の Mac の流れ（収集の前 → GSC の記録 → 週次レビュー → 収集の後）の、収集以外の段の材料 */
export interface SaturdayView {
  launchd: ReturnType<typeof weeklyLaunchd>;
  draft: ReturnType<typeof readWeeklyDraft>;
  gsc: { gates: GscRecordGates | null; logPath: string | null; error: string | null };
  logFile: string;
}

export async function loadSaturday(): Promise<SaturdayView> {
  const root = findRepoRoot();
  let gsc: SaturdayView['gsc'];
  try {
    // 記録が要る（due）と exit 1 で終わることがあるので、stdout は終了コードに関わらず読む
    const stdout = await execFileAsync(process.execPath, [join(root, 'scripts', 'check-gsc-auto-review.mjs'), '--json'], { cwd: root, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 })
      .then((r) => r.stdout, (e: { stdout?: string; message?: string }) => { if (e.stdout) return e.stdout; throw e; });
    const j = JSON.parse(stdout) as { gates?: GscRecordGates; logPath?: string };
    gsc = { gates: j.gates ?? null, logPath: j.logPath ?? null, error: j.gates ? null : 'gates が無い' };
  } catch (e) {
    gsc = { gates: null, logPath: null, error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) };
  }
  return { launchd: weeklyLaunchd(root), draft: readWeeklyDraft(root), gsc, logFile: WEEKLY_REVIEW_LOG };
}

/** 開いている自動化の Issue（automation-failure）の 1 件。runner は台帳の readers の issue:<channel> から引く */
export interface AutomationIssue {
  number: number;
  title: string;
  url: string;
  channel: string | null;
  /** 台帳のどの自動化にも当たらない channel（消した仕組みの残り・配線の無い channel）は null */
  runner: Automation['runner'] | null;
  automation: string | null;
}

export interface AutomationIssuesView {
  issues: AutomationIssue[];
  error: string | null;
}

/** 題名の channel（規約は scripts/report-automation-failure.mjs）を、台帳の readers で Mac と CI に振り分ける（純関数） */
export function classifyIssues(list: { number: number; title: string; url: string }[], automations: Automation[]): AutomationIssue[] {
  const byChannel = new Map<string, Automation>();
  for (const a of automations) for (const r of a.readers) if (r.startsWith('issue:')) byChannel.set(r.slice('issue:'.length), a);
  return list.map((i) => {
    const channel = channelOfTitle(i.title);
    const a = channel ? byChannel.get(channel) : undefined;
    return { number: i.number, title: i.title, url: i.url, channel, runner: a?.runner ?? null, automation: a?.id ?? null };
  });
}

export async function loadAutomationIssues(automations: Automation[]): Promise<AutomationIssuesView> {
  const root = findRepoRoot();
  try {
    const { stdout } = await execFileAsync('gh', ['issue', 'list', '--label', ISSUE_LABEL, '--state', 'open', '--limit', '100', '--json', 'number,title,url'], { cwd: root, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
    return { issues: classifyIssues(JSON.parse(stdout), automations), error: null };
  } catch (e) {
    return { issues: [], error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) };
  }
}
