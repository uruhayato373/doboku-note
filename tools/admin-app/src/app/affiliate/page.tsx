import { EmptyRow, numCol, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead, Kpi } from '@/components/ui';
import { affiliateSummary, affiliatePlacements, affiliateExperiments } from '@/lib/affiliate';

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
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>配置</TableHead>
              <TableHead className={numCol}>表示</TableHead>
              <TableHead className={numCol}>クリック</TableHead>
              <TableHead className={numCol}>率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.rows.map((r) => (
              <TableRow key={r.placement}>
                <TableCell>
                  {r.label}{' '}
                  {r.retired && <StatusBadge tone="neutral">撤去{r.retiredAt ? ` ${md(r.retiredAt)}` : ''}</StatusBadge>}
                </TableCell>
                <TableCell className={numCol}>{num(r.impressions)}</TableCell>
                <TableCell className={numCol + (!r.retired && r.clicks === 0 && r.impressions >= 1000 ? ' project-warning-text' : '')}>{r.clicks}</TableCell>
                <TableCell className={numCol}>{rate(r.clicks, r.impressions)}</TableCell>
              </TableRow>
            ))}
            {placements.rows.length === 0 && <EmptyRow colSpan={4}>未計測（fetch-metrics が週次で生成）</EmptyRow>}
          </TableBody>
        </TableFrame>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>
                A8 案件 {period?.singleMonth ?? ''} {crossCheckBadge && <StatusBadge tone={crossCheckBadge.tone}>{crossCheckBadge.text}</StatusBadge>}
              </TableHead>
              <TableHead className={numCol}>発生</TableHead>
              <TableHead className={numCol}>確定</TableHead>
              <TableHead className={numCol}>確定額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.programId ?? p.programRaw}>
                <TableCell>{p.program}</TableCell>
                <TableCell className={numCol}>{num(p.conversions)}</TableCell>
                <TableCell className={numCol}>{num(p.approved)}</TableCell>
                <TableCell className={numCol}>{yen(p.revenueYen)}</TableCell>
              </TableRow>
            ))}
            {programs.length === 0 && <EmptyRow colSpan={4}>{collected ? '該当なし' : '未取得（login-collectors の a8）'}</EmptyRow>}
          </TableBody>
        </TableFrame>
      </div>

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>A8 月別（直近 3 か月）</TableHead>
            <TableHead>掲載先</TableHead>
            <TableHead className={numCol}>クリック</TableHead>
            <TableHead className={numCol}>発生</TableHead>
            <TableHead className={numCol}>確定</TableHead>
            <TableHead className={numCol}>未確定</TableHead>
            <TableHead className={numCol}>取消</TableHead>
            <TableHead className={numCol}>確定額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {siteMonths.map((r) => (
            <TableRow key={`${r.month}-${r.label}`}>
              <TableCell>{r.month}</TableCell>
              <TableCell>{r.label}</TableCell>
              <TableCell className={numCol}>{num(r.clicks)}</TableCell>
              <TableCell className={numCol}>{num(r.conversions)}</TableCell>
              <TableCell className={numCol}>{num(r.approved)}</TableCell>
              <TableCell className={numCol}>{num(r.pendingCount)}</TableCell>
              <TableCell className={numCol}>{num(r.cancelledCount)}</TableCell>
              <TableCell className={numCol}>{yen(r.revenueYen)}</TableCell>
            </TableRow>
          ))}
          {siteMonths.length === 0 && <EmptyRow colSpan={8}>{collected ? '単月の取得なし' : '未取得（login-collectors の a8）'}</EmptyRow>}
        </TableBody>
      </TableFrame>
    </>
  );
}
