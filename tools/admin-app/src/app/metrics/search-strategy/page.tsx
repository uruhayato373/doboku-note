import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { DataTable, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Grid, Section, Stack } from '@/components/layout';
import SearchTabs from '@/components/SearchTabs';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findRepoRoot } from '@/lib/repo-root';
import { buildSearchOpportunities } from '../../../../../../scripts/lib/search-opportunities.mjs';
import { SITE_ORIGIN } from '../../../../../../scripts/lib/site-identity.mjs';

export const dynamic = 'force-dynamic';

/**
 * 検索 ＞ キーワード戦略。クラスター（docs/strategy/16_検索キーワード戦略.md）ごとの推移（shadcn dashboard-01 の SectionCards の形）と、
 * 11〜30 位で表示のある検索語をページ単位に束ねた改善候補（クラスターのタブ＋Data Table）。組み立ては scripts/lib/search-opportunities.mjs（CLI と同じ）。
 */
type Query = { query: string; position: number; impressions: number };
type Candidate = { page: string; impressions: number; bestPosition: number; queries: Query[]; watched: boolean; card: string | null; legacyUrl: boolean; inTarget: boolean };
type Prev = { impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null } | null;
type Cluster = { id: string; label: string; queries: number; impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null; candidates: Candidate[]; candidateTotal: number; previous: Prev };

const BASE = '/metrics/search-strategy';
const QUERY_SHOWN = 3;
const md = (d: string) => d.slice(5).replace('-', '/');
const num = (n: number) => n.toLocaleString();
const signed = (d: number) => (d === 0 ? '±0' : `${d > 0 ? '+' : ''}${num(d)}`);

/** 前期との差のバッジ（件数は多いほど良い）。 */
function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before == null) return null;
  const d = now - before;
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  return (
    <Badge variant="outline">
      <Icon />
      {signed(d)}
    </Badge>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex w-full items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 tabular-nums">
        {value}
        {note ? <span className="ml-1 text-xs text-muted-foreground">{note}</span> : null}
      </dd>
    </div>
  );
}

function ClusterCard({ c }: { c: Cluster }) {
  const p = c.previous;
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardDescription className="min-w-0 truncate" title={c.label}>
          {c.label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {num(c.top10)}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">1桁の検索語</span>
        </CardTitle>
        <CardAction>
          <Delta now={c.top10} before={p?.top10} />
        </CardAction>
      </CardHeader>
      <CardFooter>
        <dl className="m-0 flex w-full flex-col gap-1 text-sm">
          <Metric label="表示" value={num(c.impressions)} note={p ? signed(c.impressions - p.impressions) : null} />
          <Metric label="クリック" value={num(c.clicks)} note={p ? signed(c.clicks - p.clicks) : null} />
          <Metric label="平均順位" value={c.avgPosition == null ? '—' : `${c.avgPosition}位`} note={p?.avgPosition != null ? `前 ${p.avgPosition}位` : null} />
          <Metric label="11〜30位" value={num(c.striking)} note={p ? signed(c.striking - p.striking) : null} />
        </dl>
      </CardFooter>
    </Card>
  );
}

function PageCell({ path }: { path: string }) {
  const i = path.lastIndexOf('/');
  return (
    <a href={`${SITE_ORIGIN}${path}`} target="_blank" rel="noreferrer" className="flex flex-col">
      <span className="font-medium">{path.slice(i + 1) || path}</span>
      <span className="text-xs text-muted-foreground">{path.slice(0, i + 1)}</span>
    </a>
  );
}

function QueryLine({ q }: { q: Query }) {
  return (
    <li>
      {q.query}
      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
        {q.position}位・{q.impressions}
      </span>
    </li>
  );
}

function QueriesCell({ queries }: { queries: Query[] }) {
  const rest = queries.slice(QUERY_SHOWN);
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {queries.slice(0, QUERY_SHOWN).map((q) => (
        <QueryLine key={q.query} q={q} />
      ))}
      {rest.length > 0 && (
        <li>
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">ほか {rest.length} 語</summary>
            <ul className="m-0 mt-0.5 flex list-none flex-col gap-0.5 p-0">
              {rest.map((q) => (
                <QueryLine key={q.query} q={q} />
              ))}
            </ul>
          </details>
        </li>
      )}
    </ul>
  );
}

function statusOf(p: Candidate) {
  const out: { label: string; tone: 'good' | 'warn' | 'neutral' | 'info' }[] = [];
  if (p.card) out.push({ label: `起票済 ${p.card}`, tone: 'info' });
  if (p.watched) out.push({ label: '観察中', tone: 'good' });
  if (p.legacyUrl) out.push({ label: '旧URL', tone: 'warn' });
  if (!p.inTarget) out.push({ label: '受け皿外', tone: 'warn' });
  return out.length ? out : [{ label: '未起票', tone: 'neutral' as const }];
}

export default async function SearchStrategyPage({ searchParams }: { searchParams: Promise<{ cluster?: string }> }) {
  const sp = await searchParams;
  const r = buildSearchOpportunities(findRepoRoot(), { maxCandidates: Infinity }) as { period: { startDate: string; endDate: string } | null; previous: { startDate: string; endDate: string } | null; clusters: Cluster[] };
  const head = (
    <>
      <PageHead title="検索" sub={r.period ? `Google ${md(r.period.startDate)}〜${md(r.period.endDate)}${r.previous ? `（比較 ${md(r.previous.startDate)}〜${md(r.previous.endDate)}）` : ''}` : undefined} />
      <SearchTabs current={BASE} />
    </>
  );
  if (!r.period) {
    return (
      <>
        {head}
        <p className="text-sm text-muted-foreground">GSC の検索語×ページ集計が未取得</p>
      </>
    );
  }

  const selected = r.clusters.find((c) => c.id === sp.cluster) ?? null;
  const pool = (selected ? [selected] : r.clusters).flatMap((c) => c.candidates.map((p) => ({ ...p, cluster: c.label })));
  if (!selected) pool.sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);
  const total = r.clusters.reduce((s, c) => s + c.candidateTotal, 0);

  const columns: DataTableColumn[] = [
    { key: 'page', label: 'ページ', wrap: true },
    ...(selected ? [] : [{ key: 'cluster', label: 'クラスター' }]),
    { key: 'impressions', label: '表示', num: true },
    { key: 'best', label: '最良順位', num: true },
    { key: 'queries', label: '検索語（順位・表示）', wrap: true, sortable: false },
    { key: 'status', label: '状態' },
  ];
  const rows: DataTableRow[] = pool.map((p) => {
    const status = statusOf(p);
    return {
      id: `${p.cluster}:${p.page}`,
      values: {
        page: p.page,
        cluster: p.cluster,
        impressions: p.impressions,
        best: p.bestPosition,
        queries: p.queries.map((q) => q.query).join(' '),
        status: status.map((s) => s.label).join(' '),
      },
      cells: {
        page: <PageCell path={p.page} />,
        best: `${p.bestPosition}位`,
        queries: <QueriesCell queries={p.queries} />,
        status: (
          <div className="flex flex-wrap gap-1">
            {status.map((s) => (
              <StatusBadge key={s.label} tone={s.tone}>
                {s.label}
              </StatusBadge>
            ))}
          </div>
        ),
      },
    };
  });

  return (
    <>
      {head}
      <Stack gap="lg">
        <Grid min="md">
          {r.clusters.map((c) => (
            <ClusterCard key={c.id} c={c} />
          ))}
        </Grid>

        <Section title="改善候補（11〜30位）">
          <TabsList aria-label="クラスター" className="max-w-full overflow-x-auto">
            <TabsTrigger href={BASE} active={!selected}>
              すべて
              <Badge variant="secondary">{total}</Badge>
            </TabsTrigger>
            {r.clusters.map((c) => (
              <TabsTrigger key={c.id} href={`${BASE}?cluster=${c.id}`} active={c.id === selected?.id}>
                {c.label}
                <Badge variant="secondary">{c.candidateTotal}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <DataTable key={selected?.id ?? 'all'} columns={columns} rows={rows} filter="ページ・検索語・状態で絞り込み" pageSize={50} emptyText="候補なし" />
        </Section>
      </Stack>
    </>
  );
}
