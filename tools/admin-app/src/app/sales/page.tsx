import Link from 'next/link';
import { DataTable, PanelCard, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { yen } from '@/lib/format';
import { salesSummary } from '@/lib/sales';
import { datasetPath } from '../../../../../scripts/lib/datasets.mjs';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '商品', wrap: true },
  { key: 'count', label: '件数', num: true },
  { key: 'revenue', label: '売上', num: true },
];

export default function SalesPage() {
  const { months, total, source, updatedAt } = salesSummary();

  const bars: Bar[] = months.map((m) => ({
    label: m.month.slice(2),
    value: m.revenue,
  }));

  return (
    <>
      <PageHead
        title="note売上の登録実績"
        sub={`累計 ${yen(total.revenue)} / ${total.count} 件 / ${total.months} ヶ月 · ${datasetPath('note.sales')}`}
      />

      <Stack>
      <PanelCard title="月次売上推移" description={`真実源 ${source ?? '—'} · 最終更新 ${updatedAt ?? '—'}`}>
        <Stack gap="sm">
        <p className="m-0 text-sm">台帳に登録された販売額です。手数料控除後の受取や利益ではありません。目標と資格別の判断は <Link href="/metrics/business/monthly">月次レビュー</Link> で管理します。</p>
        <BarChart bars={bars} />
        </Stack>
      </PanelCard>

      {months
        .slice()
        .reverse()
        .map((m) => (
          <PanelCard key={m.month} title={`${m.month}　${yen(m.revenue)}`} description={`${m.count} 件`}>
            <DataTable
              columns={COLUMNS}
              rows={m.products.map(
                (p): DataTableRow => ({
                  id: p.title,
                  values: { title: p.title, count: p.count, revenue: p.revenue },
                  cells: { revenue: yen(p.revenue) },
                }),
              )}
              pageSize={100}
            />
          </PanelCard>
        ))}
      </Stack>
    </>
  );
}
