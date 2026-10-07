import { DataTable, StatusBadge } from '@/components/admin';
import { PageHead, Kpi } from '@/components/ui';
import { affiliateSummary, affiliatePlacements, affiliateExperiments, affiliateRules } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const yen = (v: number | null) => (v == null ? '—' : '¥' + Number(v).toLocaleString('en-US'));
const num = (v: number | null) => (v == null ? '—' : Number(v).toLocaleString('en-US'));
const rate = (c: number, i: number) => (i ? `${((c / i) * 100).toFixed(2)}%` : '—');
const md = (d: string) => d.slice(5).replace('-', '/');

/**
 * /affiliate — 人が月に一度見る最小限。改善の判断はサイト内の配置別クリック（GA4）で行い、
 * A8 は成果（発生・確定）だけを見る（A8 のクリックは stats47 と同居の口座なので分母に使わない）。
 * 配置の名前と撤去は config/cta-placements.json、数字は data/analysis/career-funnel.json（週次 CI）と data/a8/report-log.json。
 */
export default function AffiliatePage() {
  const { collected, period, surfaceTotals, programs, missingPrograms, siteMonths, crossCheckBadge } = affiliateSummary();
  const got = surfaceTotals.filter((x) => x.collected);
  const sumOf = (f: 'conversions' | 'revenueYen') => (got.length ? got.reduce((a, x) => a + (x[f] ?? 0), 0) : null);
  const placements = affiliatePlacements();
  const experiments = affiliateExperiments();
  const rules = affiliateRules();
  const active = placements.rows.filter((r) => !r.retired);
  const clicks = active.reduce((s, r) => s + r.clicks, 0);
  const imps = active.reduce((s, r) => s + r.impressions, 0);

  return (
    <>
      <PageHead title="アフィリエイト" />
      <div className="grid cols-4" style={{ marginBottom: 12 }}>
        <Kpi label={placements.window ? `サイト内クリック ${md(placements.window.start)}〜${md(placements.window.end)}` : 'サイト内クリック'} value={placements.rows.length ? clicks : '—'} />
        <Kpi label="クリック率（今の配置）" value={rate(clicks, imps)} />
        <Kpi label={`A8 発生 ${period?.singleMonth ?? ''}`} value={collected ? num(sumOf('conversions')) : '—'} />
        <Kpi label={`A8 確定額 ${period?.singleMonth ?? ''}`} value={collected ? yen(sumOf('revenueYen')) : '—'} />
      </div>

      {(experiments.length > 0 || missingPrograms.length > 0 || placements.stale) && (
        <p className="small" style={{ marginBottom: 12 }}>
          {experiments.map((x) => (
            <span key={x.id} style={{ marginRight: 16 }}>
              次の判定 {x.nextCheck ? md(x.nextCheck) : '未設定'}（{x.id}）
            </span>
          ))}
          {placements.stale && <StatusBadge tone="warn">配置別の集計が古い</StatusBadge>}{' '}
          {missingPrograms.length > 0 && <span className="project-warning-text">A8 集計から漏れている案件 {missingPrograms.length} 件</span>}
        </p>
      )}

      <div className="grid cols-2">
        <DataTable
          columns={[
            { key: 'label', label: '配置' },
            { key: 'impressions', label: '表示', num: true },
            { key: 'clicks', label: 'クリック', num: true },
            { key: 'rate', label: '率', num: true },
          ]}
          rows={placements.rows.map((r) => ({
            id: r.placement,
            values: { label: r.label, impressions: r.impressions, clicks: r.clicks, rate: r.impressions ? r.clicks / r.impressions : null },
            cells: {
              label: (
                <>
                  {r.label}{' '}
                  {r.retired && <StatusBadge tone="neutral">撤去{r.retiredAt ? ` ${md(r.retiredAt)}` : ''}</StatusBadge>}
                </>
              ),
              clicks: <span className={!r.retired && r.clicks === 0 && r.impressions >= 1000 ? 'project-warning-text' : undefined}>{r.clicks}</span>,
              rate: rate(r.clicks, r.impressions),
            },
          }))}
          emptyText="未計測（fetch-metrics が週次で生成）"
        />
        <DataTable
          columns={[
            {
              key: 'program',
              label: (
                <>
                  A8 案件 {period?.singleMonth ?? ''} {crossCheckBadge && <StatusBadge tone={crossCheckBadge.tone}>{crossCheckBadge.text}</StatusBadge>}
                </>
              ),
            },
            { key: 'conversions', label: '発生', num: true },
            { key: 'approved', label: '確定', num: true },
            { key: 'revenueYen', label: '確定額', num: true },
          ]}
          rows={programs.map((p) => ({
            id: p.programId ?? p.programRaw,
            values: { program: p.program, conversions: p.conversions, approved: p.approved, revenueYen: p.revenueYen },
            cells: { revenueYen: yen(p.revenueYen) },
          }))}
          emptyText={collected ? '該当なし' : '未取得（login-collectors の a8）'}
        />
      </div>

      <DataTable
        columns={[
          { key: 'month', label: 'A8 月別（直近 3 か月）' },
          { key: 'site', label: '掲載先' },
          { key: 'clicks', label: 'クリック', num: true },
          { key: 'conversions', label: '発生', num: true },
          { key: 'approved', label: '確定', num: true },
          { key: 'pendingCount', label: '未確定', num: true },
          { key: 'cancelledCount', label: '取消', num: true },
          { key: 'revenueYen', label: '確定額', num: true },
        ]}
        rows={siteMonths.map((r) => ({
          id: `${r.month}-${r.label}`,
          values: {
            month: r.month,
            site: r.label,
            clicks: r.clicks,
            conversions: r.conversions,
            approved: r.approved,
            pendingCount: r.pendingCount,
            cancelledCount: r.cancelledCount,
            revenueYen: r.revenueYen,
          },
          cells: { revenueYen: yen(r.revenueYen) },
        }))}
        emptyText={collected ? '単月の取得なし' : '未取得（login-collectors の a8）'}
      />

      <DataTable
        columns={[
          { key: 'ruleId', label: `配置ルール${placements.window ? ` ${md(placements.window.start)}〜${md(placements.window.end)}` : ''}` },
          { key: 'program', label: '案件' },
          { key: 'slot', label: '面' },
          { key: 'impressions', label: '表示', num: true },
          { key: 'clicks', label: 'クリック', num: true },
          { key: 'rate', label: '率', num: true },
        ]}
        rows={rules.map((r) => ({
          id: r.ruleId,
          values: {
            ruleId: r.ruleId,
            program: r.program,
            slot: r.slotLabel,
            impressions: r.impressions,
            clicks: r.clicks,
            rate: r.impressions ? r.clicks / r.impressions : null,
          },
          cells: {
            ruleId: (
              <>
                {r.ruleId}{' '}
                {!r.open && <StatusBadge tone="neutral">終了</StatusBadge>}{' '}
                {r.partial && <StatusBadge tone="info" title="窓の一部の日だけ有効。窓の残りの日の数字も混ざる">窓の一部</StatusBadge>}{' '}
                {r.sharedWith.length > 0 && <StatusBadge tone="info" title={`同じ面を分け合ったルール: ${r.sharedWith.join('・')}（数字はそれらとの合計）`}>面を共有</StatusBadge>}
              </>
            ),
            rate: rate(r.clicks, r.impressions),
          },
        }))}
        filter="ルール・案件・面で絞り込み"
        emptyText="未計測（fetch-metrics が週次で生成）"
      />
    </>
  );
}
