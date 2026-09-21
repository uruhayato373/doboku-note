#!/usr/bin/env node
/**
 * brain-sales-fetch.mjs
 * ---------------------------------------------------------------------------
 * Brain（brain-market.com）の販売管理ページを Playwright read-only で読み取り、
 * .claude/state/sales/brain-sales.json へ月次で保存する。
 *
 * 背景: kdp-report.mjs / note-sales-fetch.mjs と同じく、Brain の売上も手動転記だと
 * 「読んだ月」と「読んでいない月」が外から区別できない。読み取りは自動化するが、
 * 書き込みは追記専用（同月の再取得は supersedes に前回値を退避してから差し替える）にして
 * 履歴を消さない。
 *
 * 方針（正直さ優先）:
 *   - 販売管理ページの URL・DOM 構造は**未調査**。selector は .claude/config/brain-account.json の
 *     salesPage { url, rowSelector, cells: { title, date, amount } } から読む。未設定（null）の間は
 *     「selector 未設定＝検査不成立」で exit 2 にする（実機で初回調査してから埋める）。
 *   - ページ抽出は extractSalesRows(page) 1 関数に隔離し、selector 変更時はここだけ直す。
 *   - productId は src/lib/brain-products.ts（brain-session.mjs の readCatalog()）の title 一致で
 *     解決する。一致しなければ捏造せず brain:unknown-<slug> で保留する。
 *   - productsListed が 0 の月は「実績ゼロ」ではなく「取得できなかった」として exit 2 にする
 *     （0 件と未取得を区別する。§9）。
 *
 * 使い方:
 *   node scripts/brain-sales-fetch.mjs                  # 当月・headful（ログイン確認用）
 *   node scripts/brain-sales-fetch.mjs --month 2026-09 --headless --json
 *
 * 終了コード: 0=取得成功（1 件以上保存） / 1=想定外のエラー / 2=検査不成立（selector 未設定・0 件）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAccount, readCatalog, launchContext, assertAccount } from './lib/brain-session.mjs';
import { todayJst } from './lib/jst-date.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STATE_FILE = join(ROOT, '.claude/state/sales/brain-sales.json');
const NAME = 'brain-sales-fetch';

class SalesPageConfigError extends Error {}

/** salesPage 設定を読む。未設定/不完全なら SalesPageConfigError を投げる（捏造せず止める）。 */
function requireSalesPageConfig() {
  const config = readAccount().salesPage;
  if (!config || !config.url || !config.rowSelector || !config.cells) {
    throw new SalesPageConfigError(
      '.claude/config/brain-account.json の salesPage が未設定（selector 未調査）。実機で調査してから埋めること'
    );
  }
  return config;
}

/**
 * 販売管理ページから 1 行 = 1 商品/1 明細の生データを抽出する。
 * selector 変更が起きたときに直す箇所をここ 1 か所へ隔離する。
 */
export async function extractSalesRows(page) {
  const config = requireSalesPageConfig();
  await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const { rowSelector, cells } = config;
  const raw = await page.$$eval(
    rowSelector,
    (nodes, cells) =>
      nodes.map((el) => {
        const pick = (sel) => (sel ? (el.querySelector(sel)?.textContent || '').trim() : '');
        return { title: pick(cells.title), date: pick(cells.date), amount: pick(cells.amount) };
      }),
    cells
  );
  return raw.map((r) => ({ ...r, amount: Number(String(r.amount).replace(/[^\d.-]/g, '')) || 0 }));
}

/**
 * 生の販売行を { productId, title, date, amount } へ正規化する純関数。
 * - month に一致する日付の行だけを対象にする（ページ側の絞り込みが漏れても安全側）。
 * - productId は listings（readCatalog() の title）一致で解決。未解決は捏造せず
 *   brain:unknown-<slug> で保留する。
 *
 * @param {Array<{title:string,date:string,amount:number}>} rows
 * @param {Array<{id:string,title:string}>} listings readCatalog() の戻り値
 * @param {string} month 'YYYY-MM'
 * @returns {{productsListed:number, rows:Array<object>, totalYen:number}}
 */
export function normalizeBrainSales(rows, listings, month) {
  const inMonth = (Array.isArray(rows) ? rows : []).filter(
    (r) => typeof r?.date === 'string' && r.date.startsWith(month)
  );
  const byTitle = new Map((Array.isArray(listings) ? listings : []).map((l) => [String(l.title || '').trim(), l.id]));
  const out = inMonth.map((r) => {
    const title = String(r.title || '').trim();
    const amount = Number(r.amount) || 0;
    const productId = byTitle.get(title) || `brain:unknown-${slugify(title)}`;
    return { productId, title, date: r.date, amount };
  });
  const totalYen = out.reduce((sum, r) => sum + r.amount, 0);
  return { productsListed: out.length, rows: out, totalYen };
}

function slugify(title) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-+|-+$)/g, '');
  return slug || 'item';
}

/**
 * 既存 state へ 1 か月分をマージする純関数（追記専用）。同月に既存エントリがあれば
 * supersedes へ退避してから差し替える（履歴を消さない）。
 *
 * @param {{schemaVersion:number, updatedAt:string, months:object}|null|undefined} existing
 * @param {{month:string, productsListed:number, rows:Array<object>, totalYen:number}} incoming
 * @param {string} now ISO タイムスタンプ（entry.fetchedAt と updatedAt の元）
 */
export function mergeMonth(existing, incoming, now) {
  if (!incoming || !incoming.month) throw new Error('mergeMonth: incoming.month is required');
  const months = { ...((existing && existing.months) || {}) };
  const { month, productsListed, rows, totalYen } = incoming;
  const prior = months[month];
  const entry = { productsListed, rows, totalYen, fetchedAt: now };
  if (prior) {
    entry.supersedes = {
      productsListed: prior.productsListed,
      rows: prior.rows,
      totalYen: prior.totalYen,
      fetchedAt: prior.fetchedAt,
    };
  }
  months[month] = entry;
  return { schemaVersion: 1, updatedAt: todayJst(Date.parse(now)), months };
}

async function main() {
  const argv = process.argv.slice(2);
  const getArg = (k) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : null;
  };
  const HEADLESS = argv.includes('--headless');
  const JSON_OUT = argv.includes('--json');

  const now = new Date();
  const MONTH = getArg('--month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}$/.test(MONTH)) {
    console.error(`${NAME}: --month は YYYY-MM 形式で指定する（例: 2026-09）`);
    process.exit(1);
  }

  // 早期チェック（ブラウザを開く前に selector 未設定を検出する）
  try {
    requireSalesPageConfig();
  } catch (e) {
    if (e instanceof SalesPageConfigError) {
      console.error(`ABORT: ${NAME} — ${e.message}。検査不成立`);
      process.exit(2);
    }
    throw e;
  }

  const ctx = await launchContext({ headless: HEADLESS });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await assertAccount(page, { tag: `[${NAME}]` });

    const rawRows = await extractSalesRows(page);
    const listings = readCatalog();
    const normalized = normalizeBrainSales(rawRows, listings, MONTH);

    if (normalized.productsListed === 0) {
      console.error(`ABORT: ${NAME} — ${MONTH} の販売行を 1 件も取得できず（0 件と未取得は区別する）。検査不成立`);
      process.exit(2);
    }

    const fetchedAt = new Date().toISOString();
    const existing = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null;
    const state = mergeMonth(existing, { month: MONTH, ...normalized }, fetchedAt);

    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');

    const unresolved = normalized.rows.filter((r) => r.productId.startsWith('brain:unknown-')).length;
    console.log(
      `[${MONTH}] productsListed=${normalized.productsListed} totalYen=¥${normalized.totalYen}` +
        (unresolved ? ` / 未解決 ${unresolved} 件` : '')
    );
    console.log(`[saved] ${STATE_FILE}`);
    if (JSON_OUT) console.log(JSON.stringify({ month: MONTH, ...normalized, fetchedAt }));
  } finally {
    await ctx.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`ABORT: ${NAME} — 想定外のエラー: ${e.message}`);
    process.exit(1);
  });
}
