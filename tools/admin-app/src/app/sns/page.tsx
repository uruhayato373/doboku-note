import Link from 'next/link';
import UpcomingEvents from '@/components/UpcomingEvents';
import { DataTable, DetailList, DetailSheet, DetailText, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { snsBoard, figureBoard } from '@/lib/sns-board';
import { videoSnsJoin } from '@/lib/video-sns-join';
import { derivativeLabel } from '@/lib/video-outcomes';
import { longformPlanHref, roadmapHref } from '@/lib/content-plan-links';

export const dynamic = 'force-dynamic';

/** done/total を 20 分割の棒に。 */
function bar(done: number, total: number): string {
  const n = total > 0 ? Math.round((done / total) * 20) : 0;
  return '█'.repeat(n) + '░'.repeat(20 - n);
}

const FIGURE_COLUMNS: DataTableColumn[] = [
  { key: 'needs', label: '学習テーマ', wrap: true },
  { key: 'state', label: '素材' },
  { key: 'ig', label: 'Instagram' },
  { key: 'x', label: 'X' },
];

const TABS = [
  { id: 'figures', label: '図解素材' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'video', label: 'YouTube・動画' },
] as const;

const IG_COLUMNS: DataTableColumn[] = [
  { key: 'exam', label: '資格' },
  { key: 'done', label: 'DONE / 合計', num: true },
  { key: 'progress', label: '進捗' },
  { key: 'formats', label: 'C / R / S', num: true, sortable: false },
];

const X_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'ドラフト' },
  { key: 'counts', label: '投稿 / 予約投入済 / 未投入計画 / 下書', sortable: false },
  { key: 'total', label: 'tweet数', num: true },
  { key: 'updatedAt', label: '更新' },
];

const DERIVATIVE_COLUMNS: DataTableColumn[] = [
  { key: 'packId', label: 'packId' },
  { key: 'derivative', label: '派生物' },
  { key: 'status', label: '状態' },
  { key: 'videoId', label: 'videoId' },
];

const readinessLabel = (r: string) => (r === 'ready' ? '素材準備済' : r === 'restore' ? 'Driveから要復元' : '要確認');

type TabId = (typeof TABS)[number]['id'];

export default async function SnsBoardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { ig, x } = await snsBoard();
  const join = videoSnsJoin();
  const figures = await figureBoard();

  const figureRows: DataTableRow[] = figures.rows.map((row) => {
    const xStatus = row.x.map((item) => item.status).join(', ') || '未作成';
    return {
      id: row.pack,
      values: { needs: row.needs, state: readinessLabel(row.readiness), ig: row.igStatus, x: xStatus },
      cells: {
        needs: (
          <DetailSheet trigger={row.needs} title={row.needs} description={row.pack}>
            <DetailList
              items={[
                { label: '素材', value: readinessLabel(row.readiness) },
                { label: 'Drive', value: `${row.archivedCount} / ${row.assets.length}` },
                { label: '手元', value: `${row.localCount} / ${row.assets.length}` },
                { label: '元図', value: row.figure ? <a href={`/media/posts/${row.figure.slice('content/site/'.length)}`}>元図を開く</a> : null },
                { label: 'Instagram', value: <Link href={`/content/content~sns/${row.dir.slice('content/sns/'.length)}`}>原稿を開く</Link> },
                {
                  label: '画像',
                  value: (
                    <span className="flex flex-wrap gap-2">
                      {row.assets.filter(asset => asset.rel.startsWith(row.dir)).map((asset, i) => asset.local
                        ? <a key={asset.rel} href={`/media/sns/${asset.rel.slice('content/sns/'.length)}`}>{i + 1}枚目</a>
                        : <span key={asset.rel}>{i + 1}枚目 要復元</span>)}
                    </span>
                  ),
                },
                {
                  label: 'X',
                  value: row.x.length ? (
                    <span className="flex flex-col">
                      {row.x.map(item => <span key={`${item.draft}-${item.tweet}`}>
                        <Link href={`/content/content~sns/x/draft/${item.draft}/tweets.md`}>原稿 #{item.tweet}</Link>
                        {row.assets.find(asset => asset.rel === `content/sns/x/draft/${item.draft}/${item.file}`)?.local && <a className="ml-2" href={`/media/sns/x/draft/${item.draft}/${item.file}`}>画像</a>}
                      </span>)}
                    </span>
                  ) : null,
                },
              ]}
            />
            <DetailText title="確認事項" items={row.issues} />
          </DetailSheet>
        ),
        state: <StatusBadge tone={row.readiness === 'ready' ? 'good' : 'warn'}>{readinessLabel(row.readiness)}</StatusBadge>,
      },
    };
  });

  const igRows: DataTableRow[] = Object.entries(ig.byExam).map(([exam, s]) => ({
    id: exam,
    values: {
      exam,
      done: s.done,
      progress: s.total > 0 ? s.done / s.total : null,
      formats: `${s.carousel} / ${s.reels} / ${s.stories}`,
    },
    cells: {
      exam: <span className="font-mono">{exam}</span>,
      done: `${s.done} / ${s.total}`,
      progress: <span className="font-mono text-muted-foreground">{bar(s.done, s.total)}</span>,
      formats: `${s.carousel} / ${s.reels} / ${s.stories}`,
    },
  }));

  const xRows: DataTableRow[] = x.drafts.map((d) => ({
    id: d.name,
    values: {
      name: d.name,
      counts: `${d.counts.posted} / ${d.counts.queued} / ${d.counts.scheduled} / ${d.counts.draft}`,
      total: d.total,
      updatedAt: d.updatedAt,
    },
    cells: {
      name: <span className="font-mono">{d.name}</span>,
      counts: `${d.counts.posted} / ${d.counts.queued} / ${d.counts.scheduled} / ${d.counts.draft}`,
      updatedAt: <span className="text-muted-foreground">{d.updatedAt ? d.updatedAt.slice(0, 10) : ''}</span>,
    },
  }));

  const derivativeRows: DataTableRow[] = join.packDerivatives.flatMap((p) =>
    p.derivatives.map((d): DataTableRow => ({
      id: `${p.packId}-${d.key}`,
      values: { packId: p.packId, derivative: derivativeLabel(d.key), status: d.status, videoId: d.videoId ?? null },
      cells: {
        packId: (
          <span className="font-mono">
            <Link href={`/content/content~sns/video-packs/${p.exam}/${p.slug}`}>{p.packId}</Link>
          </span>
        ),
        derivative: <span className="text-xs">{derivativeLabel(d.key)}</span>,
        status: <span className="font-mono text-xs">{d.status}</span>,
        videoId: (
          <span className="font-mono text-xs">
            {d.videoId ?? <span className="text-muted-foreground">—</span>}
            {d.key.startsWith('shorts') && d.videoId && !d.relatedVideoId && (
              <span className="ml-1">
                <StatusBadge tone="bad">関連動画なし</StatusBadge>
              </span>
            )}
          </span>
        ),
      },
    })),
  );

  const current: TabId = TABS.some((t) => t.id === tab) ? (tab as TabId) : 'figures';
  return (
    <>
      <PageHead title="投稿状況" />
      <FilterBar className="mb-3!">
        {TABS.map((t) => (
          <FilterChip key={t.id} active={t.id === current} href={t.id === 'figures' ? '/sns' : `/sns?tab=${t.id}`}>
            {t.label}
          </FilterChip>
        ))}
        <span className="small muted ml-auto">
          <Link href="/gallery/sns?ch=instagram">Instagram 画像・動画</Link>
          <Link href="/gallery/sns?ch=x" className="ml-3">X 画像</Link>
          <Link href="/content/video" className="ml-3">動画パック</Link>
          <Link href={roadmapHref()} className="ml-3">年間ロードマップ</Link>
          <Link href={longformPlanHref()} className="ml-3">通常動画</Link>
          <Link href="/schedule?dom=sns" className="ml-3">SNS予定</Link>
        </span>
      </FilterBar>
      <UpcomingEvents domain="sns" />

      {current === 'figures' && (
        <PanelCard title="図解素材">
          {figures.errors.map(error => <p key={error} className="text-sm text-destructive">{error}</p>)}
          <DataTable columns={FIGURE_COLUMNS} rows={figureRows} filter="学習テーマで絞り込む" />
        </PanelCard>
      )}

      {current === 'instagram' && (
        <PanelCard title="Instagram 進捗" description={`投稿済み ${ig.totalDone} / ${ig.total}`}>
          <DataTable columns={IG_COLUMNS} rows={igRows} pageSize={100} />
        </PanelCard>
      )}

      {current === 'x' && (
        <PanelCard title="X ドラフト" description={`投稿 ${x.totals.posted ?? 0} / 予約投入済 ${x.totals.queued ?? 0} / 未投入計画 ${x.totals.scheduled ?? 0} / 下書 ${x.totals.draft ?? 0}`}>
          <DataTable columns={X_COLUMNS} rows={xRows} filter="ドラフト名で絞り込む" />
        </PanelCard>
      )}

      {current === 'video' && (
        <PanelCard title="動画パック 派生物" description={`企画 ${join.packTotal} 件中 制作が動いたもの ${join.packDerivatives.length} 件`}>
          {join.packDerivatives.length === 0 ? (
            <p className="text-sm">公開・予約された派生物はありません。</p>
          ) : (
            <DataTable columns={DERIVATIVE_COLUMNS} rows={derivativeRows} filter="packId で絞り込む" />
          )}
          {join.legacyShorts.ok && (
            <p className="text-sm">旧 Shorts {join.legacyShorts.total} 本（公開 {join.legacyShorts.byStage.published ?? 0} / 予約 {join.legacyShorts.byStage.scheduled ?? 0} / 停止 {join.legacyShorts.byStage.retired ?? 0}）</p>
          )}
        </PanelCard>
      )}
    </>
  );
}
