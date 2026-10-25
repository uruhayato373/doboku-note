import Link from 'next/link';
import { TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { cn } from '@/lib/cn';
import { loadKpiView, type KpiCell } from '@/lib/kpi-tree';
import { withUnit } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** トップから開く詳細: KPI ツリーの全指標を資格別に並べる（docs/strategy/15_KPIツリー.md）。 */
/** 階層ごとの字下げ（頂点 / チャネル / 入口）。 */
const INDENT = ['pl-2', 'pl-6', 'pl-10'] as const;

function Cell({ cell, unit }: { cell: KpiCell | undefined; unit: string }) {
  if (!cell || !cell.applicable) return <TableCell className={`${numCol} text-muted-foreground`}>対象外</TableCell>;
  return (
    <TableCell className={numCol}>
      {withUnit(cell.value, unit)}
      {cell.coverage === 'partial' && <span className="text-xs text-muted-foreground">（一部）</span>}
    </TableCell>
  );
}

export default async function KpiTreePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const v = loadKpiView(month);
  return (
    <>
      <PageHead title={`KPI ツリー（${v.month}）`} />
      <Stack>
        <p className="m-0 text-sm"><Link href={`/?month=${v.month}`}>← KPI へ戻る</Link></p>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>指標</TableHead>
              {v.scopes.map((s) => (
                <TableHead key={s.id} className={numCol}>{s.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {v.groups.map((g) => (
            <TableBody key={g.label}>
              <TableRow>
                <TableHead colSpan={v.scopes.length + 1} className="text-left">{g.label}</TableHead>
              </TableRow>
              {g.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className={cn(INDENT[r.depth], r.depth === 0 && 'font-bold')}>{r.label}</TableCell>
                  {v.scopes.map((s) => (
                    <Cell key={s.id} cell={r.cells[s.id]} unit={r.unit} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          ))}
        </TableFrame>
      </Stack>
    </>
  );
}
