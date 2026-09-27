import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { loadKpiView, type KpiCell } from '@/lib/kpi-tree';

export const dynamic = 'force-dynamic';

/** トップから開く詳細: KPI ツリーの全指標を資格別に並べる（docs/strategy/15_KPIツリー.md）。 */
const fmt = (v: number | null, unit: string) =>
  v == null ? '—' : unit === '円' ? `¥${v.toLocaleString('ja-JP')}` : `${v.toLocaleString('ja-JP')}${unit === '%' ? '%' : ''}`;

function Cell({ cell, unit }: { cell: KpiCell | undefined; unit: string }) {
  if (!cell || !cell.applicable) return <td className="num muted">対象外</td>;
  return (
    <td className="num">
      {fmt(cell.value, unit)}
      {cell.coverage === 'partial' && <span className="small muted">（一部）</span>}
    </td>
  );
}

export default async function KpiTreePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const v = loadKpiView(month);
  return (
    <>
      <PageHead title={`KPI ツリー（${v.month}）`} />
      <p className="small"><Link href={`/?month=${v.month}`}>← KPI へ戻る</Link></p>
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>指標</th>
              {v.scopes.map((s) => (
                <th key={s.id} className="num">{s.label}</th>
              ))}
            </tr>
          </thead>
          {v.groups.map((g) => (
            <tbody key={g.label}>
              <tr>
                <th colSpan={v.scopes.length + 1} style={{ textAlign: 'left' }}>{g.label}</th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingLeft: r.depth * 16 + 8, fontWeight: r.depth === 0 ? 700 : undefined }}>{r.label}</td>
                  {v.scopes.map((s) => (
                    <Cell key={s.id} cell={r.cells[s.id]} unit={r.unit} />
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}
