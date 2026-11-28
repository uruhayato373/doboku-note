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
  if (status === 'unpublished') return 'neutral';
  return 'info';
}

/** 予定の 1 行（例: 2027-05-01 出版 ¥1,650） */
function planText(p: KindleBookView['plans'][number]): string {
  return `${p.date} ${p.actionLabel}${p.price ? ` ${yen(p.price)}` : ''}${p.note ? `（${p.note}）` : ''}`;
}

function contentsList(b: KindleBookView) {
  if (!b.contents) return <span className="text-muted-foreground">spec なし（ビルダーの theme で作る本）</span>;
  if (!b.contents.length) return <span className="text-muted-foreground">0 本</span>;
  const total = b.contents.reduce((s, c) => s + c.chars, 0);
  return (
    <div className="text-xs">
      <p>{b.contents.length} 本・{total.toLocaleString('ja-JP')} 字</p>
      <ol className="list-decimal pl-5">
        {b.contents.map((c) => (
          <li key={c.path} className={c.missing ? 'project-warning-text' : undefined}>
            {c.heading}（{c.missing ? 'ファイルが無い' : `${c.chars.toLocaleString('ja-JP')} 字`}）<br />
            <span className="text-muted-foreground">{c.path}</span>
          </li>
        ))}
      </ol>
    </div>
  );
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
  { key: 'volume', label: '巻', num: true },
  { key: 'price', label: '価格', num: true },
  { key: 'status', label: '状態' },
  { key: 'plan', label: '次の予定' },
  { key: 'royalty', label: '受取の累計', num: true },
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
      book: `${b.title || b.id} ${b.id}${b.seriesName ? `・${b.seriesName}` : ''}`,
      volume: b.seriesVolume,
      price: b.priceJpy ?? null,
      status: b.statusLabel,
      plan: b.nextPlan ? `${b.nextPlan.date} ${b.nextPlan.actionLabel}` : null,
      royalty: b.royaltyMonths.length ? b.royaltyTotal : null,
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
              { label: 'シリーズ', value: b.seriesName ? `${b.seriesName}${b.seriesVolume != null ? `（第${b.seriesVolume}巻）` : ''}` : null },
              { label: '状態', value: `${b.statusLabel}（${b.status}）` },
              { label: '価格・受取率', value: `${yen(b.priceJpy)}${b.royaltyRate != null ? `・${Math.round(b.royaltyRate * 100)}%` : ''}` },
              { label: '予定', value: b.plans.length ? <ul className="text-xs">{b.plans.map((p, i) => <li key={i}>{planText(p)}</li>)}</ul> : null },
              { label: '置き換え（この本が引き継ぐ旧本）', value: b.supersedes.length ? b.supersedes.join(', ') : null },
              { label: '置き換え（この本を引き継ぐ巻）', value: b.supersededBy.length ? b.supersededBy.join(', ') : null },
              { label: '収録記事', value: contentsList(b) },
              {
                label: '月ごとの受取',
                value: b.royaltyMonths.length ? (
                  <ul className="text-xs">
                    {b.royaltyMonths.map((m) => <li key={m.month}>{m.month}: {yen(m.royalty)}（電子書籍 {yen(m.ebook)}・KENP {yen(m.kenp)}）{m.estimated ? '・推計' : ''}</li>)}
                    <li>累計 {yen(b.royaltyTotal)}</li>
                  </ul>
                ) : null,
              },
              { label: '版', value: b.version },
              { label: '版の履歴', value: b.versionHistory.length ? <ul className="text-xs">{b.versionHistory.map((v, i) => <li key={i}>{v.date} v{v.version}: {v.change}</li>)}</ul> : null },
              { label: '価格の履歴', value: b.priceHistory.length ? <ul className="text-xs">{b.priceHistory.map((v, i) => <li key={i}>{Object.entries(v).map(([k, x]) => `${k}=${String(x)}`).join('・')}</li>)}</ul> : null },
              { label: 'ASIN', value: b.amazonUrl ? <a href={b.amazonUrl} target="_blank" rel="noreferrer">{b.asin}</a> : (b.asin ?? b.draftAsin) },
              { label: 'EPUB', value: b.epubExists ? fmtBytes(b.epubBytes) : null },
              { label: '提出日', value: b.submittedDate },
              { label: '公開日', value: b.publishedDate },
              { label: 'プレビュー', value: <Link href={`/content/kindle/${encodeURIComponent(b.id)}`}>開く</Link> },
            ]}
          />
        </DetailSheet>
      ),
      volume: <span className="text-xs">{b.seriesVolume ?? '—'}</span>,
      price: yen(b.priceJpy),
      status: <StatusBadge tone={statusTone(b.status)}>{b.statusLabel}</StatusBadge>,
      plan: b.nextPlan ? (
        <span className={`text-xs${b.nextPlan.overdue ? ' project-warning-text' : ''}`}>{planText(b.nextPlan)}{b.nextPlan.overdue ? '・予定日を過ぎた' : ''}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
      royalty: b.royaltyMonths.length ? yen(b.royaltyTotal) : <span className="text-muted-foreground">—</span>,
      freshness: <StatusBadge tone={freshnessTone(b.freshness)}>{freshnessLabel(b.freshness)}</StatusBadge>,
    },
  };
}

/**
 * /content/kindle — KDP の Kindle 本の台帳（状態・価格・次の予定・置き換え関係・収録記事・受取の推移・ASIN・鮮度）を
 * シリーズと巻の順に並べる read-only 画面。予定は正本の catalog.plans[] を出すだけで、KDP への操作はしない。
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
        <StatCard label="販売中" value={summary.byStatus.live ?? 0} />
        <StatCard label="出品できる" value={summary.byStatus.ready ?? 0} />
        <StatCard label="制作中" value={summary.byStatus.draft ?? 0} />
        <StatCard label="販売停止" value={summary.byStatus.unpublished ?? 0} />
        <StatCard label="審査中" value={summary.byStatus.in_review ?? 0} />
        <StatCard label="予定あり（過ぎた）" value={`${summary.plannedCount}（${summary.overdueCount}）`} />
        <StatCard label="鮮度 stale" value={freshnessOk ? summary.staleCount : '検査不成立'} />
        <StatCard label="直近月ロイヤリティ" value={royalties?.ok ? `${yen(royalties.total?.royalty)}${royalties.estimated ? '(推計)' : ''}` : '未取得'} />
      </div>

      <FilterBar className="mb-3!">
        {TABS.filter((t) => t.id !== 'docs' || relatedDocs.length > 0).map((t) => (
          <FilterChip key={t.id} active={t.id === current} href={t.id === 'books' ? '/product/status?ch=kindle' : `/product/status?ch=kindle&tab=${t.id}`}>{t.label}</FilterChip>
        ))}
      </FilterBar>

      {!freshnessOk && <p className="text-sm project-warning-text">鮮度検査が実行できなかった</p>}

      {current === 'books' && (summary.staleCount > 0 || summary.notRebuildableCount > 0) && (
        <PanelCard title="整合・鮮度">
          <ul className="text-sm">
            {summary.staleCount > 0 && (
              <li className="project-warning-text">
                EPUB がソースより古い疑い {summary.staleCount} 件: {books.filter((b) => b.freshness === 'stale').map((b) => b.id).join(', ')}
              </li>
            )}
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
