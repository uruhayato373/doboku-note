import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import SearchTabs from '@/components/SearchTabs';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { direction } from '../../../../../../scripts/lib/business-direction.mjs';
import { expandEntry, indexHistory } from '../../../../../../scripts/lib/index-coverage.mjs';

export const dynamic = 'force-dynamic';

/**
 * 検索 ＞ インデックス。URL 検査の回ごとの登録率を、全体と重点資格（/exam/<資格>/ 配下）で並べる。
 * 実装は scripts/lib/index-coverage.mjs（トップの KPI ツリーと同じ）。
 */
type Ratio = { inspected: number; indexed: number; ratio: number | null };
const pct = (r: Ratio | undefined) => (r?.ratio == null ? '—' : `${(r.ratio * 100).toFixed(1)}%`);

export default function IndexPage() {
  const root = findRepoRoot();
  const quals = (direction(root) as { qualifications: { id: string; label: string }[] }).qualifications;
  const history = (indexHistory(root) as { date: string }[])
    .map((e) => expandEntry(e, quals.map((q) => q.id)) as { date: string; all: Ratio; byQualification: Record<string, Ratio> })
    .reverse();

  const columns: DataTableColumn[] = [
    { key: 'date', label: '検査日' },
    { key: 'all', label: '全体', num: true },
    ...quals.map((q) => ({ key: `q:${q.id}`, label: q.label, num: true })),
  ];
  const rows: DataTableRow[] = history.map((r) => {
    const values: DataTableRow['values'] = { date: r.date, all: r.all.ratio };
    const cells: NonNullable<DataTableRow['cells']> = {
      all: (
        <>
          {pct(r.all)} <span className="text-xs text-muted-foreground">{r.all.indexed}/{r.all.inspected}</span>
        </>
      ),
    };
    for (const q of quals) {
      const v = r.byQualification[q.id];
      values[`q:${q.id}`] = v?.ratio ?? null;
      cells[`q:${q.id}`] = (
        <>
          {pct(v)} {v && v.inspected > 0 && <span className="text-xs text-muted-foreground">{v.indexed}/{v.inspected}</span>}
        </>
      );
    }
    return { id: r.date, values, cells };
  });

  return (
    <>
      <PageHead title="検索" sub="インデックス率（URL 検査・週次）" />
      <SearchTabs current="/metrics/index" />
      <DataTable columns={columns} rows={rows} pageSize={100} />
    </>
  );
}
