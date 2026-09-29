import Link from 'next/link';
import { numCol, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { Badge } from '@/components/ui/badge';
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
    <TableHead className={className}>
      <Link href={`/strategy/market?sort=${k}`}>
        {children}
        {sort === k ? ' ▼' : ''}
      </Link>
    </TableHead>
  );

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

      <TableFrame>
        <TableHeader>
          <TableRow>
            <SortHead k="name">資格</SortHead>
            <TableHead>状態</TableHead>
            <TableHead>自分で書く区分</TableHead>
            <SortHead k="compose" className={numCol}>受験者</SortHead>
            <TableHead>買われる時期</TableHead>
            <SortHead k="sales" className={numCol}>売上</SortHead>
            <TableHead>YouTube</TableHead>
            <TableHead>note</TableHead>
            <TableHead>ココナラ</TableHead>
            <TableHead className={numCol}>X</TableHead>
            <TableHead className={numCol}>IG</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <Row key={r.id} row={r} formatTypes={view.formatTypes} />
          ))}
        </TableBody>
      </TableFrame>
    </>
  );
}

function Density({ cell }: { cell: ChannelCell | undefined }) {
  if (!cell?.density) return <span className="text-muted-foreground">—</span>;
  const top = cell.top?.[0]?.name;
  const tip = [top ? `最大: ${top}` : '', cell.partial ? '専用の検索語が未取得（汎用の検索結果から数えた下限）' : ''].filter(Boolean).join(' / ');
  return (
    <span title={tip || undefined}>
      <Badge variant={DENSITY_VARIANT[cell.density]}>{DENSITY_LABEL[cell.density]}</Badge> <span className="text-muted-foreground">{cell.strong}{cell.partial ? '*' : ''}</span>
    </span>
  );
}

function Row({ row: r, formatTypes }: { row: MarketRow; formatTypes: Record<string, string> }) {
  const compose = r.stages.filter((s) => s.compose);
  return (
    <TableRow className={'align-top' + (r.portfolio === 'declined' ? ' text-muted-foreground' : '')}>
      <TableCell className="whitespace-nowrap">{r.label}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
      </TableCell>
      <TableCell className="text-xs whitespace-normal">
        {compose.length === 0 ? (
          <span className="text-muted-foreground">なし（{r.stages.map((s) => s.types.map((t) => formatTypes[t] ?? t).join('・')).join(' / ') || '未登録'}）</span>
        ) : (
          compose.map((s) => (
            <div key={s.key}>
              <span className="text-muted-foreground">{s.label} </span>
              {s.types.map((t) => formatTypes[t] ?? t).join('・')}
            </div>
          ))
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-right tabular-nums">
        {r.composeExaminees != null ? `${r.composeExaminees.toLocaleString('ja-JP')}人` : '—'}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {compose.length === 0
          ? '—'
          : compose.map((s) => <div key={s.key}>{s.buy ? `${md(s.buy.from)}〜${md(s.buy.to)}` : <span className="text-muted-foreground">{s.examWindow ? shortWindow(s.examWindow) : '—'}</span>}</div>)}
      </TableCell>
      <TableCell className="text-xs text-right tabular-nums">{yen(r.salesYen)}</TableCell>
      <TableCell className="whitespace-nowrap text-xs"><Density cell={r.channels.youtube} /></TableCell>
      <TableCell className="whitespace-nowrap text-xs"><Density cell={r.channels.note} /></TableCell>
      <TableCell className="whitespace-nowrap text-xs"><Density cell={r.channels.coconala} /></TableCell>
      <TableCell className="text-xs text-right tabular-nums">{r.channels.x.tracked.length || '—'}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{r.channels.ig.tracked.length || '—'}</TableCell>
    </TableRow>
  );
}
