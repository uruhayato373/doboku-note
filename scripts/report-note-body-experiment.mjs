#!/usr/bin/env node
/**
 * report-note-body-experiment.mjs — EXP-053（本文中の note 案内の画像／文字の A/B）の案ごとの表示・クリック・クリック率。
 * 入力は最新の GA4 レポート cta-clicks-by-label（fetch-ga4-cta-clicks --by-label・週次）。書き込みはしない。
 * 案ごとに 1,000 表示に届くまでは途中経過として読む（DN-0949・data/business/experiments.json の EXP-053）。
 *
 * Usage: npm run report-note-body-experiment [-- --json]
 * exit: 0 / 2 = まだ行が無い（未デプロイ・未取得）
 */
import { listReports } from './lib/metric-reports.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { summarizeNoteBodyExperiment } from './lib/note-body-experiment-report.mjs';

const args = parseCliArgs({ json: { type: 'boolean' } });
const latest = listReports(ROOT, 'ga4.cta-clicks-by-label', { windowKind: 'days' })[0] ?? listReports(ROOT, 'ga4.cta-clicks-by-label')[0];
const summary = latest ? summarizeNoteBodyExperiment(latest.data.rows) : null;
if (!summary?.arms.some((a) => a.impressions > 0)) {
  console.error('[report-note-body-experiment] EXP-053 の行がまだ無い（本番デプロイの後、週次の fetch-metrics の --by-label が取る）');
  process.exit(2);
}
if (args.json) {
  console.log(JSON.stringify({ source: latest.ref, window: { startDate: latest.data.meta.startDate, endDate: latest.data.meta.endDate }, ...summary }, null, 2));
} else {
  console.log(`EXP-053 ${latest.data.meta.startDate}〜${latest.data.meta.endDate}（${latest.ref}）`);
  for (const a of summary.arms) console.log(`  ${a.variant}: 表示 ${a.impressions}・クリック ${a.clicks}・率 ${a.ctr === null ? '—' : `${(a.ctr * 100).toFixed(2)}%`}`);
  for (const p of summary.byPlacement) console.log(`    ${p.placement} ${p.variant}: ${p.clicks}/${p.impressions}`);
}
