import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../../../scripts/lib/business-direction.mjs';
import { buildProcedureView, buildReviewView, buildRunHistory } from '../../../../../../scripts/lib/review-wiring.mjs';
import { buildGate } from '../../../../../../scripts/lib/backlog-gate.mjs';

/**
 * 戦略 ＞ レビュー（週次・月次）の共通部品。画面には人が目で確かめる・決めることだけを出す
 * （手順の正本は review-wiring.json、判定は scripts/lib/review-wiring.mjs。根拠の細目はマウスで出す）。
 */
type Input = { command: string; label: string };
type Stage = { stage: string; judge: Input[]; check: Input[] };
export type Review = { file: string; cadence: string; period: { startDate: string; endDate: string }; status: string; findings: string; decision: string; nextAction: string; experimentIds?: string[]; nextReviewDate: string };
export type Cadence = {
  id: string;
  label: string;
  byStage: Stage[];
  counts: { judge: number; check: number };
  drift: { missing: string[]; extra: string[] };
  due: { due: boolean; period: { startDate: string; endDate: string } } | null;
  latest: Review | null;
  cards: { id: string; title: string }[];
  weeklyPlan: string | null;
};
type StepState = 'ok' | 'partial' | 'missing' | 'manual';
export type Procedure = {
  label: string;
  report: { name: string; week: string } | null;
  steps: { label: string; does: string; state: StepState; note: string }[];
  sections: { expected: { title: string; present: boolean; gaps: number }[]; extra: string[] } | null;
};
export type Run = {
  key: string;
  period: { startDate: string; endDate: string } | null;
  record: { status: string; revisions: number; decision: string } | null;
  report: string | null;
  reportSource: 'file' | 'git' | null;
  sections: { found: number; expected: number } | null;
  routing: { routed: number; total: number } | null;
  cards: number;
  verdict: 'ok' | 'partial' | 'missing';
};
export type Gate = {
  weekly: { decisions: { ageDays: number | null }[]; decisionsLater: unknown[]; overdue: unknown[]; filedThisWeek: unknown[] };
  monthly: { lowWithoutWhen: unknown[]; stale: unknown[]; thisMonth: number };
};

const STEP: Record<StepState, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  ok: { label: '済', variant: 'success' },
  partial: { label: '一部', variant: 'warning' },
  missing: { label: '未', variant: 'destructive' },
  manual: { label: '—', variant: 'outline' },
};
const VERDICT: Record<Run['verdict'], { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: '実施できた', variant: 'success' },
  partial: { label: '不足あり', variant: 'warning' },
  missing: { label: '未実施', variant: 'destructive' },
};
export const md = (d: string) => d.slice(5).replace('-', '/');

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="flex flex-col gap-1 px-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}

/** 最新の回の実施状況。対象期間が未記録なら「前回」と出す。 */
export function Current({ run, due }: { run: Run | undefined; due?: Cadence['due'] }) {
  const pending = due?.due && run?.period?.startDate !== due.period.startDate;
  return (
    <Section title={pending ? '前回の実施状況' : '今回の実施状況'}>
      <Grid min="sm">
        <Stat label="振り返り期間" value={run?.period ? `${md(run.period.startDate)}〜${md(run.period.endDate)}` : '—'} />
        <Stat label="記録" value={run?.record ? (run.record.status === 'provisional' ? '暫定' : '確定') : 'なし'} />
        <Stat label="判定" value={run ? <Badge variant={VERDICT[run.verdict].variant}>{VERDICT[run.verdict].label}</Badge> : '—'} />
      </Grid>
    </Section>
  );
}

/** 手順（何をやるか）と、それぞれ実施できたか。根拠はマウスで出す。 */
export function Checklist({ procedure }: { procedure: Procedure }) {
  return (
    <Section title="手順">
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>やること</TableHead>
                <TableHead className="w-20">実施</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procedure.steps.map((s, i) => (
                <TableRow key={s.label}>
                  <TableCell className="align-top text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.does}</div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span title={s.note}><Badge variant={STEP[s.state].variant}>{STEP[s.state].label}</Badge></span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Section>
  );
}

/** 回ごとの実施結果と決めたこと。 */
export function History({ runs }: { runs: Run[] }) {
  if (runs.length === 0) return null;
  return (
    <Section title="実施履歴">
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>期間</TableHead>
                <TableHead>記録</TableHead>
                <TableHead>判定</TableHead>
                <TableHead>決めたこと</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="text-xs">{r.period ? `${md(r.period.startDate)}〜${md(r.period.endDate)}` : r.key}</TableCell>
                  <TableCell className="text-xs">{r.record ? (r.record.status === 'provisional' ? '暫定' : '確定') : 'なし'}</TableCell>
                  <TableCell>
                    <Badge variant={VERDICT[r.verdict].variant}>{VERDICT[r.verdict].label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[32rem] min-w-[16rem] text-xs whitespace-normal">
                    <span className="line-clamp-2" title={r.record?.decision}>{r.record?.decision || '—'}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Section>
  );
}

function Count({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col border-l-[3px] border-border py-1 pl-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** 最新の判断（人が読む）と、人が決めるバックログのカード。 */
export function Outcome({ c, gate }: { c: Cadence; gate: Gate | null }) {
  return (
    <Section title="判断">
      <Grid min="lg">
        <Card>
          <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
            {c.latest ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">決めたこと（{md(c.latest.period.startDate)}〜{md(c.latest.period.endDate)}）</div>
                  <p className="m-0">{c.latest.decision}</p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">次の一手</div>
                  <p className="m-0">{c.latest.nextAction}</p>
                </div>
              </>
            ) : (
              <p className="m-0 text-muted-foreground">まだ記録がない</p>
            )}
          </CardContent>
        </Card>
        {gate && (
          <Card>
            <CardHeader>
              <CardTitle>人が決めるカード</CardTitle>
            </CardHeader>
            <CardContent>
              <Grid min="sm">
                {c.id === 'weekly' ? (
                  <>
                    <Count label="判断待ち" value={gate.weekly.decisions.length} />
                    <Count label="期日切れ" value={gate.weekly.overdue.length} />
                  </>
                ) : (
                  <>
                    <Count label="時期の無い 🟢" value={gate.monthly.lowWithoutWhen.length} />
                    <Count label="起票から 90 日超" value={gate.monthly.stale.length} />
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Section>
  );
}

export type ReviewData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  cadence: Cadence | undefined;
  procedure: Procedure | null;
  runs: Run[];
  gate: Gate | null;
};

/** 週次・月次ページの共通の読み込み。設定・期間を読めなければ null。 */
export function loadReview(cadenceId: 'weekly' | 'monthly'): ReviewData | null {
  const root = findRepoRoot();
  const period = reviewPeriod(cadenceId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let report: any;
  try {
    report = buildReport(root, period);
  } catch {
    return null;
  }
  const cadences = buildReviewView(root, { reviews: report.reviews, due: report.due }) as Cadence[];
  const gate = (() => {
    try {
      return buildGate(readFileSync(join(root, '.claude/todo/backlog.md'), 'utf8'), new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)) as Gate;
    } catch {
      return null;
    }
  })();
  return {
    report,
    cadence: cadences.find((c) => c.id === cadenceId),
    procedure: buildProcedureView(root, cadenceId, { reviews: report.reviews }) as Procedure | null,
    runs: buildRunHistory(root, cadenceId) as Run[],
    gate,
  };
}

/** 次回と未実施の 1 行（見出しの下）。 */
export function DueLine({ c }: { c: Cadence | undefined }) {
  if (!c) return null;
  return (
    <p className="m-0 text-sm">
      {c.due?.due
        ? <Badge variant="warning">{md(c.due.period.startDate)}〜{md(c.due.period.endDate)} は未実施</Badge>
        : <span className="text-muted-foreground">次回 {c.latest ? md(c.latest.nextReviewDate) : '—'}</span>}
    </p>
  );
}

/** 設定・計測期間を読めなかったとき。 */
export function ReviewUnavailable({ title }: { title: string }) {
  return (
    <Stack>
      <PageHead title={title} />
      <Card>
        <CardContent>設定・計測期間を読み取れない。</CardContent>
      </Card>
    </Stack>
  );
}
