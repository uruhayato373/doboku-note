#!/usr/bin/env node
// npm run check-adsense-revenue-freshness — AdSense の収益のレポート（ga4.adsense-page・fetch-metrics.yml の週次）が止まっていないか、GA4 と AdSense のリンクが生きているか（最新の広告の表示が 1 回以上）を見る。
// 鮮度の上限は台帳 ga4.reports の freshness.warnDays。quality-audit の ops（日次の ops-audit）が読み、落ちたら automation-failure Issue。
// 罠: リンクは 2026-11-23 から。最初の週次の取得（main への deploy 後の金曜）までは「取得開始前」として通す（FIRST_FETCH_DUE まで）。それ以降に 1 件も無いのは失敗（検査ゼロを緑にしない）
import { freshnessDays } from '../lib/datasets.mjs';
import { latestReport } from '../lib/metric-reports.mjs';
import { todayJst } from '../lib/jst-date.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

const DAY_MS = 86_400_000;
/** 最初の週次の取得が済んでいるはずの日（JST）。リンク 2026-11-23 → 金曜 11-27 の取得＋余裕 */
const FIRST_FETCH_DUE = '2026-12-01';

/** 純関数。report は { stamp, data: { meta, rows } } か null。{ ok, ageDays, reason } */
export function assessAdsenseFreshness(report, today, maxAgeDays) {
  if (!report) {
    if (today < FIRST_FETCH_DUE) return { ok: true, ageDays: null, reason: `取得開始前（${FIRST_FETCH_DUE} までは無くてよい）` };
    return { ok: false, ageDays: null, reason: 'AdSense の収益のレポートが 1 件も無い（fetch-metrics.yml の AdSense の段を確かめる）' };
  }
  const day = report.stamp.slice(0, 10);
  const ageDays = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);
  if (ageDays > maxAgeDays) return { ok: false, ageDays, reason: `最新の取得 ${day} が ${ageDays} 日前（上限 ${maxAgeDays} 日・fetch-metrics.yml は毎週金曜）` };
  const impressions = (report.data?.rows ?? []).reduce((n, r) => n + (Number(r.publisherAdImpressions) || 0), 0);
  if (impressions <= 0) return { ok: false, ageDays, reason: `最新の取得（${report.data?.meta?.startDate}〜${report.data?.meta?.endDate}）の広告の表示が 0 回。GA4 と AdSense のリンクが外れたか、権限が消えた疑い` };
  return { ok: true, ageDays, reason: null };
}

function main() {
  const report = latestReport(REPO_ROOT, 'ga4.adsense-page');
  const r = assessAdsenseFreshness(report, todayJst(), freshnessDays('ga4.reports', 'warnDays'));
  console.log(`check-adsense-revenue-freshness: レポート ${report ? 1 : 0} 件を検査 / 最新 ${report?.stamp?.slice(0, 10) ?? 'なし'} / 経過 ${r.ageDays ?? '-'} 日 / ${r.ok ? 'OK' : 'FAIL'}${r.ok && r.reason ? `（${r.reason}）` : ''}`);
  if (!r.ok) { console.error(`  ${r.reason}`); process.exitCode = 1; }
}

if (isCliEntry(import.meta.url)) main();
