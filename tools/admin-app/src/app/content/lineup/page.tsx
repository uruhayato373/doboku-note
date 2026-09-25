import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadLineupView, type LineupItem, type LineupRow } from '@/lib/lineup';

export const dynamic = 'force-dynamic';

const STAGE_ORDER = ['published', 'review', 'scheduled', 'draft', 'planned', 'retired', 'unknown'];

function stageVariant(stage: string): 'success' | 'warning' | 'outline' | 'secondary' | 'destructive' {
  if (stage === 'published') return 'success';
  if (stage === 'review' || stage === 'scheduled') return 'warning';
  if (stage === 'draft' || stage === 'planned') return 'outline';
  if (stage === 'unknown') return 'destructive';
  return 'secondary';
}

/**
 * /content/lineup — 商品ラインナップ（資格 × 試験区分 × チャネル）の read-only 画面。
 *
 * 一覧は販売中の件数だけで空きマス（未展開）を見せ、資格名から ?q=<資格id> の詳細（表紙つき・全件）へ進む。分類ルールは
 * `.claude/config/product-lineup.json`、判定は `scripts/lib/product-lineup.mjs`。
 * 価格・状態の変更や出品はしない（各チャネルのスキルの担当）。
 */
export default async function LineupPage({ searchParams }: { searchParams: Promise<{ retired?: string; q?: string }> }) {
  const { retired, q } = await searchParams;
  const showRetired = retired === '1';
  const view = loadLineupView();
  const { channels, unclassified, configErrors, sourceErrors } = view;
  // ?q=<資格id> ならその資格の詳細（表紙つき・全件）、無ければ一覧（販売中の件数だけ）
  const detail = q && view.rows.some((r) => r.qualificationId === q) ? q : null;
  const rows = detail ? view.rows.filter((r) => r.qualificationId === detail) : view.rows;
  const query = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { q: detail, retired: showRetired ? '1' : null, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/content/lineup${s ? `?${s}` : ''}`;
  };

  const visible = (items: LineupItem[]) =>
    items
      .filter((i) => showRetired || i.stage !== 'retired')
      .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <>
      <PageHead title={detail ? `商品ラインナップ：${rows[0]!.qualificationLabel}` : '商品ラインナップ'} />

      {(configErrors.length > 0 || sourceErrors.length > 0) && (
        <div className="card warn-border">
          <h2>読み込みの問題</h2>
          <ul className="small">
            {sourceErrors.map((e) => (
              <li key={e.channel} className="project-warning-text">
                {e.channel}: {e.message}（このチャネルの空きマスは「未展開」ではなく「未検査」）
              </li>
            ))}
            {configErrors.map((e) => (
              <li key={e} className="project-warning-text">config: {e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="small" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{detail && <Link href={query({ q: null })}>← 一覧へ</Link>}</span>
        {showRetired ? (
          <Link href={query({ retired: null })}>停止中を隠す</Link>
        ) : (
          <Link href={query({ retired: '1' })}>停止中も表示する</Link>
        )}
      </div>
      <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {!detail && <th>資格</th>}
                <th>区分</th>
                {channels.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <LineupRowView key={row.key} row={row} channels={channels} visible={visible} detail={Boolean(detail)} href={query({ q: row.qualificationId })} />
              ))}
            </tbody>
          </table>
      </div>

      {unclassified.length > 0 && (
        <div className="card warn-border">
          <h2>未分類 {unclassified.length} 件</h2>
          <p className="small muted">
            どの分類ルールにも当たらなかった商品。<code>.claude/config/product-lineup.json</code> の rules に追加する。
          </p>
          <ul className="small">
            {unclassified.map((i) => (
              <li key={`${i.channel}:${i.id}`}>
                <span className="mono">{i.channel}</span> {i.title} <span className="muted mono">{i.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function LineupRowView({
  row,
  channels,
  visible,
  detail,
  href,
}: {
  row: LineupRow;
  channels: { id: string; label: string }[];
  visible: (items: LineupItem[]) => LineupItem[];
  /** true: 表紙つきで全件（資格の詳細） / false: 販売中の件数だけ（一覧） */
  detail: boolean;
  href: string;
}) {
  return (
    <tr style={{ verticalAlign: 'top' }}>
      {row.isFirstStage && !detail && (
        <th rowSpan={row.stageCount} scope="rowgroup" style={{ whiteSpace: 'nowrap' }}>
          {detail ? row.qualificationLabel : <Link href={href}>{row.qualificationLabel}</Link>}
        </th>
      )}
      <td style={{ whiteSpace: 'nowrap' }}>
        <div>{row.stageLabel}</div>
      </td>
      {channels.map((c) => {
        const items = visible(row.byChannel[c.id] ?? []);
        const hasPublished = items.some((i) => i.stage === 'published');
        if (!detail) {
          const published = items.filter((i) => i.stage === 'published').length;
          const other = items.length - published;
          return (
            <td key={c.id} className="num">
              {published > 0 ? published : <span className="muted">未展開</span>}
              {other > 0 && <div className="muted" style={{ fontSize: 11 }}>準備中 {other}</div>}
            </td>
          );
        }
        return (
          <td key={c.id} style={{ minWidth: 200, maxWidth: 260, whiteSpace: 'normal' }}>
            {!hasPublished && <div className="small muted" style={{ marginBottom: 4 }}>未展開</div>}
            <div className="flex flex-col gap-1.5">
              {items.map((i) => (
                <ItemTile key={i.id} item={i} />
              ))}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function ItemTile({ item: i }: { item: LineupItem }) {
  const title = i.url ? (
    <a href={i.url} target="_blank" rel="noreferrer">
      {i.title}
    </a>
  ) : (
    i.title
  );
  return (
    <div className="flex items-start gap-2" title={i.note ?? i.id}>
      {i.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={i.coverUrl} alt="" width={48} loading="lazy" className="shrink-0 rounded-sm border border-border" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[27px] w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground"
        >
          {i.platform ?? '表紙なし'}
        </span>
      )}
      <div className="min-w-0 small" style={{ lineHeight: 1.35 }}>
        <div>{title}</div>
        <div className="muted">
          {i.price ?? '—'}
          {i.stage !== 'published' && (
            <>
              {' '}
              <Badge variant={stageVariant(i.stage)}>{i.stageLabel}</Badge>
            </>
          )}
        </div>
        {i.note && <div className="muted" style={{ fontSize: 11 }}>{i.note}</div>}
      </div>
    </div>
  );
}
