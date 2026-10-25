import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableRow, PanelCard, StatusBadge, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead, Kpi } from '@/components/ui';
import { loadKindleView, type KindleBookView } from '@/lib/kindle';
import { yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** status → StatusBadge の tone。判定していない状態を緑にしない。 */
function statusTone(status: string): Tone {
  if (status === 'live') return 'good';
  if (status === 'in_review') return 'warn';
  if (status === 'ready') return 'neutral';
  if (status === 'rejected') return 'bad';
  return 'info';
}

function freshnessTone(f: KindleBookView['freshness']): Tone {
  if (f === 'fresh') return 'good';
  if (f === 'stale') return 'bad';
  return 'info';
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

const BOOK_COLUMNS: DataTableColumn[] = [
  { key: 'cover', label: '表紙', sortable: false },
  { key: 'book', label: '書籍' },
  { key: 'price', label: '価格', num: true },
  { key: 'status', label: '状態' },
  { key: 'version', label: '版' },
  { key: 'date', label: '提出日' },
  { key: 'asin', label: 'ASIN' },
  { key: 'freshness', label: '鮮度' },
];

const ROYALTY_COLUMNS: DataTableColumn[] = [
  { key: 'book', label: '書籍' },
  { key: 'royalty', label: 'ロイヤリティ', num: true },
  { key: 'catalog', label: 'catalog' },
];

function bookRow(b: KindleBookView): DataTableRow {
  return {
    id: b.id,
    values: {
      cover: null,
      book: `${b.title || b.id} ${b.id}${b.series ? `・${b.series}` : ''}`,
      price: b.priceJpy ?? null,
      status: b.status,
      version: b.version || null,
      date: b.submittedDate ?? b.publishedDate ?? null,
      asin: b.asin ?? b.draftAsin ?? null,
      freshness: freshnessLabel(b.freshness),
    },
    cells: {
      cover: b.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.coverUrl} alt="" width={40} loading="lazy" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      book: (
        <>
          <div><Link href={`/content/kindle/${encodeURIComponent(b.id)}`}>{b.title || b.id}</Link></div>
          <div className="font-mono text-xs text-muted-foreground">{b.id}{b.series ? `・${b.series}` : ''}</div>
          {b.epubExists && <div className="text-xs text-muted-foreground">{fmtBytes(b.epubBytes)}</div>}
        </>
      ),
      price: yen(b.priceJpy),
      status: <StatusBadge tone={statusTone(b.status)}>{b.status}</StatusBadge>,
      version: <span className="text-xs">{b.version || '—'}</span>,
      date: <span className="text-xs">{b.submittedDate ?? b.publishedDate ?? '—'}</span>,
      asin: (
        <span className="text-xs">
          {b.amazonUrl ? (
            <a href={b.amazonUrl} target="_blank" rel="noreferrer">{b.asin}</a>
          ) : (
            <span className="text-muted-foreground">{b.asin ?? b.draftAsin ?? '—'}</span>
          )}
        </span>
      ),
      freshness: <StatusBadge tone={freshnessTone(b.freshness)}>{freshnessLabel(b.freshness)}</StatusBadge>,
    },
  };
}

/**
 * /content/kindle — KDP で販売する Kindle 本 45 冊の状態・価格・ASIN・ロイヤリティ・鮮度を
 * 横断する read-only 画面。
 *
 * 判定ロジックは scripts/lib/kindle-catalog.mjs（このページ専用の pure module）。
 * 再ビルド・提出・状態同期・任意 CLI 実行は一切追加しない（運用規約カードで CLI コマンドを
 * 案内するのみ）。config/kdp-memo.json（秘密混じり）は読まない・表示しない。
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
        <Kpi label="直近月ロイヤリティ" value={royalties?.ok ? `${yen(royalties.total?.royalty)}${royalties.estimated ? '(推計)' : ''}` : '未取得'} />
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
        <DataTable
          columns={BOOK_COLUMNS}
          rows={books.map(bookRow)}
          pageSize={100}
          filter="書籍・ASIN などで絞り込む"
          emptyText="書籍が0件です（catalog.json を確認してください）。"
        />
      </PanelCard>

      <PanelCard title="ロイヤリティ">
        {royalties?.ok ? (
          <>
            <p className="text-sm">
              {royalties.month} 月・doboku-note {royalties.total?.bookCount ?? '—'}冊・電子書籍 {royalties.total?.ebook ?? '—'}
              ・KENP {royalties.total?.kenp ?? '—'}・ロイヤリティ計 {yen(royalties.total?.royalty)}
              {royalties.estimated && <span className="project-warning-text"> （推計値）</span>}
            </p>
            {royalties.accountTotal && (
              <p className="text-sm text-muted-foreground">
                共有KDP口座全体: {royalties.accountTotal.bookCount ?? '—'}冊・ロイヤリティ {yen(royalties.accountTotal.royalty)}
                {royalties.accountKenpPagesRead != null ? `・KENP既読 ${royalties.accountKenpPagesRead}ページ` : ''}。他サイト分を上の集計から除外。
              </p>
            )}
            {royalties.caveat && <p className="text-sm text-muted-foreground">{royalties.caveat}</p>}
            {royalties.fetchedAt && <p className="text-sm text-muted-foreground">取得日時: {royalties.fetchedAt}</p>}
            {royalties.perBook && royalties.perBook.length > 0 && (
              <div className="mt-3">
                <DataTable
                  columns={ROYALTY_COLUMNS}
                  rows={royalties.perBook.map((b): DataTableRow => ({
                    id: b.bookId,
                    values: { book: `${b.title} ${b.bookId}`, royalty: b.royalty ?? null, catalog: b.inCatalog ? '—' : '未対応' },
                    cells: {
                      book: <>{b.title} <span className="font-mono text-xs text-muted-foreground">{b.bookId}</span></>,
                      royalty: yen(b.royalty),
                      catalog: b.inCatalog ? '—' : <span className="project-warning-text">未対応</span>,
                    },
                  }))}
                  pageSize={100}
                />
              </div>
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
