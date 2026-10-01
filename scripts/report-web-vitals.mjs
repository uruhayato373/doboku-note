#!/usr/bin/env node
/**
 * report-web-vitals.mjs — 実ユーザー計測（RUM）の Core Web Vitals を週次レビュー向けに読む。
 *
 * 最新の data/metrics/rum/web-vitals-*.json（fetch-ga4-web-vitals が CI で保存）を読み、
 * 手を打つべき組（不良・要改善で件数が足りているもの）を先に出す。判定は scripts/lib/web-vitals-rum.mjs。
 * 週次レビューは、ここに「不良」が出たら改善カードを起票する（PSI のラボ値だけでは起票しない）。
 *
 * 使い方: npm run report-web-vitals [-- --json]
 * 終了コード: 0＝読めた（手を打つ組の有無に関係なく）/ 2＝検査不成立（記録が無い・古い・取得できていない）
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { actionable, MIN_SAMPLES } from './lib/web-vitals-rum.mjs';

const DIR = 'data/metrics/rum';
const TAG = '[report-web-vitals]';
const MAX_AGE_DAYS = 10;
const STATUS_JA = { good: '良好', 'needs-improvement': '要改善', poor: '不良', insufficient: '件数不足' };

function main() {
  const name = existsSync(DIR) ? readdirSync(DIR).filter((f) => /^web-vitals-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1) : null;
  if (!name) {
    console.error(`${TAG} 検査不成立: ${DIR} に記録が無い（fetch-metrics.yml の Fetch GA4 (web vitals) を確認）`);
    return 2;
  }
  const data = JSON.parse(readFileSync(join(DIR, name), 'utf8'));
  const age = Math.floor((Date.now() - Date.parse(data.generatedAt)) / 86400000);
  const rows = data.summary?.rows ?? [];
  const act = actionable(rows);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ file: name, ageDays: age, status: data.status, window: data.window, events: data.summary?.events ?? 0, actionable: act, rows }, null, 2));
  } else {
    console.log(`実ユーザー計測 ${name}（${data.window ? `${data.window.startDate}〜${data.window.endDate}` : '期間不明'}・${age} 日前）状態 ${data.status}・イベント ${data.summary?.events ?? 0} 件`);
    for (const r of rows) {
      const share = r.goodShare == null ? '—' : `${Math.round(r.goodShare * 100)}%`;
      console.log(`  ${STATUS_JA[r.status].padEnd(4, '　')} ${r.metric.padEnd(3)} ${r.device.padEnd(7)} 良好率 ${share.padStart(4)}（${r.n} 件）${r.template}`);
    }
    console.log(act.length ? `手を打つ組 ${act.length}（不良 ${act.filter((r) => r.status === 'poor').length}）` : `手を打つ組なし（件数 ${MIN_SAMPLES} 未満の組は判定しない）`);
  }
  console.error(`${TAG} 組 ${rows.length} を実検査 / 判定できた ${rows.filter((r) => r.status !== 'insufficient').length} / 手を打つ ${act.length}`);
  if (data.status === 'dimensions-missing') {
    console.error(`${TAG} 検査不成立: GA4 に metric_name / metric_rating のカスタムディメンションが無い（npm run ga4-admin:apply）`);
    return 2;
  }
  if (age > MAX_AGE_DAYS) {
    console.error(`${TAG} 検査不成立: 記録が ${age} 日前（${MAX_AGE_DAYS} 日超）`);
    return 2;
  }
  return 0;
}

process.exitCode = main();
