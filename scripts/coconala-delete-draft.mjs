#!/usr/bin/env node
/**
 * coconala-delete-draft.mjs — ココナラの「空の下書き」を安全に削除するクリーナー
 * ---------------------------------------------------------------------------
 * 出品自動化の失敗（例: --image の不正パスで下書き作成後にクラッシュ）で残る
 * orphan draft（サービスタイトル未設定・¥0・下書き中）を掃除する。
 *
 * 4重ガードで「公開中の商品」を誤爆しない設計:
 *   G0 カタログ在籍拒否 … --id がカタログ(coconala-services.ts)の serviceId なら即中断
 *   G1 URL一致        … /mypage/services/{id} に実際に居ることを確認
 *   G2 タイトル空      … #ServiceOverview が存在し空（＝空の下書き）でなければ skip
 *   G3 下書き専用導線  … 「下書きを削除」リンク（公開中サービスには出ない）が在る時のみ削除
 *
 * 安全弁: 既定は dry-run（検査のみ）。実削除は --commit。account assert。
 *
 * 使い方:
 *   node scripts/coconala-delete-draft.mjs --id 4317883                 # dry-run（検査のみ）
 *   node scripts/coconala-delete-draft.mjs --id 4317883,4317565 --commit # 実削除
 * ---------------------------------------------------------------------------
 */
import {
  launchContext, waitForLogin, assertAccount, sleep, readCatalog,
} from './lib/coconala-session.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const IDS = (getArg('--id') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!IDS.length) { console.error('--id <数値[,数値...]> required'); process.exit(1); }

// G0: カタログ在籍の serviceId は絶対に消さない（公開/退役商品の保護）。
const catalog = readCatalog();
const CATALOG_IDS = new Set(
  Object.values(catalog).map((s) => (s.serviceUrl.match(/\/services\/(\d+)/) || [])[1]).filter(Boolean),
);
const inCatalog = IDS.filter((id) => CATALOG_IDS.has(id));
if (inCatalog.length) { console.error(`ABORT: カタログ在籍の serviceId は削除しない: ${inCatalog.join(',')}`); process.exit(1); }

console.log(`[prep] delete-draft ids=${IDS.join(',')} mode=${COMMIT ? 'COMMIT(実削除)' : 'DRY-RUN(検査のみ)'}`);

const ctx = await launchContext({ headless: false });
const results = [];
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.on('dialog', async (d) => { try { await d.accept(); } catch {} }); // native confirm
  const lg = await waitForLogin(page, { tag: '[del]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); await ctx.close(); process.exit(2); }
  const acc = await assertAccount(page, { tag: '[del]' });
  if (!acc.ok) { console.error('ABORT:', acc.reason); await ctx.close(); process.exit(2); }

  for (const id of IDS) {
    const want = `https://coconala.com/mypage/services/${id}`;
    await page.goto(want, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await sleep(2500);
    // G1: URL一致
    if (!page.url().startsWith(want)) { results.push([id, `SKIP: URL不一致(${page.url().slice(0, 48)})`]); continue; }
    const st = await page.evaluate(() => {
      const t = document.querySelector('#ServiceOverview');
      const del = [...document.querySelectorAll('a,button')].find((e) => (e.innerText || '').trim() === '下書きを削除');
      return { hasTitleField: !!t, title: t ? t.value : null, hasDraftDelete: !!del };
    });
    // G2: タイトル空
    if (!st.hasTitleField) { results.push([id, 'SKIP: タイトルフィールド無し（編集ページでない）']); continue; }
    if ((st.title || '').trim() !== '') { results.push([id, `SKIP: タイトル非空("${st.title}")=消さない`]); continue; }
    // G3: 下書き専用導線
    if (!st.hasDraftDelete) { results.push([id, 'SKIP: 「下書きを削除」導線なし（公開/審査中の可能性）']); continue; }

    if (!COMMIT) { results.push([id, 'DRY-RUN: 空の下書き・削除可（--commit で実行）']); continue; }
    // 実削除
    await page.evaluate(() => { [...document.querySelectorAll('a,button')].find((e) => (e.innerText || '').trim() === '下書きを削除')?.click(); });
    await sleep(1500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('a,button')].find((e) => /^(削除する|削除|はい|OK|実行)$/.test((e.innerText || '').trim()) && e.offsetParent !== null);
      b?.click();
    });
    await sleep(2500);
    // 検証: 再訪して消えているか
    await page.goto(want, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await sleep(2000);
    const gone = await page.evaluate(() => /見つかりませんでした|掲載期間が終了/.test(document.body.innerText) || !document.querySelector('#ServiceOverview'));
    results.push([id, gone ? '✓ 削除完了（再訪で消滅を確認）' : '⚠ 削除未確認（再訪で残存・要手動確認）']);
  }
} finally {
  await ctx.close();
}
console.log('=== 結果 ===');
for (const [id, r] of results) console.log(id, '|', r);
