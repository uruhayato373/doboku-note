import Link from 'next/link';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { DataTable, DetailList, DetailSheet, DetailText, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Grid, Stack } from '@/components/layout';
import SearchTabs from '@/components/SearchTabs';
import { PageHead } from '@/components/ui';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findRepoRoot } from '@/lib/repo-root';
import { buildSearchOpportunities, candidateMarks } from '../../../../../../scripts/lib/search-opportunities.mjs';
import { PHASES, RESULTS } from '../../../../../../scripts/lib/search-improvement.mjs';
import { SITE_ORIGIN } from '../../../../../../scripts/lib/site-identity.mjs';
import { num } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * 検索 ＞ キーワード戦略。クラスター（docs/strategy/16_検索キーワード戦略.md）ごとの推移（shadcn dashboard-01 の SectionCards の形）と、
 * 改善候補の帯で表示のある検索語をページ単位に束ねた改善候補（クラスターのタブ＋Data Table）、直した改善の実験（直す→本番反映→計測→判定）と週次の処置。
 * 組み立て・帯の境目と表示名・印は scripts/lib/search-opportunities.mjs と search-improvement.mjs（CLI と同じ）。ここは並べるだけ。
 */
type Query = { query: string; position: number; impressions: number };
type Candidate = { page: string; impressions: number; bestPosition: number; queries: Query[]; legacyUrl: boolean; inTarget: boolean; fileable: boolean; experiment: { id: string; phase: string; card: string } | null; lastResult: { id: string; result: string } | null };
type Prev = { impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null } | null;
type Cluster = { id: string; label: string; queries: number; impressions: number; clicks: number; top10: number; striking: number; avgPosition: number | null; candidates: Candidate[]; candidateTotal: number; previous: Prev };
type Bands = { top: string; striking: string };
type Experiment = { id: string; phase: keyof typeof PHASES; cluster: string; clusterLabel: string; page: string; card: string | null; implementedAt: string | null; change: string | null; queries: number; nextCheck: string | null; measurement: { pre: number | null; post: number | null; verdictHint: string; complete: boolean } | null; result: keyof typeof RESULTS | null };
type Triage = { cluster: string; clusterLabel: string; page: string; impressions: number | null; kind: string; status: 'action' | 'observe'; action?: string; note?: string };
type Result = { period: { startDate: string; endDate: string } | null; previous: { startDate: string; endDate: string } | null; bands: Bands; clusters: Cluster[]; experiments: Experiment[]; triage: Triage[]; quota: { recorded: number; required: number; since: string } | null };

const BASE = '/metrics/search-strategy';
/** 印（candidateMarks の key）と段階（phaseOf）の色。意味は lib が決め、ここは見た目だけ */
const MARK_TONE: Record<string, Tone> = { experiment: 'info', 'legacy-action': 'warn', 'legacy-wait': 'neutral', 'off-target': 'warn', routed: 'info', 'routed-action': 'warn', last: 'neutral', todo: 'neutral' };
const PHASE_TONE: Record<string, Tone> = { filed: 'info', implemented: 'warn', measuring: 'info', 'verdict-due': 'warn', closed: 'good', abandoned: 'neutral' };
const md = (d: string) => d.slice(5).replace('-', '/');
const signed = (d: number) => (d === 0 ? '±0' : `${d > 0 ? '+' : ''}${num(d)}`);

/** 前期との差のバッジ（件数は多いほど良い）。 */
function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before == null) return null;
  const d = now - before;
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  return (
    <StatusBadge tone="neutral">
      <Icon />
      {signed(d)}
    </StatusBadge>
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

// shadcn の Dashboard の section-cards（CardDescription・CardTitle・CardAction・CardFooter）の公式の形なので Card を直に組む（DN-0851）
function ClusterCard({ c, bands, experiments }: { c: Cluster; bands: Bands; experiments: Experiment[] }) {
  const p = c.previous;
  const open = experiments.filter((e) => e.phase !== 'closed' && e.phase !== 'abandoned').length;
  const closed = experiments.filter((e) => e.phase === 'closed').length;
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardDescription className="min-w-0 truncate" title={c.label}>
          {c.label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {num(c.top10)}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{bands.top}の検索語</span>
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
          <Metric label={bands.striking} value={num(c.striking)} note={p ? signed(c.striking - p.striking) : null} />
          <Metric label="改善の実験" value={num(open)} note={closed ? `判定済 ${closed}` : null} />
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

const queryLines = (queries: Query[]) => queries.map((q) => `${q.query}（${q.position}位・表示 ${q.impressions}）`);

function PageName({ path }: { path: string }) {
  const i = path.lastIndexOf('/');
  return (
    <span className="flex flex-col">
      <span className="font-medium">{path.slice(i + 1) || path}</span>
      <span className="text-xs text-muted-foreground">{path.slice(0, i + 1)}</span>
    </span>
  );
}

function candidateRows(pool: (Candidate & { cluster: string })[]): DataTableRow[] {
  return pool.map((p) => {
    const marks = candidateMarks(p) as { key: string; label: string; hint: string }[];
    return {
      id: `${p.cluster}:${p.page}`,
      values: { page: p.page, cluster: p.cluster, impressions: p.impressions, best: p.bestPosition, queries: p.queries.length, status: marks.map((m) => m.label).join(' ') },
      cells: {
        page: (
          <DetailSheet trigger={<PageName path={p.page} />} title={p.page} description={p.cluster}>
            <DetailText title="検索語（順位・表示）" items={queryLines(p.queries)} />
            <DetailList items={[{ label: 'ページ', value: <a href={`${SITE_ORIGIN}${p.page}`} target="_blank" rel="noreferrer">開く</a> }]} />
          </DetailSheet>
        ),
        best: `${p.bestPosition}位`,
        queries: p.queries.length,
        status: (
          <div className="flex flex-wrap gap-1">
            {marks.map((m) => (
              <StatusBadge key={m.label} tone={MARK_TONE[m.key]} title={m.hint}>
                {m.label}
              </StatusBadge>
            ))}
          </div>
        ),
      },
    };
  });
}

const TRIAGE_COLUMNS: DataTableColumn[] = [
  { key: 'status', label: '処置' },
  { key: 'page', label: 'ページ', wrap: true },
  { key: 'cluster', label: 'クラスター' },
  { key: 'impressions', label: '表示', num: true },
];

function triageRows(items: Triage[]): DataTableRow[] {
  return [...items].sort((a, b) => (a.status === b.status ? (b.impressions ?? 0) - (a.impressions ?? 0) : a.status === 'action' ? -1 : 1)).map((t) => ({
    id: `${t.cluster}:${t.page}`,
    values: { status: t.status === 'action' ? '要処置' : '観察中', page: t.page, cluster: t.clusterLabel, impressions: t.impressions },
    cells: {
      status: <StatusBadge tone={t.status === 'action' ? 'warn' : 'neutral'}>{t.status === 'action' ? '要処置' : '観察中'}</StatusBadge>,
      page: (
        <DetailSheet trigger={<PageName path={t.page} />} title={t.page} description={t.clusterLabel}>
          <DetailText title="処置" items={[t.action]} />
          <DetailText title="メモ" items={[t.note]} />
          <DetailList items={[{ label: 'ページ', value: <a href={`${SITE_ORIGIN}${t.page}`} target="_blank" rel="noreferrer">開く</a> }]} />
        </DetailSheet>
      ),
    },
  }));
}

const EXPERIMENT_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: '実験' },
  { key: 'phase', label: '段階' },
  { key: 'page', label: 'ページ', wrap: true },
  { key: 'cluster', label: 'クラスター' },
  { key: 'nextCheck', label: '判定できる日' },
  { key: 'result', label: '判定' },
];

function experimentRows(experiments: Experiment[]): DataTableRow[] {
  return experiments.map((e) => {
    const m = e.measurement;
    return {
      id: e.id,
      values: { id: e.id, phase: PHASES[e.phase], page: e.page, cluster: e.clusterLabel, nextCheck: e.nextCheck, result: e.result ? RESULTS[e.result] : null },
      cells: {
        phase: <StatusBadge tone={PHASE_TONE[e.phase]}>{PHASES[e.phase]}</StatusBadge>,
        id: (
          <DetailSheet trigger={e.id} title={e.id} description={e.clusterLabel}>
            <DetailList
              items={[
                { label: '改善の日', value: e.implementedAt },
                { label: '計測（前→後）', value: m ? `${m.pre ?? '—'} → ${m.post ?? '—'}（${m.complete ? '確定' : '途中'}・${m.verdictHint}）` : null },
                { label: 'カード', value: e.card },
              ]}
            />
            <DetailText title="改善の内容" items={[e.change]} />
          </DetailSheet>
        ),
        page: <PageCell path={e.page} />,
      },
    };
  });
}

export default async function SearchStrategyPage({ searchParams }: { searchParams: Promise<{ cluster?: string; tab?: string }> }) {
  const sp = await searchParams;
  const r = buildSearchOpportunities(findRepoRoot(), { maxCandidates: Infinity }) as Result;
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
        <p className="text-sm">GSC の検索語×ページ集計が未取得</p>
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
    { key: 'queries', label: '検索語', num: true },
    { key: 'status', label: '状態' },
  ];

  const TABS = [
    { id: 'clusters', label: 'クラスター' },
    { id: 'triage', label: `週次の処置 ${r.triage.filter((x) => x.status === 'action').length}` },
    { id: 'candidates', label: `改善候補 ${total}` },
    { id: 'experiments', label: `改善の実験 ${r.experiments.length}` },
  ];
  const tab = TABS.some((x) => x.id === sp.tab) ? (sp.tab as string) : 'clusters';

  return (
    <>
      {head}
      <nav className="filterbar mb-3!">
        {TABS.map((x) => (
          <Link key={x.id} className={'chip' + (x.id === tab ? ' active' : '')} href={x.id === 'clusters' ? BASE : `${BASE}?tab=${x.id}`}>
            {x.label}
          </Link>
        ))}
      </nav>
      <Stack gap="lg">
        {tab === 'clusters' && (
          <Grid min="md">
            {r.clusters.map((c) => (
              <ClusterCard key={c.id} c={c} bands={r.bands} experiments={r.experiments.filter((e) => e.cluster === c.id)} />
            ))}
          </Grid>
        )}

        {tab === 'triage' && (
          <>
            {r.quota && <p className="text-sm">今週の改善 {r.quota.recorded}/{r.quota.required}</p>}
            <DataTable columns={TRIAGE_COLUMNS} rows={triageRows(r.triage)} pageSize={50} emptyText="処置の要る候補なし" />
          </>
        )}

        {tab === 'candidates' && (
          <>
            <TabsList aria-label="クラスター" className="max-w-full overflow-x-auto">
              <TabsTrigger href={`${BASE}?tab=candidates`} active={!selected}>
                すべて
                <StatusBadge tone="info">{total}</StatusBadge>
              </TabsTrigger>
              {r.clusters.map((c) => (
                <TabsTrigger key={c.id} href={`${BASE}?tab=candidates&cluster=${c.id}`} active={c.id === selected?.id}>
                  {c.label}
                  <StatusBadge tone="info">{c.candidateTotal}</StatusBadge>
                </TabsTrigger>
              ))}
            </TabsList>
            <DataTable key={selected?.id ?? 'all'} columns={columns} rows={candidateRows(pool)} filter="ページ・検索語・状態で絞り込み" pageSize={50} emptyText="候補なし" />
          </>
        )}

        {tab === 'experiments' && (
          <DataTable columns={EXPERIMENT_COLUMNS} rows={experimentRows(r.experiments)} filter="実験・ページ・カード・段階で絞り込み" pageSize={50} emptyText="記録した改善なし" />
        )}
      </Stack>
    </>
  );
}
