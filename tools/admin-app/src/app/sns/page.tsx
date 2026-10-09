import Link from 'next/link';
import UpcomingEvents from '@/components/UpcomingEvents';
import { numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { snsBoard, figureBoard } from '@/lib/sns-board';
import { videoSnsJoin } from '@/lib/video-sns-join';
import { derivativeLabel } from '@/lib/video-outcomes';

export const dynamic = 'force-dynamic';

/** done/total を 20 分割の棒に。 */
function bar(done: number, total: number): string {
  const n = total > 0 ? Math.round((done / total) * 20) : 0;
  return '█'.repeat(n) + '░'.repeat(20 - n);
}

export default async function SnsBoardPage() {
  const { ig, x } = await snsBoard();
  const join = videoSnsJoin();
  const figures = await figureBoard();

  return (
    <>
      <PageHead title="投稿状況" />
      {/* SNS はサイドバーの枝にせずこのページの節にする（domains.json navRules）。素材の作業場はここから開く */}
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <a className="chip" href="#figures">図解素材</a>
        <a className="chip" href="#instagram">Instagram</a>
        <a className="chip" href="#x">X</a>
        <a className="chip" href="#video">YouTube・動画</a>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          <Link href="/gallery/sns?ch=instagram">Instagram 画像・動画</Link>
          <Link href="/gallery/sns?ch=x" style={{ marginLeft: 12 }}>X 画像</Link>
          <Link href="/content/video" style={{ marginLeft: 12 }}>動画パック</Link>
        </span>
      </nav>
      <UpcomingEvents domain="sns" />

      <div id="figures" className="mb-4">
        <PanelCard title="図解素材" description={`元図・記事とSNS原稿を照合 ${figures.checkedCount} / ${figures.sourceCount} 件。保存はDrive台帳との照合結果。`}>
          {figures.errors.map(error => <p key={error} className="text-sm text-destructive">{error}</p>)}
          <TableFrame>
            <TableHeader><TableRow>
              <TableHead>学習テーマ・元図</TableHead><TableHead>投稿文・画像</TableHead><TableHead>保存</TableHead><TableHead>制作・投稿状態</TableHead>
            </TableRow></TableHeader>
            <TableBody>{figures.rows.map(row => <TableRow key={row.pack}>
              <TableCell className="max-w-sm">
                <a href={row.nextStep}>{row.needs}</a>
                {row.figure && <div className="text-xs"><a href={`/media/posts/${row.figure.slice('content/site/'.length)}`}>元図を開く</a></div>}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-xs">Drive {row.archivedCount} / {row.assets.length}<br/>手元 {row.localCount} / {row.assets.length}</TableCell>
              <TableCell>
                <StatusBadge tone={row.readiness === 'ready' ? 'good' : 'warn'}>{row.readiness === 'ready' ? '素材準備済' : row.readiness === 'restore' ? 'Driveから要復元' : '要確認'}</StatusBadge>
                <div className="mt-1 text-xs">IG {row.igStatus} / X {row.x.map(item => item.status).join(', ') || '未作成'}</div>
                {row.issues.length > 0 && <details className="mt-1 text-xs"><summary>確認事項 {row.issues.length} 件</summary><ul className="list-disc pl-4">{row.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></details>}
              </TableCell>
            </TableRow>)}</TableBody>
          </TableFrame>
          <p className="text-xs text-muted-foreground">素材準備済は投稿文・元データ・保存画像の照合結果です。公開・予約は各チャネルの既存投稿手順で行います。元の記事や図が変わると「要確認」になります。</p>
        </PanelCard>
      </div>

      <div id="instagram" className="mb-4">
      <PanelCard title="Instagram 進捗" description={`いずれか投稿済み ${ig.totalDone} / ${ig.total}`}>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>資格</TableHead>
              <TableHead className={numCol}>DONE / 合計</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead>C / R / S</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(ig.byExam).map(([exam, s]) => (
              <TableRow key={exam}>
                <TableCell className="font-mono">{exam}</TableCell>
                <TableCell className={numCol}>
                  {s.done} / {s.total}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">{bar(s.done, s.total)}</TableCell>
                <TableCell className={numCol}>
                  {s.carousel} / {s.reels} / {s.stories}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>
      </div>

      <div id="x" className="mb-4">
      <PanelCard
        title="X ドラフト"
        description={`合計 tweet ${x.totals.tweets ?? 0} · 投稿 ${x.totals.posted ?? 0} / 予約投入済 ${x.totals.queued ?? 0} / 未投入計画 ${x.totals.scheduled ?? 0} / 下書 ${x.totals.draft ?? 0}`}
      >
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>ドラフト</TableHead>
              <TableHead>投稿 / 予約投入済 / 未投入計画 / 下書</TableHead>
              <TableHead className={numCol}>tweet数</TableHead>
              <TableHead>更新</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {x.drafts.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-mono">{d.name}</TableCell>
                <TableCell>
                  {d.counts.posted} / {d.counts.queued} / {d.counts.scheduled} / {d.counts.draft}
                </TableCell>
                <TableCell className={numCol}>{d.total}</TableCell>
                <TableCell className="text-muted-foreground">{d.updatedAt ? d.updatedAt.slice(0, 10) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
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
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>packId</TableHead>
                <TableHead>派生物</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>videoId</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {join.packDerivatives.flatMap((p) =>
                p.derivatives.map((d) => (
                  <TableRow key={`${p.packId}-${d.key}`}>
                    <TableCell className="font-mono">
                      <Link href={`/content/content~sns/video-packs/${p.exam}/${p.slug}`}>{p.packId}</Link>
                    </TableCell>
                    <TableCell className="text-xs">{derivativeLabel(d.key)}</TableCell>
                    <TableCell className="font-mono text-xs">{d.status}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.videoId ?? <span className="text-muted-foreground">—</span>}
                      {d.key.startsWith('shorts') && d.videoId && !d.relatedVideoId && (
                        <span className="ml-1">
                          <StatusBadge tone="bad">関連動画なし</StatusBadge>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </TableFrame>
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
