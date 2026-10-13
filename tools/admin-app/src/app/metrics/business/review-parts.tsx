import { existsSync, readFileSync } from 'node:fs';
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
import { reviewWeekLabel } from '../../../../../../scripts/lib/review-week.mjs';
import { readWeeklyDraft, reviewChecks, weeklyLaunchd } from '../../../../../../scripts/lib/review-automation.mjs';

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
export function Current({ sel, cadenceId }: { sel: Selected; cadenceId: 'weekly' | 'monthly' }) {
  const v = VERDICT[sel.verdict];
  return (
    <Stack gap="sm">
      <Grid min="sm">
        <Stat label={cadenceId === 'weekly' ? 'レビューの週' : '対象月'} value={runLabel(cadenceId, sel.key)} />
        <Stat label="振り返り期間" value={sel.period ? `${md(sel.period.startDate)}〜${md(sel.period.endDate)}` : '—'} />
        <Stat label="記録" value={sel.review ? (sel.review.status === 'provisional' ? '暫定' : '確定') : 'なし'} />
        <Stat label="判定" value={<Badge variant={v.variant}>{v.label}</Badge>} />
      </Grid>
      {sel.reasons.length > 0 && (
        <ul className="m-0 pl-5 text-sm text-muted-foreground">
          {sel.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </Stack>
  );
}

const CHECK_STATE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: '通過', variant: 'success' },
  fail: { label: '要対応', variant: 'warning' },
  broken: { label: '検査不成立', variant: 'destructive' },
};
const LAUNCHD: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  ok: { label: '完了', variant: 'success' },
  skipped: { label: '今週分あり（何もしない）', variant: 'outline' },
  failed: { label: '失敗', variant: 'destructive' },
  running: { label: '実行中か途中で止まった', variant: 'warning' },
};
const at = (iso: string | null | undefined) => (iso ? iso.replace('T', ' ').slice(0, 16) : '—');

/** 回を支える自動化。週次は金曜の下書き・土曜の自動実行・点検と Issue、月次は点検と Issue */
export function AutomationStatus({ a, cadenceId }: { a: Automation; cadenceId: 'weekly' | 'monthly' }) {
  if (!a) return null;
  return (
    <Section title="自動化と点検">
      <Grid min="lg">
        {cadenceId === 'weekly' && (
          <Card>
            <CardHeader>
              <CardTitle>金曜の下書き（CI）</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {!a.draft ? (
                <p className="m-0 text-muted-foreground">まだ無い（weekly-review-draft.yml が金曜 13:00 に作る・手で作るなら npm run weekly-review:draft）</p>
              ) : 'broken' in a.draft ? (
                <p className="m-0">下書きのファイルが壊れている</p>
              ) : (
                <>
                  <div>
                    {a.draft.week}・作成 {at(a.draft.generatedAt)}
                    {a.draft.stale && <Badge variant="warning" className="ml-2">この回の下書きではない</Badge>}
                  </div>
                  {a.draft.missing.length ? (
                    <ul className="m-0 pl-5">
                      {a.draft.missing.map((m: string) => (
                        <li key={m}>材料の欠け: {m}</li>
                      ))}
                    </ul>
                  ) : (
                    <Badge variant="success">必須の材料はそろっている</Badge>
                  )}
                  {a.draft.failedInputs.length > 0 && <p className="m-0 text-muted-foreground">取得に失敗した材料: {a.draft.failedInputs.join('・')}</p>}
                </>
              )}
            </CardContent>
          </Card>
        )}
        {cadenceId === 'weekly' && (
          <Card>
            <CardHeader>
              <CardTitle>土曜の自動実行（Mac の launchd）</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {!a.launchd ? (
                <p className="m-0 text-muted-foreground">この端末では確かめられない（macOS のみ）</p>
              ) : !a.launchd.installed ? (
                <p className="m-0">未登録。npm run weekly-review:install で登録する</p>
              ) : (
                <>
                  <div>登録済み（毎週土曜 9:30）</div>
                  {a.launchd.last ? (
                    <div>
                      最後の実行 {at(a.launchd.last.at)} <Badge variant={LAUNCHD[a.launchd.last.result].variant}>{LAUNCHD[a.launchd.last.result].label}</Badge>
                    </div>
                  ) : (
                    <p className="m-0 text-muted-foreground">まだ一度も動いていない</p>
                  )}
                  <p className="m-0 text-xs text-muted-foreground">ログ: ~/Library/Logs/doboku-note/weekly-review.log</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>点検と Issue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {!a.checks ? (
              <p className="m-0 text-muted-foreground">この回の点検の記録が無い（npm run review-checks）</p>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">実行 {at(a.checks.ranAt)}</div>
                {a.checks.checks.map((c) => (
                  <div key={c.command} title={c.summary}>
                    {c.label} <Badge variant={(CHECK_STATE[c.state] ?? CHECK_STATE.fail).variant}>{(CHECK_STATE[c.state] ?? CHECK_STATE.fail).label}</Badge>
                  </div>
                ))}
                {a.checks.items.length > 0 && (
                  <ul className="m-0 pl-5">
                    {a.checks.items.map((it) => (
                      <li key={it.key}>
                        {it.label} {it.routed ? <Badge variant="success">行き先あり</Badge> : <Badge variant="warning">行き先なし</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
  /** 「不足あり」「未実施」の内訳（記録・レポート・節・申し送りのどれが欠けるか） */
  reasons: string[];
  current: boolean;
};
export type Automation = {
  draft: ReturnType<typeof readWeeklyDraft>;
  launchd: ReturnType<typeof weeklyLaunchd>;
  checks: ReturnType<typeof reviewChecks>;
} | null;
export type RunOption = { key: string; label: string; verdict: Run['verdict'] };
export type ReviewData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  cadence: Cadence | undefined;
  procedure: Procedure | null;
  options: RunOption[];
  selected: Selected;
  gate: Gate | null;
  automation: Automation;
};

/** 回の呼び方。週次はレビューの週（例 W41（10/05〜10/11））、月次は対象月。換算は scripts/lib/review-week.mjs */
const runLabel = (cadenceId: string, key: string) => {
  if (cadenceId === 'monthly') return `${Number(key.slice(5))}月`;
  try {
    return reviewWeekLabel(key).week;
  } catch {
    return key;
  }
};

/** 判定が ok でない理由（buildRunHistory の行から・純関数） */
function verdictReasons(run: Run | undefined): string[] {
  if (!run) return ['事業レビューの記録もレポートも無い'];
  const out: string[] = [];
  if (!run.record) out.push('事業レビューの記録が無い');
  else if (run.record.status === 'provisional') out.push('事業レビューの記録が暫定（欠測のある指標がある・欠けた数字を取って確定版で訂正すると消える）');
  if (!run.report) out.push('レポートが無い');
  if (run.sections && run.sections.found < run.sections.expected) out.push(`レポートの必須の節 ${run.sections.found}/${run.sections.expected}`);
  if (run.routing && run.routing.total < 0) out.push('レポートに申し送りの節が無い');
  else if (run.routing && run.routing.routed < run.routing.total) out.push(`申し送りの行き先 ${run.routing.routed}/${run.routing.total}`);
  return out;
}

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
  const options = keys.map((key) => ({ key, label: runLabel(cadenceId, key), verdict: verdictOf(key) }));
  const key = runKey && keys.includes(runKey) ? runKey : keys[0] ?? '';
  const review = (report.reviews as Review[])
    .filter((r) => r.cadence === cadenceId && runKeyOfPeriod(cadenceId, r.period) === key)
    .sort((a, b) => String((b as Review & { createdAt?: string }).createdAt ?? b.file).localeCompare(String((a as Review & { createdAt?: string }).createdAt ?? a.file)))[0] ?? null;
  return {
    report,
    cadence,
    procedure: buildProcedureView(root, cadenceId, { reviews: report.reviews, runKey: key || null }) as Procedure | null,
    options,
    selected: { key, period: periodOf(key), review, verdict: verdictOf(key), reasons: verdictOf(key) === 'ok' ? [] : verdictReasons(runs.find((r) => r.key === key)), current: key === keys[0] },
    gate,
    automation: loadAutomation(root, cadenceId, key),
  };
}

/** 回を支える自動化（金曜の下書き・土曜の自動実行・点検と Issue）。読めないものは null のまま出す */
function loadAutomation(root: string, cadenceId: 'weekly' | 'monthly', key: string): Automation {
  if (!key) return null;
  const reportPath = join(root, 'docs', 'reviews', cadenceId, `${key}-review.md`);
  const reportText = existsSync(reportPath) ? readFileSync(reportPath, 'utf8') : '';
  return {
    draft: cadenceId === 'weekly' ? readWeeklyDraft(root, key) : null,
    launchd: cadenceId === 'weekly' ? weeklyLaunchd(root) : null,
    checks: reviewChecks(root, cadenceId, key, reportText),
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
