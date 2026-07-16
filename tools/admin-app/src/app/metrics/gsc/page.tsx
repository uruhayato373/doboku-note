import { DataTable, Freshness, Kpi, PageHead, SnapshotPicker, fmt, type Col } from '@/components/ui';
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

function gscCols(dimLabel: string): Col<GscRow>[] {
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
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const sp = await searchParams;
  const queryHistory = listSnapshots('gsc').get('gsc-query') ?? [];
  const querySnap: SnapshotFile | null = sp.snapshot
    ? snapshotByFile('gsc', sp.snapshot)
    : latestSnapshot('gsc', 'gsc-query');
  const pageSnap = latestSnapshot('gsc', 'gsc-page');

  const queryRows = sortByClicks(loadSnapshot<GscRow>(querySnap)?.rows ?? []);
  const pageRows = sortByClicks(loadSnapshot<GscRow>(pageSnap)?.rows ?? []);
  const qMeta = loadSnapshot(querySnap)?.meta;

  const totClicks = queryRows.reduce((s, r) => s + (r.clicks || 0), 0);
  const totImpr = queryRows.reduce((s, r) => s + (r.impressions || 0), 0);

  return (
    <>
      <PageHead
        title="GSC 詳細"
        sub={`検索クエリ / ページ（クリック降順・上位100）${
          qMeta?.startDate ? ` · 期間 ${qMeta.startDate} 〜 ${qMeta.endDate}` : ''
        }`}
      />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Kpi label="総クリック（上位100クエリ）" value={totClicks} />
        <Kpi label="総表示" value={totImpr} />
        <Kpi label="平均CTR" value={totImpr ? fmt.pct(totClicks / totImpr) : '—'} />
      </div>

      <div className="card">
        <h2>
          検索クエリ別
          <span className="sub">
            <Freshness snapshot={querySnap} /> {querySnap?.file}
          </span>
        </h2>
        <SnapshotPicker basePath="/metrics/gsc" files={queryHistory} current={querySnap?.file ?? ''} />
        <DataTable cols={gscCols('クエリ')} rows={queryRows} />
      </div>

      <div className="card">
        <h2>
          ページ別
          <span className="sub">
            <Freshness snapshot={pageSnap} /> {pageRows.length}行
          </span>
        </h2>
        <DataTable cols={gscCols('ページ')} rows={pageRows} />
      </div>
    </>
  );
}
