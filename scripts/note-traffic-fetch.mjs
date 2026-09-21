#!/usr/bin/env node
import { resolveProfileDir, resolveStatePath } from './lib/playwright-auth-profile.mjs';
import { attachCISession } from './lib/playwright-auth-state.mjs';
/**
 * note-traffic-fetch.mjs
 * ---------------------------------------------------------------------------
 * note ダッシュボード「アクセス状況」（/dashboard）を Playwright read-only で取得し、
 *   .claude/state/metrics/note/referrers-YYYY-MM.json   … 記事の流入元（月次時系列＋対象月の内訳）
 *   .claude/state/metrics/note/articles-pv-YYYY-MM.json … 対象期間の記事別 インプレッション/PV/スキ/売上
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
 *   node scripts/note-traffic-fetch.mjs --check             # ブラウザを開かず fixture で正規化が完走するか（CI 用・exit 0/1）
 *
 * exit: 0 成功 / 1 取得したが検査不成立（テーブルが読めない・0 件）/ 2 前提エラー（対象月非対応・アカウント不一致）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { parseReferrerTimeSeries, parseReferrerPie, parsePeriod, parseSummary, parseArticleRows } from './lib/note-traffic-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, '.claude/state/metrics/note');
const NAME = 'note-traffic-fetch';
const argv = process.argv.slice(2);
const getArg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const CHECK = argv.includes('--check');

if (CHECK) {
  // ブラウザ不要の完走確認（quality-audit ci）。fixture が読めて 4 パーサが非空なら成功。
  const ts = readFileSync(join(ROOT, 'tests/fixtures/note-dashboard-referrers-365d.txt'), 'utf8');
  const d28 = readFileSync(join(ROOT, 'tests/fixtures/note-dashboard-28d.txt'), 'utf8');
  const r = parseReferrerTimeSeries(ts), pie = parseReferrerPie(d28), rows = parseArticleRows(d28), sum = parseSummary(d28);
  const ok = r && r.months.length > 0 && pie && pie.length > 0 && rows.length > 0 && sum.pageViews !== null;
  console.log(`[${NAME} --check] fixture 2 件を実検査 / 時系列 ${r?.months.length ?? 0} 月 / 円グラフ ${pie?.length ?? 0} 行 / 記事 ${rows.length} 件 / PV ${sum.pageViews}`);
  process.exit(ok ? 0 : 1);
}

const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
const thisMonth = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, '0')}`;
const prev = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth() - 1, 1));
const lastMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
const MONTH = getArg('--month') || lastMonth;
if (!/^\d{4}-\d{2}$/.test(MONTH)) { console.error(`${NAME}: --month は YYYY-MM`); process.exit(2); }
const periodLabel = MONTH === thisMonth ? '今月' : MONTH === lastMonth ? '先月' : null;
if (!periodLabel) { console.error(`${NAME}: ダッシュボードの期間ボタンは「今月」「先月」しか機械で選べない（${MONTH} は対象外。時系列は 365 日で取れる）`); process.exit(2); }

const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log(`=== ${NAME}: ${MONTH}（期間ボタン「${periodLabel}」）/ mode=${COMMIT ? 'COMMIT' : 'DRY-RUN'} ===`);

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
  if (!acct) { console.error('ABORT: account != dobokunote'); process.exit(2); }

  await page.goto('https://note.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const text0 = await page.evaluate(() => document.body.innerText || '');
  if (!/アクセス状況/.test(text0)) { console.error('ABORT: ダッシュボードが開けない（DOM 変更の疑い）'); process.exit(2); }

  // 期間・並び順はネイティブ <select>（2026-09-16 実測: option value=THIS_MONTH 等）。テキストクリックでは開かない。
  const selectByOption = async (optionText, value) => {
    const sel = page.locator('select').filter({ has: page.locator('option', { hasText: optionText }) }).first();
    if (await sel.count() === 0) throw new Error(`<select>（${optionText}）が見つからない`);
    await sel.selectOption({ label: value }); await sleep(6000);
  };
  const selectPeriod = (label) => selectByOption('過去28日間', label);

  // 1. 時系列（過去365日間・月次）
  await selectPeriod('過去365日間');
  const tsBtn = page.getByRole('button', { name: '時系列' }).first();
  if (await tsBtn.count()) { await tsBtn.click(); await sleep(4000); }
  const tsText = await page.evaluate(() => document.body.innerText || '');
  const series = parseReferrerTimeSeries(tsText);
  const pieBtn = page.getByRole('button', { name: '円グラフ' }).first();
  if (await pieBtn.count()) { await pieBtn.click(); await sleep(1500); }

  // 2. 対象月の内訳・集計・記事一覧（「今月」/「先月」）
  await selectPeriod(periodLabel);
  // 記事一覧を PV 順にして全件展開（「もっとみる」を押し切る）
  try { await selectByOption('公開日順', 'ページビュー順'); } catch (e) { console.log(`[warn] 並び順の <select> が無い（${e.message}）。公開日順のまま取得する`); }
  for (let i = 0; i < 40; i++) {
    const more = page.getByRole('button', { name: 'もっとみる' }).first();
    if (!(await more.count()) || !(await more.isVisible().catch(() => false))) break;
    await more.click(); await sleep(1500);
  }
  const monthText = await page.evaluate(() => document.body.innerText || '');
  const period = parsePeriod(monthText);
  const summary = parseSummary(monthText);
  const pie = parseReferrerPie(monthText);
  const rows = parseArticleRows(monthText);

  const monthRow = series?.months.find((m) => m.month === MONTH) ?? null;
  console.log(`[時系列] ${series ? series.months.length + ' 月' : '取得不能'} / 対象月 ${MONTH}: ${monthRow ? JSON.stringify(monthRow.sources) : '無し'}`);
  console.log(`[${periodLabel}] 期間 ${period ? period.from + '〜' + period.to : '?'} / PV ${summary.pageViews} / 売上 ${summary.salesYen} / 流入元 ${pie ? pie.length : 0} 行 / 記事 ${rows.length} 件`);

  const problems = [];
  if (!series) problems.push('時系列テーブルが読めない');
  if (!pie) problems.push('円グラフテーブルが読めない');
  if (rows.length === 0) problems.push('記事一覧が 0 件');
  if (summary.pageViews === null) problems.push('ページビューが読めない');
  if (problems.length) { console.error(`${NAME}: 検査不成立: ${problems.join(' / ')}`); exitCode = 1; }
  else if (COMMIT) {
    mkdirSync(OUT_DIR, { recursive: true });
    const fetchedAt = new Date().toISOString();
    const ref = { schemaVersion: 1, month: MONTH, fetchedAt, source: 'note ダッシュボード「アクセス状況」記事の流入元（Playwright read-only・自己閲覧を含む・doboku-note.com は 2026-09 まで rel=noreferrer で no referrer に含まれる）', period, monthly: series.months, targetMonth: monthRow, pie, summary };
    const art = { schemaVersion: 1, month: MONTH, fetchedAt, period, sortedBy: 'pageViews', count: rows.length, rows };
    writeFileSync(join(OUT_DIR, `referrers-${MONTH}.json`), JSON.stringify(ref, null, 2) + '\n');
    writeFileSync(join(OUT_DIR, `articles-pv-${MONTH}.json`), JSON.stringify(art, null, 2) + '\n');
    console.log(`[write] referrers-${MONTH}.json / articles-pv-${MONTH}.json（記事 ${rows.length} 件）`);
  } else {
    console.log('（dry-run・書き込みなし。--commit で保存）');
  }
} finally {
  await ctx.close();
}
process.exit(exitCode);
