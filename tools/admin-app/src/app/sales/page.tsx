import Link from 'next/link';
import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { salesSummary } from '@/lib/sales';

export const dynamic = 'force-dynamic';

const yen = (n: number) => '¥' + Number(n).toLocaleString('en-US');

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
        sub={`累計 ${yen(total.revenue)} / ${total.count} 件 / ${total.months} ヶ月 · data/sales/sales-log.json`}
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
            <TableFrame>
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead className={numCol}>件数</TableHead>
                  <TableHead className={numCol}>売上</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.products.map((p) => (
                  <TableRow key={p.title}>
                    <TableCell className="whitespace-normal">{p.title}</TableCell>
                    <TableCell className={numCol}>{p.count}</TableCell>
                    <TableCell className={numCol}>{yen(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableFrame>
          </PanelCard>
        ))}
      </Stack>
    </>
  );
}
