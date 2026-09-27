import SearchTabs from '@/components/SearchTabs';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { buildSearchOpportunities } from '../../../../../../scripts/lib/search-opportunities.mjs';

export const dynamic = 'force-dynamic';

/**
 * 検索 ＞ キーワード戦略。クラスター（docs/strategy/16_検索キーワード戦略.md）ごとの推移と、
 * 11〜30 位で表示のある検索語をページ単位に束ねた改善候補。組み立ては scripts/lib/search-opportunities.mjs（CLI と同じ）。
 */
type Query = { query: string; position: number; impressions: number };
type Candidate = { page: string; impressions: number; bestPosition: number; queries: Query[]; watched: boolean; card: string | null; legacyUrl: boolean; inTarget: boolean };
type Prev = { impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null } | null;
type Cluster = { id: string; label: string; queries: number; impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null; candidates: Candidate[]; candidateTotal: number; previous: Prev };

const md = (d: string) => d.slice(5).replace('-', '/');
const delta = (now: number, before: number | undefined) => {
  if (before == null) return null;
  const d = now - before;
  return <span className="small muted">（{d >= 0 ? '+' : ''}{d}）</span>;
};

export default function SearchStrategyPage() {
  const r = buildSearchOpportunities(findRepoRoot()) as { period: { startDate: string; endDate: string } | null; previous: { startDate: string; endDate: string } | null; clusters: Cluster[] };
  return (
    <>
      <PageHead title="検索" sub={r.period ? `Google ${md(r.period.startDate)}〜${md(r.period.endDate)}${r.previous ? `（比較 ${md(r.previous.startDate)}〜${md(r.previous.endDate)}）` : ''}` : undefined} />
      <SearchTabs current="/metrics/search-strategy" />
      {!r.period ? (
        <p className="card">GSC の検索語×ページ集計が未取得</p>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>クラスター</th>
                    <th className="num">表示</th>
                    <th className="num">クリック</th>
                    <th className="num">1桁の検索語</th>
                    <th className="num">11〜30位</th>
                    <th className="num">平均順位</th>
                  </tr>
                </thead>
                <tbody>
                  {r.clusters.map((c) => (
                    <tr key={c.id}>
                      <td>{c.label}</td>
                      <td className="num">{c.impressions}{delta(c.impressions, c.previous?.impressions)}</td>
                      <td className="num">{c.clicks}{delta(c.clicks, c.previous?.clicks)}</td>
                      <td className="num">{c.top10}{delta(c.top10, c.previous?.top10)}</td>
                      <td className="num">{c.striking}</td>
                      <td className="num">{c.avgPosition ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {r.clusters.map((c) => (
            <div className="card" key={c.id}>
              <h2>
                {c.label}
                <span className="sub">改善候補 {c.candidateTotal}</span>
              </h2>
              {c.candidates.length === 0 ? (
                <p className="small muted">候補なし</p>
              ) : (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>ページ</th>
                        <th className="num">表示</th>
                        <th className="num">最良</th>
                        <th>検索語（順位・表示）</th>
                        <th>状態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.candidates.map((p) => (
                        <tr key={p.page}>
                          <td className="small">
                            <a href={`https://doboku-note.com${p.page}`} target="_blank" rel="noreferrer">{p.page}</a>
                          </td>
                          <td className="num">{p.impressions}</td>
                          <td className="num">{p.bestPosition}位</td>
                          <td className="small">{p.queries.slice(0, 3).map((q) => `${q.query}（${q.position}位・${q.impressions}）`).join(' / ')}</td>
                          <td className="small">
                            {[p.card && `起票済 ${p.card}`, p.watched && '観察中', p.legacyUrl && '旧URL', !p.inTarget && '受け皿外'].filter(Boolean).join('・') || '未起票'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
