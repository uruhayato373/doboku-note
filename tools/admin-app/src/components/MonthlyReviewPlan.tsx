import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { PanelCard } from '@/components/admin';
import { Badge } from '@/components/ui/badge';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../scripts/lib/business-direction.mjs';
import { buildGate } from '../../../../scripts/lib/backlog-gate.mjs';
import { datasetPath } from '../../../../scripts/lib/datasets.mjs';
import { monthlyReadiness } from '../../../../scripts/lib/monthly-review-readiness.mjs';

type StepState = 'done' | 'waiting' | 'todo' | 'human';
type Step = { key: string; group: string; label: string; state: StepState; detail: string; command?: string };

const STATE: Record<StepState, { label: string; variant: 'success' | 'outline' | 'warning' | 'destructive' }> = {
  done: { label: '済', variant: 'success' },
  waiting: { label: '待ち', variant: 'outline' },
  todo: { label: 'やる', variant: 'warning' },
  human: { label: '人が判断', variant: 'destructive' },
};

const readJson = (root: string, rel: string) => {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
};

/** 月次レビューの準備（データの確定・人の入力・判断・記録）を、前の暦月について組み立てる。読めなければ null。 */
function loadPlan() {
  const root = findRepoRoot();
  const period = reviewPeriod('monthly') as { startDate: string; endDate: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let report: any;
  try { report = buildReport(root, period); } catch { return null; }
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const month = period.startDate.slice(0, 7);
  const gate = (() => {
    try { return (buildGate(readFileSync(join(root, '.claude/todo/backlog.md'), 'utf8'), today) as { monthly: { lowWithoutWhen: unknown[]; stale: unknown[] } }).monthly; } catch { return null; }
  })();
  return monthlyReadiness({
    period,
    today,
    salesMonths: readJson(root, datasetPath('note.sales'))?.months ?? {},
    trafficFetchedAt: readJson(root, datasetPath('note.referrers', { month }))?.fetchedAt ?? null,
    cells: report.cells,
    kdpMonth: readJson(root, datasetPath('kdp.royalties'))?.months?.[month] ?? null,
    gate,
    experiments: report.experiments,
    due: (report.due as { cadence: string; record: string | null }[]).find((x) => x.cadence === 'monthly') ?? null,
  }) as { month: string; steps: Step[]; summary: Record<string, number> };
}

/**
 * 今月やること（前の月の振り返りに向けた準備）。計画 ＞ 月間（/todo?f=monthly）に出す。
 * 状態の判定は scripts/lib/monthly-review-readiness.mjs。レビューの手順と実施の証拠は 戦略 ＞ レビュー ＞ 月次。
 */
export function MonthlyReviewPlan() {
  const plan = loadPlan();
  if (!plan) return null;
  const { steps, month, summary } = plan;
  const groups = [...new Set(steps.map((s) => s.group))];
  let n = 0;
  return (
    <PanelCard
      title={`今月やること（${month} の月次レビューに向けて）`}
      description={`済 ${summary.done} / ${summary.total}`}
      className="mb-3"
    >
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g} className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground">{g}</div>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {steps.filter((s) => s.group === g).map((s) => {
                n += 1;
                return (
                  <li key={s.key} className="grid grid-cols-[1.5rem_4.5rem_1fr] items-start gap-2">
                    <span className="text-sm text-muted-foreground tabular-nums">{n}</span>
                    <Badge variant={STATE[s.state].variant}>{STATE[s.state].label}</Badge>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm ${s.state === 'done' ? 'text-muted-foreground' : 'font-semibold'}`}>{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.detail}</span>
                      {s.command && s.state !== 'done' && <code className="w-fit text-xs">{s.command}</code>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        <Link className="text-xs" href="/metrics/business/monthly">レビューの手順と実施状況 → 戦略 ＞ レビュー ＞ 月次</Link>
      </div>
    </PanelCard>
  );
}
