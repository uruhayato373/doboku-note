import { PageHead, Kpi } from '@/components/ui';
import { affiliateSummary, affiliatePlacements, affiliateExperiments } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const yen = (v: number | null) => (v == null ? '—' : '¥' + Number(v).toLocaleString('en-US'));
const num = (v: number | null) => (v == null ? '—' : Number(v).toLocaleString('en-US'));
const rate = (c: number, i: number) => (i ? `${((c / i) * 100).toFixed(2)}%` : '—');
const md = (d: string) => d.slice(5).replace('-', '/');

const PLACEMENT_LABELS: Record<string, string> = {
  sidebar: '記事サイドバー',
  'article-inline': '本文中',
  'article-mid': '本文中間',
  'article-end': '記事末',
  'category-sidebar': 'カテゴリ サイドバー',
  'category-mobile': 'カテゴリ モバイル',
  'category-career-section': 'カテゴリ キャリア欄',
};

/**
 * /affiliate — 人が月に一度見る最小限。改善の判断はサイト内の配置別クリック（GA4）で行い、
 * A8 は成果（発生・確定）だけを見る（A8 のクリックは stats47 と同居の口座なので分母に使わない）。
 * 口座横断の月別・日別、検算、未写像の一覧は週次レビュー（check-a8-report-due）が見る。
 */
export default function AffiliatePage() {
  const { collected, period, surfaceTotals, programs, unmapped } = affiliateSummary();
  const got = surfaceTotals.filter((x) => x.collected);
  const sumOf = (f: 'conversions' | 'revenueYen') => (got.length ? got.reduce((a, x) => a + (x[f] ?? 0), 0) : null);
  const placements = affiliatePlacements();
  const experiments = affiliateExperiments();
  const clicks = placements.rows.reduce((s, r) => s + r.clicks, 0);
  const imps = placements.rows.reduce((s, r) => s + r.impressions, 0);

  return (
    <>
      <PageHead title="アフィリエイト" />
      <div className="grid cols-4" style={{ marginBottom: 12 }}>
        <Kpi label={placements.window ? `サイト内クリック ${md(placements.window.start)}〜${md(placements.window.end)}` : 'サイト内クリック'} value={placements.rows.length ? clicks : '—'} />
        <Kpi label="クリック率" value={rate(clicks, imps)} />
        <Kpi label={`A8 発生 ${period?.singleMonth ?? ''}`} value={collected ? num(sumOf('conversions')) : '—'} />
        <Kpi label={`A8 確定額 ${period?.singleMonth ?? ''}`} value={collected ? yen(sumOf('revenueYen')) : '—'} />
      </div>

      {surfaceTotals.length > 1 && (
        <p className="small" style={{ marginBottom: 4 }}>
          A8 内訳{' '}
          {surfaceTotals.map((x) => (
            <span key={x.site} style={{ marginRight: 16 }}>
              {x.label}: {x.collected ? `発生 ${num(x.conversions)}・確定 ${yen(x.revenueYen)}` : '未取得'}
            </span>
          ))}
        </p>
      )}
      {(experiments.length > 0 || unmapped.length > 0) && (
        <p className="small" style={{ marginBottom: 12 }}>
          {experiments.map((x) => (
            <span key={x.id} style={{ marginRight: 16 }}>
              次の判定 {x.nextCheck ? md(x.nextCheck) : '未設定'}（{x.id}）
            </span>
          ))}
          {unmapped.length > 0 && <span className="project-warning-text">A8 集計から漏れている案件 {unmapped.length} 件</span>}
        </p>
      )}

      <div className="grid cols-2">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>配置</th>
                <th className="num">表示</th>
                <th className="num">クリック</th>
                <th className="num">率</th>
              </tr>
            </thead>
            <tbody>
              {placements.rows.map((r) => (
                <tr key={r.placement}>
                  <td>{PLACEMENT_LABELS[r.placement] ?? r.placement}</td>
                  <td className="num">{num(r.impressions)}</td>
                  <td className={'num' + (r.clicks === 0 && r.impressions >= 1000 ? ' project-warning-text' : '')}>{r.clicks}</td>
                  <td className="num">{rate(r.clicks, r.impressions)}</td>
                </tr>
              ))}
              {placements.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">未計測（npm run report-career-funnel）</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>A8 案件 {period?.singleMonth ?? ''}</th>
                <th className="num">発生</th>
                <th className="num">確定</th>
                <th className="num">確定額</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.programId ?? p.programRaw}>
                  <td>{p.program}</td>
                  <td className="num">{num(p.conversions)}</td>
                  <td className="num">{num(p.approved)}</td>
                  <td className="num">{yen(p.revenueYen)}</td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">{collected ? '該当なし' : '未取得（/a8-report）'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
