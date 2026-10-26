import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { videoOutcomes, derivativeLabel } from '@/lib/video-outcomes';
import { LABELS } from '@/lib/lifecycle';
import { examLabel, stageClass } from '@/lib/video-board';
import { datasetDir } from '../../../../../../scripts/lib/datasets.mjs';

export const dynamic = 'force-dynamic';

const PACK_COLUMNS: DataTableColumn[] = [
  { key: 'stage', label: '段階' },
  { key: 'packId', label: 'packId' },
  { key: 'derivatives', label: '派生物の公開状態', sortable: false },
  { key: 'sessions', label: 'セッション', num: true },
  { key: 'users', label: 'ユーザー', num: true },
  { key: 'cta', label: '主CTA' },
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
export default async function VideoOutcomesPage() {
  const { rows, metrics, otherCampaigns, youtubeAnalytics, verification } = videoOutcomes();
  const published = rows.filter((r) => r.anyPublished);
  const measurable = metrics.ok ? published.filter((r) => (r.sessions ?? 0) > 0).length : null;

  const packRows: DataTableRow[] = rows.map((r) => ({
    id: r.packId,
    values: {
      stage: r.stage ? LABELS[r.stage] : '不明',
      packId: r.packId,
      derivatives: r.derivatives.length === 0 ? '未登録' : r.derivatives.map((d) => `${derivativeLabel(d.key)}:${d.status}`).join(' '),
      sessions: r.sessions,
      users: r.activeUsers,
      cta: r.cta ?? null,
    },
    cells: {
      stage: (
        <StatusBadge tone={stageClass(r.stage) as Tone}>
          {r.stage ? LABELS[r.stage] : '不明'}
        </StatusBadge>
      ),
      packId: (
        <div className="font-mono">
          <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>{r.packId}</Link>
          <div className="text-xs text-muted-foreground">{examLabel(r.exam)}</div>
        </div>
      ),
      derivatives: (
        <div className="text-xs">
          {r.derivatives.length === 0 ? (
            <span className="text-muted-foreground">未登録</span>
          ) : (
            r.derivatives.map((d) => (
              <span key={d.key} className="mr-2">
                {derivativeLabel(d.key)}:{' '}
                <span className="font-mono">{d.status}</span>
                {d.videoId && <span className="text-muted-foreground"> ({d.videoId})</span>}
                {d.key.startsWith('shorts') &&
                  ['published', 'measured'].includes(d.status) &&
                  !d.relatedVideoId && (
                    <span className="ml-1">
                      <StatusBadge tone="bad">関連動画なし</StatusBadge>
                    </span>
                  )}
              </span>
            ))
          )}
        </div>
      ),
      sessions: count(r.sessions),
      users: count(r.activeUsers),
      cta: <span className="font-mono text-xs">{r.cta ?? '—'}</span>,
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
      traffic: v.trafficSources.slice().sort((a, b) => b.views - a.views).slice(0, 3).map((s) => `${s.type} ${s.views}`).join(' / ') || null },
    cells: { packId: <span className="font-mono text-xs">{v.packId}</span>, views: count(v.views),
      duration: v.averageViewDurationSec ?? '—', percentage: v.averageViewPercentage ?? '—' },
  }));

  return (
    <>
      <PageHead
        title="動画成果"
        sub="動画パック × 公開状態 × YouTube視聴 × GA4送客（read-only）"
      />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href="/content/video">動画パック</Link>
        {' · '}
        <Link href="/sns">投稿状況</Link>
        {' · '}
        <Link href="/metrics/ga4">アクセス（GA4）</Link>
      </nav>

      <Stack>
      <PanelCard title="YouTubeの視聴" description={`YouTube Analytics（${datasetDir('youtube.analytics')}/・CI供給）`}>
        {youtubeAnalytics.ok ? (
          <div className="filterbar">
            <StatusBadge tone="good">取得済み</StatusBadge>
            <StatusBadge tone="neutral">期間 {youtubeAnalytics.period?.startDate} 〜 {youtubeAnalytics.period?.endDate}</StatusBadge>
            <StatusBadge tone="neutral">対象 {youtubeAnalytics.targets} 本・指標あり {youtubeAnalytics.measured} 本</StatusBadge>
          </div>
        ) : <p><StatusBadge tone="neutral">未取得</StatusBadge> {youtubeAnalytics.reason}</p>}
        <p className="text-xs text-muted-foreground">APIに行がない動画は「—」。サムネイルの表示回数とCTRはこのAPIの取得対象外。</p>
      </PanelCard>

      {youtubeAnalytics.ok && <PanelCard title="動画別の視聴" description="公開台帳のYouTube IDで照合した28日窓">
        <DataTable columns={YOUTUBE_COLUMNS} rows={youtubeRows} filter="packId で絞り込む" />
      </PanelCard>}

      <PanelCard title="計測データ" description={`GA4 の campaign（${datasetDir('ga4.reports')}/・CI 供給）`}>
        {metrics.ok ? (
          <div className="filterbar">
            <StatusBadge tone="good">取得済み</StatusBadge>
            <StatusBadge tone="neutral">
              期間 {metrics.startDate} 〜 {metrics.endDate}
            </StatusBadge>
            <StatusBadge tone={(metrics.ageDays ?? 0) > 9 ? 'warn' : 'neutral'}>
              鮮度 {metrics.ageDays ?? '?'} 日
            </StatusBadge>
            <StatusBadge tone="neutral">campaign {metrics.campaignRows} 件</StatusBadge>
          </div>
        ) : (
          <>
            <p><StatusBadge tone="bad">未取得</StatusBadge></p>
            <p className="text-muted-foreground">{metrics.reason}</p>
            <p className="text-xs text-muted-foreground">
              このため送客列は「0」ではなく「—」で表示している（未取得と流入ゼロを混同しない）。
            </p>
          </>
        )}
      </PanelCard>

      <PanelCard title="公開実体の照合" description="verify-video-publication の直近記録 · .claude/state/video-publication-verify.json">
        {!verification.exists ? (
          <>
            <p><StatusBadge tone="neutral">未実行</StatusBadge></p>
            <p className="text-xs text-muted-foreground">
              まだ一度も実査していない。公開照合のCIは停止中。再開後は削除・非公開・概要欄のUTM欠落・Shortの関連動画未設定を検出する。
            </p>
          </>
        ) : (
          <>
            <div className="filterbar">
              <StatusBadge tone={verification.findings.length ? 'bad' : 'good'}>
                {verification.findings.length ? `ドリフト ${verification.findings.length} 件` : 'ドリフトなし'}
              </StatusBadge>
              <StatusBadge tone="neutral">照合 {verification.checked} 件</StatusBadge>
              <StatusBadge tone={(verification.ageDays ?? 0) > 14 ? 'warn' : 'neutral'}>
                {verification.ageDays === null ? '日時不明' : `${verification.ageDays} 日前`}
              </StatusBadge>
            </div>
            {verification.checked === 0 && (
              <p className="text-xs text-muted-foreground">
                照合対象 0 件（公開済みの派生物がまだ無い）。異常 0 件とは異なる。
              </p>
            )}
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

      <PanelCard title="サマリ" description="公開済み＝派生物のいずれかが published 以降">
        <div className="filterbar">
          <StatusBadge tone="neutral">企画 {rows.length}</StatusBadge>
          <StatusBadge tone={published.length ? 'good' : 'neutral'}>
            公開済み {published.length}
          </StatusBadge>
          <StatusBadge tone="neutral">
            送客あり {measurable === null ? '未取得' : measurable}
          </StatusBadge>
        </div>
        {published.length === 0 && (
          <p className="text-xs text-muted-foreground">
            まだ公開済みの派生物がない。成果の判断は公開後 6 週間で行う（docs/marketing/06_動画コンテンツ運用設計.md §8 Phase 5）。
          </p>
        )}
      </PanelCard>

      <PanelCard title="パック別" description="公開済み → 送客の多い順">
        <DataTable columns={PACK_COLUMNS} rows={packRows} filter="packId で絞り込む" />
      </PanelCard>

      {metrics.ok && otherCampaigns.length > 0 && (
        <PanelCard title="パック外の campaign" description="既存 UTM（note・X 等）。動画パックとは無関係だが取り違え防止に併記">
          <DataTable columns={CAMPAIGN_COLUMNS} rows={campaignRows} pageSize={100} />
        </PanelCard>
      )}
      </Stack>
    </>
  );
}
