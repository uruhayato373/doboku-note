import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../../../scripts/lib/business-direction.mjs';
import { buildProcedureView, buildReviewView, buildRunHistory, runKeyOfPeriod } from '../../../../../../scripts/lib/review-wiring.mjs';
import { buildGate } from '../../../../../../scripts/lib/backlog-gate.mjs';
import { todayJst } from '../../../../../../scripts/lib/jst-date.mjs';
import { reviewWeekLabel } from '../../../../../../scripts/lib/review-week.mjs';
import { readWeeklyDraft, reviewChecks, weeklyLaunchd } from '../../../../../../scripts/lib/review-automation.mjs';
import { jstDateTime } from '@/lib/format';
import { StatusBadge, type Tone, DataTable, PanelCard, StatCard, type DataTableColumn, type DataTableRow } from '@/components/admin';

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

const STEP: Record<StepState, { label: string; tone: Tone }> = {
  ok: { label: '済', tone: 'good' },
  partial: { label: '一部', tone: 'warn' },
  missing: { label: '未', tone: 'bad' },
  manual: { label: '—', tone: 'neutral' },
};
const VERDICT: Record<Run['verdict'], { label: string; tone: Tone }> = {
  ok: { label: '実施できた', tone: 'good' },
  partial: { label: '不足あり', tone: 'warn' },
  missing: { label: '未実施', tone: 'bad' },
};
export const md = (d: string) => d.slice(5).replace('-', '/');

/** 選んだ回の実施状況。 */
export function Current({ sel, cadenceId }: { sel: Selected; cadenceId: 'weekly' | 'monthly' }) {
  const v = VERDICT[sel.verdict];
  return (
    <Stack gap="sm">
      <Grid min="sm">
        <StatCard label={cadenceId === 'weekly' ? 'レビューの週' : '対象月'} value={runLabel(cadenceId, sel.key)} />
        <StatCard label="振り返り期間" value={sel.period ? `${md(sel.period.startDate)}〜${md(sel.period.endDate)}` : '—'} />
        <StatCard label="記録" value={sel.review ? (sel.review.status === 'provisional' ? '暫定' : '確定') : 'なし'} />
        <StatCard label="判定" value={<StatusBadge tone={v.tone}>{v.label}</StatusBadge>} />
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

const CHECK_STATE: Record<string, { label: string; tone: Tone }> = {
  ok: { label: '通過', tone: 'good' },
  fail: { label: '要対応', tone: 'warn' },
  broken: { label: '検査不成立', tone: 'bad' },
};
const LAUNCHD: Record<string, { label: string; tone: Tone }> = {
  ok: { label: '完了', tone: 'good' },
  skipped: { label: '今週分あり（何もしない）', tone: 'neutral' },
  failed: { label: '失敗', tone: 'bad' },
  running: { label: '実行中か途中で止まった', tone: 'warn' },
};

/** 回を支える自動化。週次は土曜の下書き・自動実行・点検と Issue、月次は点検と Issue */
export function AutomationStatus({ a, cadenceId }: { a: Automation; cadenceId: 'weekly' | 'monthly' }) {
  if (!a) return null;
  return (
    <Section title="自動化と点検">
      <Grid min="lg">
        {cadenceId === 'weekly' && (
          <PanelCard title="下書き（土曜の Mac）"><div className="flex flex-col gap-2 text-sm">
              {!a.draft ? (
                <p className="m-0 text-muted-foreground">まだ無い（土曜の Mac が収集の後に作る・手で作るなら npm run weekly-review:draft）</p>
              ) : 'broken' in a.draft ? (
                <p className="m-0">下書きのファイルが壊れている</p>
              ) : (
                <>
                  <div>
                    {a.draft.week}・作成 {jstDateTime(a.draft.generatedAt, { short: true })}
                    {a.draft.stale && <> <StatusBadge tone="warn">この回の下書きではない</StatusBadge></>}
                  </div>
                  {a.draft.missing.length ? (
                    <ul className="m-0 pl-5">
                      {a.draft.missing.map((m: string) => (
                        <li key={m}>材料の欠け: {m}</li>
                      ))}
                    </ul>
                  ) : (
                    <StatusBadge tone="good">必須の材料はそろっている</StatusBadge>
                  )}
                  {a.draft.failedInputs.length > 0 && <p className="m-0 text-muted-foreground">取得に失敗した材料: {a.draft.failedInputs.join('・')}</p>}
                </>
              )}
            </div>
          </PanelCard>
        )}
        {cadenceId === 'weekly' && (
          <PanelCard title="土曜の自動実行（Mac）"><div className="flex flex-col gap-2 text-sm">
              {!a.launchd ? (
                <p className="m-0 text-muted-foreground">この端末では確かめられない（macOS のみ）</p>
              ) : a.launchd.last ? (
                <div>
                  最後の実行 {jstDateTime(a.launchd.last.at, { short: true })} <StatusBadge tone={LAUNCHD[a.launchd.last.result].tone}>{LAUNCHD[a.launchd.last.result].label}</StatusBadge>
                  {a.launchd.last.collectFailed ? <StatusBadge tone="bad">土曜の収集が失敗</StatusBadge> : null}
                  {a.launchd.last.gscFailed ? <StatusBadge tone="bad">GSC の記録が失敗</StatusBadge> : null}
                </div>
              ) : (
                <p className="m-0 text-muted-foreground">{a.launchd.installed ? 'まだ一度も動いていない' : '未登録（npm run weekly-review:install で登録する）'}</p>
              )}
              {/* 段ごとの結果（収集・GSC の記録・レビュー）は Mac の自動実行の画面が正本。ここはレビューの回の目印だけ（DN-0851） */}
              <Link href="/ops/mac">段ごとの結果は「Mac の自動実行」で見る</Link>
            </div>
          </PanelCard>
        )}
        <PanelCard title="点検と Issue"><div className="flex flex-col gap-2 text-sm">
            {!a.checks ? (
              <p className="m-0 text-muted-foreground">この回の点検の記録が無い（npm run review-checks）</p>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">実行 {jstDateTime(a.checks.ranAt, { short: true })}</div>
                {a.checks.checks.map((c) => (
                  <div key={c.command} title={c.summary}>
                    {c.label} <StatusBadge tone={(CHECK_STATE[c.state] ?? CHECK_STATE.fail).tone}>{(CHECK_STATE[c.state] ?? CHECK_STATE.fail).label}</StatusBadge>
                  </div>
                ))}
                {a.checks.items.length > 0 && (
                  <ul className="m-0 pl-5">
                    {a.checks.items.map((it) => (
                      <li key={it.key}>
                        {it.label} {it.routed ? <StatusBadge tone="good">行き先あり</StatusBadge> : <StatusBadge tone="warn">行き先なし</StatusBadge>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </PanelCard>
      </Grid>
    </Section>
  );
}

const STEP_COLUMNS: DataTableColumn[] = [
  { key: 'order', label: '#', num: true },
  { key: 'step', label: 'やること', wrap: true },
  { key: 'state', label: '実施' },
];

function stepRows(procedure: Procedure): DataTableRow[] {
  return procedure.steps.map((s, i) => ({
    id: s.label,
    values: { order: i + 1, step: `${s.label} ${s.does}`, state: STEP[s.state].label },
    cells: {
      step: (
        <>
          <div className="font-semibold">{s.label}</div>
          <div className="text-xs text-muted-foreground">{s.does}</div>
        </>
      ),
      state: (
        <span title={s.note}>
          <StatusBadge tone={STEP[s.state].tone}>{STEP[s.state].label}</StatusBadge>
        </span>
      ),
    },
  }));
}

/** 手順（何をやるか）と、それぞれ実施できたか。根拠はマウスで出す。 */
export function Checklist({ procedure }: { procedure: Procedure }) {
  return (
    <Section title="手順">
      <DataTable columns={STEP_COLUMNS} rows={stepRows(procedure)} pageSize={20} />
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
        <PanelCard title="判断の記録">
          <div className="flex flex-col gap-3 text-sm leading-relaxed">
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
          </div>
        </PanelCard>
        {gate && (
          <PanelCard title="人が決めるカード">
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
            
          </PanelCard>
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

/** 回を支える自動化（土曜の下書き・自動実行・点検と Issue）。読めないものは null のまま出す */
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
          <StatusBadge tone={VERDICT[o.verdict].tone}>{VERDICT[o.verdict].label}</StatusBadge>
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
      <p className="project-warning-text text-sm">設定・計測期間を読み取れない。</p>
    </Stack>
  );
}
