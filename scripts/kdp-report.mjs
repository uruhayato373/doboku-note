#!/usr/bin/env node
/**
 * kdp-report.mjs
 * ---------------------------------------------------------------------------
 * Amazon KDP のレポート画面（kdpreports.amazon.co.jp）を Playwright で読み取り、
 * 月次ロイヤリティを .claude/state/sales/kdp-royalties.json へ正規化保存する
 * **読み取り専用** レポータ。KDP 側には一切書き込まない（クリックはページ送り/月選択のみ）。
 *
 * kdp-publish.mjs と同じ「システム Chrome(channel:chrome) + 永続プロファイル(.local/playwright-kdp-profile)
 * + proxy + ignoreHTTPSErrors」方式。ログイン情報はそのプロファイルを共用する。
 *
 * 取得元（2026-07-31 実測。旧 kdp.amazon.co.jp/ja_JP/reports-new は kdpreports へ 302）:
 *   - /royalties … 期間指定・書籍別の推計ロイヤリティ（電子書籍/紙/KENP/合計）
 *   - /pmr       … 月別ロイヤリティ（マーケットプレイス別・KENP 既読ページ数）
 *
 * ★限界（正直に明記）★
 *   - 当月の数字は Amazon 側の「推計」。KENP は翌月 15 日頃に確定する（estimated:true で記録）。
 *   - KDP は bot 検知が強く、ログイン時に CAPTCHA / 2FA を出す。これらは人が処理する。
 *   - DOM は table を持たない SPA のため、body innerText の行パターンで抽出している。
 *     UI 変更時は --dump で生テキストを出して較正する。
 *
 * 使い方:
 *   node scripts/kdp-report.mjs                      # 当月を取得して保存
 *   node scripts/kdp-report.mjs --month 2026-06      # 対象月を指定して取得
 *   node scripts/kdp-report.mjs --dry-run            # 保存せず表示だけ
 *   node scripts/kdp-report.mjs --dump               # 生 innerText を .tmp へ保存（UI 較正用）
 *
 * 終了コード: 0=取得成功 / 2=取得不成立（未ログイン・0 件・通貨不一致）。
 * 「1 件も取れていない」を成功と呼ばないため、書籍行 0 件・合計行なしは必ず失敗にする。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-kdp-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const TMP = join(ROOT, '.tmp');
const STATE = join(ROOT, '.claude/state/sales/kdp-royalties.json');
const CATALOG = join(ROOT, 'scripts/kindle-published/catalog.json');
const BASE = 'https://kdpreports.amazon.co.jp';
mkdirSync(TMP, { recursive: true });

// ── 引数 ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes('--dry-run');
const DUMP = argv.includes('--dump');
const now = new Date();
const CUR_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const MONTH = getArg('--month') || CUR_MONTH;
if (!/^\d{4}-\d{2}$/.test(MONTH)) { console.error('--month は YYYY-MM 形式'); process.exit(1); }
const [Y, M] = MONTH.split('-').map(Number);
const LAST_DAY = new Date(Y, M, 0).getDate();
const IS_CURRENT = MONTH === CUR_MONTH;
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const IS_PREV = MONTH === `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jpDate = (d) => `${Y}年${String(M).padStart(2, '0')}月${String(d).padStart(2, '0')}日`;
const num = (s) => Number(String(s).replace(/[¥￥,\s]/g, '')) || 0;

// catalog のタイトル（title: subtitle）→ book id。KDP 上の表示タイトルと同一形式。
// catalog の subtitle は実機とドリフトすることがある（A-02: 「論点別に」/実機「10論点に」）ため、
// 完全一致で外れたら「: 」前の主タイトルで引き直す（主タイトル重複時は曖昧なので引かない）。
const exactToId = new Map();
const baseToId = new Map();
if (existsSync(CATALOG)) {
  for (const b of JSON.parse(readFileSync(CATALOG, 'utf8')).books || []) {
    exactToId.set(b.subtitle ? `${b.title}: ${b.subtitle}` : b.title, b.id);
    baseToId.set(b.title, baseToId.has(b.title) ? null : b.id);
  }
}
const lookupId = (t) => exactToId.get(t) ?? baseToId.get(t.split(': ')[0]) ?? null;

// ── 起動 ─────────────────────────────────────────────────────────────────
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1100 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const bodyText = (page) => page.evaluate(() => document.body.innerText || '');
const shot = async (page, s) => { try { await page.screenshot({ path: join(TMP, `kdp-report-${s}.png`) }); } catch {} };
const abort = async (page, msg, step) => { console.error(`ABORT: ${msg}`); if (page) await shot(page, step); await ctx.close(); process.exit(2); };

try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. ログインゲート（未ログインなら headful で人がログイン → 永続プロファイルに保存）
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let ok = false;
  for (let i = 0; i < 48; i++) {
    await sleep(2500);
    let t = ''; try { t = await bodyText(page); } catch {}
    if (/kdpreports\./.test(page.url()) && /(ダッシュボード|ロイヤリティの見積り)/.test(t)) { ok = true; break; }
    if (i === 0) console.log('[1] 未ログイン → ブラウザで手動ログイン（CAPTCHA/2FA も人が処理）…');
  }
  if (!ok) await abort(page, 'KDP レポートに到達できず（ログイン未完 or チャレンジ）', '01-login');
  console.log(`[1] login gate OK / 対象月=${MONTH}${IS_CURRENT ? '（当月＝推計）' : ''}`);

  // ── 2. ロイヤリティの見積り（書籍別）────────────────────────────────────
  await page.goto(`${BASE}/royalties`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);

  // 通貨 assert（JPY 以外だと数値の桁区切り・小数が変わるため取り込まない）
  const curLabel = await page.locator('#Currency-filter-only').innerText().catch(() => '');
  if (!/JPY/.test(curLabel)) await abort(page, `通貨が JPY でない（検出=${curLabel || '不明'}）`, '02-currency');

  // 期間指定。日付 input へのテキスト入力は React 側で握り潰されて効かない（実測: fill しても
  // 終了日の値に戻る）ため、input クリックで開くカレンダーの右側プリセット（今月/前月）を使う。
  // 前々月以前は日セルクリックが必要で未実装。偽の期間で取り込まないよう明示的に停止する。
  const startIn = page.locator('input[aria-label="開始日"]');
  const endIn = page.locator('input[aria-label="終了日"]');
  if (!IS_CURRENT) {
    if (!IS_PREV) await abort(page, `--month は当月と前月のみ対応（指定=${MONTH}）。それ以前の確定値は KDP の月別ロイヤリティ（${BASE}/pmr）を参照`, '02-month');
    await startIn.click(); await sleep(2500);
    const preset = page.getByText('前月', { exact: true }).first();
    // 販売データが無い期間のプリセットは disabled になる（実測: 初出版 2026-07 の口座で「前月」が無効）。
    // クリックを 30 秒待たせず、理由を出して止める。
    if (!(await preset.isEnabled().catch(() => false))) {
      await abort(page, `「前月」プリセットが無効（${MONTH} に販売データが無い可能性）。月別ロイヤリティ ${BASE}/pmr で確認`, '02-preset');
    }
    await preset.click({ timeout: 10000 });
    await sleep(9000);
  }
  const gotStart = await startIn.inputValue().catch(() => '');
  const gotEnd = await endIn.inputValue().catch(() => '');
  if (gotStart !== jpDate(1) || gotEnd !== jpDate(LAST_DAY)) {
    await abort(page, `期間が ${MONTH} にならない（開始=${gotStart} 終了=${gotEnd}）。UI 変更の可能性 → --dump で較正`, '02-range');
  }
  console.log(`[2] 期間 OK: ${gotStart} 〜 ${gotEnd}`);

  // 書籍別行の抽出。DOM は table を持たないため innerText の行パターンで読む。
  //   … 本のタイトル / 電子書籍の… / 紙書籍の… / KENP… / 合計… / 合計ロイヤリティ - JPY
  //   「N 冊の本すべて」+ 金額5行（合計行） → 以降 (タイトル + 金額5行) の繰り返し
  const parseBooks = (txt) => {
    const lines = txt.split('\n').map((s) => s.trim()).filter(Boolean);
    const head = lines.findIndex((l) => /^合計ロイヤリティ\s*-\s*JPY$/.test(l));
    if (head < 0) return { total: null, books: [] };
    const isMoney = (l) => /^[¥￥]-?[\d,]+$/.test(l);
    let total = null; const books = [];
    for (let i = head + 1; i < lines.length; i++) {
      const label = lines[i];
      if (isMoney(label)) continue;
      const vals = lines.slice(i + 1, i + 6);
      if (vals.length < 5 || !vals.every(isMoney)) continue;
      const rec = { ebook: num(vals[0]), print: num(vals[1]), kenp: num(vals[2]), royalty: num(vals[3]) };
      const m = label.match(/^(\d+)\s*冊の本すべて$/);
      if (m) total = { bookCount: Number(m[1]), ...rec };
      else books.push({ bookId: lookupId(label), title: label, ...rec });
      i += 5;
    }
    return { total, books };
  };

  let txt = await bodyText(page);
  if (DUMP) writeFileSync(join(TMP, `kdp-royalties-${MONTH}.txt`), txt);
  let { total, books } = parseBooks(txt);
  if (!total) await abort(page, '合計行（N 冊の本すべて）を検出できず。UI 変更の可能性 → --dump で較正', '02-parse');

  // ページ送り（1 ページ 20 冊。総冊数に届くまで番号ボタンを押す）
  const seen = new Set(books.map((b) => b.title));
  for (let p = 2; books.length < total.bookCount && p <= 20; p++) {
    const btn = page.locator('button').filter({ hasText: new RegExp(`^${p}$`) });
    if (!(await btn.count().catch(() => 0))) break;
    await btn.first().click();
    await sleep(7000);
    const more = parseBooks(await bodyText(page)).books.filter((b) => !seen.has(b.title));
    if (!more.length) break;
    more.forEach((b) => seen.add(b.title));
    books.push(...more);
  }
  console.log(`[2] 書籍別 ${books.length}/${total.bookCount} 冊 取得（合計 ¥${total.royalty}）`);
  if (!books.length) await abort(page, '書籍行を 1 件も取得できず（0 件を成功と呼ばない）', '02-empty');
  if (books.length < total.bookCount) console.log(`[2] WARN: ${total.bookCount - books.length} 冊が未取得（ページ送り不足の可能性）`);

  // ── 3. 月別ロイヤリティ（マーケットプレイス別・KENP 既読ページ数）─────────
  await page.goto(`${BASE}/pmr`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  // 月選択の input[role=combobox] は高さ 1px の不可視要素で value も空。
  // 現在値と当たり判定は兄弟の #month-filter-value（表示部）が持つので、そちらを使う。
  // オプションは #options-list-N 配下にしか無いので、現在値表示への誤マッチを避けて限定する。
  const monthLabel = `${Y}年${M}月`;
  const valueEl = page.locator('#month-filter-value');
  const shownMonth = () => valueEl.innerText().then((s) => s.trim()).catch(() => '');
  let pmrMonthOk = false;
  try {
    if ((await shownMonth()) !== monthLabel) {
      try { await valueEl.click({ timeout: 10000 }); }
      catch { await page.locator('input[role="combobox"][aria-label="月を選択"]').click({ force: true, timeout: 10000 }); }
      await sleep(2500);
      const opt = page.locator('[id^="options-list"]').getByText(monthLabel, { exact: true });
      if (await opt.count()) { await opt.first().click(); await sleep(9000); }
      else console.log(`[3] WARN: 月別ロイヤリティに ${monthLabel} の選択肢が無い（KDP は直近数か月のみ保持）`);
    }
    pmrMonthOk = (await shownMonth()) === monthLabel;
    if (!pmrMonthOk) console.log(`[3] WARN: 月が ${monthLabel} にならない（表示=${await shownMonth() || '不明'}）`);
  } catch (e) { console.log(`[3] WARN: 月選択に失敗（${e.message.split('\n')[0]}）`); }

  let marketplaces = null;
  if (pmrMonthOk) {
    const ptxt = await bodyText(page);
    if (DUMP) writeFileSync(join(TMP, `kdp-pmr-${MONTH}.txt`), ptxt);
    // 行: \tマーケットプレイス\t通貨\t電子書籍\tペーパーバック\tハードカバー\tN 既読 KENP\t総収益
    let scanned = 0; const rows = [];
    for (const line of ptxt.split('\n')) {
      const c = line.split('\t').map((s) => s.trim());
      if (c.length < 7) continue;
      const [, name, cur, eb, pb, hc, kenp] = c;
      if (!name || !/^[A-Z]{3}$/.test(cur || '')) continue;
      scanned++;
      const rec = {
        marketplace: name, currency: cur,
        ebook: num(eb), paperback: num(pb), hardcover: num(hc),
        kenpPages: Number(String(kenp).replace(/[^\d]/g, '')) || 0,
      };
      if (rec.ebook || rec.paperback || rec.hardcover || rec.kenpPages) rows.push(rec);
    }
    // 「1 行も読めなかった（故障）」と「読めたが実績ゼロ」を区別する
    if (!scanned) { pmrMonthOk = false; console.log('[3] WARN: 通貨行を 1 行も読めず（UI 変更の可能性）→ marketplaces は null 記録'); }
    else { marketplaces = rows; console.log(`[3] マーケットプレイス ${scanned} 行を検査 / 実績あり ${rows.length} 件`); }
  }

  // ── 4. 保存 ────────────────────────────────────────────────────────────
  const entry = {
    fetchedAt: new Date().toISOString(),
    range: { start: `${MONTH}-01`, end: `${MONTH}-${String(LAST_DAY).padStart(2, '0')}` },
    estimated: IS_CURRENT,
    total: { bookCount: total.bookCount, ebook: total.ebook, print: total.print, kenp: total.kenp, royalty: total.royalty },
    kenpPagesRead: marketplaces ? marketplaces.reduce((a, m) => a + m.kenpPages, 0) : null,
    marketplaces,
    books: books.sort((a, b) => b.royalty - a.royalty),
  };

  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {
    version: 1,
    currency: 'JPY',
    source: 'KDP レポート（kdpreports.amazon.co.jp /royalties + /pmr）を npm run kdp-report で読み取り',
    caveat: '金額は Amazon 側の推計ロイヤリティ。当月分は estimated:true。KENP は翌月 15 日頃に確定するため、確定後に同月を再取得して上書きする。',
    months: {},
  };
  state.months[MONTH] = entry;
  state.updatedAt = todayJst();

  const top = entry.books.slice(0, 5).map((b) => `  ${(b.bookId || '--').padEnd(5)} ¥${String(b.royalty).padStart(5)}  ${b.title.slice(0, 44)}`).join('\n');
  console.log(`\n[${MONTH}] 推計ロイヤリティ ¥${total.royalty}（電子書籍 ¥${total.ebook} / 紙 ¥${total.print} / KENP ¥${total.kenp}）` +
    `${entry.kenpPagesRead != null ? ` / 既読 ${entry.kenpPagesRead} ページ` : ''}\n${top}`);

  if (DRY) console.log(`\n[dry-run] 保存せず終了（保存先: ${STATE}）`);
  else { mkdirSync(dirname(STATE), { recursive: true }); writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n'); console.log(`\n[saved] ${STATE}`); }
} finally {
  await ctx.close();
}
