import Link from 'next/link';
import { PageHead, Kpi } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadBrainView, type BrainProductView } from '@/lib/brain';

export const dynamic = 'force-dynamic';

/** status → Badge variant。判定していない状態を緑にしない。 */
function statusVariant(status: string): 'success' | 'warning' | 'outline' | 'destructive' | 'secondary' {
  if (status === 'listed') return 'success';
  if (status === 'submitted') return 'warning';
  if (status === 'draft') return 'outline';
  if (status === 'rejected') return 'destructive';
  return 'secondary'; // paused 等
}

function wiringVariant(status: 'ok' | 'error'): 'success' | 'destructive' {
  return status === 'ok' ? 'success' : 'destructive';
}

function fmtBytes(n: number): string {
  if (n <= 0) return '0 KB';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * /content/brain — Brain 商品の状態・販売文・画像・配布物・関連設計を横断する read-only 画面。
 *
 * 判定ロジックは scripts/lib/brain-inventory.mjs（check-brain-wiring と共有）。
 * 公開・本文更新・status/price 変更・R2 upload・任意 CLI 実行は一切追加しない。
 * アカウント設定・秘密値は読まない・表示しない。
 */
export default function BrainContentPage() {
  const view = loadBrainView();
  const { products, summary, overallOk, overallViolations, relatedDocs, fileMtimeRange } = view;

  return (
    <>
      <PageHead
        title="Brain"
        sub={`brain-market.com で販売する Claude Code キット ${summary.total} 件・read-only（公開/本文更新/価格変更は npm run check-brain-wiring と /brain-publish を使う）`}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Kpi label="商品数" value={summary.total} />
        <Kpi label="listed" value={summary.byStatus.listed ?? 0} />
        <Kpi label="submitted" value={summary.byStatus.submitted ?? 0} />
        <Kpi label="draft" value={summary.byStatus.draft ?? 0} />
        <Kpi label="配線 OK" value={summary.wiringOk} />
        <Kpi label="配線 要確認" value={summary.wiringError} />
      </div>

      {fileMtimeRange && (
        <p className="small muted">
          画像・配布物ファイルの最終更新: {fileMtimeRange.earliest.slice(0, 10)} 〜 {fileMtimeRange.latest.slice(0, 10)}
          （実ファイルの mtime。編集操作の記録ではない）
        </p>
      )}

      {!overallOk && overallViolations.length > 0 && (
        <div className="card">
          <h2>全体の不整合</h2>
          <ul className="small">
            {overallViolations.map((v) => (
              <li key={v} className="project-warning-text">{v}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>商品</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>商品</th>
                <th>状態</th>
                <th className="num">価格</th>
                <th>Brain</th>
                <th>販売文</th>
                <th>画像</th>
                <th>配布物</th>
                <th className="num">関連設計</th>
                <th>配線</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow key={p.id} product={p} relatedCount={relatedDocs.length} />
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && <p className="small muted">商品が0件です（カタログを確認してください）。</p>}
      </div>

      {relatedDocs.length > 0 && (
        <div className="card">
          <h2>関連設計文書</h2>
          <p className="small muted">docs frontmatter の <code>channel: brain</code> を持つ文書（{relatedDocs.length} 件）。</p>
          <ul>
            {relatedDocs.map((d) => (
              <li key={d.file}>
                <Link href={d.href}>{d.title}</Link> <span className="muted mono small">{d.file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>運用規約</h2>
        <p className="small">
          出品・修正・審査結果の反映は <code>/brain-publish</code> スキルを使う。運用・スキーマ・安全弁は{' '}
          <Link href="/knowledge/reference/brain-operations">brain-operations.md</Link> を参照。
        </p>
      </div>
    </>
  );
}

function ProductRow({ product: p, relatedCount }: { product: BrainProductView; relatedCount: number }) {
  return (
    <tr>
      <td>
        <div>{p.shortTitle || p.id}</div>
        <div className="muted small mono">{p.id}</div>
      </td>
      <td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></td>
      <td className="num">{p.price || `¥${p.priceYen.toLocaleString('ja-JP')}`}</td>
      <td>
        {p.status === 'listed' && p.productUrl ? (
          <a href={p.productUrl} target="_blank" rel="noreferrer">開く</a>
        ) : (
          <span className="muted">{p.productUrl ? '非公開' : 'URL未設定'}</span>
        )}
      </td>
      <td>
        {p.bodyTextLength > 0 ? (
          <span>{p.bodyTextLength.toLocaleString('ja-JP')} 字{p.paidMarker ? '・有料ライン有' : ''}</span>
        ) : (
          <span className="muted">未設定</span>
        )}
      </td>
      <td>
        {p.image.exists ? (
          <span>
            {fmtBytes(p.image.bytes)}
            {p.image.dimensions ? `・${p.image.dimensions.width}×${p.image.dimensions.height}` : ''}
          </span>
        ) : (
          <span className="muted">不在</span>
        )}
      </td>
      <td>
        {p.dist.exists ? (
          <span className="mono small">
            {p.dist.basename}
            <br />
            {fmtBytes(p.dist.bytes)} · sha256 {p.dist.sha256?.slice(0, 8)}
          </span>
        ) : (
          <span className="muted">不在</span>
        )}
      </td>
      <td className="num">{relatedCount}</td>
      <td>
        <Badge variant={wiringVariant(p.wiringStatus)}>{p.wiringStatus === 'ok' ? 'OK' : '要確認'}</Badge>
        {p.violations.length > 0 && (
          <ul className="small project-warning-text">
            {p.violations.map((v) => <li key={v}>{v}</li>)}
          </ul>
        )}
      </td>
    </tr>
  );
}
