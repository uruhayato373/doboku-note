import { TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
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
  const rows = (indexHistory(root) as { date: string }[])
    .map((e) => expandEntry(e, quals.map((q) => q.id)) as { date: string; all: Ratio; byQualification: Record<string, Ratio> })
    .reverse();
  return (
    <>
      <PageHead title="検索" sub="インデックス率（URL 検査・週次）" />
      <SearchTabs current="/metrics/index" />
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>検査日</TableHead>
            <TableHead className={numCol}>全体</TableHead>
            {quals.map((q) => (
              <TableHead key={q.id} className={numCol}>{q.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.date}>
              <TableCell>{r.date}</TableCell>
              <TableCell className={numCol}>
                {pct(r.all)} <span className="text-xs text-muted-foreground">{r.all.indexed}/{r.all.inspected}</span>
              </TableCell>
              {quals.map((q) => {
                const v = r.byQualification[q.id];
                return (
                  <TableCell key={q.id} className={numCol}>
                    {pct(v)} {v && v.inspected > 0 && <span className="text-xs text-muted-foreground">{v.indexed}/{v.inspected}</span>}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </>
  );
}
