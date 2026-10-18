import Link from 'next/link';
import { DataTable, StatusBadge, type DataTableRow, type Tone } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { examLabel } from '@/lib/video-board';
import { longformPlanHref } from '@/lib/content-plan-links';
import { PLAN_ACTIONS, type loadLongformPlan } from '../../../../scripts/lib/youtube-longform-plan.mjs';

type Board = ReturnType<typeof loadLongformPlan>;
type PlanRow = Board['rows'][number];
const viewOptions = { active: '予定・制作中', scheduled: '予約済み', published: '公開済み', stopped: '停止中', all: 'すべて' };

function publicationState(row: PlanRow): { label: string; tone: Tone } {
  if (row.status === 'stopped') return { label: '停止中', tone: 'neutral' };
  if (['failed', 'qa_blocked'].includes(row.status)) return { label: '要修正', tone: 'bad' };
  if (row.action === 'reuse') return { label: '再案内', tone: 'neutral' };
  if (row.status === 'published') return { label: '公開済み', tone: 'good' };
  if (row.status === 'scheduled') return { label: '予約済み', tone: 'info' };
  return { label: '未予約', tone: 'neutral' };
}

function VideoDetail({ row }: { row: PlanRow }) {
  const state = publicationState(row);
  return <Sheet>
    <SheetTrigger asChild>
      <button type="button" className="text-left font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{row.title}</button>
    </SheetTrigger>
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader className="pr-10">
        <SheetTitle>{row.title}</SheetTitle>
        <SheetDescription>{examLabel(row.exam)} · {labels[row.action]}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        {row.warning && <p className="text-sm text-destructive">{row.warning}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
          <dt className="text-muted-foreground">実予約・公開日時</dt><dd>{row.actual ?? '未予約'}</dd>
          <dt className="text-muted-foreground">公開目標</dt><dd>{row.target ?? '未設定'}{row.action === 'reuse' && '（再案内）'}</dd>
          <dt className="text-muted-foreground">制作着手</dt><dd>{row.start ?? '未設定'}</dd>
          <dt className="text-muted-foreground">確認期限</dt><dd>{row.ready ?? '未設定'}</dd>
          <dt className="text-muted-foreground">優先度</dt><dd>{row.priority ?? '未設定'}</dd>
        </dl>
        <section aria-label="制作メモ"><h3 className="mb-2 text-sm font-semibold">制作メモ</h3><p className="whitespace-pre-wrap text-sm leading-relaxed">{row.note || 'メモなし'}</p></section>
        <div className="flex flex-wrap gap-2">
          {row.href && <Button variant="outline" asChild><Link href={row.href}>画像・動画を確認</Link></Button>}
          {row.url && <Button variant="outline" asChild><a href={row.url} target="_blank" rel="noreferrer">YouTubeで確認</a></Button>}
        </div>
        <details className="text-xs text-muted-foreground"><summary>台帳情報</summary><p className="mt-2 break-all">{row.publicationId ?? row.id}</p><p className="mt-1">状態: {row.status}</p></details>
      </div>
    </SheetContent>
  </Sheet>;
}

type ExamRow = { id: string; label: string; marks: { date: string; label: string; estimated: boolean }[] };
const labels: Record<string, string> = PLAN_ACTIONS;

/** 通常動画の制作・公開管理。計画と公開台帳はIDで結合済み。 */
export function VideoAnnualPlan({ board, months, exams, periods, month, exam, library, view }: {
  board: Board; months: string[]; exams: ExamRow[]; periods: { exam: string; label: string; window: string }[]; month?: string; exam?: string; library: boolean; view?: string;
}) {
  const link = (m?: string, e = exam, lib = library) => longformPlanHref({ m, e, library: lib ? '1' : undefined });
  const examRows = board.rows.filter((r) => !exam || r.exam === exam);
  const inventory = new Map(examRows.filter((r) => r.publicationId).map((r) => [r.publicationId, r.status]));
  const published = [...inventory.values()].filter((s) => s === 'published').length;
  const reserved = [...inventory.values()].filter((s) => s === 'scheduled').length;
  const activeView = view && Object.hasOwn(viewOptions, view) ? view as keyof typeof viewOptions : library ? 'published' : 'active';
  const filtered = board.rows.filter((r) =>
    (r.inPeriod || !r.date || activeView === 'published') &&
    (!month || r.date?.startsWith(month)) && (!exam || r.exam === exam) &&
    (activeView === 'all' ||
      (activeView === 'active' && r.status !== 'stopped' && (r.status !== 'published' || r.action === 'reuse')) ||
      (activeView === 'scheduled' && r.status === 'scheduled') ||
      (activeView === 'published' && r.status === 'published' && r.action !== 'reuse') ||
      (activeView === 'stopped' && r.status === 'stopped')));
  const rows: DataTableRow[] = filtered.map((r) => {
    const state = publicationState(r);
    return {
      id: r.id,
      values: { date: r.date, title: `${r.title} ${examLabel(r.exam)}`, state: state.label },
      cells: {
        date: <><time dateTime={r.date ?? undefined}>{r.date ?? '未設定'}</time>{r.actual && r.action !== 'reuse' && <div className="text-xs text-muted-foreground">{r.actual.slice(11)}</div>}</>,
        title: <><VideoDetail row={r} />{!exam && <div className="text-xs text-muted-foreground">{examLabel(r.exam)}</div>}</>,
        state: <StatusBadge tone={state.tone}>{state.label}</StatusBadge>,
      },
    };
  });
  const overview: DataTableRow[] = months.map((m) => {
    const scheduled = examRows.filter((r) => r.inPeriod && r.date?.startsWith(m) && r.action !== 'library');
    const creation = examRows.filter((r) => r.start?.startsWith(m));
    const priority = [...new Set(scheduled.filter((r) => r.priority === 'P1').map((r) => r.exam))];
    const events = exams.filter((e) => !exam || e.id === exam).flatMap((e) => e.marks.filter((x) => x.date.startsWith(m)).map((x) => ({ ...x, exam: e.id })));
    return { id: m, values: { month: m, exam: events.map((e) => `${examLabel(e.exam)} ${e.label}`).join(' '), priority: [priority.length ? `P1: ${priority.map(examLabel).join('・')}` : '', [...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].length ? `予約維持: ${[...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].map(examLabel).join('・')}` : ''].filter(Boolean).join(' / ') || '試行・再活用を中心に進行', start: creation.length, publish: scheduled.filter((r) => r.action !== 'reuse').length, reuse: scheduled.filter((r) => r.action === 'reuse').length }, cells: {
      month: <Link href={link(m, undefined, false)}>{m}</Link>,
      exam: <div className="text-xs">{events.map((e, i) => <div key={i}>{e.estimated ? `${e.date.slice(0, 7)}頃` : e.date} {examLabel(e.exam)} {e.label}{e.estimated ? '（前年から推定）' : ''}</div>)}{!events.length && '日付指定の行事なし（期間行事は試験台帳参照）'}</div>,
    } };
  });
  return <>
    <p className="mb-4 text-sm text-muted-foreground">予約済み {reserved} 本 · 公開済み {published} 本</p>
    <form method="get" action="/sns/youtube/longform" className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">資格<select name="e" defaultValue={exam ?? ''} className="h-9 rounded-md border border-input bg-background px-3"><option value="">全資格</option>{[...new Set(board.rows.map((r) => r.exam))].map((e) => <option key={e} value={e}>{examLabel(e)}</option>)}</select></label>
      <label className="grid gap-1 text-sm">月<select name="m" defaultValue={month ?? ''} className="h-9 rounded-md border border-input bg-background px-3"><option value="">全期間</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label className="grid gap-1 text-sm">表示<select name="s" defaultValue={activeView} className="h-9 rounded-md border border-input bg-background px-3">{Object.entries(viewOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button type="submit" variant="outline">絞り込む</Button>
    </form>
    <DataTable columns={[{ key: 'date', label: '公開日' }, { key: 'title', label: '動画', wrap: true }, { key: 'state', label: '状態', sortable: false }]} rows={rows} filter="動画名で検索" emptyText="この条件の動画はありません" pageSize={25} />
    <p className="mt-2 text-xs text-muted-foreground">動画名から詳細を確認できます。未予約の公開日は目標日です。</p>
    <details className="mt-4"><summary>通常動画の月別制作配分</summary>
      <p className="my-2 text-xs text-muted-foreground">{board.plan.cadence} P1＝主軸を優先、P2＝季節集中・再活用、P3＝試行。</p>
      <div className="min-w-0 max-w-full overflow-x-auto"><DataTable columns={[{ key: 'month', label: '月' }, { key: 'exam', label: '試験・発表・申込', wrap: true }, { key: 'priority', label: '優先する資格', wrap: true }, { key: 'start', label: '制作着手', num: true }, { key: 'publish', label: '公開枠', num: true }, { key: 'reuse', label: '再案内', num: true }]} rows={overview} pageSize={12} /></div>
      <details className="my-3 text-xs text-muted-foreground"><summary>日付未定の期間行事（試験日程台帳）</summary>{periods.filter((p) => !exam || p.exam === exam).map((p, i) => <p key={i}>{examLabel(p.exam)} {p.label}: {p.window}</p>)}</details>
    </details>
    <details className="mt-4 text-sm"><summary>制作・レビューの方針</summary><p className="mt-2 text-muted-foreground">{board.plan.productionRule}</p><p className="mt-2 text-muted-foreground">{board.plan.reviewRule}</p></details>
    <p className="mt-2 text-xs"><Link href="/strategy/qualifications">試験日程の台帳</Link> · <Link href="/content/items?c=youtube">作品と公開</Link> · <Link href="/metrics/video">動画の送客実績</Link></p>
  </>;
}
