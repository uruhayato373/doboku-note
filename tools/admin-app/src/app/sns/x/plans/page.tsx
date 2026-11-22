import Link from 'next/link';
import {
  DataTable, PanelCard, StatCard, StatusBadge, type DataTableColumn, type DataTableRow,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import { approvalState, listXPlanFiles, loadXPlan } from '@/lib/x-plans';

export const dynamic = 'force-dynamic';

/** /sns/x/plans — X の月次計画ごとの承認状況（read-only）。承認の前に中身を見る入口 */
const COLUMNS: DataTableColumn[] = [
  { key: 'plan', label: '計画', wrap: true },
  { key: 'posts', label: '投稿', num: true },
  { key: 'approved', label: '承認済み', num: true },
  { key: 'pending', label: '未承認', num: true },
  { key: 'locked', label: '予約後', num: true },
  { key: 'unresolved', label: '結べない', num: true },
];

export default function XPlansPage() {
  const plans = listXPlanFiles().map((file) => {
    try {
      const p = loadXPlan(file);
      if (!p) return { file, error: '読めない' };
      const c = { approved: 0, pending: 0, locked: 0 };
      for (const r of p.rows) c[approvalState(r)] += 1;
      return { file, p, c };
    } catch (e) {
      return { file, error: e instanceof Error ? e.message : String(e) };
    }
  });
  const ok = plans.flatMap((x) => ('p' in x && x.p ? [x] : []));
  const failed = plans.filter((x) => 'error' in x);
  const sum = (f: (x: (typeof ok)[number]) => number) => ok.reduce((n, x) => n + f(x), 0);

  const rows: DataTableRow[] = ok.map(({ file, p, c }): DataTableRow => ({
    id: file,
    values: {
      plan: file, posts: p!.rows.length + p!.unresolved.length, approved: c.approved, pending: c.pending, locked: c.locked, unresolved: p!.unresolved.length,
    },
    cells: {
      plan: <Link href={`/sns/x/plans/${encodeURIComponent(file)}`}>{file}</Link>,
    },
  }));

  return (
    <>
      <PageHead title="X の月次計画" />
      <p className="mb-4"><Link href="/sns">← SNS</Link></p>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="計画" value={plans.length} />
        <StatCard label="承認済み" value={sum((x) => x.c.approved)} />
        <StatCard label="未承認" value={sum((x) => x.c.pending)} />
        <StatCard label="予約後" value={sum((x) => x.c.locked)} />
      </div>
      {failed.length ? (
        <PanelCard title="読めなかった計画" className="mb-4">
          <ul className="m-0 list-disc pl-5 text-sm">
            {failed.map((x) => <li key={x.file}>{x.file} <StatusBadge tone="bad">{'error' in x ? x.error : ''}</StatusBadge></li>)}
          </ul>
        </PanelCard>
      ) : null}
      <PanelCard title="計画ごとの承認">
        <DataTable columns={COLUMNS} rows={rows} pageSize={50} emptyText="計画がない" />
      </PanelCard>
    </>
  );
}
