#!/usr/bin/env node
/**
 * coconala-edit.mjs — 既存ココナラ サービスの内容を SoT から修正する Playwright エディタ
 * ---------------------------------------------------------------------------
 * カタログ（coconala-services.ts）＋ listings（coconala-listings.json）を真実源に、
 * 既存サービスの編集ページ（/mypage/services/{id}）を開いてフィールドを再充填する。
 * 価格改定・文面修正・カテゴリ変更を「SoT を直してこのスクリプトを回す」運用にする。
 *
 * 安全弁: 既定は「下書きで保存」。反映（再公開）は --commit。account assert。
 *
 * 使い方:
 *   node scripts/coconala-edit.mjs --service coconala-tensaku-set --commit      # カタログの現値を反映
 *   node scripts/coconala-edit.mjs --service coconala-shindan --fields price     # 価格だけ更新（下書き保存）
 *   node scripts/coconala-edit.mjs --service-id 4317349 --service coconala-shindan  # 下書きを直接編集（テスト用）
 *
 * --fields で更新対象を限定（カンマ区切り: title,catchphrase,category,body,purchaseNote,price,delivery）。
 * 省略時は全フィールドを SoT で上書き（フル同期）。
 * ---------------------------------------------------------------------------
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, launchContext, waitForLogin, assertAccount, sleep, readCatalog, readListings, writeBackCatalog, resolveImagePath,
} from './lib/coconala-session.mjs';
import { fillServiceForm, submitForm, uploadImage, replaceImage } from './lib/coconala-form.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const SERVICE = getArg('--service');
const SERVICE_ID = getArg('--service-id'); // 数値 id を直接指定（下書きの直接編集）
const ONLY = (getArg('--fields') || '').split(',').map((s) => s.trim()).filter(Boolean);
// --image <path>: 商品画像をアップロード。既定は「画像だけ追加して更新」（本文フィールドは触らない）。
// listings に画像パスが無いので明示指定。省略時は .claude/config/coconala/assets/thumb-<key>.png を既定候補に。
const IMAGE = getArg('--image');
const FORCE_IMAGE = argv.includes('--force-image');
// --replace-image: 既存スロットを全削除してから --image を1枚入れる（デザイン刷新用・2026-08-05）。
//   uploadImage は追加専用なので、差し替えたいときはこちらを使う。
const REPLACE_IMAGE = argv.includes('--replace-image');
// bare 名は assets 既定へ解決＋事前存在確認（publish と同じ・orphan/中断防止）。
const imgResolved = resolveImagePath(IMAGE);
if (!imgResolved.ok) { console.error(`ABORT: ${imgResolved.reason}（--image は bare 名なら .claude/config/coconala/assets/ に解決）`); process.exit(1); }
const IMAGE_ABS = imgResolved.abs;
const IMAGE_ONLY = !!IMAGE && ONLY.length === 0; // --image かつ --fields 指定なし → 画像のみ更新
if (!SERVICE) { console.error('--service <id> required（listings/カタログの id）'); process.exit(1); }

const catalog = readCatalog();
const listings = readListings();
const svc = catalog[SERVICE];
const lst = listings[SERVICE];
if (!svc) { console.error(`ABORT: カタログに "${SERVICE}" が無い`); process.exit(1); }
if (!lst) { console.error(`ABORT: listings に "${SERVICE}" が無い`); process.exit(1); }

// 編集対象の数値 id を解決: --service-id 優先 → カタログ serviceUrl から
let numericId = SERVICE_ID;
if (!numericId) numericId = (svc.serviceUrl.match(/\/services\/(\d+)/) || [])[1];
if (!numericId) { console.error(`ABORT: 編集対象の数値 id を解決できない（listed で serviceUrl があるか、--service-id を指定）`); process.exit(1); }

// フルフィールド → --fields で絞り込み
const allFields = {
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
const keyMap = { title: 'title', catchphrase: 'catchphrase', category: 'category', body: 'body', purchaseNote: 'purchaseNote', price: 'priceYen', delivery: 'deliveryDays' };
let fields = allFields;
if (ONLY.length) {
  fields = {};
  for (const k of ONLY) { const fk = keyMap[k] || k; if (fk in allFields) fields[fk] = allFields[fk]; }
  // category を触るなら provisionFormat も保持不要（部分更新）
}
console.log(`[prep] edit service=${SERVICE} id=${numericId} fields=${ONLY.length ? ONLY.join(',') : 'ALL'} mode=${COMMIT ? 'COMMIT(反映)' : 'DRAFT(下書き)'}`);

mkdirSync(join(ROOT, '.tmp/coconala'), { recursive: true });
const shot = (n) => join(ROOT, '.tmp/coconala', n);

const ctx = await launchContext({ headless: false });
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  const lg = await waitForLogin(page, { tag: '[edit]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); await ctx.close(); process.exit(2); }
  const acc = await assertAccount(page, { tag: '[edit]' });
  if (!acc.ok) { console.error('ABORT:', acc.reason); await ctx.close(); process.exit(2); }

  await page.goto(`https://coconala.com/mypage/services/${numericId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  await sleep(3000);
  if (!/\/mypage\/services\/\d+/.test(page.url())) { console.error('ABORT: 編集ページに到達できない（id 不正 or 権限）'); await ctx.close(); process.exit(3); }

  // 画像アップロード（--image）。IMAGE_ONLY なら本文フィールドは触らない（画像だけ更新）。
  if (IMAGE_ABS) {
    const ir = REPLACE_IMAGE
      ? await replaceImage(page, IMAGE_ABS, { tag: '[edit]' })
      : await uploadImage(page, IMAGE_ABS, { tag: '[edit]', force: FORCE_IMAGE });
    console.log(`[edit] 画像${REPLACE_IMAGE ? '差し替え' : ''}:`, JSON.stringify(ir));
    if (!ir.ok) { console.error('[edit] ★画像アップロード失敗→中断（保存しない）'); await page.screenshot({ path: shot(`edit-image-fail-${SERVICE}.png`) }).catch(() => {}); await ctx.close(); process.exit(3); }
    if (!REPLACE_IMAGE && !ir.added && !FORCE_IMAGE) { console.log('[edit] 画像は既存のため追加せず終了（--force-image で追加可）'); await ctx.close(); process.exit(0); }
  }

  if (!IMAGE_ONLY) {
    const { log, warnings } = await fillServiceForm(page, fields, { tag: '[edit]' });
    log.forEach((l) => console.log('   ', l));
    if (warnings.length) { console.log('[edit] ⚠ warnings:'); warnings.forEach((w) => console.log('    -', w)); }
  }
  await page.screenshot({ path: shot(`edit-filled-${SERVICE}.png`) }).catch(() => {});

  const r = await submitForm(page, { commit: COMMIT, tag: '[edit]' });
  console.log(`[edit] ${r.action}:`, JSON.stringify({ ok: r.ok, url: r.url, errors: r.errors }));
  await page.screenshot({ path: shot(`edit-result-${SERVICE}.png`) }).catch(() => {});
  // 公開成功 & カタログがまだ draft → listed へ書き戻し（下書きを公開した場合）
  if (COMMIT && r.ok && svc.status === 'draft') {
    const publicUrl = `https://coconala.com/services/${numericId}`;
    if (writeBackCatalog(SERVICE, publicUrl)) console.log(`[edit] カタログ書き戻し: ${SERVICE} → listed / ${publicUrl}`);
    console.log('    ★ account.json は既設定。/links には listed で表示されます');
  }
  if (!r.ok) process.exitCode = 2;
  console.log('RESULT:', JSON.stringify({ service: SERVICE, id: numericId, mode: COMMIT ? 'commit' : 'draft', ok: r.ok }));
} finally {
  await ctx.close();
}
