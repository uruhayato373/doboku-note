#!/usr/bin/env node
/**
 * measure-experiments.mjs — 実験台帳（.claude/state/experiments.json）のうち `measure` 仕様を持つ running / measuring の
 * 実験について、前後の窓で GA4 / GSC / 売上台帳を測り、`measurements[]` に自動計測を追記する。
 *
 * なぜ: 前後比較が手作業（/nsm-experiment measure）で、EXP-007/008 は期限を数週間過ぎても測られなかった。
 * 測るのは CI、裁定は週次レビュー（VERDICT_DUE でトリアージ対象になる）と分ける。
 *
 * 仕様と判定の目安: scripts/lib/experiment-measure.mjs（specErrors / measureWindows / verdictHint）
 * 冪等: 同じ仕様（specHash）・同じ事後窓の終わりの自動計測があれば追記しない。history は触らない
 * （CLOSE_DUE の経過日数を自動計測でリセットしない）。
 *
 * Usage:
 *   node scripts/measure-experiments.mjs            # dry-run（測って表示）
 *   node scripts/measure-experiments.mjs --commit   # 台帳へ追記
 *
 * exit: 0 成功（対象 0 件を含む・件数を出力）/ 1 取得失敗あり / 2 検査不成立（API が要るのに認証なし・仕様不正）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { jst } from './lib/business-direction.mjs';
import { normPath, foldGsc } from './lib/growth-pack.mjs';
import { specErrors, specHash, measureWindows, verdictHint, deltaPct, sumSales, sumGscPages, alreadyMeasured, inScope } from './lib/experiment-measure.mjs';
import { buildContentIndex } from './build-growth-digest.mjs';
import { ga4FromEnv, japanFilter, spamExclusion, andFilter, runReportAll } from '../.claude/scripts/lib/ga4-client.mjs';
import { getAuth, fetchSearchAnalytics } from '../.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const TAG = '[measure-experiments]';
const LEDGER = '.claude/state/experiments.json';
const SALES = '.claude/state/sales/sales-log.json';

async function ga4Value(ga4, spec, windows) {
  const ranges = [{ ...windows.pre, name: 'pre' }, { ...windows.post, name: 'post' }];
  const event = spec.metric.startsWith('ga4.event:') ? spec.metric.slice('ga4.event:'.length) : null;
  const filters = [japanFilter()];
  if (event) filters.push({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: event } } });
  else {
    filters.push(spamExclusion());
    if (spec.scope.source === 'google') {
      filters.push({ filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: 'google' } } });
      filters.push({ filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { matchType: 'EXACT', value: 'Organic Search' } } });
    }
  }
  const report = await runReportAll(ga4.client, {
    property: ga4.property,
    dateRanges: ranges.map(({ startDate, endDate, name }) => ({ startDate, endDate, name })),
    dimensions: [{ name: event ? 'pagePath' : 'landingPage' }],
    metrics: [{ name: event ? 'eventCount' : 'sessions' }],
    dimensionFilter: andFilter(filters),
  });
  const iRange = report.dimensionHeaders.indexOf('dateRange');
  const out = { pre: 0, post: 0 };
  for (const r of report.rows) {
    const d = r.dimensionValues.map((x) => x.value);
    if (!inScope(normPath(d[0]), spec.scope)) continue;
    out[d[iRange]] += Number(r.metricValues[0].value) || 0;
  }
  return { pre: { value: out.pre, volume: out.pre }, post: { value: out.post, volume: out.post } };
}

async function gscValue(auth, spec, windows, legacy) {
  const one = async (w) => {
    const res = foldGsc(await fetchSearchAnalytics(auth, { startDate: w.startDate, endDate: w.endDate, effectiveDimensions: ['page'], all: true, country: 'jpn' }));
    return sumGscPages(res.rows.map((r) => ({ ...r, page: legacy.get(r.page) ?? r.page })), spec);
  };
  return { pre: await one(windows.pre), post: await one(windows.post) };
}

async function main() {
  const commit = process.argv.includes('--commit');
  const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
  const today = jst();
  const targets = ledger.experiments.filter((e) => ['running', 'measuring'].includes(e.status) && e.measure);
  const invalid = targets.map((e) => [e.id, specErrors(e.measure)]).filter(([, errs]) => errs.length);
  for (const [id, errs] of invalid) console.error(`${TAG} ${id}: measure 仕様が不正（${errs.join(' / ')}）`);
  if (invalid.length) return 2;

  let ga4 = null, gscAuth = null, legacy = null;
  const needs = (prefix) => targets.some((e) => e.measure.metric.startsWith(prefix));
  try {
    if (needs('ga4.')) ga4 = ga4FromEnv();
    if (needs('gsc.')) { gscAuth = getAuth(); legacy = buildContentIndex().legacy; }
  } catch (e) {
    console.error(`${TAG} 検査不成立: ${e.message}`);
    return 2;
  }
  const sales = needs('sales.') ? JSON.parse(readFileSync(SALES, 'utf8')).sales : [];
  // 売上台帳は手動転記で遅れる。台帳の最終日が事後窓の終わりに届くまでは確定扱いにしない（未転記を target-missed と誤読しない）
  const salesThrough = sales.reduce((a, s) => (s.date > a ? s.date : a), '');

  let appended = 0, skipped = 0, waiting = 0;
  const failures = [];
  for (const e of targets) {
    const spec = e.measure;
    const windows = measureWindows(spec, e.started_at, today);
    if (!windows) { waiting++; console.log(`${TAG} ${e.id}: 事後窓が未開始（GSC 確定前）`); continue; }
    if (spec.metric.startsWith('sales.') && salesThrough < windows.post.endDate) windows.complete = false;
    const hash = specHash(spec);
    if (alreadyMeasured(e, hash, windows.post)) { skipped++; continue; }
    try {
      const v = spec.metric.startsWith('sales.') ? { pre: sumSales(sales, spec, windows.pre), post: sumSales(sales, spec, windows.post) }
        : spec.metric.startsWith('ga4.') ? await ga4Value(ga4, spec, windows)
          : await gscValue(gscAuth, spec, windows, legacy);
      const m = {
        source: 'auto', measuredAt: new Date().toISOString(), specHash: hash, metric: spec.metric,
        pre: { ...windows.pre, ...v.pre }, post: { ...windows.post, ...v.post }, complete: windows.complete,
        ...(spec.metric.startsWith('sales.') ? { salesLedgerThrough: salesThrough || null } : {}),
        deltaPct: deltaPct(spec, v.pre, v.post, windows), verdictHint: verdictHint(spec, v.pre, v.post, windows),
      };
      (e.measurements ??= []).push(m);
      appended++;
      console.log(`${TAG} ${e.id}: ${spec.metric} ${m.pre.value} → ${m.post.value}（日あたり ${m.deltaPct ?? '—'}%・${m.complete ? '確定' : '途中'}）→ ${m.verdictHint}`);
    } catch (err) {
      failures.push(e.id);
      console.error(`${TAG} ${e.id}: 取得失敗 ${String(err?.message ?? err).slice(0, 200)}`);
    }
  }
  console.log(`${TAG} 対象 ${targets.length} 件（measure 仕様あり）/ 追記 ${appended} / 計測済みで省略 ${skipped} / 事後窓待ち ${waiting} / 失敗 ${failures.length}`);
  if (appended && commit) {
    ledger.updated_at = new Date().toISOString();
    writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log(`${TAG} → ${LEDGER}`);
  } else if (appended) console.log(`${TAG} dry-run（--commit で台帳へ追記）`);
  return failures.length ? 1 : 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (e) => { console.error(`${TAG} 失敗: ${e?.stack ?? e}`); process.exitCode = 1; },
);
