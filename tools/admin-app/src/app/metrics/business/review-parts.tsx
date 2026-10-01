import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../../../scripts/lib/business-direction.mjs';
import { buildProcedureView, buildReviewView, buildRunHistory } from '../../../../../../scripts/lib/review-wiring.mjs';
import { buildGate } from '../../../../../../scripts/lib/backlog-gate.mjs';

/**
 * 戦略 ＞ レビューの共通部品。週次（/metrics/business/weekly）と月次（/metrics/business/monthly）のページが使う。
 * 「何をしているか（手順）」と「正しく実施できたか（証拠と履歴）」を管理する。
 * - 手順の正本は .claude/config/review-wiring.json の procedure、判定は scripts/lib/review-wiring.mjs（buildProcedureView・buildRunHistory）
 * - 実施履歴はレビュー記録（.claude/state/metrics/business/review-*.json）とレポート（docs/reviews/{weekly,monthly}/。
 *   保持方針で削除された古い回は git 履歴）を回ごとに突き合わせる
 * - 判断・出力・バックログの関門・見る材料は従来どおり。KPI の値はトップ（/）
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
  ok: { label: '証拠あり', variant: 'success' },
  partial: { label: '一部', variant: 'warning' },
  missing: { label: '証拠なし', variant: 'destructive' },
  manual: { label: '記録が残らない', variant: 'outline' },
};
const VERDICT: Record<Run['verdict'], { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: '実施できた', variant: 'success' },
  partial: { label: '不足あり', variant: 'warning' },
  missing: { label: '未実施', variant: 'destructive' },
};
export const md = (d: string) => d.slice(5).replace('-', '/');

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="flex flex-col gap-1 px-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-bold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

/** 今回の実施状況（最新の回）。 */
export function Current({ run, procedure, due }: { run: Run | undefined; procedure: Procedure; due?: Cadence['due'] }) {
  const count = (s: StepState) => procedure.steps.filter((x) => x.state === s).length;
  // 対象期間がまだ記録されていないとき、最新の回は「前回」。今回は未実施であることを先に出す
  const pending = due?.due && run?.period?.startDate !== due.period.startDate ? due.period : null;
  return (
    <Section
      title={pending ? '前回の実施状況' : '今回の実施状況'}
      note={pending ? `今回の対象 ${md(pending.startDate)}〜${md(pending.endDate)} は未実施。実施すると、下の判定と手順チェックリストが今回のものに変わる` : undefined}
    >
      <Grid min="sm">
        <Stat
          label="振り返り期間"
          value={run?.period ? `${md(run.period.startDate)}〜${md(run.period.endDate)}` : '—'}
          sub={run ? `回 ${run.key}` : undefined}
        />
        <Stat
          label="レビュー記録"
          value={run?.record ? (run.record.status === 'provisional' ? '暫定' : '確定') : 'なし'}
          sub={run?.record && run.record.revisions > 1 ? `書き直し ${run.record.revisions} 回` : undefined}
        />
        <Stat label="手順の証拠" value={`${count('ok')} / ${procedure.steps.length}`} sub={`一部 ${count('partial')}・なし ${count('missing')}・記録が残らない ${count('manual')}`} />
        <Stat label="判定" value={run ? <Badge variant={VERDICT[run.verdict].variant}>{VERDICT[run.verdict].label}</Badge> : '—'} sub={procedure.report?.name} />
      </Grid>
    </Section>
  );
}

/** 手順チェックリスト（何をやるか・何が残れば実施済みか・今回の判定）。 */
export function Checklist({ procedure }: { procedure: Procedure }) {
  const lacking = procedure.sections?.expected.filter((x) => !x.present) ?? [];
  return (
    <Section title="手順チェックリスト" note="手順の正本は .claude/config/review-wiring.json の procedure。判定は最新のレポート・記録・計測トリアージ・週間計画から機械で出す">
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>手順</TableHead>
                <TableHead>判定</TableHead>
                <TableHead>根拠</TableHead>
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
                    <Badge variant={STEP[s.state].variant}>{STEP[s.state].label}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-xs whitespace-normal">{s.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {procedure.sections && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">
            レポートの必須の節 {procedure.sections.expected.length - lacking.length} / {procedure.sections.expected.length}
            {lacking.length ? '・書かれていない:' : '・すべて書かれている'}
          </span>
          {lacking.map((x) => (
            <Badge key={x.title} variant="warning">{x.title}</Badge>
          ))}
        </div>
      )}
    </Section>
  );
}

/** 回ごとの実施履歴。 */
export function History({ runs, weekly }: { runs: Run[]; weekly: boolean }) {
  return (
    <Section
      title="実施履歴"
      note="レビュー記録とレポートを回ごとに突き合わせる。古いレポートは保持方針で削除されているので git 履歴から読む（「履歴」）。判定は記録が確定・レポートあり・必須の節が全部・申し送りの行き先が全件（週次）で「実施できた」"
    >
      <Card className="py-2">
        <CardContent className="px-2">
          {runs.length === 0 ? (
            <p className="m-0 p-2 text-sm text-muted-foreground">まだ実施の記録もレポートも無い</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>回</TableHead>
                  <TableHead>振り返り期間</TableHead>
                  <TableHead>記録</TableHead>
                  <TableHead>レポート</TableHead>
                  <TableHead>必須の節</TableHead>
                  {weekly && <TableHead>申し送りの行き先</TableHead>}
                  <TableHead>起票</TableHead>
                  <TableHead>判定</TableHead>
                  <TableHead>決めたこと</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const sectionsOk = r.sections && r.sections.found === r.sections.expected;
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="font-mono text-xs">{r.key}</TableCell>
                      <TableCell className="text-xs">{r.period ? `${md(r.period.startDate)}〜${md(r.period.endDate)}` : '—'}</TableCell>
                      <TableCell>
                        {r.record ? (
                          <Badge variant={r.record.status === 'provisional' ? 'warning' : 'success'}>
                            {r.record.status === 'provisional' ? '暫定' : '確定'}
                            {r.record.revisions > 1 ? ` ×${r.record.revisions}` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">なし</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.report ? (r.reportSource === 'git' ? <span className="text-muted-foreground">あり（履歴）</span> : 'あり') : <Badge variant="destructive">なし</Badge>}
                      </TableCell>
                      <TableCell className={`text-xs tabular-nums ${r.sections && !sectionsOk ? 'text-(--warn)' : ''}`}>
                        {r.sections ? `${r.sections.found} / ${r.sections.expected}` : '—'}
                      </TableCell>
                      {weekly && (
                        <TableCell className="text-xs tabular-nums">
                          {!r.routing ? '—' : r.routing.total < 0 ? <span className="text-(--warn)">節なし</span> : `${r.routing.routed} / ${r.routing.total}`}
                        </TableCell>
                      )}
                      <TableCell className="text-xs tabular-nums">{r.cards}</TableCell>
                      <TableCell>
                        <Badge variant={VERDICT[r.verdict].variant}>{VERDICT[r.verdict].label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[28rem] min-w-[16rem] text-xs whitespace-normal">
                        <span className="line-clamp-2" title={r.record?.decision}>{r.record?.decision || '—'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

function Output({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </>
  );
  return (
    <div className="flex flex-col border-l-[3px] border-border py-1 pl-3">
      {href ? <Link href={href} className="flex flex-col text-inherit no-underline">{body}</Link> : body}
    </div>
  );
}

/** 判断と出力（最新のレビュー記録）とバックログの関門。 */
export function Outcome({ c, gate }: { c: Cadence; gate: Gate | null }) {
  return (
    <Section title="判断と出力">
      <Grid min="lg">
        <Card>
          <CardHeader>
            <CardTitle>判断</CardTitle>
            {c.latest && (
              <CardDescription>
                {c.latest.period.startDate}〜{c.latest.period.endDate}
                {c.latest.status === 'provisional' ? '（暫定）' : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
            {c.latest ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">決めたこと</div>
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
        <Card>
          <CardHeader>
            <CardTitle>出力</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Grid min="sm">
              <Output label="起票したカード" value={c.cards.length} href={c.cards.length ? '/todo?f=backlog' : undefined} />
              <Output label="実験" value={c.latest?.experimentIds?.length ?? 0} />
              {c.weeklyPlan && <Output label="週次計画" value="開く →" href="/todo?f=weekly" />}
            </Grid>
            {c.cards.length > 0 && (
              <ul className="m-0 pl-4 text-xs">
                {c.cards.map((x) => (
                  <li key={x.id}>
                    <Link className="font-mono" href={`/todo?f=backlog&id=${x.id}`}>{x.id}</Link> {x.title}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Grid>
      {gate && (
        <Card>
          <CardHeader>
            <CardTitle>バックログの関門</CardTitle>
            <CardDescription>{c.id === 'weekly' ? '判断待ちを全件諮る・期日切れ・新規' : '時期なしの🟢・90 日超を月を付けるか削除'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Grid min="sm">
              {c.id === 'weekly' ? (
                <>
                  <Output label="今決められる判断待ち" value={gate.weekly.decisions.length} href="/todo?f=backlog" />
                  <Output label="判断の時期が先" value={gate.weekly.decisionsLater.length} />
                  <Output label="いちばん古い判断待ち" value={gate.weekly.decisions.length ? `${gate.weekly.decisions[0]?.ageDays ?? '—'} 日` : '—'} />
                  <Output label="期日切れ" value={gate.weekly.overdue.length} />
                  <Output label="直近 7 日の起票" value={gate.weekly.filedThisWeek.length} />
                </>
              ) : (
                <>
                  <Output label="時期の無い 🟢" value={gate.monthly.lowWithoutWhen.length} href="/todo?f=backlog" />
                  <Output label="起票から 90 日超" value={gate.monthly.stale.length} />
                  <Output label="今月の 🔴🟡" value={gate.monthly.thisMonth} />
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Section>
  );
}

/** 見る材料（判断に使う入力）と、実行するコマンドの全件。 */
export function Inputs({ c }: { c: Cadence }) {
  const checks = c.byStage.reduce((n, s) => n + s.check.length, 0);
  const drifted = c.drift.missing.length > 0 || c.drift.extra.length > 0;
  return (
    <Section title="見る材料" note={`ほかに自動の点検 ${checks} 件（異常があるときだけ見ればよい）`}>
      <Card>
        <CardContent className="flex flex-col gap-2.5">
          {c.byStage.filter((s) => s.judge.length).map((s) => (
            <div key={s.stage} className="grid grid-cols-[7em_1fr] items-baseline gap-2">
              <span className="text-xs text-muted-foreground">{s.stage}</span>
              <div className="flex flex-wrap gap-1.5">
                {s.judge.map((i) => <Badge key={i.command} variant="outline" className="whitespace-normal">{i.label}</Badge>)}
              </div>
            </div>
          ))}
          {drifted && <Badge variant="warning">配線の正本とスキルがずれている</Badge>}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">実行するコマンドの全件（判断 {c.counts.judge}・点検 {c.counts.check}）</summary>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>段</TableHead>
                  <TableHead>見るもの</TableHead>
                  <TableHead>コマンド</TableHead>
                  <TableHead>役割</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.byStage.flatMap((s) =>
                  [...s.judge.map((i) => ({ ...i, role: '判断' })), ...s.check.map((i) => ({ ...i, role: '点検' }))].map((i, n) => (
                    <TableRow key={s.stage + i.command}>
                      <TableCell className="text-xs text-muted-foreground">{n === 0 ? s.stage : ''}</TableCell>
                      <TableCell className="text-xs">{i.label}</TableCell>
                      <TableCell className="font-mono text-xs">{i.command.replace(/^node:/, 'node scripts/')}</TableCell>
                      <TableCell className="text-xs">{i.role === '判断' ? <strong>判断</strong> : <span className="text-muted-foreground">点検</span>}</TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </details>
        </CardContent>
      </Card>
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

/** 最終・次回・未記録の 1 行（各ページの見出しの下）。 */
export function DueLine({ c }: { c: Cadence | undefined }) {
  if (!c) return null;
  return (
    <p className="m-0 text-xs text-muted-foreground">
      {c.latest ? `最終 ${md(c.latest.period.startDate)}〜${md(c.latest.period.endDate)}・次回 ${md(c.latest.nextReviewDate)}` : '記録なし'}
      {c.due?.due && <span className="text-(--warn)">・{md(c.due.period.startDate)}〜{md(c.due.period.endDate)} が未記録</span>}
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
