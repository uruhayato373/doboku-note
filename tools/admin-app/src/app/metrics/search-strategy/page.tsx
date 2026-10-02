import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { Stack } from '@/components/layout';
import SearchTabs from '@/components/SearchTabs';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { buildSearchOpportunities } from '../../../../../../scripts/lib/search-opportunities.mjs';
import { SITE_ORIGIN } from '../../../../../../scripts/lib/site-identity.mjs';

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
  return <span className="text-xs text-muted-foreground">（{d >= 0 ? '+' : ''}{d}）</span>;
};

export default function SearchStrategyPage() {
  const r = buildSearchOpportunities(findRepoRoot()) as { period: { startDate: string; endDate: string } | null; previous: { startDate: string; endDate: string } | null; clusters: Cluster[] };
  return (
    <>
      <PageHead title="検索" sub={r.period ? `Google ${md(r.period.startDate)}〜${md(r.period.endDate)}${r.previous ? `（比較 ${md(r.previous.startDate)}〜${md(r.previous.endDate)}）` : ''}` : undefined} />
      <SearchTabs current="/metrics/search-strategy" />
      {!r.period ? (
        <p className="text-sm text-muted-foreground">GSC の検索語×ページ集計が未取得</p>
      ) : (
        <Stack>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>クラスター</TableHead>
                <TableHead className={numCol}>表示</TableHead>
                <TableHead className={numCol}>クリック</TableHead>
                <TableHead className={numCol}>1桁の検索語</TableHead>
                <TableHead className={numCol}>11〜30位</TableHead>
                <TableHead className={numCol}>平均順位</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.clusters.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.label}</TableCell>
                  <TableCell className={numCol}>{c.impressions}{delta(c.impressions, c.previous?.impressions)}</TableCell>
                  <TableCell className={numCol}>{c.clicks}{delta(c.clicks, c.previous?.clicks)}</TableCell>
                  <TableCell className={numCol}>{c.top10}{delta(c.top10, c.previous?.top10)}</TableCell>
                  <TableCell className={numCol}>{c.striking}</TableCell>
                  <TableCell className={numCol}>{c.avgPosition ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>

          {r.clusters.map((c) => (
            <PanelCard key={c.id} title={c.label} description={`改善候補 ${c.candidateTotal}`}>
              {c.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">候補なし</p>
              ) : (
                <TableFrame>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ページ</TableHead>
                      <TableHead className={numCol}>表示</TableHead>
                      <TableHead className={numCol}>最良</TableHead>
                      <TableHead>検索語（順位・表示）</TableHead>
                      <TableHead>状態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.candidates.map((p) => (
                      <TableRow key={p.page}>
                        <TableCell className="text-xs">
                          <a href={`${SITE_ORIGIN}${p.page}`} target="_blank" rel="noreferrer">{p.page}</a>
                        </TableCell>
                        <TableCell className={numCol}>{p.impressions}</TableCell>
                        <TableCell className={numCol}>{p.bestPosition}位</TableCell>
                        <TableCell className="text-xs">{p.queries.slice(0, 3).map((q) => `${q.query}（${q.position}位・${q.impressions}）`).join(' / ')}</TableCell>
                        <TableCell className="text-xs">
                          {[p.card && `起票済 ${p.card}`, p.watched && '観察中', p.legacyUrl && '旧URL', !p.inTarget && '受け皿外'].filter(Boolean).join('・') || '未起票'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableFrame>
              )}
            </PanelCard>
          ))}
        </Stack>
      )}
    </>
  );
}
