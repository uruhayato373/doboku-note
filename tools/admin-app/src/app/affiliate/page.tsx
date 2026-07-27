import { PageHead } from '@/components/ui';
import { BarChart, type Bar } from '@/components/charts/BarChart';
import { affiliateSummary } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const yen = (v: number | null) => (v == null ? '—' : '¥' + Number(v).toLocaleString('en-US'));
const num = (v: number | null) => (v == null ? '—' : Number(v).toLocaleString('en-US'));
const epcFmt = (v: number | null) => (v == null ? '—' : '¥' + v.toFixed(1));

export default function AffiliatePage() {
  const {
    collected,
    site,
    period,
    updatedAt,
    lastRun,
    siteTotals,
    programs,
    accountWideMonths,
    accountWideDays,
    crossCheck,
    unmapped,
    notAttributable,
  } = affiliateSummary();

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
            npm run a8-ui:fetch{'\n'}
            npm run a8-ui:normalize -- --latest
          </pre>
        </div>
      </>
    );
  }

  const bars: Bar[] = accountWideMonths.map((m) => ({ label: m.month.slice(2), value: m.clicks ?? 0 }));

  return (
    <>
      <PageHead
        title="アフィリ"
        sub={`${site ?? '—'} · 期間 ${period?.start ?? '?'}〜${period?.end ?? '?'} · 最終取得 ${updatedAt?.slice(0, 16).replace('T', ' ') ?? '—'}`}
      />

      {unmapped.length > 0 ? (
        <div className="card">
          <h2>
            未写像のプログラム
            <span className="sub">
              <span className="badge warn">{unmapped.length} 件</span> 集計から漏れています
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
                  <th>プログラムID</th>
                  <th>プログラム名</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((u) => (
                  <tr key={u.programId ?? u.programRaw}>
                    <td>{u.programId ?? '—'}</td>
                    <td className="wrap">{u.programRaw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {siteTotals ? (
        <div className="card">
          <h2>
            {siteTotals.site} の実績
            <span className="sub">
              サイト別レポート＝<strong>doboku-note に分離された唯一の真実源</strong>
            </span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="num">imp</th>
                  <th className="num">クリック</th>
                  <th className="num">発生</th>
                  <th className="num">発生額</th>
                  <th className="num">確定</th>
                  <th className="num">確定額</th>
                  <th className="num">キャンセル</th>
                  <th className="num">未確定</th>
                  <th className="num">EPC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="num">{num(siteTotals.impressions)}</td>
                  <td className="num">{num(siteTotals.clicks)}</td>
                  <td className="num">{num(siteTotals.conversions)}</td>
                  <td className="num">{yen(siteTotals.grossRevenueYen)}</td>
                  <td className="num">{num(siteTotals.approved)}</td>
                  <td className="num">{yen(siteTotals.revenueYen)}</td>
                  <td className="num">
                    {num(siteTotals.cancelledCount)} / {yen(siteTotals.cancelledYen)}
                  </td>
                  <td className="num">
                    {num(siteTotals.pendingCount)} / {yen(siteTotals.pendingRevenueYen)}
                  </td>
                  <td className="num">{epcFmt(siteTotals.epc)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="sub">
            EPC は「確定額 ÷ クリック」。発生額はキャンセルされると確定額に載らないため、両者の差は要確認。
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>
            サイト別実績なし<span className="sub"><span className="badge bad">要確認</span></span>
          </h2>
          <p>サイト別レポートに {site} の行がありません＝分離された実績を取れていません。</p>
        </div>
      )}

      <div className="card">
        <h2>
          プログラム別
          <span className="sub">
            口座横断レポートから allowlist 抽出（{programs.length} 件）
          </span>
        </h2>
        {crossCheck?.comparable ? (
          <p className="sub">
            検算: 抽出クリック {num(crossCheck.deltas?.clicks?.picked ?? null)} /{' '}
            {num(crossCheck.deltas?.clicks?.site ?? null)}（サイト別）{' '}
            {crossCheck.exceeded ? (
              <span className="badge bad">超過＝stats47 混入の疑い</span>
            ) : (
              <span className="badge good">範囲内</span>
            )}
          </p>
        ) : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>プログラム</th>
                <th className="num">クリック</th>
                <th className="num">発生</th>
                <th className="num">発生額</th>
                <th className="num">確定</th>
                <th className="num">確定額</th>
                <th className="num">EPC</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.programId ?? p.programRaw}>
                  <td className="wrap">
                    <strong>{p.program}</strong>
                    <br />
                    <span className="sub">{p.programRaw}</span>
                  </td>
                  <td className="num">{num(p.clicks)}</td>
                  <td className="num">{num(p.conversions)}</td>
                  <td className="num">{yen(p.grossRevenueYen)}</td>
                  <td className="num">{num(p.approved)}</td>
                  <td className="num">{yen(p.revenueYen)}</td>
                  <td className="num">{epcFmt(p.epc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notAttributable > 0 ? (
          <p className="sub">
            対象期間（{period?.raw ?? '不明'}）が単月でないため、{notAttributable} 件は月次 SSOT
            （a8-results.json）へ未反映です。月次内訳には期間フォーム対応が必要。
          </p>
        ) : null}
      </div>

      {accountWideMonths.length > 0 ? (
        <div className="card">
          <h2>
            月次クリック（口座横断）
            <span className="sub">
              <span className="badge warn">stats47 込み</span> doboku 単独ではない・トレンド把握用
            </span>
          </h2>
          <BarChart bars={bars} />
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>月</th>
                  <th className="num">クリック</th>
                  <th className="num">発生</th>
                  <th className="num">発生額</th>
                  <th className="num">確定額</th>
                </tr>
              </thead>
              <tbody>
                {accountWideMonths
                  .slice()
                  .reverse()
                  .map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td className="num">{num(m.clicks)}</td>
                      <td className="num">{num(m.conversions)}</td>
                      <td className="num">{yen(m.grossRevenueYen)}</td>
                      <td className="num">{yen(m.revenueYen)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {accountWideDays.length > 0 ? (
        <div className="card">
          <h2>
            日別（直近 {accountWideDays.length} 日・口座横断）
            <span className="sub">
              <span className="badge warn">stats47 込み</span> 異常検知用
            </span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>日付</th>
                  <th className="num">クリック</th>
                  <th className="num">発生</th>
                  <th className="num">発生額</th>
                </tr>
              </thead>
              <tbody>
                {accountWideDays.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="num">{num(d.clicks)}</td>
                    <td className="num">{num(d.conversions)}</td>
                    <td className="num">{yen(d.grossRevenueYen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="sub">
        run {lastRun ?? '—'} · 供給は <code>/a8-report</code>（a8-ui:fetch → a8-ui:normalize）
      </p>
    </>
  );
}
