import { DataTable, PanelCard, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { yen } from '@/lib/format';
import { salesSummary } from '@/lib/sales';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '商品', wrap: true },
  { key: 'count', label: '件数', num: true },
  { key: 'revenue', label: '売上', num: true },
];

export default function SalesPage() {
  const { months, total } = salesSummary();

  const bars: Bar[] = months.map((m) => ({
    label: m.month.slice(2),
    value: m.revenue,
  }));

  return (
    <>
      <PageHead
        title="note売上の登録実績"
        sub={`累計 ${yen(total.revenue)} / ${total.count} 件 / ${total.months} ヶ月`}
      />

      <Stack>
      <PanelCard title="月次売上推移">
        <BarChart bars={bars} />
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
