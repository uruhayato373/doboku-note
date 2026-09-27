import Link from 'next/link';
import MetricsOverview from '@/components/MetricsOverview';
import { PageHead } from '@/components/ui';
import { loadKpiView, type KpiCell } from '@/lib/kpi-tree';

export const dynamic = 'force-dynamic';

/**
 * トップ = KPI。月の受取額（NSM）と目標の差、KPI ツリー（docs/strategy/15_KPIツリー.md）を資格別に出す。
 * 期間は暦月（?month=YYYY-MM・既定は直近の完了月）。下に集客の推移とデータの更新（旧 /metrics）。
 */
const fmt = (v: number | null, unit: string) =>
  v == null ? '—' : unit === '円' ? `¥${v.toLocaleString('ja-JP')}` : `${v.toLocaleString('ja-JP')}${unit === '%' ? '%' : ''}`;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function Cell({ cell, unit }: { cell: KpiCell | undefined; unit: string }) {
  if (!cell || !cell.applicable) return <td className="num muted">対象外</td>;
  return (
    <td className="num">
      {fmt(cell.value, unit)}
      {cell.coverage === 'partial' && <span className="small muted">（一部）</span>}
    </td>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const v = loadKpiView(month);
  const rate = v.receipts != null && v.goal ? v.receipts / v.goal.value : null;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const next = shiftMonth(v.month, 1);

  return (
    <>
      <PageHead title="KPI" sub={`${v.period.startDate} 〜 ${v.period.endDate}`} />
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <Link className="chip" href={`/?month=${shiftMonth(v.month, -1)}`}>← 前の月</Link>
        <span className="chip active">{v.month}</span>
        {next < thisMonth && <Link className="chip" href={`/?month=${next}`}>次の月 →</Link>}
      </nav>

      <div className="card">
        <h2>月の受取額（手数料控除後）</h2>
        <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>
          {fmt(v.receipts, '円')}
          {v.goal && <span className="small muted"> / 目標 ¥{v.goal.value.toLocaleString('ja-JP')}</span>}
        </p>
        {rate != null && (
          <>
            <div style={{ height: 8, background: 'var(--line, #ddd)', borderRadius: 4, overflow: 'hidden', maxWidth: 480 }}>
              <div style={{ width: `${Math.min(rate, 1) * 100}%`, height: '100%', background: rate >= 1 ? 'var(--good)' : 'var(--warn, #c80)' }} />
            </div>
            <p className="small">達成率 {Math.round(rate * 100)}%{v.goal && v.goal.effectiveDate > v.period.startDate ? `（目標は ${v.goal.effectiveDate} から適用）` : ''}</p>
          </>
        )}
        {v.receipts == null && <p className="small muted">この月の受取額は未記録</p>}
      </div>

      <div className="card">
        <h2>KPI ツリー</h2>
        <div className="table-wrap">
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
        <p className="small muted">
          <Link href="/metrics/business?cadence=monthly">月次レビュー</Link> ・ <Link href="/sales">売上明細</Link> ・ <Link href="/metrics/gsc">検索</Link> ・ <Link href="/metrics/ga4">アクセス</Link>
        </p>
      </div>

      <h2 style={{ margin: '24px 0 8px' }}>集客の推移とデータの更新</h2>
      <MetricsOverview />
    </>
  );
}
