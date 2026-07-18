#!/usr/bin/env node
/**
 * coconala-publish.mjs — ココナラ サービスを新規出品する Playwright パブリッシャ
 * ---------------------------------------------------------------------------
 * note-publish.mjs と同思想（永続プロファイル + 安全弁 + draft-first + --commit gate）。
 * カタログ（coconala-services.ts＝価格/状態/URL の SoT）と listings（.claude/config/
 * coconala-listings.json＝本文/カテゴリ/納期）を serviceId で引き、出品フォームへ流し込む。
 *
 * 工程: ログイン確認 → account assert → /services/add でサービス種別=テキストチャット/
 *   データ納品を選び「内容の入力に進む」→ 生成された下書き編集ページで fillServiceForm →
 *   「下書きで保存」（既定）/ 「公開する」（--commit）→ 公開時はカタログへ書き戻し（status/URL/listedAt）。
 *
 * 安全弁:
 *   1. account assert（coconala-account.json の sellerName・未設定ならログイン済みのみ）
 *   2. 既定は下書き保存。実公開は --commit 必須
 *   3. カタログの status が既に listed でURLがある serviceId は二重出品しない（冪等）
 *   4. --commit でもフォームのバリデーションエラーが出たら「公開した」と報告しない
 *
 * 使い方:
 *   node scripts/coconala-publish.mjs --service coconala-shindan            # 下書き作成のみ（既定）
 *   node scripts/coconala-publish.mjs --service coconala-tensaku-set --commit  # 公開
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, launchContext, waitForLogin, assertAccount, sleep,
  readCatalog, readListings, CATALOG_PATH,
} from './lib/coconala-session.mjs';
import { fillServiceForm, submitForm, dismissModal } from './lib/coconala-form.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const SERVICE = getArg('--service');
if (!SERVICE) { console.error('--service <id> required（例: coconala-shindan）'); process.exit(1); }

const catalog = readCatalog();
const listings = readListings();
const svc = catalog[SERVICE];
const lst = listings[SERVICE];
if (!svc) { console.error(`ABORT: カタログに serviceId "${SERVICE}" が無い`); process.exit(1); }
if (!lst) { console.error(`ABORT: listings に "${SERVICE}" が無い（.claude/config/coconala-listings.json）`); process.exit(1); }

// 冪等ガード: 既に出品済み（listed + serviceUrl あり）なら二重出品しない
if (svc.status === 'listed' && /^https?:\/\//.test(svc.serviceUrl || '')) {
  console.log(`[skip] 既に出品済み: ${svc.serviceUrl}（新規出品はしない。修正は coconala-edit.mjs）`);
  process.exit(0);
}
// カテゴリ未確定ガード
if (!lst.category || !lst.category.master || !lst.category.sub) {
  console.error(`ABORT: listings["${SERVICE}"].category が未確定（master/sub）。coconala-discover でカテゴリ確定を`);
  process.exit(1);
}

const fields = {
  title: svc.title,
  catchphrase: lst.catchphrase,
  category: lst.category,
  genreFacets: lst.genreFacets || [],
  provisionFormat: lst.provisionFormat || '1',
  body: lst.body,
  purchaseNote: lst.purchaseNote,
  priceYen: svc.priceYen,
  deliveryDays: lst.deliveryDays,
};
console.log(`[prep] service=${SERVICE} title="${(svc.title || '').slice(0, 30)}" price=¥${svc.priceYen} cat=${lst.category.master}/${lst.category.sub} mode=${COMMIT ? 'COMMIT(公開)' : 'DRAFT(下書き)'}`);

mkdirSync(join(ROOT, '.tmp/coconala'), { recursive: true });
const shot = (n) => join(ROOT, '.tmp/coconala', n);

const ctx = await launchContext({ headless: false });
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. ログイン + account assert
  const lg = await waitForLogin(page, { tag: '[publish]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); await ctx.close(); process.exit(2); }
  const acc = await assertAccount(page, { tag: '[publish]' });
  if (!acc.ok) { console.error('ABORT:', acc.reason); await ctx.close(); process.exit(2); }
  console.log('[1] login + account OK');

  // 2. /services/add でサービス種別を選択 → 内容入力へ
  await page.goto('https://coconala.com/services/add', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  await dismissModal(page);
  const label = page.getByText('テキストチャット・', { exact: false });
  if (await label.count()) await label.first().click();
  else {
    await page.evaluate(() => {
      const r = document.querySelector('input[name="service-type"]');
      const lbl = r?.closest('label'); (lbl || r)?.click();
    });
  }
  await sleep(1500);
  const proceed = page.getByRole('button', { name: '内容の入力に進む' });
  if (!(await proceed.count())) { console.error('ABORT: 「内容の入力に進む」未検出'); await page.screenshot({ path: shot('publish-add.png') }); await ctx.close(); process.exit(3); }
  try { await proceed.first().click({ timeout: 10000 }); }
  catch { await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /内容の入力に進む/.test(x.innerText)); b?.click(); }); }
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4000);
  const editUrl = page.url();
  const sid = (editUrl.match(/\/services\/(\d+)/) || [])[1] || '';
  console.log('[2] 内容入力ページ:', editUrl, 'serviceId=', sid || '(不明)');
  if (!/\/mypage\/services\/\d+/.test(editUrl)) { console.error('ABORT: 内容入力ページに遷移していない'); await page.screenshot({ path: shot('publish-noedit.png') }); await ctx.close(); process.exit(3); }

  // 3. フォーム充填
  const { log, warnings } = await fillServiceForm(page, fields, { tag: '[publish]' });
  log.forEach((l) => console.log('   ', l));
  if (warnings.length) { console.log('[3] ⚠ warnings:'); warnings.forEach((w) => console.log('    -', w)); }
  await page.screenshot({ path: shot(`publish-filled-${SERVICE}.png`), fullPage: true });

  // 4. 送信
  if (COMMIT && warnings.some((w) => /価格|category/.test(w))) {
    console.error('[4] ★中断: 価格/カテゴリの充填に warning があるため公開しない（下書き保存に退避）★');
    const r = await submitForm(page, { commit: false, tag: '[publish]' });
    console.log('[4] 下書き保存:', JSON.stringify(r));
    process.exitCode = 3;
  } else {
    const r = await submitForm(page, { commit: COMMIT, tag: '[publish]' });
    console.log(`[4] ${r.action}:`, JSON.stringify({ ok: r.ok, url: r.url, errors: r.errors }));
    await page.screenshot({ path: shot(`publish-result-${SERVICE}.png`), fullPage: true });
    if (COMMIT && r.ok) {
      // 公開成功 → カタログへ書き戻し（status:'listed' + serviceUrl + listedAt）
      const pubId = sid || (r.url.match(/\/services\/(\d+)/) || [])[1] || '';
      const publicUrl = pubId ? `https://coconala.com/services/${pubId}` : '';
      writeBackCatalog(SERVICE, publicUrl);
      console.log(`[5] カタログ書き戻し: ${SERVICE} → listed / ${publicUrl}`);
      console.log('    ★ account.json の sellerName/profileUrl/listedAt も未設定なら埋めてください（check-coconala-wiring が listed で profileUrl 必須）');
    } else if (COMMIT && !r.ok) {
      console.error('[5] 公開はバリデーションエラーで未完了（上記 errors 参照・.tmp/coconala のスクショ確認）');
      process.exitCode = 2;
    }
  }
  await page.screenshot({ path: shot(`publish-final-${SERVICE}.png`) });
  console.log('RESULT:', JSON.stringify({ service: SERVICE, mode: COMMIT ? 'commit' : 'draft', serviceId: sid }));
} finally {
  await ctx.close();
}

/** カタログ（coconala-services.ts）の該当 service を status:'listed' + serviceUrl + listedAt に書き戻す */
function writeBackCatalog(id, url) {
  try {
    let ts = readFileSync(CATALOG_PATH, 'utf-8');
    const today = new Date().toISOString().slice(0, 10);
    // 該当 id ブロック（id: 'X' から次の '},' まで）を切り出して置換
    const idRe = new RegExp(`(id:\\s*'${id}',[\\s\\S]*?)(\\n\\s*\\},)`);
    const m = ts.match(idRe);
    if (!m) { console.log('[writeback] id ブロック未検出（手動更新を）'); return; }
    let block = m[1];
    block = block.replace(/status:\s*'[^']*'/, "status: 'listed'");
    block = block.replace(/serviceUrl:\s*'[^']*'/, `serviceUrl: '${url}'`);
    if (/listedAt:/.test(block)) block = block.replace(/listedAt:\s*'[^']*'/, `listedAt: '${today}'`);
    else block = block.replace(/(weeklyCapacity:\s*\d+,)/, `$1\n    listedAt: '${today}',`);
    ts = ts.replace(idRe, block + m[2]);
    writeFileSync(CATALOG_PATH, ts);
  } catch (e) { console.log('[writeback] skip:', e.message.split('\n')[0]); }
}
