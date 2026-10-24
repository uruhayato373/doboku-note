#!/usr/bin/env node
import { resolveProfileDir, resolveStatePath } from './lib/playwright-auth-profile.mjs';
import { attachCISession } from './lib/playwright-auth-state.mjs';
/**
 * note-traffic-fetch.mjs
 * ---------------------------------------------------------------------------
 * note ダッシュボード「アクセス状況」（/dashboard）を Playwright read-only で取得し、
 *   data/note/referrers/YYYY-MM.json   … 記事の流入元（月次時系列＋対象月の内訳）
 *   data/note/articles-pv/YYYY-MM.json … 対象期間の記事別 インプレッション/PV/スキ/売上
 * を書く（DN-0249）。
 *
 * 背景（2026-09-15 実測）: 収益の出所は note 内回遊＋note 記事への検索直で 73〜80%、X 0.2%。
 *   サイト→note は rel=noreferrer で不可視だった（PR #511 で是正・EXP-010）。この「どこから来たか」を
 *   毎月機械で残さないと、投資配分の判断が実感に戻る。business-direction の notePv 欠測もここで埋める。
 *
 * 認証は人が通す（note の永続プロファイル）。パスワードは扱わない。書き込みは --commit のときだけ。
 * 判定ロジック（innerText → JSON）は scripts/lib/note-traffic-normalize.mjs（純関数・テスト済み）。
 *
 * 使い方:
 *   node scripts/note-traffic-fetch.mjs                     # 先月・dry-run（画面から取れた値を表示するだけ）
 *   node scripts/note-traffic-fetch.mjs --month 2026-09     # 指定月（当月＝「今月」/ 先月＝「先月」だけ対応）
 *   node scripts/note-traffic-fetch.mjs --month 2026-09 --commit
 *   node scripts/note-traffic-fetch.mjs --from 2026-10-05 --to 2026-10-11 --commit  # 指定期間・週次用（data/note/traffic-period/）
 *   node scripts/note-traffic-fetch.mjs --check             # ブラウザを開かず fixture で正規化が完走するか（CI 用・exit 0/1）
 *
 * exit: 0 成功 / 1 取得したが検査不成立（テーブルが読めない・0 件）/ 2 前提エラー（対象月非対応・アカウント不一致）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { parseReferrerTimeSeries, parseReferrerPie, parsePeriod, parseSummary, parseArticleRows, parseRequestedPeriod, trafficProblems } from './lib/note-traffic-normalize.mjs';
import { jstClock } from './lib/jst-date.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const NAME = 'note-traffic-fetch';
const args = parseCliArgs({ month: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, commit: { type: 'boolean' }, check: { type: 'boolean' } });
const COMMIT = args.commit;
const CHECK = args.check;
let requestedPeriod;
try { requestedPeriod = parseRequestedPeriod(args); } catch (error) { console.error(`${NAME}: ${error.message}`); process.exit(2); }

if (CHECK) {
  // ブラウザ不要の完走確認（quality-audit ci）。fixture が読めて 4 パーサが非空なら成功。
  const ts = readFileSync(join(ROOT, 'tests/fixtures/note-dashboard-referrers-365d.txt'), 'utf8');
  const d28 = readFileSync(join(ROOT, 'tests/fixtures/note-dashboard-28d.txt'), 'utf8');
  const r = parseReferrerTimeSeries(ts), pie = parseReferrerPie(d28), rows = parseArticleRows(d28), sum = parseSummary(d28);
  const ok = r && r.months.length > 0 && pie && pie.length > 0 && rows.length > 0 && sum.pageViews !== null;
  console.log(`[${NAME} --check] fixture 2 件を実検査 / 時系列 ${r?.months.length ?? 0} 月 / 円グラフ ${pie?.length ?? 0} 行 / 記事 ${rows.length} 件 / PV ${sum.pageViews}`);
  process.exit(ok ? 0 : 1);
}

const jstNow = jstClock();
const thisMonth = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, '0')}`;
const prev = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth() - 1, 1));
const lastMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
const MONTH = args.month || lastMonth;
if (!/^\d{4}-\d{2}$/.test(MONTH)) { console.error(`${NAME}: --month は YYYY-MM`); process.exit(2); }
const periodLabel = requestedPeriod ? 'カスタム' : MONTH === thisMonth ? '今月' : MONTH === lastMonth ? '先月' : null;
if (!periodLabel) { console.error(`${NAME}: ダッシュボードの期間ボタンは「今月」「先月」しか機械で選べない（${MONTH} は対象外。時系列は 365 日で取れる）`); process.exit(2); }

const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log(`=== ${NAME}: ${requestedPeriod ? requestedPeriod.from + '〜' + requestedPeriod.to : MONTH}（期間ボタン「${periodLabel}」）/ mode=${COMMIT ? 'COMMIT' : 'DRY-RUN'} ===`);

const ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
  headless: false, channel: 'chrome', ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1400 }, args: ['--disable-blink-features=AutomationControlled'],
}));
await attachCISession(ctx, 'note', { statePath: resolveStatePath('note', { cwd: ROOT, repoRoot: ROOT }) });
let exitCode = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { exitCode = 2; throw new Error('ABORT: account != dobokunote'); }

  await page.goto('https://note.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const text0 = await page.evaluate(() => document.body.innerText || '');
  if (!/アクセス状況/.test(text0)) { exitCode = 2; throw new Error('ABORT: ダッシュボードが開けない（DOM 変更の疑い）'); }

  // 期間・並び順はネイティブ <select>（2026-09-16 実測: option value=THIS_MONTH 等）。テキストクリックでは開かない。
  const selectByOption = async (optionText, value) => {
    const sel = page.locator('select').filter({ has: page.locator('option', { hasText: optionText }) }).first();
    if (await sel.count() === 0) throw new Error(`<select>（${optionText}）が見つからない`);
    await sel.selectOption({ label: value }); await sleep(6000);
  };
  const selectPeriod = (label) => selectByOption('過去28日間', label);

  // 月次の流入元は従来どおり取得。指定期間では全期間への切り替えを挟まない。
  let series = null;
  if (!requestedPeriod) {
    await selectPeriod('過去365日間');
    const tsBtn = page.getByRole('button', { name: '時系列', exact: true }).first();
    if (await tsBtn.count()) { await tsBtn.click(); await sleep(4000); }
    series = parseReferrerTimeSeries(await page.evaluate(() => document.body.innerText || ''));
    const pieBtn = page.getByRole('button', { name: '円グラフ', exact: true }).first();
    if (await pieBtn.count()) { await pieBtn.click(); await sleep(1500); }
  }

  await selectPeriod(periodLabel);
  if (requestedPeriod) {
    await page.getByRole('textbox', { name: '開始日を選択してください', exact: true }).fill(requestedPeriod.from.replaceAll('-', '/'));
    await page.getByRole('textbox', { name: '終了日を選択してください', exact: true }).fill(requestedPeriod.to.replaceAll('-', '/'));
    await page.getByRole('button', { name: '適用', exact: true }).click();
    await sleep(6000);
  }
  // ローディング中の「-」を0や取得失敗へ即変換しない。表示期間も一致するまで待つ。
  const waitForData = async (predicate, label) => {
    const deadline = Date.now() + 60000;
    do {
      const text = await page.evaluate(() => document.body.innerText || '');
      if (predicate(text)) return text;
      await sleep(500);
    } while (Date.now() < deadline);
    throw new Error(`${label}が60秒以内に読み込まれない`);
  };
  // 「今月」「先月」のボタンでも、表示中の期間が対象月に切り替わるまで待つ。2026-10-24 の土曜の収集（Mac・画面あり）は
  // 切り替わる途中の記事 20 件を読み、「もっとみる」が出る前に一覧の終わりと見て検査不成立になった（DN-0817）
  await waitForData((text) => {
    const period = parsePeriod(text);
    return parseSummary(text).pageViews !== null && parseArticleRows(text).length > 0
      && (requestedPeriod ? (period?.from === requestedPeriod.from && period?.to === requestedPeriod.to) : period?.from === `${MONTH}-01`);
  }, '期間・集計・記事一覧');
  // 記事一覧を PV 順にして全件展開（「もっとみる」を押し切る）
  let sortedBy = 'pageViews';
  try { await selectByOption('公開日順', 'ページビュー順'); } catch (e) { sortedBy = 'publishedAt'; console.log(`[warn] 並び順の <select> が無い（${e.message}）。公開日順のまま取得する`); }
  let hasMore = false;
  for (let i = 0; i < 200; i++) {
    const more = page.getByRole('button', { name: 'もっとみる', exact: true }).first();
    // 行の追加と次のボタンの描画は同時ではない。短い非表示を一覧終端と誤認しない。
    let visible = await more.isVisible().catch(() => false);
    for (let settle = 0; !visible && settle < 12; settle++) {
      await sleep(500);
      visible = await more.isVisible().catch(() => false);
    }
    if (!visible) break;
    const before = parseArticleRows(await page.evaluate(() => document.body.innerText || '')).length;
    await more.click();
    await waitForData((text) => parseArticleRows(text).length > before, '記事の追加読込');
    if ((i + 1) % 10 === 0) console.log(`[記事] ${before}件から追加読込中`);
  }
  const more = page.getByRole('button', { name: 'もっとみる', exact: true }).first();
  hasMore = await more.isVisible().catch(() => false);
  const monthText = await page.evaluate(() => document.body.innerText || '');
  const period = parsePeriod(monthText);
  const summary = parseSummary(monthText);
  const pie = parseReferrerPie(monthText);
  const rows = parseArticleRows(monthText);

  const monthRow = series?.months.find((m) => m.month === MONTH) ?? null;
  if (!requestedPeriod) console.log(`[時系列] ${series ? series.months.length + ' 月' : '取得不能'} / 対象月 ${MONTH}: ${monthRow ? JSON.stringify(monthRow.sources) : '無し'}`);
  console.log(`[${periodLabel}] 期間 ${period ? period.from + '〜' + period.to : '?'} / PV ${summary.pageViews} / 売上 ${summary.salesYen} / 流入元 ${pie ? pie.length : 0} 行 / 記事 ${rows.length} 件`);

  const problems = trafficProblems({ period, summary, rows, hasMore, requestedPeriod });
  if (!requestedPeriod && !series) problems.push('時系列テーブルが読めない');
  if (!requestedPeriod && !pie) problems.push('円グラフテーブルが読めない');
  if (problems.length) { console.error(`${NAME}: 検査不成立: ${problems.join(' / ')}`); exitCode = 1; }
  else if (COMMIT) {
    const fetchedAt = new Date().toISOString();
    const source = 'note ダッシュボード「アクセス状況」（Playwright read-only・自己閲覧を含む）。流入元は閲覧の経路であり購入経路ではない';
    if (requestedPeriod) {
      const record = { schemaVersion: 1, fetchedAt, source, period, summary, pie, sortedBy, count: rows.length, rows };
      const saved = writeDataset(ROOT, 'note.traffic-period', record, { values: period });
      console.log(`[write] ${saved.file}（記事 ${rows.length} 件・PV ${summary.pageViews}・流入元 ${pie ? pie.length + '行' : '画面に表示なし'}）`);
    } else {
      const ref = { schemaVersion: 1, month: MONTH, fetchedAt, source, period, monthly: series.months, targetMonth: monthRow, pie, summary };
      const art = { schemaVersion: 1, month: MONTH, fetchedAt, period, sortedBy, count: rows.length, rows };
      const values = { month: MONTH };
      const refPath = writeDataset(ROOT, 'note.referrers', ref, { values }).file;
      const artPath = writeDataset(ROOT, 'note.articles-pv', art, { values }).file;
      console.log(`[write] ${refPath} / ${artPath}（記事 ${rows.length} 件）`);
    }
  } else {
    console.log('（dry-run・書き込みなし。--commit で保存）');
  }
} catch (error) {
  console.error(`${NAME}: ${error.message}`);
  exitCode ||= 1;
} finally {
  await ctx.close();
}
process.exit(exitCode);
