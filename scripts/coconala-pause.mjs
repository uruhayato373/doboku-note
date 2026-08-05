#!/usr/bin/env node
/**
 * coconala-pause.mjs — 出品サービスの「受付を休止する」を安全に実行する
 * ---------------------------------------------------------------------------
 * 用途: 商品の統廃合で不要になった出品を、URL と実績を残したまま購入不可にする。
 *   2026-08-05 の C系統廃合（C1/C4/C5/C6/C7 → パック限定収録・模範答案セットへ統合）で新設。
 *
 * なぜ「受付休止」で「アーカイブ」ではないか:
 *   ポップオーバーの選択肢は2つ（実機確定 2026-08-05）。
 *     ①「受付を休止する」= a.js_change-open-status[data-mode=stop]（可逆・URL 温存・購入不可）
 *     ②「アーカイブ（非表示）にする」= 一覧から消える（復帰が重い）
 *   統廃合は「棚から下ろす」だけで、後で復活させる余地を残したいので ① を採る。
 *   カタログの status:'paused'（季節オフ＝出品中だが導線を伏せる）とも意味が一致する。
 *
 * 安全弁（delete-draft と同流儀の多重ガード・fail-closed）:
 *   G0 カタログ status が 'paused' のものだけ受け付ける
 *      → 'listed'（売れている現役商品）は**構造的に休止できない**。C8 のような実売商品の誤爆を防ぐ。
 *   G1 serviceUrl から数値 id を取り出せること（空 URL は拒否）
 *   G2 出品一覧に当該 id のアンカーが**ちょうど1つ**あること
 *   G3 現在 stop_fg=0（公開中）であること。既に休止中なら skip（エラーにしない＝再実行可能）
 *   G4 account assert（sellerName=dobokunote）
 *   既定 dry-run・実行は --commit。実行後は一覧を再読して stop_fg=1 を**実測で検証**する。
 *
 * 実機確定（2026-08-05）:
 *   一覧 /mypage/services_lists の各行 div.action に
 *     a[href="/mypage/services/{id}"]（編集する）
 *     a.js_publish-links-popver[data-publish-links='{"id","stop_fg","opened","order_count"}']（公開設定）
 *   公開設定クリックで popover が開き
 *     a.js_change-open-status[data-mode="stop"][href="/services/stop/{id}"]（受付を休止する）
 *
 * 使い方:
 *   node scripts/coconala-pause.mjs --service coconala-bunseki-pdf              # dry-run
 *   node scripts/coconala-pause.mjs --service a,b,c --commit                    # 実行（カンマ区切り可）
 *   node scripts/coconala-pause.mjs --all-paused --commit                       # カタログ paused 全部
 *
 * exit: 0=成功/skip / 1=ガード違反・検証失敗 / 2=ログイン/アカウント不一致
 * 真実源: .claude/knowledge/reference/coconala-operations.md §8
 * ---------------------------------------------------------------------------
 */
import {
  launchContext,
  waitForLogin,
  assertAccount,
  readCatalog,
  sleep,
} from './lib/coconala-session.mjs';

const TAG = '[coconala-pause]';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const ALL_PAUSED = argv.includes('--all-paused');
const HEADLESS = argv.includes('--headless');

const LIST_URL = 'https://coconala.com/mypage/services_lists';

const catalog = readCatalog();
let ids = (getArg('--service') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (ALL_PAUSED) ids = Object.values(catalog).filter((s) => s.status === 'paused').map((s) => s.id);
if (ids.length === 0) {
  console.error(`${TAG} --service <id[,id]> か --all-paused が必要`);
  process.exit(1);
}

// ---- G0/G1: カタログ側の事前ガード（ブラウザを開く前に落とす） ----
const targets = [];
const rejected = [];
for (const id of ids) {
  const svc = catalog[id];
  if (!svc) { rejected.push(`${id}: カタログに存在しない`); continue; }
  if (svc.status !== 'paused') {
    rejected.push(`${id}: status='${svc.status}' — 休止できるのは status:'paused' のものだけ（先にカタログを paused にしてください）`);
    continue;
  }
  const sid = (svc.serviceUrl.match(/services\/(\d+)/) || [])[1];
  if (!sid) { rejected.push(`${id}: serviceUrl から数値 id を取れない（"${svc.serviceUrl}"）`); continue; }
  targets.push({ id, sid, title: svc.title });
}
if (rejected.length) {
  console.error(`${TAG} ✗ ガードで拒否 ${rejected.length} 件:`);
  for (const r of rejected) console.error(`  - ${r}`);
}
if (targets.length === 0) { console.error(`${TAG} 対象 0 件で終了`); process.exit(1); }

console.log(`${TAG} 対象 ${targets.length} 件 / mode=${COMMIT ? 'COMMIT(実行)' : 'DRY-RUN'}`);
for (const t of targets) console.log(`  - ${t.id} (id=${t.sid}) ${t.title}`);

/**
 * 一覧の 1 ページ分の公開状態を data-publish-links から読む。
 * 出品一覧は **1ページ 10 件でページ送りされる**（2026-08-05 実機確定・pager の a要素は無く
 * ?page=N を直接叩く）。1ページ目しか見ないと 11 件目以降が「一覧に見つからない」に化ける。
 */
async function readPage(page, n) {
  const url = n === 1 ? LIST_URL : `${LIST_URL}?page=${n}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  await sleep(2000);
  return page.evaluate(() =>
    [...document.querySelectorAll('a.js_publish-links-popver')].map((a) => {
      try { return JSON.parse(a.getAttribute('data-publish-links') || '{}'); } catch { return {}; }
    })
  );
}

/** 全ページを走査して公開状態を集める（10件未満のページに当たったら終端） */
async function readStates(page, { maxPages = 12 } = {}) {
  const all = [];
  for (let n = 1; n <= maxPages; n++) {
    const rows = await readPage(page, n);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 10) break;
  }
  return all;
}

/** 対象 id が載っているページ番号を返す（操作はそのページ上で行う必要がある） */
async function findPageOf(page, sid, { maxPages = 12 } = {}) {
  for (let n = 1; n <= maxPages; n++) {
    const rows = await readPage(page, n);
    if (rows.length === 0) return null;
    if (rows.some((r) => String(r.id) === sid)) return n;
    if (rows.length < 10) return null;
  }
  return null;
}

const ctx = await launchContext({ headless: HEADLESS });
const page = ctx.pages()[0] || (await ctx.newPage());

const login = await waitForLogin(page, { tag: TAG });
if (!login.ok) { console.error(`${TAG} ✗ ${login.reason}`); await ctx.close(); process.exit(2); }
const acct = await assertAccount(page, { tag: TAG });
if (!acct.ok) { console.error(`${TAG} ✗ アカウント不一致で中断: ${acct.reason}`); await ctx.close(); process.exit(2); }

let before = await readStates(page);
const byId = (arr) => new Map(arr.map((s) => [String(s.id), s]));

const results = [];
for (const t of targets) {
  const st = byId(before).get(t.sid);
  // G2: 一覧に居るか
  if (!st) { results.push({ ...t, outcome: 'ng', reason: '出品一覧に見つからない' }); continue; }
  // G3: 既に休止中なら skip
  if (String(st.stop_fg) === '1') { results.push({ ...t, outcome: 'skip', reason: '既に受付休止中' }); continue; }

  if (!COMMIT) { results.push({ ...t, outcome: 'dry-run', reason: `stop_fg=${st.stop_fg} → 休止可（--commit で実行）` }); continue; }

  // 操作は対象が載っているページ上で行う（一覧は10件でページ送り）
  const pageNo = await findPageOf(page, t.sid);
  if (pageNo === null) { results.push({ ...t, outcome: 'ng', reason: '一覧のどのページにも見つからない' }); continue; }

  // 公開設定 popover を開く
  const anchor = page.locator(`a.js_publish-links-popver[data-publish-links*='"id":"${t.sid}"']`);
  const n = await anchor.count();
  if (n !== 1) { results.push({ ...t, outcome: 'ng', reason: `公開設定アンカーが ${n} 個（1個であるべき）` }); continue; }
  await anchor.first().click({ timeout: 10000 });
  await sleep(1500);

  // 「受付を休止する」= data-mode=stop かつ href が当該 id
  const stopLink = page.locator(`a.js_change-open-status[data-mode="stop"][href="/services/stop/${t.sid}"]`);
  if ((await stopLink.count()) === 0) {
    results.push({ ...t, outcome: 'ng', reason: '「受付を休止する」導線が popover に無い（UI 変更の疑い）' });
    await page.keyboard.press('Escape').catch(() => {});
    continue;
  }
  await stopLink.first().click({ timeout: 10000 });
  await sleep(2500);
  // 確認ダイアログ（あれば OK / はい を押す）
  for (const label of ['OK', 'はい', '休止する']) {
    const b = page.getByRole('button', { name: label, exact: true }).filter({ visible: true });
    if ((await b.count()) > 0) { await b.first().click({ timeout: 5000 }).catch(() => {}); await sleep(2000); break; }
  }
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  await sleep(1500);

  // 実測で検証（自己申告を信じない）
  before = await readStates(page);
  const after = byId(before).get(t.sid);
  if (after && String(after.stop_fg) === '1') results.push({ ...t, outcome: 'ok', reason: 'stop_fg=1 を実測で確認' });
  else results.push({ ...t, outcome: 'ng', reason: `休止を反映できていない（stop_fg=${after?.stop_fg ?? '不明'}）` });
}

await ctx.close();

console.log('');
const c = (o) => results.filter((r) => r.outcome === o).length;
console.log(`${TAG} 実行 ${results.length} 件: ok=${c('ok')} skip=${c('skip')} dry-run=${c('dry-run')} ng=${c('ng')}`);
for (const r of results) console.log(`  [${r.outcome}] ${r.id} — ${r.reason}`);
if (c('ng') > 0) { console.error(`${TAG} ✗ 失敗 ${c('ng')} 件`); process.exit(1); }
console.log(`${TAG} ✓ ${COMMIT ? '休止を反映' : 'dry-run 完了（--commit で実行）'}`);
