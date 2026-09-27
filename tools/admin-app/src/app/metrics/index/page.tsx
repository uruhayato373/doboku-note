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
    .map((e) => expandEntry(root, e, quals.map((q) => q.id)) as { date: string; all: Ratio; byQualification: Record<string, Ratio> })
    .reverse();
  return (
    <>
      <PageHead title="検索" sub="インデックス率（URL 検査・週次）" />
      <SearchTabs current="/metrics/index" />
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>検査日</th>
                <th className="num">全体</th>
                {quals.map((q) => (
                  <th key={q.id} className="num">{q.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td className="num">
                    {pct(r.all)} <span className="small muted">{r.all.indexed}/{r.all.inspected}</span>
                  </td>
                  {quals.map((q) => {
                    const v = r.byQualification[q.id];
                    return (
                      <td key={q.id} className="num">
                        {pct(v)} {v && v.inspected > 0 && <span className="small muted">{v.indexed}/{v.inspected}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
