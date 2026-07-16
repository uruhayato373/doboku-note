import { DataTable, Freshness, PageHead, SnapshotPicker, fmt, type Col } from '@/components/ui';
import {
  latestSnapshot,
  listSnapshots,
  loadSnapshot,
  snapshotByFile,
  type SnapshotFile,
} from '@/lib/snapshots';

export const dynamic = 'force-dynamic';

interface GaRow {
  activeUsers: number;
  sessions: number;
  engagementRate: number;
  averageSessionDuration: number;
  [k: string]: unknown;
}

/** 標準 GA4 指標 4 列（dim ラベル列は呼び出し側で先頭に差す）。 */
function metricCols(): Col<GaRow>[] {
  return [
    { key: 'activeUsers', label: 'ユーザー', num: true, render: (r) => fmt.int(r.activeUsers) },
    { key: 'sessions', label: 'セッション', num: true, render: (r) => fmt.int(r.sessions) },
    { key: 'engagementRate', label: 'エンゲージ率', num: true, render: (r) => fmt.pct(r.engagementRate) },
    { key: 'averageSessionDuration', label: '平均滞在', num: true, render: (r) => fmt.dur(r.averageSessionDuration) },
  ];
}

function Section({
  title,
  snap,
  dimKey,
  dimLabel,
  limit,
  wrapDim,
}: {
  title: string;
  snap: SnapshotFile | null;
  dimKey: string;
  dimLabel: string;
  limit?: number;
  wrapDim?: boolean;
}) {
  const data = loadSnapshot<GaRow>(snap);
  let rows = data?.rows ?? [];
  rows = rows.slice().sort((a, b) => (b.activeUsers || 0) - (a.activeUsers || 0));
  if (limit) rows = rows.slice(0, limit);
  const cols: Col<GaRow>[] = [
    { key: dimKey, label: dimLabel, wrap: wrapDim, render: (r) => String(r[dimKey] ?? '') },
    ...metricCols(),
  ];
  return (
    <div className="card">
      <h2>
        {title}
        <span className="sub">
          <Freshness snapshot={snap} /> {rows.length}行
        </span>
      </h2>
      <DataTable cols={cols} rows={rows} />
    </div>
  );
}

export default async function Ga4Page({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const sp = await searchParams;

  // page テーブルのみ ?snapshot= で履歴切替可能にする。
  const pageHistory = listSnapshots('ga4').get('ga4-page') ?? [];
  const pageSnap = sp.snapshot ? snapshotByFile('ga4', sp.snapshot) : latestSnapshot('ga4', 'ga4-page');

  return (
    <>
      <PageHead title="GA4 詳細" sub="チャネル / ページ / 参照元 / SNS 別（各最新スナップショット・ユーザー降順）" />

      <Section title="チャネル別" snap={latestSnapshot('ga4', 'ga4-channel')} dimKey="channel" dimLabel="チャネル" />

      <div className="card">
        <h2>
          ページ別（上位20）
          <span className="sub">
            <Freshness snapshot={pageSnap} /> {pageSnap?.file}
          </span>
        </h2>
        <SnapshotPicker basePath="/metrics/ga4" files={pageHistory} current={pageSnap?.file ?? ''} />
        <DataTable
          cols={[
            { key: 'page', label: 'ページ', wrap: true, render: (r) => String(r.page ?? '') },
            ...metricCols(),
          ]}
          rows={(loadSnapshot<GaRow>(pageSnap)?.rows ?? [])
            .slice()
            .sort((a, b) => (b.activeUsers || 0) - (a.activeUsers || 0))
            .slice(0, 20)}
        />
      </div>

      <Section title="参照元別" snap={latestSnapshot('ga4', 'ga4-source')} dimKey="source" dimLabel="参照元" limit={20} />
      <Section
        title="SNS 流入（source / medium）"
        snap={latestSnapshot('ga4', 'ga4-sourceMedium-sns')}
        dimKey="sourceMedium"
        dimLabel="source / medium"
        wrapDim
      />
    </>
  );
}
