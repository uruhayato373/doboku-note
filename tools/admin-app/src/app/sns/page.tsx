import Link from 'next/link';
import UpcomingEvents from '@/components/UpcomingEvents';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
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
  { key: 'needs', label: '学習テーマ・元図', wrap: true },
  { key: 'post', label: '投稿文・画像', sortable: false },
  { key: 'saved', label: '保存', sortable: false },
  { key: 'state', label: '制作・投稿状態', sortable: false },
];

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

export default async function SnsBoardPage() {
  const { ig, x } = await snsBoard();
  const join = videoSnsJoin();
  const figures = await figureBoard();

  const figureRows: DataTableRow[] = figures.rows.map((row) => {
    const xStatus = row.x.map((item) => item.status).join(', ') || '未作成';
    return {
      id: row.pack,
      values: {
        needs: row.needs,
        post: row.dir,
        saved: `Drive ${row.archivedCount} / ${row.assets.length} 手元 ${row.localCount} / ${row.assets.length}`,
        state: `${readinessLabel(row.readiness)} IG ${row.igStatus} / X ${xStatus}`,
      },
      cells: {
        needs: (
          <div className="max-w-sm">
            <a href={row.nextStep}>{row.needs}</a>
            {row.figure && <div className="text-xs"><a href={`/media/posts/${row.figure.slice('content/site/'.length)}`}>元図を開く</a></div>}
          </div>
        ),
        post: (
          <>
            <Link href={`/content/content~sns/${row.dir.slice('content/sns/'.length)}`}>Instagram原稿</Link>
            <div className="flex flex-wrap gap-2 text-xs">
              {row.assets.filter(asset => asset.rel.startsWith(row.dir)).map((asset, i) => asset.local
                ? <a key={asset.rel} href={`/media/sns/${asset.rel.slice('content/sns/'.length)}`}>{i + 1}枚目</a>
                : <span key={asset.rel}>{i + 1}枚目 要復元</span>)}
            </div>
            {row.x.map(item => <div key={`${item.draft}-${item.tweet}`} className="text-xs">
              <Link href={`/content/content~sns/x/draft/${item.draft}/tweets.md`}>X原稿 #{item.tweet}</Link>
              {row.assets.find(asset => asset.rel === `content/sns/x/draft/${item.draft}/${item.file}`)?.local && <a className="ml-2" href={`/media/sns/x/draft/${item.draft}/${item.file}`}>画像</a>}
            </div>)}
          </>
        ),
        saved: <span className="text-xs">Drive {row.archivedCount} / {row.assets.length}<br/>手元 {row.localCount} / {row.assets.length}</span>,
        state: (
          <>
            <StatusBadge tone={row.readiness === 'ready' ? 'good' : 'warn'}>{readinessLabel(row.readiness)}</StatusBadge>
            <div className="mt-1 text-xs">IG {row.igStatus} / X {xStatus}</div>
            {row.issues.length > 0 && <details className="mt-1 text-xs"><summary>確認事項 {row.issues.length} 件</summary><ul className="list-disc pl-4">{row.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></details>}
          </>
        ),
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

  return (
    <>
      <PageHead title="投稿状況" />
      <nav className="project-crumbs" aria-label="関連する計画と台帳">
        <Link href={roadmapHref()}>年間ロードマップ</Link> · <Link href={longformPlanHref()}>通常動画の制作・公開管理</Link> · <Link href="/schedule?dom=sns">SNS全体の予定</Link>
      </nav>
      {/* SNS はサイドバーの枝にせずこのページの節にする（domains.json navRules）。素材の作業場はここから開く */}
      <nav className="filterbar mb-3!">
        <a className="chip" href="#figures">図解素材</a>
        <a className="chip" href="#instagram">Instagram</a>
        <a className="chip" href="#x">X</a>
        <a className="chip" href="#video">YouTube・動画</a>
        <span className="small muted ml-auto">
          <Link href="/gallery/sns?ch=instagram">Instagram 画像・動画</Link>
          <Link href="/gallery/sns?ch=x" className="ml-3">X 画像</Link>
          <Link href="/content/video" className="ml-3">動画パック</Link>
        </span>
      </nav>
      <UpcomingEvents domain="sns" />

      <div id="figures" className="mb-4">
        <PanelCard title="図解素材" description={`元図・記事とSNS原稿を照合 ${figures.checkedCount} / ${figures.sourceCount} 件。保存はDrive台帳との照合結果。`}>
          {figures.errors.map(error => <p key={error} className="text-sm text-destructive">{error}</p>)}
          <DataTable columns={FIGURE_COLUMNS} rows={figureRows} filter="学習テーマで絞り込む" />
          <p className="text-xs text-muted-foreground">素材準備済は投稿文・元データ・保存画像の照合結果です。公開・予約は各チャネルの既存投稿手順で行います。元の記事や図が変わると「要確認」になります。</p>
        </PanelCard>
      </div>

      <div id="instagram" className="mb-4">
      <PanelCard title="Instagram 進捗" description={`いずれか投稿済み ${ig.totalDone} / ${ig.total}`}>
        <DataTable columns={IG_COLUMNS} rows={igRows} pageSize={100} />
      </PanelCard>
      </div>

      <div id="x" className="mb-4">
      <PanelCard
        title="X ドラフト"
        description={`合計 tweet ${x.totals.tweets ?? 0} · 投稿 ${x.totals.posted ?? 0} / 予約投入済 ${x.totals.queued ?? 0} / 未投入計画 ${x.totals.scheduled ?? 0} / 下書 ${x.totals.draft ?? 0}`}
      >
        <DataTable columns={X_COLUMNS} rows={xRows} filter="ドラフト名で絞り込む" />
      </PanelCard>
      </div>

      {/* 動画パック（DN-0110）× SNS。レガシー Shorts 台帳と混ぜないため節を分ける。 */}
      <div id="video" className="mb-4">
      <PanelCard
        title="動画パック 派生物"
        description={`content/registry · 企画 ${join.packTotal} 件中 制作が動いたもの ${join.packDerivatives.length} 件`}
      >
        {join.packDerivatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだ公開・予約された派生物はない（企画と台本のみ）。企画一覧は{' '}
            <Link href="/content/video">動画パック</Link>、成果は <Link href="/metrics/video">動画成果</Link>。
          </p>
        ) : (
          <DataTable columns={DERIVATIVE_COLUMNS} rows={derivativeRows} filter="packId で絞り込む" />
        )}
        <p className="text-xs text-muted-foreground">
          旧 Shorts（台帳 <code>content/registry</code> の kind <code>legacy-short</code>）は IG 過去問パック由来の
          <strong>レガシー{join.legacyShorts.ok ? ` ${join.legacyShorts.total} 本` : ''}</strong>
          で、動画パックとは別系統。
          {join.legacyShorts.ok
            ? ` 内訳: 公開 ${join.legacyShorts.byStage.published ?? 0} / 予約 ${join.legacyShorts.byStage.scheduled ?? 0} / 停止 ${join.legacyShorts.byStage.retired ?? 0}。`
            : ` 台帳を読めていない: ${join.legacyShorts.reason}。`}
        </p>
      </PanelCard>
      </div>
    </>
  );
}
