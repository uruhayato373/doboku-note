import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { salesSummary } from '@/lib/sales';

export const dynamic = 'force-dynamic';

const yen = (n: number) => '¥' + Number(n).toLocaleString('en-US');

export default function SalesPage() {
  const { months, total, source, updatedAt, milestone } = salesSummary();

  const bars: Bar[] = months.map((m) => ({
    label: m.month.slice(2),
    value: m.revenue,
    highlight: m.milestone,
  }));

  return (
    <>
      <PageHead
        title="売上"
        sub={`累計 ${yen(total.revenue)} / ${total.count} 件 / ${total.months} ヶ月 · .claude/state/sales/sales-log.json`}
      />

      <div className="card">
        <h2>
          月次売上推移
          <span className="sub">
            真実源 {source ?? '—'} · 最終更新 {updatedAt ?? '—'}
          </span>
        </h2>
        <BarChart bars={bars} milestone={milestone} milestoneLabel={`${yen(milestone)} マイルストーン`} />
      </div>

      {months
        .slice()
        .reverse()
        .map((m) => (
          <div className="card" key={m.month}>
            <h2>
              {m.month}　{yen(m.revenue)}
              <span className="sub">
                {m.count} 件 {m.milestone ? <span className="badge good">¥15k 達成</span> : null}
              </span>
            </h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th className="num">件数</th>
                    <th className="num">売上</th>
                  </tr>
                </thead>
                <tbody>
                  {m.products.map((p) => (
                    <tr key={p.title}>
                      <td className="wrap">{p.title}</td>
                      <td className="num">{p.count}</td>
                      <td className="num">{yen(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </>
  );
}
