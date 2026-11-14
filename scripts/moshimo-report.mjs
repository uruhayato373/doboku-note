#!/usr/bin/env node
/**
 * npm run moshimo-report -- --month YYYY-MM
 * もしものサイト別・案件別成果を月単位で取得する。ログインは土曜の収集（エージェント外）と同じ仕組み。
 * --check は前月・当月の保存済み記録を検算する。取得失敗では既存の記録を上書きしない。
 * 行のない案件は補完しない。ページ送りがある場合も部分取得を保存せず停止する。
 */
import { loadAspConfig, getAsp, openAsp, ensureTargetSite } from './lib/asp-browser.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { previousMonth } from './lib/weekly-collect-plan.mjs';
import { moshimoMonthRange, parseMoshimoRows, validateMoshimoReport } from './lib/moshimo-report.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJsonIf, writeJson } from './lib/json-io.mjs';
import { MoshimoReport } from './lib/dataset-schemas.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { agentSession } from './lib/credential-store.mjs';

const args = parseCliArgs({ month: { type: 'string' }, check: { type: 'boolean' } });
try {
  const root = loadAspConfig();
  const asp = getAsp(root, 'moshimo');
  const siteId = String(asp.sites['doboku-note']);
  const today = todayJst();
  const month = args.month ?? today.slice(0, 7);
  if (args.check) {
    for (const m of args.month ? [month] : [previousMonth(month), month]) {
      const state = MoshimoReport.parse(readJsonIf(REPO_ROOT, datasetPath('moshimo.reports', { month: m })));
      validateMoshimoReport(state, { month: m, siteId, fresh: true });
      console.log(`${m}: 取得 ${state.observedRows} 件・検算 ${state.records.length} 件`);
    }
  } else {
    if (agentSession()) throw new Error('成果取得はエージェント外の土曜の収集で実行する（ログインを代行しない）');
    if (root.targetSiteName !== 'doboku-note') throw new Error('対象サイトが doboku-note でない');
    const period = moshimoMonthRange(month, today);
    const qs = new URLSearchParams({ from_date: period.from.replaceAll('-', '/'), to_date: period.to.replaceAll('-', '/'), terminal_type: '0', order: 'result_price_d' });
    const { ctx, page } = await openAsp(asp, { label: 'moshimo-report' });
    try {
      await ensureTargetSite(page, asp, root, { navigateTo: `/af/shop/report/kpi/promotion?${qs}` });
      const url = new URL(page.url());
      if (url.pathname !== '/af/shop/report/kpi/promotion' || url.searchParams.get(asp.siteParam) !== siteId) throw new Error('レポートのサイト帰属を確認できない');
      const dates = await page.locator('input[name="from_date"],input[name="to_date"]').evaluateAll(els => Object.fromEntries(els.map(el => [el.name, el.value])));
      if (dates.from_date !== qs.get('from_date') || dates.to_date !== qs.get('to_date')) throw new Error('指定期間と表示期間が違う');
      if (await page.locator('a').evaluateAll(els => els.some(el => el.getBoundingClientRect().width && /^(次へ|次|›|»|>)$/.test(el.textContent.replace(/\s/g, ''))))) throw new Error('ページ送りあり。全件取得できないため保存しない');
      const rows = await page.locator('table tbody tr').evaluateAll(trs => trs.flatMap(tr => {
        const link = tr.querySelector('a[href*="promotion_id="]');
        if (!link) return [];
        const url = new URL(link.href);
        return [{ programId: url.searchParams.get('promotion_id'), siteId: url.searchParams.get('shop_site_id'), programName: link.textContent.trim(), cells: [...tr.querySelectorAll('th,td')].map(el => el.textContent.replace(/\s+/g, ' ').trim()) }];
      }));
      const records = parseMoshimoRows(rows, siteId);
      const state = MoshimoReport.parse({ schemaVersion: 1, month, fetchedAt: new Date().toISOString(), source: { site: 'doboku-note', siteId, url: page.url() }, period, observedRows: rows.length, records });
      validateMoshimoReport(state, { month, siteId });
      writeJson(REPO_ROOT, datasetPath('moshimo.reports', { month }), state);
      console.log(`${month}: 取得 ${rows.length} 件・検算 ${records.length} 件（欠けた案件は 0 補完しない）`);
    } finally { await ctx.close(); }
  }
} catch (e) { console.error(`[moshimo-report] 検査不成立: ${e.message}`); process.exitCode = 1; }
