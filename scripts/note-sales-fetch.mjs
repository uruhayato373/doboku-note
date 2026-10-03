#!/usr/bin/env node
import { resolveProfileDir, resolveStatePath } from './lib/playwright-auth-profile.mjs';
import { attachCISession } from './lib/playwright-auth-state.mjs';
/**
 * note-sales-fetch.mjs
 * ---------------------------------------------------------------------------
 * note の「販売履歴」`/sitesettings/purchasers`（明細）と「売上管理」`/sitesettings/salesmanage`
 * （月次総額）を Playwright read-only で取得し、`data/note/sales.json` の
 * 該当月を差し替える（DN-0018）。
 *
 * 背景: 手動転記は「やった月」と「やらなかった月」が外から区別できず、2026-07 は
 * note 実績 145 件 ¥275,140 に対しログ 23 件 ¥49,660（18%）しか入らないまま気づかれなかった
 * （`sales-summary` は入っている分を正しく足すので緑のまま）。取得と検算を自動化する。
 * 詳細 → .claude/knowledge/reference/sales-tracking.md「取得と検算」
 *
 * **パスワード再確認は資格情報で 1 回だけ通す**（scripts/lib/note-reauth.mjs。手元は Mac キーチェーン／
 * Windows 資格情報マネージャーの doboku-note-auth-note、CI は Secrets DOBOKU_AUTH_NOTE_USER/_PASSWORD）。
 * 未登録・失敗印あり・通らないときは ABORT して人へ引き継ぐ（--no-auto-reauth で常に人が通す）。
 * エージェントはこの自動入力を走らせない（パスワード入力はエージェントの禁止行為。実行はオーナー・スケジューラ・CI）。
 * 認証後の Cookie は永続プロファイルに残るため、一度通せば以後のバッチ実行では再確認は出ない（2026-08-17 実測）。
 *
 * **検算に通らなければ 1 バイトも書かない**: 明細合計と「売上管理」の月次表示額が一致するまで
 * exit 2。一致したら、その月は追記ではなく差し替える（部分手入力への追記は重複を生む）。
 * 前月の売上が note 側でまだ集計中（翌月 2 日に確定）なら exit 8（PENDING・書き込みなし）で止める。
 *
 * productId 解決は scripts/lib/sales-normalize.mjs（純関数・テスト済み）に委譲する。
 * マガジンは src/lib/note-magazines.ts の title/shortTitle と一致すれば解決、
 * 単品記事は誤推定を避けて article:unknown-{date}-{index} に保留し、人手確認へ回す。
 *
 * 使い方:
 *   node scripts/note-sales-fetch.mjs                      # 当月・dry-run（既定・安全）
 *   node scripts/note-sales-fetch.mjs --month 2026-07       # 指定月・dry-run
 *   node scripts/note-sales-fetch.mjs --month 2026-07 --commit  # 検算OK後に data/note/sales.json を差し替え
 *
 * 実行はローカル（note ログイン済みプロファイルのある Mac/Windows）限定。
 *
 * **ライブ校正の記録（2026-09-13・Mac 実機で 2026-09 を取得し検算 0 差で書き込み）**:
 *   販売履歴の年/月 <select> は 0=年/1=月 で確定。「もっとみる」は button 名で確定。
 *   売上管理ページには <select> が無く、当月は「今月の売上 … 総額 ¥N」、過去月は
 *   「処理済みの売上」表の行から読む（旧実装は説明文の「1,000円以上」を拾って必ず不一致だった）。
 *   メンバーシップ会費は価格が「1,480円 / 月」・接頭辞「メンバーシップ・」が別要素になることがある。
 *   カタログの単品記事（noteUrl が /n/）は `article:<id>`・type=article で書く（sales-tracking.md）。
 *   selector が見つからなければ ABORT して人へ引き継ぐ（fail-closed）。
 *   売上ページはパスワード再確認が要る領域。出たら資格情報で 1 回だけ通し、通らなければ人が headed ブラウザで通す。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveKnownSaleEntry, resolveSaleEntry, reconcileTotal, canonicalizeProductId } from './lib/sales-normalize.mjs';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { describeReauthResult, isNoteReauthPage, noteReauthMarkPath, passNoteReauth } from './lib/note-reauth.mjs';
import { isNoteMonthFinalized, isNoteSalesAggregating, noteSalesPendingMessage } from './lib/net-receipts.mjs';
import { jst } from './lib/business-direction.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { jstMonth, todayJst } from './lib/jst-date.mjs';
import { writeDataset } from './lib/dataset-write.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const SALES_LOG = join(ROOT, datasetPath('note.sales'));
const NAME = 'note-sales-fetch';

const argv = process.argv.slice(2);
const getArg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const NO_AUTO_REAUTH = argv.includes('--no-auto-reauth');

const now = new Date();
const MONTH_ARG = getArg('--month') || jstMonth(now);
if (!/^\d{4}-\d{2}$/.test(MONTH_ARG)) {
  console.error(`${NAME}: --month は YYYY-MM 形式で指定する（例: 2026-07）`);
  process.exit(1);
}
const [YEAR, MONTH] = MONTH_ARG.split('-');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 前月指定の年/月 <select> を変えると販売履歴ページが読み込み直される。その途中で page.evaluate を
// 呼ぶと「Execution context was destroyed」で落ちていた（2026-10-02 CI・前月だけ失敗・当月は既定値の
// まま再読み込みが起きず成功・DN-0512）。読み込みの完了を待つ／遷移で消えた評価だけ取り直す。
async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}
async function evaluateStable(page, fn, arg) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (e) {
      if (attempt >= 3 || !/Execution context was destroyed|navigation/i.test(String(e?.message))) throw e;
      await settle(page);
      await sleep(1500);
    }
  }
}

/** note-magazines.ts を静的パースして {id, title, shortTitle} の配列を返す（既存スクリプトと同じ手法）。 */
function loadMagazines() {
  const src = readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8');
  // エントリは `'<id>': {` で始まり、その直後に id / published / noteUrl / title / shortTitle が並ぶ。
  // 旧正規表現（`{ … id … title … }` を非貪欲に跨ぐ）は description 内の入れ子や省略キーで
  // id と title の組を取り違え、2026-09-13 に実在する単品記事 10 件を全部 unknown にしていた。
  const out = [];
  const chunks = src.split(/\n  '([^']+)':\s*\{/);
  for (let i = 1; i < chunks.length; i += 2) {
    const id = chunks[i];
    const body = chunks[i + 1] || '';
    const title = body.match(/\n\s*title:\s*'((?:[^'\\]|\\.)*)'/)?.[1];
    const shortTitle = body.match(/\n\s*shortTitle:\s*'((?:[^'\\]|\\.)*)'/)?.[1];
    // noteUrl が /n/ なら単品記事（sales-tracking.md: productId は `article:<catalog-id>`・type=article）
    const single = /noteUrl:\s*'https:\/\/note\.com\/dobokunote\/n\//.test(body);
    if (title) out.push({ id, title: title.replace(/\\'/g, "'"), shortTitle: shortTitle ? shortTitle.replace(/\\'/g, "'") : undefined, single });
  }
  return out;
}

console.log(`=== ${NAME}: ${MONTH_ARG} / mode=${COMMIT ? 'COMMIT(sales.json差し替え)' : 'DRY-RUN(書き込みなし)'} ===`);

const ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
  headless: false,
  channel: 'chrome',
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
}));
await attachCISession(ctx, 'note', { statePath: resolveStatePath('note', { cwd: ROOT, repoRoot: ROOT }) });

try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート（他 note-*.mjs と同じ）
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; }
  }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // 2. 販売履歴（明細）
  await page.goto('https://note.com/sitesettings/purchasers', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);

  // パスワード再確認は資格情報で 1 回だけ通す（--no-auto-reauth で従来どおり人が通す）
  const reauth = NO_AUTO_REAUTH ? { status: 'disabled' } : await passNoteReauth(page, { markPath: noteReauthMarkPath({ cwd: ROOT, repoRoot: ROOT }) });
  if (reauth.status === 'ok') {
    console.log('[1b] パスワード再確認を資格情報で通した');
    await page.goto('https://note.com/sitesettings/purchasers', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
  }
  if (await isNoteReauthPage(page)) {
    console.error(`ABORT: パスワード再確認画面が出ている（${describeReauthResult(reauth)}）`);
    console.error('  人が通すなら、ブラウザ上でパスワードを入力してから再実行する（Cookie は永続プロファイルに残る）');
    await ctx.close();
    process.exit(3);
  }

  const selects = page.locator('select');
  const selectCount = await selects.count();
  if (selectCount < 2) {
    console.error(`ABORT: 月フィルタの <select> が見つからない（検出 ${selectCount} 件・要 2 件以上）。DOM 変更の疑い`);
    await ctx.close();
    process.exit(4);
  }
  // 文書化された想定: 0=年 / 1=月。ライブで違えば ABORT する（誤った月を書き込むより安全）。
  try {
    await selects.nth(0).selectOption({ label: `${YEAR}年` });
    await settle(page);
    await selects.nth(1).selectOption({ label: `${Number(MONTH)}月` });
    await settle(page);
  } catch (e) {
    console.error(`ABORT: 年/月セレクタの選択に失敗（${e.message}）。<select> の並びが想定と違う可能性`);
    await ctx.close();
    process.exit(4);
  }
  await sleep(1500);
  // 選択が効いたかを読み戻す（再読み込みで既定の当月へ戻っていたら、誤った月を書く前に止める）
  const chosen = await evaluateStable(page, () => Array.from(document.querySelectorAll('select')).slice(0, 2).map((s) => s.options[s.selectedIndex]?.text?.trim() ?? ''));
  if (chosen[0] !== `${YEAR}年` || chosen[1] !== `${Number(MONTH)}月`) {
    console.error(`ABORT: 年/月の選択が反映されていない（表示 ${chosen.join('/')}・要求 ${YEAR}年/${Number(MONTH)}月）`);
    await ctx.close();
    process.exit(4);
  }

  // 「もっとみる」を尽きるまでクリック（明細が尽きたら消える/disabled になる想定）
  let clicks = 0;
  const moreBtn = page.getByRole('button', { name: /もっとみる/ });
  while (await moreBtn.count() && (await moreBtn.first().isVisible().catch(() => false))) {
    try {
      await moreBtn.first().click({ timeout: 5000 });
      clicks++;
      await sleep(1200);
    } catch {
      break;
    }
    if (clicks > 200) { // 異常な暴走防止（1日100件想定なら数十クリックで尽きるはず）
      console.error('ABORT: 「もっとみる」クリックが 200 回を超えた。無限ループの疑い');
      await ctx.close();
      process.exit(5);
    }
  }
  console.log(`[2] 「もっとみる」${clicks} 回クリック`);

  // 明細行を抽出。行の正確なマークアップは未確認のため、価格表記（円）を手がかりに
  // 直近のタイトル・日付テキストを拾う緩い抽出にする。0 件は「取得失敗」として扱う。
  const rawRows = await evaluateStable(page, () => {
    const priceRe = /^[\d,]+円(?:\s*\/\s*月)?$/; // メンバーシップ会費は「1,480円 / 月」（2026-09-13 実 DOM）
    const dateRe = /^\d{4}年\d{1,2}月\d{1,2}日/;
    const nodes = Array.from(document.querySelectorAll('body *')).filter(
      (el) => el.children.length === 0 && el.innerText && el.innerText.trim()
    );
    const texts = nodes.map((el) => el.innerText.trim());
    const rows = [];
    for (let i = 0; i < texts.length; i++) {
      if (priceRe.test(texts[i])) {
        // 価格の直前を遡ってタイトルと日付を推定する
        let date = null, title = null;
        for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
          if (!date && dateRe.test(texts[j])) { date = texts[j]; continue; }
          if (date && !title && texts[j] && texts[j] !== '返信する' && !/^(?:記事購入|マガジン|メンバーシップ)[・･]?$/.test(texts[j])) { title = texts[j]; break; }
        }
        if (date && title) rows.push({ title, date, priceText: texts[i] });
      }
    }
    return rows;
  });

  if (rawRows.length === 0) {
    console.error('ABORT: 明細行を 1 件も抽出できなかった（DOM 構造が想定と違う可能性・selector 要校正）');
    await ctx.close();
    process.exit(6);
  }
  console.log(`[3] 明細 ${rawRows.length} 件を抽出`);

  // 3. 売上管理（月次総額）
  await page.goto('https://note.com/sitesettings/salesmanage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  // 2026-09-13 実 DOM: 売上管理ページに年/月 <select> は無い。当月は「今月の売上 … 総額 ¥N」、
  // 過去月は「処理済みの売上」表の行「YYYY年M月 <お支払日> ¥N <状況>」から読む。
  // 以前の `([\d,]+)\s*円` は説明文の「1,000円以上」を拾って必ず検算不一致になっていた。
  const dashboardTotalText = await evaluateStable(page, ({ year, month }) => {
    const text = document.body.innerText || '';
    const cur = text.match(/今月の売上[\s\S]*?(\d{4})年(\d{1,2})月1日[\s\S]*?総額\s*¥([\d,]+)/);
    if (cur && Number(cur[1]) === year && Number(cur[2]) === month) return cur[3];
    const row = new RegExp(`${year}年${month}月\\s+[^\\n]*?¥([\\d,]+)`).exec(text);
    return row ? row[1] : null;
  }, { year: Number(YEAR), month: Number(MONTH) });
  if (!dashboardTotalText) {
    // 前月は翌月 2 日の確定まで処理済みの表に行が無い。これは DOM の変化ではないので別の終了コードで止める
    if (isNoteSalesAggregating(await evaluateStable(page, () => document.body.innerText || ''))) {
      console.error(`PENDING: ${noteSalesPendingMessage(MONTH_ARG)}。1 バイトも書き込まない`);
      await ctx.close();
      process.exit(8);
    }
    console.error('ABORT: 売上管理ページから月次総額を読めなかった（selector 要校正）');
    await ctx.close();
    process.exit(7);
  }
  const dashboardTotal = Number(dashboardTotalText.replace(/,/g, ''));
  console.log(`[4] 売上管理 表示総額: ¥${dashboardTotal.toLocaleString()}`);

  // 4. 正規化・検算
  const magazines = loadMagazines();
  const log = existsSync(SALES_LOG) ? JSON.parse(readFileSync(SALES_LOG, 'utf8')) : { version: 1, currency: 'JPY', sales: [] };
  const entries = [];
  let unknownIdx = 0;
  for (const r of rawRows) {
    const dateIso = toIsoDate(r.date);
    const price = Number(r.priceText.replace(/[^\d]/g, ''));
    const cleanTitle = r.title.replace(/^(?:記事購入|マガジン|メンバーシップ)[・･]/, '');
    const resolved = resolveKnownSaleEntry(cleanTitle, log.sales) ?? resolveSaleEntry({ title: r.title, date: dateIso }, magazines, unknownIdx);
    if (!resolved.resolved) unknownIdx++;
    // 販売履歴の表示は「記事購入・<題名>」「マガジン・<題名>」「メンバーシップ・<プラン>」。ログの title は題名だけ
    entries.push({ date: dateIso, productId: canonicalizeProductId(resolved.productId), title: cleanTitle, type: resolved.type, price });
  }

  const check = reconcileTotal(entries, dashboardTotal);
  console.log(`[5] 検算: 明細合計 ¥${check.computed.toLocaleString()} / 表示総額 ¥${check.expected.toLocaleString()}（差 ${check.diff}）`);
  if (!check.ok) {
    console.error(`ABORT: 検算が一致しない（差 ¥${check.diff}）。1 バイトも書き込まない`);
    console.error('  「もっとみる」の取りこぼし、または月フィルタのズレを確認すること');
    await ctx.close();
    process.exit(2);
  }
  console.log('[5] 検算 OK');

  const unresolvedCount = entries.filter((e) => e.productId.startsWith('article:unknown-')).length;
  if (unresolvedCount > 0) {
    console.log(`[6] 未解決 productId ${unresolvedCount} 件（article:unknown-* で保留・後で /record-sales か手動修正で確定させる）`);
  }

  if (!COMMIT) {
    console.log(`\n[dry-run] ${entries.length} 件を書き込み対象として検出（未反映・実書き込みは --commit）`);
    await ctx.close();
    process.exit(0);
  }

  // 5. 差し替え（追記ではない）
  const kept = (log.sales || []).filter((s) => !String(s.date || '').startsWith(MONTH_ARG));
  const removed = (log.sales || []).length - kept.length;
  log.sales = [...kept, ...entries.map(({ date, productId, title, type, price }) => ({ date, productId, title, type, price }))];
  log.updatedAt = todayJst(now);
  // 月ごとの取得記録。finalized=true は note の確定日（翌月 2 日）以降に月次表示と検算一致したもの。
  // 事業レビュー・実験計測はこれが true の月だけを確定値として扱う（確定前の値を完了と呼ばない）
  const fetchedDay = jst(now);
  log.months = { ...(log.months ?? {}), [MONTH_ARG]: { fetchedAt: now.toISOString(), count: entries.length, total: dashboardTotal, finalized: isNoteMonthFinalized(MONTH_ARG, fetchedDay) } };
  writeDataset(ROOT, 'note.sales', log); // 型（NoteSalesLog）を検査してから書く。合わなければ 1 バイトも書かない
  console.log(`[6] ${datasetPath('note.sales')} を更新: ${MONTH_ARG} を ${removed} 件 → ${entries.length} 件へ差し替え`);

  await ctx.close();
  process.exit(0);
} catch (e) {
  console.error(`ABORT: 想定外のエラー — ${e.message}`);
  await ctx.close();
  process.exit(1);
}

/** "2026年7月17日" → "2026-07-17" */
function toIsoDate(jaDate) {
  const m = /^(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(jaDate || '');
  if (!m) return jaDate;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}
