import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
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
const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_TONE: Record<string, Tone> = { active: 'good', candidate: 'neutral', declined: 'info' };
const DENSITY_LABEL: Record<string, string> = { none: '無', low: '少', mid: '中', high: '多' };
const DENSITY_TONE: Record<string, Tone> = { none: 'good', low: 'neutral', mid: 'warn', high: 'bad' };

const md = (date: string) => {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};
const yen = (n: number) => (n > 0 ? `¥${Math.round(n / 1000).toLocaleString('ja-JP')}k` : '—');
/** 日付未発表の期間の文言を短くする（例: 2026年12月上旬〜2027年1月中旬の受験者に別途通知する日 → 12月上旬〜1月中旬）。 */
const shortWindow = (w: string) => w.replace(/の受験者に.*$/, '').replace(/\d{4}年/g, '');

const COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'portfolio', label: '状態' },
  { key: 'compose', label: '自分で書く区分', wrap: true, sortable: false },
  { key: 'examinees', label: '受験者', num: true },
  { key: 'buy', label: '買われる時期', sortable: false },
  { key: 'sales', label: '売上', num: true },
  { key: 'youtube', label: 'YouTube' },
  { key: 'note', label: 'note' },
  { key: 'coconala', label: 'ココナラ' },
  { key: 'x', label: 'X', num: true },
  { key: 'ig', label: 'IG', num: true },
];

/** 初期の並びは 展開中 → 候補 → 見送り、同じ状態の中では受験者数の多い順。列見出しで並べ替えられる。 */
export default function MarketPage() {
  const view = loadMarketView();
  const order: Record<string, number> = { active: 0, candidate: 1, declined: 2 };
  const rows = [...view.rows].sort(
    (a, b) => (order[a.portfolio] ?? 3) - (order[b.portfolio] ?? 3) || (b.composeExaminees ?? -1) - (a.composeExaminees ?? -1),
  );
  const actionCount = view.rows.reduce((n, r) => n + r.actions.length, 0);

  return (
    <>
      <PageHead title="展開の判断" />
      <SectionTabs set="market" current="/strategy/market" />

      {view.errors.length > 0 && (
        <PanelCard title={`正本の不整合 ${view.errors.length} 件`}>
          <p className="text-sm text-muted-foreground">npm run check-qualification-market で詳細を確認して正本を直す。</p>
        </PanelCard>
      )}
      {actionCount > 0 && <p className="text-sm text-muted-foreground">要対応 {actionCount} 件（npm run qualification-market）。ココナラの * は下限。</p>}

      <DataTable columns={COLUMNS} rows={rows.map((r) => toRow(r, view.formatTypes))} pageSize={100} />
    </>
  );
}

function Density({ cell }: { cell: ChannelCell | undefined }) {
  if (!cell?.density) return <span className="text-muted-foreground">—</span>;
  const top = cell.top?.[0]?.name;
  const tip = [top ? `最大: ${top}` : '', cell.partial ? '専用の検索語が未取得（汎用の検索結果から数えた下限）' : ''].filter(Boolean).join(' / ');
  return (
    <span title={tip || undefined}>
      <StatusBadge tone={DENSITY_TONE[cell.density]}>{DENSITY_LABEL[cell.density]}</StatusBadge> <span className="text-muted-foreground">{cell.strong}{cell.partial ? '*' : ''}</span>
    </span>
  );
}

function toRow(r: MarketRow, formatTypes: Record<string, string>): DataTableRow {
  const compose = r.stages.filter((s) => s.compose);
  const typeText = (types: string[]) => types.map((t) => formatTypes[t] ?? t).join('・');
  const composeText =
    compose.length === 0
      ? `なし（${r.stages.map((s) => typeText(s.types)).join(' / ') || '未登録'}）`
      : compose.map((s) => `${s.label} ${typeText(s.types)}`).join(' / ');
  const buyText = compose.length === 0 ? '—' : compose.map((s) => (s.buy ? `${md(s.buy.from)}〜${md(s.buy.to)}` : s.examWindow ? shortWindow(s.examWindow) : '—')).join(' / ');
  // 見送りの資格は行全体を薄く出す
  const dim = (node: React.ReactNode) => (r.portfolio === 'declined' ? <span className="text-muted-foreground">{node}</span> : node);
  const density = (cell: ChannelCell | undefined) => (cell?.density ? (cell.strong ?? 0) : null);
  return {
    id: r.id,
    values: {
      label: r.label,
      portfolio: PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio,
      compose: composeText,
      examinees: r.composeExaminees,
      buy: buyText,
      sales: r.salesYen,
      youtube: density(r.channels.youtube),
      note: density(r.channels.note),
      coconala: density(r.channels.coconala),
      x: r.channels.x.tracked.length || null,
      ig: r.channels.ig.tracked.length || null,
    },
    cells: {
      label: dim(r.label),
      portfolio: <StatusBadge tone={PORTFOLIO_TONE[r.portfolio] ?? 'info'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</StatusBadge>,
      compose: dim(
        <div className="text-xs">
          {compose.length === 0 ? (
            <span className="text-muted-foreground">{composeText}</span>
          ) : (
            compose.map((s) => (
              <div key={s.key}>
                <span className="text-muted-foreground">{s.label} </span>
                {typeText(s.types)}
              </div>
            ))
          )}
        </div>,
      ),
      examinees: dim(<span className="text-xs">{r.composeExaminees != null ? `${r.composeExaminees.toLocaleString('ja-JP')}人` : '—'}</span>),
      buy: dim(
        <div className="text-xs">
          {compose.length === 0
            ? '—'
            : compose.map((s) => <div key={s.key}>{s.buy ? `${md(s.buy.from)}〜${md(s.buy.to)}` : <span className="text-muted-foreground">{s.examWindow ? shortWindow(s.examWindow) : '—'}</span>}</div>)}
        </div>,
      ),
      sales: dim(<span className="text-xs">{yen(r.salesYen)}</span>),
      youtube: dim(<span className="text-xs"><Density cell={r.channels.youtube} /></span>),
      note: dim(<span className="text-xs"><Density cell={r.channels.note} /></span>),
      coconala: dim(<span className="text-xs"><Density cell={r.channels.coconala} /></span>),
      x: dim(<span className="text-xs">{r.channels.x.tracked.length || '—'}</span>),
      ig: dim(<span className="text-xs">{r.channels.ig.tracked.length || '—'}</span>),
    },
  };
}
