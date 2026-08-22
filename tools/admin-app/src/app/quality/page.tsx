import { PageHead } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import { qualitySummary, qualityCensus, type Severity } from '@/lib/quality';

export const dynamic = 'force-dynamic';

const sevClass = (s: Severity | string) => (s === 'HIGH' ? 'bad' : s === 'LOW' ? 'neutral' : 'warn');

export default function QualityPage() {
  const data = qualitySummary();
  const census = qualityCensus();
  const { totals, articleCount, byRule, history, window: win } = data;

  const burndown = (() => {
    const byDate: Record<string, (typeof history)[number]> = {};
    for (const h of history) byDate[h.date] = h;
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ label: p.date.slice(5), value: p.violations }));
  })();

  const winStr = win ? `${win.start}〜${win.end}` : '';

  return (
    <>
      <PageHead
        title="品質概観"
        sub={`違反のある記事 ${articleCount} 件 · 全体傾向とルール別内訳（人気集計期間 ${winStr}）· 記事別品質は「サイト記事」に統合`}
      />

      {/* 採点カバレッジ census */}
      <div className="card">
        <h2>採点カバレッジ（census）</h2>
        {!census.present ? (
          <div className="small muted">
            未生成。<code>npm run quality-census</code> を実行すると資格 × group の採点率が出ます。
          </div>
        ) : (
          <div className="small muted">
            全 published <b>{(census.totals as Record<string, number>)?.total ?? '—'}</b> 件 · 採点済み{' '}
            <b>{(census.totals as Record<string, number>)?.scored ?? '—'}</b>（
            {(census.totals as Record<string, number>)?.coverage_pct ?? '—'}%） · 未採点{' '}
            {(census.totals as Record<string, number>)?.unscored ?? '—'} · 不合格{' '}
            {(census.totals as Record<string, number>)?.failed ?? '—'} · 薄層{' '}
            {(census.totals as Record<string, number>)?.thin ?? '—'} · rewrite queue {census.rewrite_queue_count} 件 · 生成{' '}
            {(census.generated_at ?? '').slice(0, 10)}
          </div>
        )}
      </div>

      {/* 違反サマリ */}
      <div className="card">
        <h2>違反サマリ</h2>
        <div className="filterbar">
          <span className="badge bad">HIGH {totals.HIGH ?? 0}</span>
          <span className="badge warn">MEDIUM {totals.MEDIUM ?? 0}</span>
          <span className="badge neutral">LOW {totals.LOW ?? 0}</span>
        </div>
        <p className="small muted">
          対象 = fullScan ルール（表/入れ子/段落/見出し/文体）の baseline。更新は{' '}
          <code>npm run check-content-quality</code> → <code>update-content-quality-baseline</code>
        </p>
      </div>

      {/* 違反バーンダウン */}
      <div className="card">
        <h2>
          違反バーンダウン<span className="sub">history.jsonl · {burndown.length} 点</span>
        </h2>
        {burndown.length >= 2 ? (
          <LineChart points={burndown} color="var(--accent)" />
        ) : (
          <div className="small muted">
            履歴 {burndown.length} 点。<code>npm run quality-snapshot</code> を週次で回すとバーンダウンが出ます。
          </div>
        )}
      </div>

      {/* ルール別 */}
      <div className="card">
        <h2>ルール別（違反の内訳）</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ルール</th>
                <th>重大度</th>
                <th className="num">記事数</th>
                <th className="num">違反数</th>
              </tr>
            </thead>
            <tbody>
              {byRule.map((r) => (
                <tr key={r.rule}>
                  <td>
                    <span className={'badge ' + sevClass(r.severity)}>{r.rule}</span>
                  </td>
                  <td>{r.severity}</td>
                  <td className="num">{r.files}</td>
                  <td className="num">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
