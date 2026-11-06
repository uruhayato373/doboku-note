import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { videoOutcomes, derivativeLabel } from '@/lib/video-outcomes';
import { LABELS } from '@/lib/lifecycle';
import { num } from '@/lib/format';
import { examLabel, stageClass } from '@/lib/video-board';

export const dynamic = 'force-dynamic';

const PACK_COLUMNS: DataTableColumn[] = [
  { key: 'stage', label: '段階' },
  { key: 'packId', label: 'packId' },
  { key: 'sessions', label: 'セッション', num: true },
  { key: 'users', label: 'ユーザー', num: true },
  { key: 'siteNoteClicks', label: 'サイト→noteクリック', num: true },
];

const CAMPAIGN_COLUMNS: DataTableColumn[] = [
  { key: 'campaign', label: 'campaign' },
  { key: 'sessions', label: 'セッション', num: true },
  { key: 'users', label: 'ユーザー', num: true },
];

const YOUTUBE_COLUMNS: DataTableColumn[] = [
  { key: 'packId', label: 'packId' },
  { key: 'kind', label: '形式' },
  { key: 'views', label: '視聴回数', num: true },
  { key: 'duration', label: '平均視聴時間（秒）', num: true },
  { key: 'percentage', label: '平均視聴率（%）', num: true },
  { key: 'traffic', label: '主な流入元', sortable: false },
];

/** 送客の数。未取得（null）と 0 を薄い字で区別して出す。 */
const count = (n: number | null) => (n === null ? <span className="text-muted-foreground">—</span> : n || <span className="text-muted-foreground">0</span>);

/**
 * /metrics/video — 動画パックの「公開状態 × 送客成果」（read-only）。
 *
 * 計測は CI 供給が正（fetch-metrics.yml の GA4 campaign スナップショット）。
 * **未取得と 0 件を区別**して表示し、未取得のときに全件 0 の緑を出さない。
 */
export default async function VideoOutcomesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const { rows, metrics, noteClickMetrics, otherCampaigns, youtubeAnalytics, verification } = videoOutcomes();
  const published = rows.filter((r) => r.anyPublished);
  const measurable = metrics.ok ? published.filter((r) => (r.sessions ?? 0) > 0).length : null;

  const packRows: DataTableRow[] = rows.map((r) => ({
    id: r.packId,
    values: {
      stage: r.stage ? LABELS[r.stage] : '不明',
      packId: r.packId,
      sessions: r.sessions,
      users: r.activeUsers,
      siteNoteClicks: r.siteNoteClicks,
    },
    cells: {
      stage: (
        <StatusBadge tone={stageClass(r.stage) as Tone}>
          {r.stage ? LABELS[r.stage] : '不明'}
        </StatusBadge>
      ),
      packId: (
        <DetailSheet trigger={<span className="font-mono">{r.packId}</span>} title={r.packId} description={examLabel(r.exam)}>
          <DetailList
            items={[
              { label: '主CTA', value: r.cta ? <span className="font-mono text-xs">{r.cta}</span> : null },
              { label: 'パック', value: <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>開く</Link> },
              {
                label: '派生物',
                value:
                  r.derivatives.length === 0
                    ? '未登録'
                    : (
                      <div className="space-y-1">
                        {r.derivatives.map((d) => (
                          <div key={d.key}>
                            {derivativeLabel(d.key)}: <span className="font-mono">{d.status}</span>
                            {d.videoId && <span className="text-muted-foreground"> ({d.videoId})</span>}
                            {d.key.startsWith('shorts') && ['published', 'measured'].includes(d.status) && !d.relatedVideoId && (
                              <span className="ml-1"><StatusBadge tone="bad">関連動画なし</StatusBadge></span>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
              },
            ]}
          />
        </DetailSheet>
      ),
      sessions: count(r.sessions),
      users: count(r.activeUsers),
      siteNoteClicks: count(r.siteNoteClicks),
    },
  }));
  const campaignRows: DataTableRow[] = otherCampaigns.map((c) => ({
    id: c.campaign,
    values: { campaign: c.campaign, sessions: c.sessions, users: c.activeUsers },
    cells: { campaign: <span className="font-mono text-xs">{c.campaign}</span> },
  }));
  const youtubeRows: DataTableRow[] = youtubeAnalytics.videos.map((v) => ({
    id: v.publicationId,
    values: { packId: v.packId, kind: v.kind, views: v.views, duration: v.averageViewDurationSec, percentage: v.averageViewPercentage,
      traffic: v.trafficSources.slice().sort((a, b) => b.views - a.views).slice(0, 3).map((s) => `${s.type} ${num(s.views)}`).join(' / ') || null },
    cells: { packId: <span className="font-mono text-xs">{v.packId}</span>, views: count(v.views),
      duration: num(v.averageViewDurationSec), percentage: num(v.averageViewPercentage) },
  }));

  const TABS = [
    { id: 'packs', label: 'パック別' },
    { id: 'youtube', label: 'YouTube視聴' },
    { id: 'data', label: '計測と照合' },
  ];
  const tab = TABS.some((x) => x.id === sp.tab) ? (sp.tab as string) : 'packs';

  return (
    <>
      <PageHead title="動画成果" />

      <FilterBar className="mb-3!">
        {TABS.map((x) => (
          <FilterChip key={x.id} active={x.id === tab} href={x.id === 'packs' ? '/metrics/video' : `/metrics/video?tab=${x.id}`}>
            {x.label}
          </FilterChip>
        ))}
      </FilterBar>

      <Stack>
      {tab === 'packs' && (
        <>
          <FilterBar>
            <StatusBadge tone="neutral">企画 {rows.length}</StatusBadge>
            <StatusBadge tone={published.length ? 'good' : 'neutral'}>公開済み {published.length}</StatusBadge>
            <StatusBadge tone="neutral">送客あり {measurable === null ? '未取得' : measurable}</StatusBadge>
          </FilterBar>
          <DataTable columns={PACK_COLUMNS} rows={packRows} filter="packId で絞り込む" />
        </>
      )}

      {tab === 'youtube' && (
        <>
          <FilterBar>
            {youtubeAnalytics.ok ? (
              <>
                <StatusBadge tone="good">取得済み</StatusBadge>
                <StatusBadge tone="neutral">期間 {youtubeAnalytics.period?.startDate} 〜 {youtubeAnalytics.period?.endDate}</StatusBadge>
                <StatusBadge tone="neutral">対象 {youtubeAnalytics.targets} 本・指標あり {youtubeAnalytics.measured} 本</StatusBadge>
              </>
            ) : (
              <>
                <StatusBadge tone="neutral">未取得</StatusBadge> {youtubeAnalytics.reason}
              </>
            )}
          </FilterBar>
          {youtubeAnalytics.ok && <DataTable columns={YOUTUBE_COLUMNS} rows={youtubeRows} filter="packId で絞り込む" />}
        </>
      )}

      {tab === 'data' && (
        <>
          <PanelCard title="GA4 の計測">
            {metrics.ok ? (
              <FilterBar>
                <StatusBadge tone="good">取得済み</StatusBadge>
                <StatusBadge tone="neutral">期間 {metrics.startDate} 〜 {metrics.endDate}</StatusBadge>
                <StatusBadge tone={(metrics.ageDays ?? 0) > 9 ? 'warn' : 'neutral'}>鮮度 {metrics.ageDays ?? '?'} 日</StatusBadge>
                <StatusBadge tone="neutral">campaign {metrics.campaignRows} 件</StatusBadge>
                <StatusBadge tone="neutral">サイト→note {noteClickMetrics.ok ? '取得済み' : '未取得'}</StatusBadge>
              </FilterBar>
            ) : (
              <p><StatusBadge tone="bad">未取得</StatusBadge> {metrics.reason}</p>
            )}
          </PanelCard>

          <PanelCard title="公開実体の照合">
            {!verification.exists ? (
              <StatusBadge tone="neutral">未実行</StatusBadge>
            ) : (
              <>
                <FilterBar>
                  <StatusBadge tone={verification.findings.length ? 'bad' : 'good'}>
                    {verification.findings.length ? `ドリフト ${verification.findings.length} 件` : 'ドリフトなし'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">照合 {verification.checked} 件</StatusBadge>
                  <StatusBadge tone={(verification.ageDays ?? 0) > 14 ? 'warn' : 'neutral'}>
                    {verification.ageDays === null ? '日時不明' : `${verification.ageDays} 日前`}
                  </StatusBadge>
                </FilterBar>
                {verification.findings.length > 0 && (
                  <ul className="small">
                    {verification.findings.map((f, i) => (
                      <li key={i}>
                        <span className="mono">{f.id}</span> [{f.code}] {f.message}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </PanelCard>

          {metrics.ok && otherCampaigns.length > 0 && (
            <PanelCard title="パック外の campaign">
              <DataTable columns={CAMPAIGN_COLUMNS} rows={campaignRows} pageSize={100} />
            </PanelCard>
          )}
        </>
      )}
      </Stack>
    </>
  );
}
