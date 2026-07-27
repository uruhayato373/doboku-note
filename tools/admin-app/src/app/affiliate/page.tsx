import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { affiliateSummary } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const yen = (n: number | null) => (n == null ? '—' : '¥' + Number(n).toLocaleString('en-US'));
const epcFmt = (n: number | null) => (n == null ? '—' : '¥' + n.toFixed(1));
const numFmt = (n: number | null) => (n == null ? '—' : Number(n).toLocaleString('en-US'));

export default function AffiliatePage() {
  const { collected, site, updatedAt, lastRun, months, recentDays, unmapped, total } = affiliateSummary();

  if (!collected) {
    return (
      <>
        <PageHead title="アフィリ" sub="A8 成果（.claude/state/metrics/affiliate/a8-report-log.json）" />
        <div className="card">
          <h2>未収集</h2>
          <p>
            A8 レポートがまだ取り込まれていません。<code>/a8-report</code> スキル、または以下で収集してください。
          </p>
          <pre>
            npm run a8-ui:fetch -- --dry-run{'\n'}
            npm run a8-ui:fetch{'\n'}
            npm run a8-ui:normalize -- --latest
          </pre>
          <p className="sub">
            A8 口座は stats47 と共用のため、doboku-note のサイト帰属を assert できない場合は
            意図的に取り込みを中止します（stats47 の混入防止）。
          </p>
        </div>
      </>
    );
  }

  const bars: Bar[] = months.map((m) => ({ label: m.month.slice(2), value: m.revenueYen }));

  return (
    <>
      <PageHead
        title="アフィリ"
        sub={`${site ?? '—'} · 累計 ${yen(total.revenueYen)} / ${numFmt(total.clicks)} クリック / EPC ${epcFmt(total.epc)}`}
      />

      {unmapped.length > 0 ? (
        <div className="card">
          <h2>
            未写像のプログラム
            <span className="sub">
              <span className="badge warn">{unmapped.length} 件</span> a8-results.json へ未反映
            </span>
          </h2>
          <p className="sub">
            <code>.claude/config/a8-report-automation.json</code> の <code>a8.programIdMap</code> に追記して
            <code>npm run a8-ui:normalize -- --latest</code> を再実行してください。
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>月</th>
                  <th>プログラム名（A8 表記）</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((u) => (
                  <tr key={`${u.month}-${u.programRaw}`}>
                    <td>{u.month}</td>
                    <td className="wrap">{u.programRaw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2>
          月次 確定報酬
          <span className="sub">
            最終更新 {updatedAt ?? '—'} · run {lastRun ?? '—'}
          </span>
        </h2>
        <BarChart bars={bars} />
      </div>

      {months
        .slice()
        .reverse()
        .map((m) => (
          <div className="card" key={m.month}>
            <h2>
              {m.month}　{yen(m.revenueYen)}
              <span className="sub">
                {numFmt(m.clicks)} クリック / 発生 {numFmt(m.conversions)} / 確定 {numFmt(m.approved)} / EPC{' '}
                {epcFmt(m.epc)}
              </span>
            </h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>プログラム</th>
                    <th className="num">クリック</th>
                    <th className="num">発生</th>
                    <th className="num">確定</th>
                    <th className="num">確定報酬</th>
                    <th className="num">EPC</th>
                  </tr>
                </thead>
                <tbody>
                  {m.programs.map((p) => (
                    <tr key={p.programRaw}>
                      <td className="wrap">
                        {p.programRaw}
                        {p.program ? null : <span className="badge warn">未写像</span>}
                      </td>
                      <td className="num">{numFmt(p.clicks)}</td>
                      <td className="num">{numFmt(p.conversions)}</td>
                      <td className="num">{numFmt(p.approved)}</td>
                      <td className="num">{yen(p.revenueYen)}</td>
                      <td className="num">{epcFmt(p.epc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {recentDays.length > 0 ? (
        <div className="card">
          <h2>
            日別（直近 31 日）
            <span className="sub">異常検知用</span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>日付</th>
                  <th className="num">クリック</th>
                  <th className="num">発生</th>
                  <th className="num">確定報酬</th>
                </tr>
              </thead>
              <tbody>
                {recentDays.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="num">{numFmt(d.clicks)}</td>
                    <td className="num">{numFmt(d.conversions)}</td>
                    <td className="num">{yen(d.revenueYen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
