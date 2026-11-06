import { DataTable, FilterBar, FilterChip, PanelCard, StatCard, toDataTable, type DataTableCol } from '@/components/admin';
import { Grid, Stack } from '@/components/layout';
import SearchTabs from '@/components/SearchTabs';
import { Freshness, PageHead, SnapshotPicker, fmt } from '@/components/ui';
import {
  latestSnapshot,
  listSnapshots,
  loadSnapshot,
  snapshotByFile,
  type SnapshotFile,
} from '@/lib/snapshots';

export const dynamic = 'force-dynamic';

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function gscCols(dimLabel: string): DataTableCol<GscRow>[] {
  return [
    { key: 'key', label: dimLabel, wrap: true, render: (r) => (r.keys?.[0] ?? '') },
    { key: 'clicks', label: 'クリック', num: true, render: (r) => fmt.int(r.clicks) },
    { key: 'impressions', label: '表示', num: true, render: (r) => fmt.int(r.impressions) },
    { key: 'ctr', label: 'CTR', num: true, render: (r) => fmt.pct(r.ctr) },
    { key: 'position', label: '掲載順位', num: true, render: (r) => fmt.dec(r.position, 1) },
  ];
}

function sortByClicks(rows: GscRow[]): GscRow[] {
  return rows.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
}

export default async function GscPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === 'page' ? 'page' : 'query';
  const queryHistory = listSnapshots('gsc.query');
  const querySnap: SnapshotFile | null = sp.snapshot
    ? snapshotByFile('gsc.query', sp.snapshot)
    : latestSnapshot('gsc.query');
  const pageSnap = latestSnapshot('gsc.page');

  const queryRows = sortByClicks(loadSnapshot<GscRow>(querySnap)?.rows ?? []);
  const pageRows = sortByClicks(loadSnapshot<GscRow>(pageSnap)?.rows ?? []);
  const qMeta = loadSnapshot(querySnap)?.meta;

  const totClicks = queryRows.reduce((s, r) => s + (r.clicks || 0), 0);
  const totImpr = queryRows.reduce((s, r) => s + (r.impressions || 0), 0);

  return (
    <>
      <PageHead title="検索（GSC）" sub={qMeta?.startDate ? `期間 ${qMeta.startDate} 〜 ${qMeta.endDate}` : undefined} />
      <SearchTabs current="/metrics/gsc" />

      <Stack>
      <Grid min="sm">
        <StatCard label="総クリック（上位100クエリ）" value={fmt.int(totClicks)} />
        <StatCard label="総表示" value={fmt.int(totImpr)} />
        <StatCard label="平均CTR" value={totImpr ? fmt.pct(totClicks / totImpr) : '—'} />
      </Grid>

      <FilterBar className="mb-3!">
        <FilterChip active={tab === 'query'} href="/metrics/gsc">検索クエリ別</FilterChip>
        <FilterChip active={tab === 'page'} href="/metrics/gsc?tab=page">ページ別</FilterChip>
      </FilterBar>

      {tab === 'query' ? (
        <PanelCard title="検索クエリ別" description={<Freshness snapshot={querySnap} />}>
          <Stack gap="sm">
            <SnapshotPicker basePath="/metrics/gsc" files={queryHistory} current={querySnap?.file ?? ''} />
            <DataTable {...toDataTable(gscCols('クエリ'), queryRows)} filter="クエリで絞り込み" />
          </Stack>
        </PanelCard>
      ) : (
        <PanelCard title="ページ別" description={<Freshness snapshot={pageSnap} />}>
          <DataTable {...toDataTable(gscCols('ページ'), pageRows)} filter="ページで絞り込み" />
        </PanelCard>
      )}
      </Stack>
    </>
  );
}
