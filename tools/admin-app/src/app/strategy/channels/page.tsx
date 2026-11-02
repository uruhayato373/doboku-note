import { DataTable, PanelCard, StatCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import SectionTabs from '@/components/SectionTabs';
import { yen } from '@/lib/format';
import { loadChannelView, type ChannelId, type Kpi, type ReceiptStatus } from '@/lib/channels';

export const dynamic = 'force-dynamic';

/**
 * /strategy/channels — チャネル設計（人が見る画面）。どのチャネルで何を売るかを決めるための値と、SWOT・4C・KGI/KPI。
 * 組み立ては scripts/lib/channel-economics.mjs（npm run channel-economics と同じ実装）。正本は config/channel-strategy.json、
 * 判断の文章は docs/strategy/22_チャネル別商品設計2026-11.md。
 */
const CHANNEL_LABEL: Record<ChannelId, string> = { note: 'note', kindle: 'KDP', coconala: 'ココナラ' };
const STATUS_LABEL: Record<ReceiptStatus, string> = { final: '確定', 'to-date': '途中', estimate: '推計', missing: '未取得' };
const STATUS_TONE: Record<ReceiptStatus, Tone> = { final: 'good', 'to-date': 'info', estimate: 'warn', missing: 'neutral' };

const withUnit = (v: number | null, unit: string) => (v == null ? '未計測' : unit === '円' ? yen(v) : `${v.toLocaleString('ja-JP')}${unit}`);
const cell = (v: number | null, s: ReceiptStatus) => (
  <span className="inline-flex items-center gap-1">
    {yen(v)}
    {s !== 'final' && <StatusBadge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</StatusBadge>}
  </span>
);

/** 目標に届いているか（減らす KPI は id で判定: 販売 0 の商品は少ないほど良い） */
function kpiTone(k: Kpi): Tone {
  if (k.actual == null) return 'neutral';
  const lowerIsBetter = k.id === 'note-unsold-paid';
  return (lowerIsBetter ? k.actual <= k.target : k.actual >= k.target) ? 'good' : 'warn';
}

const MONTH_COLUMNS: DataTableColumn[] = [
  { key: 'month', label: '月' },
  { key: 'note', label: 'note', num: true },
  { key: 'kdp', label: 'KDP', num: true },
  { key: 'coconala', label: 'ココナラ', num: true },
  { key: 'total', label: '受取の計', num: true },
];
const UNIT_COLUMNS: DataTableColumn[] = [
  { key: 'item', label: '売り方' },
  { key: 'sales', label: '件数', num: true },
  { key: 'avgPrice', label: '平均価格', num: true },
  { key: 'netPerSale', label: '1 件の手取り', num: true },
];
const QUAL_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'note', label: 'note', num: true },
  { key: 'kindle', label: 'KDP', num: true },
  { key: 'coconala', label: 'ココナラ', num: true },
  { key: 'total', label: '計', num: true },
];
const KPI_COLUMNS: DataTableColumn[] = [
  { key: 'channel', label: 'チャネル' },
  { key: 'label', label: 'KPI', wrap: true },
  { key: 'target', label: '目標', num: true },
  { key: 'actual', label: '実績', num: true },
  { key: 'status', label: '承認' },
];

export default function ChannelsPage() {
  const v = loadChannelView();
  const monthRows: DataTableRow[] = v.monthly.map((m) => ({
    id: m.month,
    values: { month: m.month, note: m.note, kdp: m.kdp, coconala: m.coconala, total: m.total },
    cells: {
      note: cell(m.note, m.status.note ?? 'missing'),
      kdp: cell(m.kdp, m.status.kdp ?? 'missing'),
      coconala: cell(m.coconala, m.status.coconala ?? 'missing'),
      total: m.complete ? yen(m.total) : <span className="text-muted-foreground">{yen(m.total)}（欠けあり）</span>,
    },
  }));
  const unitRows: DataTableRow[] = v.unit.map((u) => ({
    id: u.item,
    values: { item: u.item, sales: u.sales, avgPrice: u.avgPrice, netPerSale: u.netPerSale },
    cells: { avgPrice: yen(u.avgPrice), netPerSale: u.estimated ? `${yen(u.netPerSale)}（公表料率で推計）` : yen(u.netPerSale) },
  }));
  const qualRows: DataTableRow[] = v.byQualification.map((q) => ({
    id: q.id,
    values: { label: q.label, note: q.note, kindle: q.kindle, coconala: q.coconala, total: q.note + q.kindle + q.coconala },
    cells: { note: yen(q.note), kindle: yen(q.kindle), coconala: yen(q.coconala), total: yen(q.note + q.kindle + q.coconala) },
  }));
  const kpiRows: DataTableRow[] = v.kpis.map((k) => ({
    id: k.id,
    values: { channel: CHANNEL_LABEL[k.channel], label: k.label, target: k.target, actual: k.actual, status: k.status },
    cells: {
      label: (
        <span className="flex flex-col gap-0.5">
          {k.label}
          <span className="text-xs text-muted-foreground">{k.why}</span>
        </span>
      ),
      target: withUnit(k.target, k.unit),
      actual: (
        <span className="inline-flex items-center gap-1">
          <StatusBadge tone={kpiTone(k)}>{withUnit(k.actual, k.unit)}</StatusBadge>
          {k.actualAt && <span className="text-xs text-muted-foreground">{k.actualAt}</span>}
        </span>
      ),
      status: <StatusBadge tone={k.status === 'approved' ? 'good' : 'info'}>{k.status === 'approved' ? '承認済み' : '案'}</StatusBadge>,
    },
  }));
  const keep = (id: ChannelId) => (id === 'note' && v.noteKeepActual != null ? `実績 ${(v.noteKeepActual * 100).toFixed(1)}%` : `公表 ${(v.fees[id].keepRate * 100).toFixed(1)}%`);

  return (
    <>
      <PageHead title="チャネル設計" />
      <SectionTabs set="market" current="/strategy/channels" />
      <Stack>
        <Grid min="sm">
          <StatCard label={v.kgi.label} value={yen(v.kgi.lastFullTotal)} sub={`${v.kgi.lastFullMonth ?? '—'}${v.kgi.lastFullComplete ? '' : '・欠けあり'} / 目標 ${yen(v.kgi.targetYen)}`} />
          {(['note', 'kindle', 'coconala'] as ChannelId[]).map((id) => (
            <StatCard key={id} label={`${CHANNEL_LABEL[id]}の手取りの割合`} value={keep(id)} sub={`${v.fees[id].checkedAt} 確認`} />
          ))}
        </Grid>

        <Section title="KGI・KPI" note="「案」は運営者の承認前。実績は台帳から自動で出す（測れていないものは「未計測」）">
          <DataTable columns={KPI_COLUMNS} rows={kpiRows} pageSize={50} />
        </Section>

        <Section title="月別の受取" note="管理画面のトップと同じ組み立て（net-receipts）。note は毎月 2 日に前月が確定する">
          <DataTable columns={MONTH_COLUMNS} rows={monthRows} pageSize={24} />
        </Section>

        <Grid min="md">
          <PanelCard title="1 件あたりの手取り" description="note は確定月の実績の控除後の割合、KDP は公表料率（70% 帯）で計算">
            <DataTable columns={UNIT_COLUMNS} rows={unitRows} pageSize={20} />
          </PanelCard>
          <PanelCard title="資格 × チャネルの手取り（累計）" description="note は実績の控除後の割合で換算、KDP はロイヤリティ、ココナラは受注の控除後">
            <DataTable columns={QUAL_COLUMNS} rows={qualRows} pageSize={20} />
          </PanelCard>
        </Grid>

        <Section title="ココナラの入口" note={`過去 30 日（${v.coconala.period ?? '未取得'}）。最後の売上 ${v.coconala.lastRevenueAt ?? 'なし'}`}>
          <Grid min="sm">
            <StatCard label="出品中" value={String(v.coconala.listed)} sub={`休止 ${v.coconala.paused}`} />
            <StatCard label="閲覧" value={withUnit(v.coconala.views, '')} />
            <StatCard label="お気に入り" value={withUnit(v.coconala.favorites, '')} />
            <StatCard label="受注" value={withUnit(v.coconala.orders, '')} />
          </Grid>
        </Section>

        <Section title="チャネルの役割・4P・4C" note="4P は売る側の決めごと（商品・価格・売り場・販促）、4C は同じ 4 つを買う側から見直したもの（顧客価値・コスト・利便性・伝え方）">
          <Stack>
            {v.channels.map((c) => (
              <PanelCard key={c.id} title={CHANNEL_LABEL[c.id]} description={c.role}>
                <dl className="grid grid-cols-[6.5em_1fr] gap-x-2 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">売る</dt>
                  <dd>{c.sells.join('・')}</dd>
                  <dt className="text-muted-foreground">売らない</dt>
                  <dd>{c.notSell.join('・')}</dd>
                </dl>
                <div className="mt-3 grid grid-cols-[4em_1fr_1fr] gap-x-3 gap-y-1 text-sm">
                  <span />
                  <span className="text-xs text-muted-foreground">4P（売る側）</span>
                  <span className="text-xs text-muted-foreground">4C（買う側）</span>
                  {(
                    [
                      ['商品', c.fourP.product, c.fourC.customerValue],
                      ['価格', c.fourP.price, c.fourC.cost],
                      ['売り場', c.fourP.place, c.fourC.convenience],
                      ['販促', c.fourP.promotion, c.fourC.communication],
                    ] as const
                  ).map(([label, p, cc]) => (
                    <div key={label} className="contents">
                      <span className="border-t border-border pt-1 text-xs text-muted-foreground">{label}</span>
                      <span className="border-t border-border pt-1">{p}</span>
                      <span className="border-t border-border pt-1">{cc}</span>
                    </div>
                  ))}
                </div>
              </PanelCard>
            ))}
          </Stack>
        </Section>

        <Section title="SWOT">
          <Grid min="md">
            {(
              [
                ['強み（S）', v.swot.strengths],
                ['弱み（W）', v.swot.weaknesses],
                ['機会（O）', v.swot.opportunities],
                ['脅威（T）', v.swot.threats],
              ] as const
            ).map(([title, items]) => (
              <PanelCard key={title} title={title}>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </PanelCard>
            ))}
          </Grid>
        </Section>
      </Stack>
    </>
  );
}
