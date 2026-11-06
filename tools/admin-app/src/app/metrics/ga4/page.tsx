import { DataTable, FilterBar, FilterChip, PanelCard, toDataTable, type DataTableCol } from '@/components/admin';
import { Stack } from '@/components/layout';
import { Freshness, PageHead, SnapshotPicker, fmt } from '@/components/ui';
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
function metricCols(): DataTableCol<GaRow>[] {
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
  const cols: DataTableCol<GaRow>[] = [
    { key: dimKey, label: dimLabel, wrap: wrapDim, render: (r) => String(r[dimKey] ?? '') },
    ...metricCols(),
  ];
  return (
    <PanelCard
      title={title}
      description={<Freshness snapshot={snap} />}
    >
      <DataTable {...toDataTable(cols, rows)} />
    </PanelCard>
  );
}

export default async function Ga4Page({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const TABS = [
    { id: 'channel', label: 'チャネル' },
    { id: 'page', label: 'ページ' },
    { id: 'source', label: '参照元' },
    { id: 'sns', label: 'SNS 流入' },
  ];
  const tab = TABS.some((x) => x.id === sp.tab) ? (sp.tab as string) : 'channel';

  // page テーブルのみ ?snapshot= で履歴切替可能にする。
  const pageHistory = listSnapshots('ga4.page');
  const pageSnap = sp.snapshot ? snapshotByFile('ga4.page', sp.snapshot) : latestSnapshot('ga4.page');

  return (
    <>
      <PageHead title="アクセス（GA4）" />

      <Stack>
      <FilterBar className="mb-3!">
        {TABS.map((x) => (
          <FilterChip key={x.id} active={x.id === tab} href={x.id === 'channel' ? '/metrics/ga4' : `/metrics/ga4?tab=${x.id}`}>
            {x.label}
          </FilterChip>
        ))}
      </FilterBar>
      {tab === 'channel' && <Section title="チャネル別" snap={latestSnapshot('ga4.channel')} dimKey="channel" dimLabel="チャネル" />}

      {tab === 'page' && <PanelCard title="ページ別（上位20）" description={<Freshness snapshot={pageSnap} />}>
        <Stack gap="sm">
        <SnapshotPicker basePath="/metrics/ga4" keep={{ tab: 'page' }} files={pageHistory} current={pageSnap?.file ?? ''} />
        <DataTable
          {...toDataTable(
            [{ key: 'page', label: 'ページ', wrap: true, render: (r) => String(r.page ?? '') }, ...metricCols()],
            (loadSnapshot<GaRow>(pageSnap)?.rows ?? [])
              .slice()
              .sort((a, b) => (b.activeUsers || 0) - (a.activeUsers || 0))
              .slice(0, 20),
          )}
        />
        </Stack>
      </PanelCard>}

      {tab === 'source' && <Section title="参照元別" snap={latestSnapshot('ga4.source')} dimKey="source" dimLabel="参照元" limit={20} />}
      {tab === 'sns' && (
        <Section
          title="SNS 流入（source / medium）"
          snap={latestSnapshot('ga4.source-medium-sns')}
          dimKey="sourceMedium"
          dimLabel="source / medium"
          wrapDim
        />
      )}
      </Stack>
    </>
  );
}
