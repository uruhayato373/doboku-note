import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageHead } from '@/components/ui';
import { Section, Stack } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { findRepoRoot } from '@/lib/repo-root';
import { monthlyReadiness } from '../../../../../../../scripts/lib/monthly-review-readiness.mjs';
import { Checklist, DueLine, History, Inputs, Outcome, ReviewUnavailable, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

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

/** 今月やること（上から順に進める）。状態は scripts/lib/monthly-review-readiness.mjs が決める。 */
function MonthlyPlan({ steps, month, summary }: { steps: Step[]; month: string; summary: Record<string, number> }) {
  const groups = [...new Set(steps.map((s) => s.group))];
  let n = 0;
  return (
    <Section
      title={`今月やること（${month} の振り返り）`}
      note={`済 ${summary.done}・待ち ${summary.waiting}・やる ${summary.todo}・人が判断 ${summary.human}（全 ${summary.total}）。待ちは確定日や CI を待つだけで、人の作業は無い`}
    >
      <Card className="py-2">
        <CardContent className="flex flex-col gap-4 px-4">
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
        </CardContent>
      </Card>
    </Section>
  );
}

/** 戦略 ＞ レビュー ＞ 月次。前の暦月を振り返る。上に「今月やること」、下に手順の証拠・履歴・判断・材料。 */
export default function MonthlyReviewPage() {
  const d = loadReview('monthly');
  if (!d) return <ReviewUnavailable title="月次レビュー" />;
  const root = findRepoRoot();
  const period = d.report.period as { startDate: string; endDate: string };
  const month = period.startDate.slice(0, 7);
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const readiness = monthlyReadiness({
    period,
    today,
    salesMonths: readJson(root, '.claude/state/sales/sales-log.json')?.months ?? {},
    trafficFetchedAt: readJson(root, `.claude/state/metrics/note/referrers-${month}.json`)?.fetchedAt ?? null,
    cells: d.report.cells,
    kdpMonth: readJson(root, '.claude/state/sales/kdp-royalties.json')?.months?.[month] ?? null,
    gate: d.gate?.monthly ?? null,
    experiments: d.report.experiments,
    due: (d.report.due as { cadence: string; record: string | null }[]).find((x) => x.cadence === 'monthly') ?? null,
  }) as { month: string; steps: Step[]; summary: Record<string, number> };

  return (
    <Stack gap="lg">
      <div className="flex flex-col gap-2">
        <PageHead title="月次レビュー" />
        <DueLine c={d.cadence} />
      </div>
      <MonthlyPlan steps={readiness.steps} month={readiness.month} summary={readiness.summary} />
      {d.procedure && <Checklist procedure={d.procedure} />}
      <History runs={d.runs} weekly={false} />
      {d.cadence && <Outcome c={d.cadence} gate={d.gate} />}
      {d.cadence && <Inputs c={d.cadence} />}
    </Stack>
  );
}
