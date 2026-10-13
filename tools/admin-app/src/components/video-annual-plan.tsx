import Link from 'next/link';
import { DataTable, StatusBadge, type DataTableRow } from '@/components/admin';
import { examLabel } from '@/lib/video-board';
import { PLAN_ACTIONS, type loadLongformPlan } from '../../../../scripts/lib/youtube-longform-plan.mjs';

type Board = ReturnType<typeof loadLongformPlan>;
type ExamRow = { id: string; label: string; marks: { date: string; label: string; estimated: boolean }[] };
const labels: Record<string, string> = PLAN_ACTIONS;

/** 年間ロードマップの通常動画ビュー。計画と公開台帳はIDで結合済み。 */
export function VideoAnnualPlan({ board, months, exams, periods, month, exam, library }: {
  board: Board; months: string[]; exams: ExamRow[]; periods: { exam: string; label: string; window: string }[]; month?: string; exam?: string; library: boolean;
}) {
  const link = (m?: string, e = exam, lib = library) => {
    const q = new URLSearchParams({ view: 'video' });
    if (m) q.set('m', m);
    if (e) q.set('e', e);
    if (lib) q.set('library', '1');
    return `/plan/roadmap?${q}`;
  };
  const filtered = board.rows.filter((r) =>
    (library ? r.action === 'library' : r.action !== 'library' && (r.inPeriod || !r.date)) &&
    (!month || r.date?.startsWith(month)) && (!exam || r.exam === exam));
  const rows: DataTableRow[] = filtered.map((r) => ({
    id: r.id,
    values: { priority: r.priority ?? '予約・実績', start: r.start, ready: r.ready, date: r.date, title: r.title, exam: examLabel(r.exam), action: labels[r.action], note: r.note },
    cells: {
      title: <><div>{r.href ? <Link href={r.href}>{r.title}</Link> : r.title}</div><div className="max-w-xs break-all text-xs text-muted-foreground">{r.publicationId ?? `企画: ${r.id}（作品登録前）`}</div></>,
      date: <>{r.date ?? '未設定'}<div className="text-xs text-muted-foreground">{r.action === 'reuse' ? '再案内目標' : r.actual ? `台帳 ${r.actual}` : '公開目標・未予約'}</div></>,
      note: <>{r.note}{r.warning && <div><StatusBadge tone="warn">{r.warning}</StatusBadge></div>}</>,
    },
  }));
  const overview: DataTableRow[] = months.map((m) => {
    const scheduled = board.rows.filter((r) => r.inPeriod && r.date?.startsWith(m) && r.action !== 'library');
    const creation = board.rows.filter((r) => r.start?.startsWith(m));
    const priority = [...new Set(scheduled.filter((r) => r.priority === 'P1').map((r) => r.exam))];
    const events = exams.flatMap((e) => e.marks.filter((x) => x.date.startsWith(m)).map((x) => ({ ...x, exam: e.id })));
    return { id: m, values: { month: m, exam: events.map((e) => `${examLabel(e.exam)} ${e.label}`).join(' '), priority: [priority.length ? `P1: ${priority.map(examLabel).join('・')}` : '', [...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].length ? `予約維持: ${[...new Set(scheduled.filter((r) => r.action === 'scheduled').map((r) => r.exam))].map(examLabel).join('・')}` : ''].filter(Boolean).join(' / ') || '試行・再活用を中心に進行', start: creation.length, publish: scheduled.filter((r) => r.action !== 'reuse').length, reuse: scheduled.filter((r) => r.action === 'reuse').length }, cells: {
      month: <Link href={link(m, undefined, false)}>{m}</Link>,
      exam: <div className="text-xs">{events.map((e, i) => <div key={i}>{e.estimated ? `${e.date.slice(0, 7)}頃` : e.date} {examLabel(e.exam)} {e.label}{e.estimated ? '（前年から推定）' : ''}</div>)}{!events.length && '日付指定の行事なし（期間行事は試験台帳参照）'}</div>,
    } };
  });
  return <>
    <p className="mb-2 text-sm">台帳の通常動画 {board.inventory} 本（公開済み {board.published}・予約済み {board.scheduled}）。P1＝主軸を優先、P2＝季節集中・再活用、P3＝試行。</p>
    <p className="mb-2 text-xs text-muted-foreground">{board.plan.cadence}</p>
    <details className="mb-3 text-xs text-muted-foreground"><summary>日付未定の期間行事（試験日程台帳）</summary>{periods.map((p, i) => <p key={i}>{examLabel(p.exam)} {p.label}: {p.window}</p>)}</details>
    <div className="min-w-0 max-w-full overflow-x-auto"><DataTable columns={[{ key: 'month', label: '月' }, { key: 'exam', label: '試験・発表・申込', wrap: true }, { key: 'priority', label: '優先する資格', wrap: true }, { key: 'start', label: '制作着手', num: true }, { key: 'publish', label: '公開枠', num: true }, { key: 'reuse', label: '再案内', num: true }]} rows={overview} pageSize={12} /></div>
    <div className="filterbar mt-4">
      <Link href={link(undefined, exam, false)} className={'chip' + (!library ? ' active' : '')}>制作・公開計画</Link>
      <Link href={link(undefined, exam, true)} className={'chip' + (library ? ' active' : '')}>公開済み資産</Link>
      <Link href={link()} className={'chip' + (!month ? ' active' : '')}>全期間</Link>
      {months.map((m) => <Link key={m} href={link(m)} className={'chip' + (month === m ? ' active' : '')}>{m}</Link>)}
    </div>
    <div className="filterbar">
      <Link href={link(month, '')} className={'chip' + (!exam ? ' active' : '')}>全資格</Link>
      {[...new Set(board.rows.map((r) => r.exam))].map((e) => <Link key={e} href={link(month, e)} className={'chip' + (exam === e ? ' active' : '')}>{examLabel(e)}</Link>)}
    </div>
    <div className="min-w-0 max-w-full overflow-x-auto"><DataTable columns={[{ key: 'priority', label: '優先' }, { key: 'start', label: '制作着手' }, { key: 'ready', label: '確認完了目標' }, { key: 'date', label: '公開／再案内日', wrap: true }, { key: 'exam', label: '資格' }, { key: 'title', label: '動画・台帳ID', wrap: true }, { key: 'action', label: '作業' }, { key: 'note', label: '制作内容・条件', wrap: true }]} rows={rows} filter="タイトル・ID・資格で検索" pageSize={25} /></div>
    <p className="mt-3 text-xs text-muted-foreground">{board.plan.productionRule}</p>
    <p className="mt-2 text-xs text-muted-foreground">{board.plan.reviewRule}</p>
    <p className="mt-2 text-xs"><Link href="/strategy/qualifications">試験日程の台帳</Link> · <Link href="/content/items?c=youtube">作品と公開</Link> · <Link href="/metrics/video">動画の送客実績</Link></p>
  </>;
}
