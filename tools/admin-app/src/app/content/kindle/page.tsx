import Link from 'next/link';
import { PageHead, Kpi } from '@/components/ui';
import { Badge } from '@/components/primitives';
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

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Kpi label="冊数" value={summary.total} />
        <Kpi label="live" value={summary.byStatus.live ?? 0} />
        <Kpi label="in_review" value={summary.byStatus.in_review ?? 0} />
        <Kpi label="鮮度 stale" value={freshnessOk ? summary.staleCount : '検査不成立'} />
        <Kpi label="直近月ロイヤリティ" value={royalties?.ok ? `${fmtYen(royalties.total?.royalty)}${royalties.estimated ? '(推計)' : ''}` : '未取得'} />
      </div>

      {!freshnessOk && (
        <div className="card">
          <p className="small project-warning-text">
            鮮度検査が実行できなかった（git log 取得失敗）。stale 0 件を「健全」と読まないこと。
          </p>
        </div>
      )}

      {(summary.staleCount > 0 || summary.deadMemoCount > 0 || summary.notRebuildableCount > 0) && (
        <div className="card">
          <h2>整合・鮮度</h2>
          <ul className="small">
            {summary.staleCount > 0 && (
              <li className="project-warning-text">
                EPUB がソースより古い疑い {summary.staleCount} 件:{' '}
                {books.filter((b) => b.freshness === 'stale').map((b) => b.id).join(', ')}
                （修正: <code>npm run sync-kindle-dist -- --downloads &lt;id&gt;</code>）
              </li>
            )}
            {summary.deadMemoCount > 0 && (
              <li className="muted">
                KDP入力メモの参照先が不在 {summary.deadMemoCount} 件（<code>npm run gen-kdp-memo &lt;id&gt;</code> で生成可）
              </li>
            )}
            {summary.notRebuildableCount > 0 && (
              <li className="muted">
                自動再ビルド経路の外（buildSpec 無し）{summary.notRebuildableCount} 件:{' '}
                {books.filter((b) => !b.rebuildable).map((b) => b.id).join(', ')}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>書籍</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>表紙</th>
                <th>書籍</th>
                <th className="num">価格</th>
                <th>状態</th>
                <th>版</th>
                <th>提出日</th>
                <th>ASIN</th>
                <th>鮮度</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => <BookRow key={b.id} book={b} />)}
            </tbody>
          </table>
        </div>
        {books.length === 0 && <p className="small muted">書籍が0件です（catalog.json を確認してください）。</p>}
      </div>

      <div className="card">
        <h2>ロイヤリティ</h2>
        {royalties?.ok ? (
          <>
            <p className="small">
              {royalties.month} 月・冊数 {royalties.total?.bookCount ?? '—'}・電子書籍 {royalties.total?.ebook ?? '—'}
              ・KENP {royalties.total?.kenp ?? '—'}・ロイヤリティ計 {fmtYen(royalties.total?.royalty)}
              {royalties.estimated && <span className="project-warning-text"> （推計値）</span>}
            </p>
            {royalties.caveat && <p className="small muted">{royalties.caveat}</p>}
            {royalties.fetchedAt && <p className="small muted">取得日時: {royalties.fetchedAt}</p>}
            {royalties.perBook && royalties.perBook.length > 0 && (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>書籍</th><th className="num">ロイヤリティ</th><th>catalog</th></tr>
                  </thead>
                  <tbody>
                    {royalties.perBook.map((b) => (
                      <tr key={b.bookId}>
                        <td>{b.title} <span className="muted small mono">{b.bookId}</span></td>
                        <td className="num">{fmtYen(b.royalty)}</td>
                        <td>{b.inCatalog ? '—' : <span className="project-warning-text">未対応</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="small muted">未取得（ローカルで <code>npm run kdp-report</code> を実行するとこのカードに反映されます）。</p>
        )}
      </div>

      {relatedDocs.length > 0 && (
        <div className="card">
          <h2>関連設計文書</h2>
          <p className="small muted">docs frontmatter の <code>channel: kindle</code> を持つ文書（{relatedDocs.length} 件）。</p>
          <ul>
            {relatedDocs.map((d) => (
              <li key={d.file}>
                <Link href={d.href}>{d.title}</Link> <span className="muted small mono">{d.file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>運用規約</h2>
        <p className="small">
          この画面は読み取り専用。再ビルド= <code>npm run sync-kindle-dist -- --downloads &lt;id&gt;</code> ／
          提出= <code>/kdp-publish</code>（<code>npm run kdp-batch</code>）／
          本棚同期= <code>node scripts/kdp-publish.mjs --sync-status</code> ／
          ロイヤリティ= <code>npm run kdp-report</code>。
          状態 SoT は <Link href="/content/content~kindle">catalog.json ほか（ファイル一覧）</Link>、手順は kdp-operator エージェントを参照。
        </p>
      </div>
    </>
  );
}

function BookRow({ book: b }: { book: KindleBookView }) {
  return (
    <tr>
      <td>
        {b.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.coverUrl} alt="" width={40} loading="lazy" />
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        <div>{b.title || b.id}</div>
        <div className="muted small mono">{b.id}{b.series ? `・${b.series}` : ''}</div>
        {b.epubExists && <div className="muted small">{fmtBytes(b.epubBytes)}</div>}
      </td>
      <td className="num">{fmtYen(b.priceJpy)}</td>
      <td><Badge variant={statusVariant(b.status)}>{b.status}</Badge></td>
      <td className="small">{b.version || '—'}</td>
      <td className="small">{b.submittedDate ?? b.publishedDate ?? '—'}</td>
      <td className="small">
        {b.amazonUrl ? (
          <a href={b.amazonUrl} target="_blank" rel="noreferrer">{b.asin}</a>
        ) : (
          <span className="muted">{b.asin ?? b.draftAsin ?? '—'}</span>
        )}
      </td>
      <td><Badge variant={freshnessVariant(b.freshness)}>{freshnessLabel(b.freshness)}</Badge></td>
    </tr>
  );
}
