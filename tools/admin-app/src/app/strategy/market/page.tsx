import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadMarketView, type ChannelCell, type MarketRow } from '@/lib/market';

export const dynamic = 'force-dynamic';

/**
 * /strategy/market — 展開の判断（人が見る画面）。展開する資格を決めるための値だけを 1 行に並べる。
 *
 * 自分で答案を組み立てる区分（経験記述・論文）とその受験者数・買われる時期・自社の売上・
 * YouTube / note / ココナラの混み具合（強い売り手の数）・X / Instagram の追跡数。
 * 組み立ては scripts/lib/qualification-market.mjs（npm run qualification-market と同じ実装）。
 * 取得日・検索語・出典は正本と CLI が持つので出さない。正本の不整合と要対応は件数だけ出す。
 */
type SortKey = 'compose' | 'sales' | 'name';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = { active: 'success', candidate: 'outline', declined: 'secondary' };
const DENSITY_LABEL: Record<string, string> = { none: '無', low: '少', mid: '中', high: '多' };
const DENSITY_VARIANT: Record<string, 'success' | 'outline' | 'warning' | 'destructive'> = { none: 'success', low: 'outline', mid: 'warning', high: 'destructive' };

const md = (date: string) => {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};
const yen = (n: number) => (n > 0 ? `¥${Math.round(n / 1000).toLocaleString('ja-JP')}k` : '—');
/** 日付未発表の期間の文言を短くする（例: 2026年12月上旬〜2027年1月中旬の受験者に別途通知する日 → 12月上旬〜1月中旬）。 */
const shortWindow = (w: string) => w.replace(/の受験者に.*$/, '').replace(/\d{4}年/g, '');

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: sortParam } = await searchParams;
  const view = loadMarketView();
  const sort: SortKey = sortParam === 'sales' || sortParam === 'name' ? sortParam : 'compose';
  const order: Record<string, number> = { active: 0, candidate: 1, declined: 2 };
  const rows = [...view.rows].sort((a, b) => {
    if (sort === 'name') return a.label.localeCompare(b.label, 'ja');
    if (sort === 'sales') return b.salesYen - a.salesYen || (b.composeExaminees ?? -1) - (a.composeExaminees ?? -1);
    return (order[a.portfolio] ?? 3) - (order[b.portfolio] ?? 3) || (b.composeExaminees ?? -1) - (a.composeExaminees ?? -1);
  });
  const actionCount = view.rows.reduce((n, r) => n + r.actions.length, 0);

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={className}>
      <Link href={`/strategy/market?sort=${k}`}>
        {children}
        {sort === k ? ' ▼' : ''}
      </Link>
    </th>
  );

  return (
    <>
      <PageHead title="展開の判断" />

      {view.errors.length > 0 && (
        <div className="card warn-border">
          <h2>正本の不整合 {view.errors.length} 件</h2>
          <p className="small muted">npm run check-qualification-market で詳細を確認して正本を直す。</p>
        </div>
      )}
      {actionCount > 0 && <p className="small muted">要対応 {actionCount} 件（npm run qualification-market）。ココナラの * は下限。</p>}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <SortHead k="name">資格</SortHead>
              <th>状態</th>
              <th>自分で書く区分</th>
              <SortHead k="compose" className="num">受験者</SortHead>
              <th>買われる時期</th>
              <SortHead k="sales" className="num">売上</SortHead>
              <th>YouTube</th>
              <th>note</th>
              <th>ココナラ</th>
              <th className="num">X</th>
              <th className="num">IG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.id} row={r} formatTypes={view.formatTypes} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Density({ cell }: { cell: ChannelCell | undefined }) {
  if (!cell?.density) return <span className="muted">—</span>;
  const top = cell.top?.[0]?.name;
  const tip = [top ? `最大: ${top}` : '', cell.partial ? '専用の検索語が未取得（汎用の検索結果から数えた下限）' : ''].filter(Boolean).join(' / ');
  return (
    <span title={tip || undefined}>
      <Badge variant={DENSITY_VARIANT[cell.density]}>{DENSITY_LABEL[cell.density]}</Badge> <span className="muted">{cell.strong}{cell.partial ? '*' : ''}</span>
    </span>
  );
}

function Row({ row: r, formatTypes }: { row: MarketRow; formatTypes: Record<string, string> }) {
  const compose = r.stages.filter((s) => s.compose);
  return (
    <tr style={{ verticalAlign: 'top' }} className={r.portfolio === 'declined' ? 'muted' : undefined}>
      <td style={{ whiteSpace: 'nowrap' }}>{r.label}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
      </td>
      <td className="small">
        {compose.length === 0 ? (
          <span className="muted">なし（{r.stages.map((s) => s.types.map((t) => formatTypes[t] ?? t).join('・')).join(' / ') || '未登録'}）</span>
        ) : (
          compose.map((s) => (
            <div key={s.key}>
              <span className="muted">{s.label} </span>
              {s.types.map((t) => formatTypes[t] ?? t).join('・')}
            </div>
          ))
        )}
      </td>
      <td className="small num" style={{ whiteSpace: 'nowrap' }}>
        {r.composeExaminees != null ? `${r.composeExaminees.toLocaleString('ja-JP')}人` : '—'}
      </td>
      <td className="small" style={{ whiteSpace: 'nowrap' }}>
        {compose.length === 0
          ? '—'
          : compose.map((s) => <div key={s.key}>{s.buy ? `${md(s.buy.from)}〜${md(s.buy.to)}` : <span className="muted">{s.examWindow ? shortWindow(s.examWindow) : '—'}</span>}</div>)}
      </td>
      <td className="small num">{yen(r.salesYen)}</td>
      <td className="small" style={{ whiteSpace: 'nowrap' }}><Density cell={r.channels.youtube} /></td>
      <td className="small" style={{ whiteSpace: 'nowrap' }}><Density cell={r.channels.note} /></td>
      <td className="small" style={{ whiteSpace: 'nowrap' }}><Density cell={r.channels.coconala} /></td>
      <td className="small num">{r.channels.x.tracked.length || '—'}</td>
      <td className="small num">{r.channels.ig.tracked.length || '—'}</td>
    </tr>
  );
}
