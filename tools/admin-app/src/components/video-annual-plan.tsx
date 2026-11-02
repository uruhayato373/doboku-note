import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, DetailText, StatusBadge, type DataTableRow, type Tone } from '@/components/admin';
import { Button } from '@/components/ui/button';
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
  return (
    <DetailSheet trigger={row.title} title={row.title} description={`${examLabel(row.exam)} · ${labels[row.action]}`}>
      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
      {row.warning && <p className="text-destructive">{row.warning}</p>}
      <DetailList
        items={[
          { label: '実予約・公開日時', value: row.actual ?? '未予約' },
          { label: '公開目標', value: `${row.target ?? '未設定'}${row.action === 'reuse' ? '（再案内）' : ''}` },
          { label: '制作着手', value: row.start ?? '未設定' },
          { label: '確認期限', value: row.ready ?? '未設定' },
          { label: '優先度', value: row.priority ?? '未設定' },
          { label: '状態', value: row.status },
          { label: '台帳', value: <span className="break-all">{row.publicationId ?? row.id}</span> },
        ]}
      />
      <DetailText title="制作メモ" items={[row.note]} />
      <div className="flex flex-wrap gap-2">
        {row.href && <Button variant="outline" asChild><Link href={row.href}>画像・動画を確認</Link></Button>}
        {row.url && <Button variant="outline" asChild><a href={row.url} target="_blank" rel="noreferrer">YouTubeで確認</a></Button>}
      </div>
    </DetailSheet>
  );
}

type ExamRow = { id: string; label: string; marks: { date: string; label: string; estimated: boolean }[] };
const labels: Record<string, string> = PLAN_ACTIONS;

/** 通常動画の制作・公開管理。計画と公開台帳はIDで結合済み。 */
export function VideoAnnualPlan({ board, months, exams, periods, month, exam, library, view, tab }: {
  board: Board; months: string[]; exams: ExamRow[]; periods: { exam: string; label: string; window: string }[]; month?: string; exam?: string; library: boolean; view?: string; tab?: string;
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
    return { id: m, values: { month: m, exam: events.map((e) => `${examLabel(e.exam)} ${e.label}`).join(' '), priority: [priority.length ? `P1: ${priority.map(examLabel).join('・')}` : '', [...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].length ? `予約維持: ${[...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].map(examLabel).join('・')}` : ''].filter(Boolean).join(' / ') || '—', start: creation.length, publish: scheduled.filter((r) => r.action !== 'reuse').length, reuse: scheduled.filter((r) => r.action === 'reuse').length }, cells: {
      month: <Link href={link(m, undefined, false)}>{m}</Link>,
      exam: <div className="text-xs">{events.map((e, i) => <div key={i}>{e.estimated ? `${e.date.slice(0, 7)}頃` : e.date} {examLabel(e.exam)} {e.label}{e.estimated ? '（推定）' : ''}</div>)}{!events.length && '—'}</div>,
    } };
  });
  const current = tab === 'plan' ? 'plan' : 'videos';
  const tabHref = (t: string) => `/sns/youtube/longform?${new URLSearchParams({ ...(exam ? { e: exam } : {}), ...(month ? { m: month } : {}), ...(t === 'plan' ? { tab: 'plan' } : {}) }).toString()}`;
  return <>
    <nav className="filterbar mb-3!">
      <Link className={'chip' + (current === 'videos' ? ' active' : '')} href={tabHref('videos')}>動画</Link>
      <Link className={'chip' + (current === 'plan' ? ' active' : '')} href={tabHref('plan')}>月別制作配分</Link>
      <span className="small muted ml-auto">予約済み {reserved} 本 · 公開済み {published} 本</span>
    </nav>
    {current === 'videos' && <>
    <form method="get" action="/sns/youtube/longform" className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">資格<select name="e" defaultValue={exam ?? ''} className="h-9 rounded-md border border-input bg-background px-3"><option value="">全資格</option>{[...new Set(board.rows.map((r) => r.exam))].map((e) => <option key={e} value={e}>{examLabel(e)}</option>)}</select></label>
      <label className="grid gap-1 text-sm">月<select name="m" defaultValue={month ?? ''} className="h-9 rounded-md border border-input bg-background px-3"><option value="">全期間</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label className="grid gap-1 text-sm">表示<select name="s" defaultValue={activeView} className="h-9 rounded-md border border-input bg-background px-3">{Object.entries(viewOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button type="submit" variant="outline">絞り込む</Button>
    </form>
    <DataTable columns={[{ key: 'date', label: '公開日' }, { key: 'title', label: '動画', wrap: true }, { key: 'state', label: '状態', sortable: false }]} rows={rows} filter="動画名で検索" emptyText="該当なし" pageSize={25} />
    </>}
    {current === 'plan' && <>
      <div className="min-w-0 max-w-full overflow-x-auto"><DataTable columns={[{ key: 'month', label: '月' }, { key: 'exam', label: '試験・発表・申込', wrap: true }, { key: 'priority', label: '優先する資格', wrap: true }, { key: 'start', label: '制作着手', num: true }, { key: 'publish', label: '公開枠', num: true }, { key: 'reuse', label: '再案内', num: true }]} rows={overview} pageSize={12} /></div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <DetailSheet trigger="日付未定の期間行事" title="日付未定の期間行事">
          <DetailText title="期間行事" items={periods.filter((p) => !exam || p.exam === exam).map((p) => `${examLabel(p.exam)} ${p.label}: ${p.window}`)} />
        </DetailSheet>
        <DetailSheet trigger="制作・レビューの方針" title="制作・レビューの方針">
          <DetailText title="方針" items={[board.plan.cadence, board.plan.productionRule, board.plan.reviewRule]} />
        </DetailSheet>
      </div>
    </>}
    <p className="mt-3 text-xs"><Link href="/strategy/qualifications">試験日程の台帳</Link> · <Link href="/content/items?c=youtube">作品と公開</Link> · <Link href="/metrics/video">動画の送客実績</Link></p>
  </>;
}
