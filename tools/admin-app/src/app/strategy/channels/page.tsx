import Link from 'next/link';
import { DataTable, PanelCard, StatCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import SectionTabs from '@/components/SectionTabs';
import { yen } from '@/lib/format';
import { loadChannelView, type ChannelId, type Kpi, type ReceiptStatus } from '@/lib/channels';

export const dynamic = 'force-dynamic';

/**
 * /strategy/channels — チャネル設計（人が見る画面）。数字（KGI・KPI・受取・手取り）／4P・4C／SWOT をタブで切り替える。
 * 組み立ては scripts/lib/channel-economics.mjs（npm run channel-economics と同じ実装）。正本は config/channel-strategy.json、
 * 判断の文章は docs/strategy/22_チャネル別商品設計2026-11.md（手数料の根拠・KPI の理由はここに出さず正本と文書が持つ）。
 */
const CHANNEL_LABEL: Record<ChannelId, string> = { note: 'note', kindle: 'KDP', coconala: 'ココナラ' };
const TABS = [
  { id: 'numbers', label: '数字' },
  { id: 'mix', label: '4P・4C' },
  { id: 'swot', label: 'SWOT' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const withUnit = (v: number | null, unit: string) => (v == null ? '—' : unit === '円' ? yen(v) : `${v.toLocaleString('ja-JP')}${unit}`);
/** 確定していない月の値は薄く出す（確定・途中・推計の区別は正本と CLI が持つ） */
const receipt = (v: number | null, s: ReceiptStatus) => (s === 'final' ? yen(v) : <span className="text-muted-foreground">{yen(v)}</span>);

function kpiTone(k: Kpi): Tone {
  if (k.actual == null) return 'neutral';
  const lowerIsBetter = k.id === 'note-unsold-paid';
  return (lowerIsBetter ? k.actual <= k.target : k.actual >= k.target) ? 'good' : 'warn';
}

const KPI_COLUMNS: DataTableColumn[] = [
  { key: 'channel', label: 'チャネル' },
  { key: 'label', label: 'KPI' },
  { key: 'target', label: '目標', num: true },
  { key: 'actual', label: '実績', num: true },
];
const MONTH_COLUMNS: DataTableColumn[] = [
  { key: 'month', label: '月' },
  { key: 'note', label: 'note', num: true },
  { key: 'kdp', label: 'KDP', num: true },
  { key: 'coconala', label: 'ココナラ', num: true },
  { key: 'total', label: '計', num: true },
];
const UNIT_COLUMNS: DataTableColumn[] = [
  { key: 'item', label: '売り方' },
  { key: 'avgPrice', label: '平均価格', num: true },
  { key: 'netPerSale', label: '1 件の手取り', num: true },
];
const QUAL_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'note', label: 'note', num: true },
  { key: 'kindle', label: 'KDP', num: true },
  { key: 'coconala', label: 'ココナラ', num: true },
];

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current: TabId = TABS.some((t) => t.id === tab) ? (tab as TabId) : 'numbers';
  const v = loadChannelView();

  return (
    <>
      <PageHead title="チャネル設計" />
      <SectionTabs set="market" current="/strategy/channels" />
      <nav className="filterbar mb-3!">
        {TABS.map((t) => (
          <Link key={t.id} className={'chip' + (t.id === current ? ' active' : '')} href={t.id === 'numbers' ? '/strategy/channels' : `/strategy/channels?tab=${t.id}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {current === 'numbers' && <Numbers v={v} />}
      {current === 'mix' && <Mix v={v} />}
      {current === 'swot' && <Swot v={v} />}
    </>
  );
}

type View = ReturnType<typeof loadChannelView>;

function Numbers({ v }: { v: View }) {
  const kpiRows: DataTableRow[] = v.kpis.map((k) => ({
    id: k.id,
    values: { channel: CHANNEL_LABEL[k.channel], label: k.label, target: k.target, actual: k.actual },
    cells: { target: withUnit(k.target, k.unit), actual: <StatusBadge tone={kpiTone(k)}>{withUnit(k.actual, k.unit)}</StatusBadge> },
  }));
  // データの無い月（今月の取得前）は出さない
  const monthRows: DataTableRow[] = v.monthly
    .filter((m) => m.total != null || m.note != null)
    .map((m) => ({
      id: m.month,
      values: { month: m.month, note: m.note, kdp: m.kdp, coconala: m.coconala, total: m.total },
      cells: {
        note: receipt(m.note, m.status.note ?? 'missing'),
        kdp: receipt(m.kdp, m.status.kdp ?? 'missing'),
        coconala: receipt(m.coconala, m.status.coconala ?? 'missing'),
        total: m.complete ? yen(m.total) : <span className="text-muted-foreground">{yen(m.total)}</span>,
      },
    }));
  const unitRows: DataTableRow[] = v.unit.map((u) => ({
    id: u.item,
    values: { item: u.item.replace(/・公開中 \d+ 冊の中央値/, ''), avgPrice: u.avgPrice, netPerSale: u.netPerSale },
    cells: { avgPrice: yen(u.avgPrice), netPerSale: yen(u.netPerSale) },
  }));
  const qualRows: DataTableRow[] = v.byQualification
    .filter((q) => q.note + q.kindle + q.coconala > 0)
    .map((q) => ({
      id: q.id,
      values: { label: q.label, note: q.note, kindle: q.kindle, coconala: q.coconala },
      cells: { note: yen(q.note), kindle: yen(q.kindle), coconala: yen(q.coconala) },
    }));

  return (
    <Stack>
      <Grid min="sm">
        <StatCard label={`受取（${v.kgi.lastFullMonth ?? '—'}）`} value={yen(v.kgi.lastFullTotal)} sub={`目標 ${yen(v.kgi.targetYen)}`} />
        <StatCard label="ココナラ 閲覧（30 日）" value={withUnit(v.coconala.views, '')} />
        <StatCard label="ココナラ 受注（30 日）" value={withUnit(v.coconala.orders, '')} />
        <StatCard label="ココナラ 出品中" value={String(v.coconala.listed)} />
      </Grid>
      <Section title="KPI">
        <DataTable columns={KPI_COLUMNS} rows={kpiRows} pageSize={50} />
      </Section>
      <Section title="月別の受取">
        <DataTable columns={MONTH_COLUMNS} rows={monthRows} pageSize={24} />
      </Section>
      <Grid min="md">
        <Section title="1 件あたりの手取り">
          <DataTable columns={UNIT_COLUMNS} rows={unitRows} pageSize={20} />
        </Section>
        <Section title="資格 × チャネルの手取り">
          <DataTable columns={QUAL_COLUMNS} rows={qualRows} pageSize={20} />
        </Section>
      </Grid>
    </Stack>
  );
}

function Mix({ v }: { v: View }) {
  return (
    <Stack>
      {v.channels.map((c) => (
        <PanelCard key={c.id} title={CHANNEL_LABEL[c.id]}>
          <div className="grid grid-cols-[4em_1fr_1fr] gap-x-3 gap-y-1 text-sm">
            <span />
            <span className="text-xs text-muted-foreground">4P</span>
            <span className="text-xs text-muted-foreground">4C</span>
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
  );
}

function Swot({ v }: { v: View }) {
  return (
    <Grid min="md">
      {(
        [
          ['強み', v.swot.strengths],
          ['弱み', v.swot.weaknesses],
          ['機会', v.swot.opportunities],
          ['脅威', v.swot.threats],
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
  );
}
