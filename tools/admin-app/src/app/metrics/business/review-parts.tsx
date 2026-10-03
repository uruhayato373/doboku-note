import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../../../scripts/lib/business-direction.mjs';
import { buildProcedureView, buildReviewView, buildRunHistory, runKeyOfPeriod } from '../../../../../../scripts/lib/review-wiring.mjs';
import { buildGate } from '../../../../../../scripts/lib/backlog-gate.mjs';
import { todayJst } from '../../../../../../scripts/lib/jst-date.mjs';

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

/** 選んだ回の実施状況。 */
export function Current({ sel }: { sel: Selected }) {
  const v = VERDICT[sel.verdict];
  return (
    <Grid min="sm">
      <Stat label="振り返り期間" value={sel.period ? `${md(sel.period.startDate)}〜${md(sel.period.endDate)}` : '—'} />
      <Stat label="記録" value={sel.review ? (sel.review.status === 'provisional' ? '暫定' : '確定') : 'なし'} />
      <Stat label="判定" value={<Badge variant={v.variant}>{v.label}</Badge>} />
    </Grid>
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

function Count({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col border-l-[3px] border-border py-1 pl-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** 選んだ回の判断（人が読む）と、今の回だけ人が決めるバックログのカード。 */
export function Outcome({ c, review, gate }: { c: Cadence; review: Review | null; gate: Gate | null }) {
  return (
    <Section title="判断">
      <Grid min="lg">
        <Card>
          <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
            {review ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">決めたこと</div>
                  <p className="m-0">{review.decision}</p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">次の一手</div>
                  <p className="m-0">{review.nextAction}</p>
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

export type Selected = {
  key: string;
  period: { startDate: string; endDate: string } | null;
  review: Review | null;
  verdict: Run['verdict'];
  current: boolean;
};
export type RunOption = { key: string; label: string; verdict: Run['verdict'] };
export type ReviewData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  cadence: Cadence | undefined;
  procedure: Procedure | null;
  options: RunOption[];
  selected: Selected;
  gate: Gate | null;
};

/** 週次の回のキー（レポートの ISO 週 YYYY-Www）から振り返り期間（その前の月曜〜日曜）を出す。 */
function weeklyPeriodOfKey(key: string) {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const jan4 = Date.UTC(Number(m[1]), 0, 4);
  const week1Monday = jan4 - (((new Date(jan4).getUTCDay() + 6) % 7) * 86400000);
  const monday = week1Monday + (Number(m[2]) - 1) * 7 * 86400000;
  const day = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { startDate: day(monday - 7 * 86400000), endDate: day(monday - 86400000) };
}

const runLabel = (cadenceId: string, key: string, period: { startDate: string; endDate: string } | null) => {
  if (cadenceId === 'monthly') return `${Number(key.slice(5))}月`;
  const p = period ?? weeklyPeriodOfKey(key);
  return p ? `${md(p.startDate)}〜${md(p.endDate)}` : key;
};

/** 週次・月次ページの共通の読み込み。runKey で回を選ぶ（既定は今の回）。設定・期間を読めなければ null。 */
export function loadReview(cadenceId: 'weekly' | 'monthly', runKey?: string): ReviewData | null {
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
      return buildGate(readFileSync(join(root, '.claude/todo/backlog.md'), 'utf8'), todayJst()) as Gate;
    } catch {
      return null;
    }
  })();
  const cadence = cadences.find((c) => c.id === cadenceId);
  const runs = buildRunHistory(root, cadenceId, { limit: 8 }) as Run[];
  // 今の回（対象期間が未記録ならその期間）を先頭に、過去の回を新しい順に並べる
  const dueKey = cadence?.due?.due ? (runKeyOfPeriod(cadenceId, cadence.due.period) as string) : null;
  const keys = [...new Set([...(dueKey ? [dueKey] : []), ...runs.map((r) => r.key)])].slice(0, cadenceId === 'weekly' ? 5 : 6);
  const periodOf = (key: string) => runs.find((r) => r.key === key)?.period ?? (key === dueKey ? cadence!.due!.period : null);
  const verdictOf = (key: string): Run['verdict'] => runs.find((r) => r.key === key)?.verdict ?? 'missing';
  const options = keys.map((key) => ({ key, label: runLabel(cadenceId, key, periodOf(key)), verdict: verdictOf(key) }));
  const key = runKey && keys.includes(runKey) ? runKey : keys[0] ?? '';
  const review = (report.reviews as Review[])
    .filter((r) => r.cadence === cadenceId && runKeyOfPeriod(cadenceId, r.period) === key)
    .sort((a, b) => String((b as Review & { createdAt?: string }).createdAt ?? b.file).localeCompare(String((a as Review & { createdAt?: string }).createdAt ?? a.file)))[0] ?? null;
  return {
    report,
    cadence,
    procedure: buildProcedureView(root, cadenceId, { reviews: report.reviews, runKey: key || null }) as Procedure | null,
    options,
    selected: { key, period: periodOf(key), review, verdict: verdictOf(key), current: key === keys[0] },
    gate,
  };
}

/** 回の選択（月次＝月・週次＝週）。各回に判定を添える。 */
export function RunPicker({ base, options, selected }: { base: string; options: RunOption[]; selected: string }) {
  return (
    <TabsList aria-label="回">
      {options.map((o, i) => (
        <TabsTrigger key={o.key} href={i === 0 ? base : `${base}?run=${o.key}`} active={o.key === selected}>
          {o.label}
          <Badge variant={VERDICT[o.verdict].variant}>{VERDICT[o.verdict].label}</Badge>
        </TabsTrigger>
      ))}
    </TabsList>
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
