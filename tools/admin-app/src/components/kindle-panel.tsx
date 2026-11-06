import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, type DataTableColumn, type DataTableRow, PanelCard, StatCard, StatusBadge, type Tone, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { loadKindleView, type KindleBookView } from '@/lib/kindle';
import { yen } from '@/lib/format';

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
  { key: 'date', label: '提出日' },
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
      date: b.submittedDate ?? b.publishedDate ?? null,
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
        <DetailSheet trigger={b.title || b.id} title={b.title || b.id} description={b.id}>
          <DetailList
            items={[
              { label: 'シリーズ', value: b.series },
              { label: '版', value: b.version },
              { label: 'ASIN', value: b.amazonUrl ? <a href={b.amazonUrl} target="_blank" rel="noreferrer">{b.asin}</a> : (b.asin ?? b.draftAsin) },
              { label: 'EPUB', value: b.epubExists ? fmtBytes(b.epubBytes) : null },
              { label: '提出日', value: b.submittedDate },
              { label: '公開日', value: b.publishedDate },
              { label: 'プレビュー', value: <Link href={`/content/kindle/${encodeURIComponent(b.id)}`}>開く</Link> },
            ]}
          />
        </DetailSheet>
      ),
      price: yen(b.priceJpy),
      status: <StatusBadge tone={statusTone(b.status)}>{b.status}</StatusBadge>,
      date: <span className="text-xs">{b.submittedDate ?? b.publishedDate ?? '—'}</span>,
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
const TABS = [
  { id: 'books', label: '書籍' },
  { id: 'royalty', label: 'ロイヤリティ' },
  { id: 'docs', label: '関連文書' },
] as const;

/** 販売状態の Kindle タブ。書籍・ロイヤリティ・関連文書を切り替える */
export async function KindlePanel({ tab }: { tab?: string }) {
  const current = TABS.some((t) => t.id === tab) ? tab : 'books';
  const view = await loadKindleView();
  const { books, summary, freshnessOk, royalties, relatedDocs } = view;

  return (
    <>
      <Stack>
      <div className="grid cols-4">
        <StatCard label="live" value={summary.byStatus.live ?? 0} />
        <StatCard label="in_review" value={summary.byStatus.in_review ?? 0} />
        <StatCard label="鮮度 stale" value={freshnessOk ? summary.staleCount : '検査不成立'} />
        <StatCard label="直近月ロイヤリティ" value={royalties?.ok ? `${yen(royalties.total?.royalty)}${royalties.estimated ? '(推計)' : ''}` : '未取得'} />
      </div>

      <FilterBar className="mb-3!">
        {TABS.filter((t) => t.id !== 'docs' || relatedDocs.length > 0).map((t) => (
          <FilterChip key={t.id} active={t.id === current} href={t.id === 'books' ? '/product/status?ch=kindle' : `/product/status?ch=kindle&tab=${t.id}`}>{t.label}</FilterChip>
        ))}
      </FilterBar>

      {!freshnessOk && <p className="text-sm project-warning-text">鮮度検査が実行できなかった</p>}

      {current === 'books' && (summary.staleCount > 0 || summary.deadMemoCount > 0 || summary.notRebuildableCount > 0) && (
        <PanelCard title="整合・鮮度">
          <ul className="text-sm">
            {summary.staleCount > 0 && (
              <li className="project-warning-text">
                EPUB がソースより古い疑い {summary.staleCount} 件: {books.filter((b) => b.freshness === 'stale').map((b) => b.id).join(', ')}
              </li>
            )}
            {summary.deadMemoCount > 0 && <li>KDP入力メモの参照先が不在 {summary.deadMemoCount} 件</li>}
            {summary.notRebuildableCount > 0 && <li>自動再ビルドの外 {summary.notRebuildableCount} 件: {books.filter((b) => !b.rebuildable).map((b) => b.id).join(', ')}</li>}
          </ul>
        </PanelCard>
      )}

      {current === 'books' && (
        <PanelCard title="書籍">
          <DataTable columns={BOOK_COLUMNS} rows={books.map(bookRow)} pageSize={100} filter="書籍・ASIN などで絞り込む" emptyText="書籍なし" />
        </PanelCard>
      )}

      {current === 'royalty' && (
        <PanelCard title="ロイヤリティ">
          {royalties?.ok ? (
            <>
              <p className="text-sm">
                {royalties.month} 月・{royalties.total?.bookCount ?? '—'}冊・電子書籍 {royalties.total?.ebook ?? '—'}
                ・KENP {royalties.total?.kenp ?? '—'}・計 {yen(royalties.total?.royalty)}
                {royalties.estimated && <span className="project-warning-text"> （推計値）</span>}
              </p>
              {royalties.perBook && royalties.perBook.length > 0 && (
                <div className="mt-3">
                  <DataTable
                    columns={ROYALTY_COLUMNS}
                    rows={royalties.perBook.map((b): DataTableRow => ({
                      id: b.bookId,
                      values: { book: `${b.title} ${b.bookId}`, royalty: b.royalty ?? null, catalog: b.inCatalog ? '—' : '未対応' },
                      cells: {
                        book: <DetailSheet trigger={b.title} title={b.title} description={b.bookId}><DetailList items={[{ label: 'catalog', value: b.inCatalog ? '対応' : '未対応' }]} /></DetailSheet>,
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
            <p className="text-sm">未取得</p>
          )}
        </PanelCard>
      )}

      {current === 'docs' && relatedDocs.length > 0 && (
        <PanelCard title="関連文書">
          <ul>
            {relatedDocs.map((d) => <li key={d.file}><Link href={d.href}>{d.title}</Link></li>)}
          </ul>
        </PanelCard>
      )}
      </Stack>
    </>
  );
}
