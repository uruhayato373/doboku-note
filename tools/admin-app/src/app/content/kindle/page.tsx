import Link from 'next/link';
import {
  numCol, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
} from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead, Kpi } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { loadKindleView, type KindleBookView } from '@/lib/kindle';

export const dynamic = 'force-dynamic';

/** status → Badge variant。判定していない状態を緑にしない。 */
function statusVariant(status: string): 'success' | 'warning' | 'outline' | 'destructive' | 'secondary' {
  if (status === 'live') return 'success';
  if (status === 'in_review') return 'warning';
  if (status === 'ready') return 'outline';
  if (status === 'rejected') return 'destructive';
  return 'secondary';
}

function freshnessVariant(f: KindleBookView['freshness']): 'success' | 'destructive' | 'secondary' {
  if (f === 'fresh') return 'success';
  if (f === 'stale') return 'destructive';
  return 'secondary';
}

function freshnessLabel(f: KindleBookView['freshness']): string {
  if (f === 'fresh') return '最新';
  if (f === 'stale') return '陳腐化疑い';
  return '不明';
}

function fmtBytes(n: number): string {
  if (n <= 0) return '0 KB';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function fmtYen(n: number | undefined): string {
  return `¥${(n ?? 0).toLocaleString('ja-JP')}`;
}

/**
 * /content/kindle — KDP で販売する Kindle 本 45 冊の状態・価格・ASIN・ロイヤリティ・鮮度を
 * 横断する read-only 画面。
 *
 * 判定ロジックは scripts/lib/kindle-catalog.mjs（このページ専用の pure module）。
 * 再ビルド・提出・状態同期・任意 CLI 実行は一切追加しない（運用規約カードで CLI コマンドを
 * 案内するのみ）。.claude/config/kdp-memo.json（秘密混じり）は読まない・表示しない。
 */
export default async function KindleContentPage() {
  const view = await loadKindleView();
  const { books, summary, freshnessOk, royalties, relatedDocs } = view;

  return (
    <>
      <PageHead
        title="Kindle"
        sub={`KDP で販売する Kindle 本 ${summary.total} 件・read-only（再ビルド/提出/状態同期は npm run sync-kindle-dist ・ node scripts/kdp-publish.mjs --sync-status ・ npm run kdp-batch を使う）`}
      />

      <Stack>
      <div className="grid cols-4">
        <Kpi label="冊数" value={summary.total} />
        <Kpi label="live" value={summary.byStatus.live ?? 0} />
        <Kpi label="in_review" value={summary.byStatus.in_review ?? 0} />
        <Kpi label="鮮度 stale" value={freshnessOk ? summary.staleCount : '検査不成立'} />
        <Kpi label="直近月ロイヤリティ" value={royalties?.ok ? `${fmtYen(royalties.total?.royalty)}${royalties.estimated ? '(推計)' : ''}` : '未取得'} />
      </div>

      {!freshnessOk && (
        <p className="text-sm project-warning-text">
          鮮度検査が実行できなかった（git log 取得失敗）。stale 0 件を「健全」と読まないこと。
        </p>
      )}

      {(summary.staleCount > 0 || summary.deadMemoCount > 0 || summary.notRebuildableCount > 0) && (
        <PanelCard title="整合・鮮度">
          <ul className="text-sm">
            {summary.staleCount > 0 && (
              <li className="project-warning-text">
                EPUB がソースより古い疑い {summary.staleCount} 件:{' '}
                {books.filter((b) => b.freshness === 'stale').map((b) => b.id).join(', ')}
                （修正: <code>npm run sync-kindle-dist -- --downloads &lt;id&gt;</code>）
              </li>
            )}
            {summary.deadMemoCount > 0 && (
              <li className="text-muted-foreground">
                KDP入力メモの参照先が不在 {summary.deadMemoCount} 件（<code>npm run gen-kdp-memo &lt;id&gt;</code> で生成可）
              </li>
            )}
            {summary.notRebuildableCount > 0 && (
              <li className="text-muted-foreground">
                自動再ビルド経路の外（buildSpec 無し）{summary.notRebuildableCount} 件:{' '}
                {books.filter((b) => !b.rebuildable).map((b) => b.id).join(', ')}
              </li>
            )}
          </ul>
        </PanelCard>
      )}

      <PanelCard title="書籍">
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>表紙</TableHead>
              <TableHead>書籍</TableHead>
              <TableHead className={numCol}>価格</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>版</TableHead>
              <TableHead>提出日</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>鮮度</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((b) => <BookRow key={b.id} book={b} />)}
          </TableBody>
        </TableFrame>
        {books.length === 0 && <p className="mt-3 text-sm text-muted-foreground">書籍が0件です（catalog.json を確認してください）。</p>}
      </PanelCard>

      <PanelCard title="ロイヤリティ">
        {royalties?.ok ? (
          <>
            <p className="text-sm">
              {royalties.month} 月・doboku-note {royalties.total?.bookCount ?? '—'}冊・電子書籍 {royalties.total?.ebook ?? '—'}
              ・KENP {royalties.total?.kenp ?? '—'}・ロイヤリティ計 {fmtYen(royalties.total?.royalty)}
              {royalties.estimated && <span className="project-warning-text"> （推計値）</span>}
            </p>
            {royalties.accountTotal && (
              <p className="text-sm text-muted-foreground">
                共有KDP口座全体: {royalties.accountTotal.bookCount ?? '—'}冊・ロイヤリティ {fmtYen(royalties.accountTotal.royalty)}
                {royalties.accountKenpPagesRead != null ? `・KENP既読 ${royalties.accountKenpPagesRead}ページ` : ''}。他サイト分を上の集計から除外。
              </p>
            )}
            {royalties.caveat && <p className="text-sm text-muted-foreground">{royalties.caveat}</p>}
            {royalties.fetchedAt && <p className="text-sm text-muted-foreground">取得日時: {royalties.fetchedAt}</p>}
            {royalties.perBook && royalties.perBook.length > 0 && (
              <TableFrame className="mt-3">
                <TableHeader>
                  <TableRow><TableHead>書籍</TableHead><TableHead className={numCol}>ロイヤリティ</TableHead><TableHead>catalog</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {royalties.perBook.map((b) => (
                    <TableRow key={b.bookId}>
                      <TableCell>{b.title} <span className="font-mono text-xs text-muted-foreground">{b.bookId}</span></TableCell>
                      <TableCell className={numCol}>{fmtYen(b.royalty)}</TableCell>
                      <TableCell>{b.inCatalog ? '—' : <span className="project-warning-text">未対応</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableFrame>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">未取得（ローカルで <code>npm run kdp-report</code> を実行するとこのカードに反映されます）。</p>
        )}
      </PanelCard>

      {relatedDocs.length > 0 && (
        <PanelCard title="関連設計文書">
          <p className="text-sm text-muted-foreground">docs frontmatter の <code>channel: kindle</code> を持つ文書（{relatedDocs.length} 件）。</p>
          <ul>
            {relatedDocs.map((d) => (
              <li key={d.file}>
                <Link href={d.href}>{d.title}</Link> <span className="font-mono text-xs text-muted-foreground">{d.file}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}

      <PanelCard title="運用規約">
        <p className="text-sm">
          この画面は読み取り専用。再ビルド= <code>npm run sync-kindle-dist -- --downloads &lt;id&gt;</code> ／
          提出= <code>/kdp-publish</code>（<code>npm run kdp-batch</code>）／
          本棚同期= <code>node scripts/kdp-publish.mjs --sync-status</code> ／
          ロイヤリティ= <code>npm run kdp-report</code>。
          状態 SoT は <Link href="/content/content~kindle">catalog.json ほか（ファイル一覧）</Link>、手順は kdp-operator エージェントを参照。
        </p>
      </PanelCard>
      </Stack>
    </>
  );
}

function BookRow({ book: b }: { book: KindleBookView }) {
  return (
    <TableRow>
      <TableCell>
        {b.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.coverUrl} alt="" width={40} loading="lazy" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div><Link href={`/content/kindle/${encodeURIComponent(b.id)}`}>{b.title || b.id}</Link></div>
        <div className="font-mono text-xs text-muted-foreground">{b.id}{b.series ? `・${b.series}` : ''}</div>
        {b.epubExists && <div className="text-xs text-muted-foreground">{fmtBytes(b.epubBytes)}</div>}
      </TableCell>
      <TableCell className={numCol}>{fmtYen(b.priceJpy)}</TableCell>
      <TableCell><Badge variant={statusVariant(b.status)}>{b.status}</Badge></TableCell>
      <TableCell className="text-xs">{b.version || '—'}</TableCell>
      <TableCell className="text-xs">{b.submittedDate ?? b.publishedDate ?? '—'}</TableCell>
      <TableCell className="text-xs">
        {b.amazonUrl ? (
          <a href={b.amazonUrl} target="_blank" rel="noreferrer">{b.asin}</a>
        ) : (
          <span className="text-muted-foreground">{b.asin ?? b.draftAsin ?? '—'}</span>
        )}
      </TableCell>
      <TableCell><Badge variant={freshnessVariant(b.freshness)}>{freshnessLabel(b.freshness)}</Badge></TableCell>
    </TableRow>
  );
}
