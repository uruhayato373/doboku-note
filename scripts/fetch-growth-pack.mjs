#!/usr/bin/env node
/**
 * fetch-growth-pack.mjs — 週次の成長パック（GA4 Data API × GSC）を、事業レビューと同じ月〜日の週で取得する。
 *
 * なぜ: 既存の週次取得は GA4 7 日が木〜水、GSC が別窓、ページ別は上位 100 件と窓も母数も揃っておらず、
 * 「どのページで何が起きたか」を週単位で突合できなかった。ここでは前の完了週（月〜日・JST）と直前 28 日の
 * 基線を同じ条件で取り、機会ダイジェスト（build-growth-digest）の唯一の入力にする。
 *
 *   GA4: landingPage × sessionSource × channel（sessions / engagedSessions / activeUsers / keyEvents）
 *        pagePath × eventName（eventCount / totalUsers。対象イベントは .claude/config/growth-cycle.json）
 *        いずれも country=Japan・参照スパム除外・全件ページング（lib/ga4-client.mjs）
 *   GSC: page と page×query（週・基線、country=jpn・web・final）
 *
 * Usage:
 *   node scripts/fetch-growth-pack.mjs                  # 前の完了週（JST）
 *   node scripts/fetch-growth-pack.mjs --week 2026-W38  # 過去週の取り直し（同名ファイルを上書き）
 *   node scripts/fetch-growth-pack.mjs --dry-run        # 取得だけして書かない
 *
 * 出力: .claude/state/metrics/growth/pack-YYYY-Www.json
 * exit: 0 全区画取得 / 1 取得失敗あり（取れた区画は書く・失敗は sections[*].error）/
 *       2 検査不成立（認証なし・週が GSC 確定前）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { addDays, GSC_FINAL_LAG_DAYS, jst } from './lib/business-direction.mjs';
import { packPeriods, foldLanding, foldEvents, foldGsc } from './lib/growth-pack.mjs';
import { ga4FromEnv, japanFilter, spamExclusion, andFilter, runReportAll, isLimited } from '../.claude/scripts/lib/ga4-client.mjs';
import { getAuth, fetchSearchAnalytics } from '../.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const TAG = '[growth-pack]';
const OUT_DIR = '.claude/state/metrics/growth';
const CONFIG = '.claude/config/growth-cycle.json';
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

async function main() {
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const { week, period, baseline } = packPeriods({ today: jst(), week: argValue('--week'), baselineDays: cfg.baselineDays });
  if (period.endDate > addDays(jst(), -GSC_FINAL_LAG_DAYS)) {
    console.error(`${TAG} ${week}（${period.startDate}〜${period.endDate}）は GSC 確定前（終了日から${GSC_FINAL_LAG_DAYS}日未満）。取得しない`);
    return 2;
  }

  let ga4;
  let gscAuth;
  try {
    ga4 = ga4FromEnv();
    gscAuth = getAuth();
  } catch (e) {
    console.error(`${TAG} 検査不成立: ${e.message}`);
    return 2;
  }

  const dateRanges = [
    { startDate: period.startDate, endDate: period.endDate, name: 'week' },
    { startDate: baseline.startDate, endDate: baseline.endDate, name: 'base' },
  ];
  const sections = {};
  const run = async (name, fn) => {
    try {
      sections[name] = { ok: true, ...(await fn()) };
    } catch (e) {
      sections[name] = { ok: false, error: String(e?.message ?? e).slice(0, 300) };
    }
  };

  await run('ga4Landing', async () => {
    const report = await runReportAll(ga4.client, {
      property: ga4.property,
      dateRanges,
      dimensions: [{ name: 'landingPage' }, { name: 'sessionSource' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'activeUsers' }, { name: 'keyEvents' }],
      dimensionFilter: andFilter([japanFilter(), spamExclusion()]),
    });
    return { rowCount: report.rowCount, truncated: report.truncated, limited: isLimited(report.metadata), rows: foldLanding(report, { organicSources: cfg.organicSources }) };
  });

  await run('ga4Events', async () => {
    const report = await runReportAll(ga4.client, {
      property: ga4.property,
      dateRanges,
      dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: andFilter([japanFilter(), { filter: { fieldName: 'eventName', inListFilter: { values: cfg.events } } }]),
    });
    return { rowCount: report.rowCount, truncated: report.truncated, limited: isLimited(report.metadata), rows: foldEvents(report) };
  });

  const gsc = (range, dims) => async () =>
    foldGsc(await fetchSearchAnalytics(gscAuth, { startDate: range.startDate, endDate: range.endDate, effectiveDimensions: dims, all: true, country: cfg.gscCountry }));
  await run('gscPageWeek', gsc(period, ['page']));
  await run('gscPageBase', gsc(baseline, ['page']));
  await run('gscPageQueryWeek', gsc(period, ['page', 'query']));
  await run('gscPageQueryBase', gsc(baseline, ['page', 'query']));

  const pack = {
    schemaVersion: 1,
    week,
    period,
    baseline,
    generatedAt: new Date().toISOString(),
    filters: { ga4: 'country=Japan・参照スパム除外（lib/ga4-client.mjs）', gsc: `country=${cfg.gscCountry}・web・final（日付は太平洋時間）` },
    sections,
  };

  const failed = Object.entries(sections).filter(([, s]) => !s.ok);
  for (const [name, s] of Object.entries(sections)) {
    console.log(`${TAG} ${name}: ${s.ok ? `${s.rows.length} 行${s.truncated ? '（打ち切り）' : ''}${s.limited ? '（thresholding/sampling）' : ''}` : `失敗 ${s.error}`}`);
  }
  console.log(`${TAG} ${week}（${period.startDate}〜${period.endDate}・基線 ${baseline.startDate}〜${baseline.endDate}）区画 ${Object.keys(sections).length} 件中 取得 ${Object.keys(sections).length - failed.length} / 失敗 ${failed.length}`);

  if (failed.length === Object.keys(sections).length) return 1; // 全滅は書かない（空のパックを正として残さない）
  if (!args.includes('--dry-run')) {
    mkdirSync(OUT_DIR, { recursive: true });
    const out = join(OUT_DIR, `pack-${week}.json`);
    writeFileSync(out, `${JSON.stringify(pack)}\n`);
    console.log(`${TAG} → ${out}`);
  }
  return failed.length ? 1 : 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (e) => { console.error(`${TAG} 失敗: ${e?.stack ?? e}`); process.exitCode = 1; },
);
