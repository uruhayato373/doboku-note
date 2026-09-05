#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-sales-fetch.mjs
 * ---------------------------------------------------------------------------
 * note の「販売履歴」`/sitesettings/purchasers`（明細）と「売上管理」`/sitesettings/salesmanage`
 * （月次総額）を Playwright read-only で取得し、`.claude/state/sales/sales-log.json` の
 * 該当月を差し替える（DN-0018）。
 *
 * 背景: 手動転記は「やった月」と「やらなかった月」が外から区別できず、2026-07 は
 * note 実績 145 件 ¥275,140 に対しログ 23 件 ¥49,660（18%）しか入らないまま気づかれなかった
 * （`sales-summary` は入っている分を正しく足すので緑のまま）。取得と検算を自動化する。
 * 詳細 → .claude/knowledge/reference/sales-tracking.md「取得と検算」
 *
 * **認証は人が通す**（パスワード再確認画面が出たら ABORT して手動ログインを促す。
 * パスワード入力はエージェントの禁止行為）。認証後の Cookie は永続プロファイルに残るため、
 * 一度通せば以後のバッチ実行では再確認は出ない（2026-08-17 実測）。
 *
 * **検算に通らなければ 1 バイトも書かない**: 明細合計と「売上管理」の月次表示額が一致するまで
 * exit 2。一致したら、その月は追記ではなく差し替える（部分手入力への追記は重複を生む）。
 *
 * productId 解決は scripts/lib/sales-normalize.mjs（純関数・テスト済み）に委譲する。
 * マガジンは src/lib/note-magazines.ts の title/shortTitle と一致すれば解決、
 * 単品記事は誤推定を避けて article:unknown-{date}-{index} に保留し、人手確認へ回す。
 *
 * 使い方:
 *   node scripts/note-sales-fetch.mjs                      # 当月・dry-run（既定・安全）
 *   node scripts/note-sales-fetch.mjs --month 2026-07       # 指定月・dry-run
 *   node scripts/note-sales-fetch.mjs --month 2026-07 --commit  # 検算OK後に sales-log.json を差し替え
 *
 * 実行はローカル（note ログイン済みプロファイルのある Mac/Windows）限定。
 *
 * **既知の未検証部分（要ライブ校正・2026-08-25 時点）**:
 *   月選択 <select> のインデックス（0=年/1=月 と文書化されているが実 DOM 未確認）、
 *   「もっとみる」ボタンの正確な role/name、売上管理ページの月次総額表示セレクタは
 *   実機で一度も通していない。selector が見つからなければ ABORT して人へ引き継ぐ
 *   （fail-closed。誤ったセレクタで静かに 0 件を「完了」と報告しない）。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSaleEntry, reconcileTotal, canonicalizeProductId } from './lib/sales-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const SALES_LOG = join(ROOT, '.claude/state/sales/sales-log.json');
const NAME = 'note-sales-fetch';

const argv = process.argv.slice(2);
const getArg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');

const now = new Date();
const MONTH_ARG = getArg('--month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
if (!/^\d{4}-\d{2}$/.test(MONTH_ARG)) {
  console.error(`${NAME}: --month は YYYY-MM 形式で指定する（例: 2026-07）`);
  process.exit(1);
}
const [YEAR, MONTH] = MONTH_ARG.split('-');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** note-magazines.ts を静的パースして {id, title, shortTitle} の配列を返す（既存スクリプトと同じ手法）。 */
function loadMagazines() {
  const src = readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8');
  const out = [];
  const re = /\{[\s\S]*?id:\s*'([^']+)'[\s\S]*?title:\s*'([^']*)'[\s\S]*?(?:shortTitle:\s*'([^']*)')?[\s\S]*?\n\s*\},?/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({ id: m[1], title: m[2], shortTitle: m[3] || undefined });
  }
  return out;
}

console.log(`=== ${NAME}: ${MONTH_ARG} / mode=${COMMIT ? 'COMMIT(sales-log差し替え)' : 'DRY-RUN(書き込みなし)'} ===`);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

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

  if (/password|パスワード/i.test(await page.evaluate(() => document.body.innerText || ''))) {
    console.error('ABORT: パスワード再確認画面が出ている。認証は人が通す必要がある');
    console.error('  ブラウザ上でパスワードを入力してから、このスクリプトを再実行すること（Cookie は永続プロファイルに残る）');
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
    await selects.nth(1).selectOption({ label: `${Number(MONTH)}月` });
  } catch (e) {
    console.error(`ABORT: 年/月セレクタの選択に失敗（${e.message}）。<select> の並びが想定と違う可能性`);
    await ctx.close();
    process.exit(4);
  }
  await sleep(1500);

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
  const rawRows = await page.evaluate(() => {
    const priceRe = /^[\d,]+円$/;
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
          if (date && !title && texts[j] && texts[j] !== '返信する' && texts[j] !== '記事購入') { title = texts[j]; break; }
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
  const smSelects = page.locator('select');
  if (await smSelects.count() >= 2) {
    try {
      await smSelects.nth(0).selectOption({ label: `${YEAR}年` });
      await smSelects.nth(1).selectOption({ label: `${Number(MONTH)}月` });
      await sleep(1500);
    } catch (e) {
      console.error(`ABORT: 売上管理ページの年/月選択に失敗（${e.message}）`);
      await ctx.close();
      process.exit(4);
    }
  }
  const dashboardTotalText = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/([\d,]+)\s*円/);
    return m ? m[1] : null;
  });
  if (!dashboardTotalText) {
    console.error('ABORT: 売上管理ページから月次総額を読めなかった（selector 要校正）');
    await ctx.close();
    process.exit(7);
  }
  const dashboardTotal = Number(dashboardTotalText.replace(/,/g, ''));
  console.log(`[4] 売上管理 表示総額: ¥${dashboardTotal.toLocaleString()}`);

  // 4. 正規化・検算
  const magazines = loadMagazines();
  const entries = [];
  let unknownIdx = 0;
  for (const r of rawRows) {
    const dateIso = toIsoDate(r.date);
    const price = Number(r.priceText.replace(/[^\d]/g, ''));
    const resolved = resolveSaleEntry({ title: r.title, date: dateIso }, magazines, unknownIdx);
    if (!resolved.resolved) unknownIdx++;
    entries.push({ date: dateIso, productId: canonicalizeProductId(resolved.productId), title: r.title, type: resolved.type, price });
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
  const log = existsSync(SALES_LOG) ? JSON.parse(readFileSync(SALES_LOG, 'utf8')) : { version: 1, currency: 'JPY', sales: [] };
  const kept = (log.sales || []).filter((s) => !String(s.date || '').startsWith(MONTH_ARG));
  const removed = (log.sales || []).length - kept.length;
  log.sales = [...kept, ...entries.map(({ date, productId, title, type, price }) => ({ date, productId, title, type, price }))];
  log.updatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  writeFileSync(SALES_LOG, JSON.stringify(log, null, 2) + '\n');
  console.log(`[6] sales-log.json を更新: ${MONTH_ARG} を ${removed} 件 → ${entries.length} 件へ差し替え`);

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
