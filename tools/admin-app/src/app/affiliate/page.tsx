import { DataTable, PanelCard, StatusBadge } from '@/components/admin';
import { Grid, Stack } from '@/components/layout';
import { PageHead, Kpi } from '@/components/ui';
import { affiliateSummary, affiliatePlacements, affiliateExperiments, affiliateRules, affiliateClickLog, affiliateConversions } from '@/lib/affiliate';

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
  const { rows: rules, window: ruleWindow, unattributed } = affiliateRules();
  const clickLog = affiliateClickLog();
  const conversions = affiliateConversions();
  const active = placements.rows.filter((r) => !r.retired);
  const clicks = active.reduce((s, r) => s + r.clicks, 0);
  const imps = active.reduce((s, r) => s + r.impressions, 0);
  const win = placements.window ? `${md(placements.window.start)}〜${md(placements.window.end)}` : null;
  const month = period?.singleMonth ?? '';
  // ページ別から数えた窓は、ルールごとに数字が分かれている（面の合計ではない）
  const byPage = ruleWindow?.source === 'page';
  const ruleWin = ruleWindow ? `${md(ruleWindow.start)}〜${md(ruleWindow.end)}` : null;
  // 面の合計の窓で全ルールが窓の途中から有効なら、行ごとの印は情報にならないので説明へ出す
  const allPartial = !byPage && rules.length > 0 && rules.every((r) => r.partial);
  const nextChecks = experiments.map((x) => `次の判定 ${x.nextCheck ? md(x.nextCheck) : '未設定'}（${x.id}）`).join('・');

  return (
    <>
      <PageHead title="アフィリエイト" sub={nextChecks || undefined} />
      <Stack gap="lg">
        <Grid min="sm">
          <Kpi label={win ? `サイト内クリック ${win}` : 'サイト内クリック'} value={placements.rows.length ? clicks : '—'} />
          <Kpi label="クリック率（今の配置）" value={rate(clicks, imps)} />
          <Kpi label={`A8 発生 ${month}`} value={collected ? num(sumOf('conversions')) : '—'} />
          <Kpi label={`A8 確定額 ${month}`} value={collected ? yen(sumOf('revenueYen')) : '—'} />
        </Grid>

        <Grid min="lg">
          <PanelCard
            title="配置別（サイト内）"
            description={
              <>
                GA4 {win ?? '未計測'}{' '}
                {placements.stale && <StatusBadge tone="warn">集計が古い</StatusBadge>}
              </>
            }
          >
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
          </PanelCard>

          <PanelCard
            title="A8 案件別"
            description={
              <>
                {month || '未取得'}{' '}
                {crossCheckBadge && <StatusBadge tone={crossCheckBadge.tone}>{crossCheckBadge.text}</StatusBadge>}{' '}
                {missingPrograms.length > 0 && <StatusBadge tone="warn">集計から漏れた案件 {missingPrograms.length} 件</StatusBadge>}
              </>
            }
          >
            <DataTable
              columns={[
                { key: 'program', label: '案件' },
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
          </PanelCard>
        </Grid>

        <PanelCard title="A8 月別" description="直近 3 か月・サイト別レポート（サイト＋note）">
          <DataTable
            columns={[
              { key: 'month', label: '月' },
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
        </PanelCard>

        <PanelCard
          title="配置ルール別"
          description={
            <>
              GA4 {ruleWin ?? '未計測'}・
              {byPage ? 'ページ別からルールごとに数えた数字' : `同じ面を分け合うルールの数字は面の合計${allPartial ? '・どのルールも窓の途中から有効（窓の残りの日の数字も混ざる）' : ''}`}{' '}
              {unattributed && unattributed.clicks > 0 && (
                <StatusBadge tone="warn" title="撤去前の面・ラベル未登録・ページ不明。内訳は転職ファネルの集計（analysis.career-funnel）の unattributed.top">
                  ルールに当たらないクリック {unattributed.clicks}
                </StatusBadge>
              )}
            </>
          }
        >
          <DataTable
            columns={[
              { key: 'ruleId', label: 'ルール' },
              { key: 'program', label: '案件' },
              { key: 'slot', label: '面' },
              { key: 'impressions', label: '表示', num: true },
              { key: 'clicks', label: 'クリック', num: true },
              { key: 'rate', label: '率', num: true },
            ]}
            rows={rules.map((r) => {
              const shared = r.impressionsShared + r.clicksShared > 0;
              return {
                id: r.ruleId,
                values: {
                  ruleId: r.ruleId,
                  program: r.program,
                  slot: r.slotLabel,
                  impressions: r.impressions,
                  clicks: r.clicks,
                  rate: r.impressions && !shared ? r.clicks / r.impressions : null,
                },
                cells: {
                  ruleId: (
                    <>
                      {r.ruleId}{' '}
                      {!r.open && <StatusBadge tone="neutral">終了</StatusBadge>}{' '}
                      {!byPage && r.partial && !allPartial && <StatusBadge tone="info" title="窓の一部の日だけ有効。窓の残りの日の数字も混ざる">窓の一部</StatusBadge>}{' '}
                      {!byPage && r.sharedWith.length > 0 && <StatusBadge tone="info" title={`同じ面を分け合ったルール: ${r.sharedWith.join('・')}（数字はそれらとの合計）`}>面を共有</StatusBadge>}
                      {byPage && shared && (
                        <StatusBadge tone="info" title={`${r.sharedWith.join('・')} と分けられない表示 ${r.impressionsShared}・クリック ${r.clicksShared}（窓の途中で閉じて開き直した）`}>
                          前後と分けられない分あり
                        </StatusBadge>
                      )}
                    </>
                  ),
                  rate: shared ? '—' : rate(r.clicks, r.impressions),
                },
              };
            })}
            filter="ルール・案件・面で絞り込み"
            emptyText="未計測（fetch-metrics が週次で生成）"
          />
        </PanelCard>

        <PanelCard title="成果の出どころ" description="A8 の成果別（1 成果 1 行・週次 CI）。ページは広告をクリックしたページ（2026-10-07 20:00 より前のクリックはドメインしか残らず不明）。候補が 1 つなら面まで決まる">
          <DataTable
            columns={[
              { key: 'clickedAt', label: 'クリック' },
              { key: 'program', label: '案件' },
              { key: 'status', label: '状態' },
              { key: 'gross', label: '発生額', num: true },
              { key: 'page', label: 'ページ', wrap: true },
              { key: 'rules', label: '候補の配置ルール', wrap: true },
            ]}
            rows={conversions.map((c, i) => ({
              id: `${c.clickedAt}-${i}`,
              values: {
                clickedAt: c.clickedAt.slice(5, 16).replace('-', '/').replace('T', ' '),
                program: c.program ?? '（不明）',
                status: c.status,
                gross: yen(c.grossRevenueYen),
                page: c.page ?? '（不明）',
                rules: c.rules || '—',
              },
            }))}
            emptyText="成果なし（A8 の成果別は週次 CI の login-collectors が取得）"
          />
        </PanelCard>

        <PanelCard title="クリックの出どころ" description={`GA4 ${ruleWin ?? '未計測'}・日付は JST。A8 の発生日と突き合わせて、どこから成果が出たかの候補を見る`}>
          <DataTable
            columns={[
              { key: 'date', label: '日付' },
              { key: 'page', label: 'ページ', wrap: true },
              { key: 'program', label: '案件' },
              { key: 'slot', label: '面' },
              { key: 'ruleId', label: 'ルール' },
              { key: 'clicks', label: 'クリック', num: true },
            ]}
            rows={clickLog.map((c, i) => ({
              id: `${c.date}-${c.page}-${c.slotLabel}-${i}`,
              values: { date: c.date, page: c.page, program: c.program ?? '（不明）', slot: c.slotLabel, ruleId: c.ruleId ?? '—', clicks: c.clicks },
            }))}
            filter="ページ・案件・面で絞り込み"
            emptyText={byPage ? 'この窓のクリックなし' : '未計測（fetch-metrics のページ別が週次で生成）'}
          />
        </PanelCard>
      </Stack>
    </>
  );
}
