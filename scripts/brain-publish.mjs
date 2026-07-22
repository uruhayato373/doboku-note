#!/usr/bin/env node
/**
 * brain-publish.mjs — Brain（brain-market.com）へ Claude Code キット商品を出品する
 * ---------------------------------------------------------------------------
 * coconala-publish.mjs と同思想（永続プロファイル + 安全弁 + draft-first + --commit gate）。
 * カタログ（src/lib/brain-products.ts＝価格/状態/URL）と listings
 * （.claude/config/brain-listings.json＝本文/画像/有料ライン）を serviceId で引き、
 * Tiptap エディタへ流し込む。2026-07-22 の実出品2件で確立したフローの恒久実装。
 *
 * 工程: ログイン待ち → account assert → 記事作成（or --edit-url で既存ドラフト再開）
 *   → タイトル/本文（ProseMirror・行単位 insertText）→ メイン画像（トリミング「適用」）
 *   → 下書き保存（既定はここまで）
 *   → --commit: 販売設定（価格）→ 有料エリア（paidMarker 直前にライン・可視テキスト assert）
 *   → 公開申請 → 確認モーダル（価格 assert）→ 最終確定 → /a/complete_published で成功判定
 *   → カタログへ status:'submitted' + articleId + submittedAt を書き戻し
 *
 * 安全弁:
 *   1. 審査ガイドライン同意モーダルが出た場合、--agree なしでは押さず ABORT（同意はユーザー許可事項）
 *   2. 既定は下書きまで。公開申請は --commit 必須
 *   3. カタログが既に submitted/listed の service は二重申請しない（--force-resubmit で解除）
 *   4. 販売設定は Brain 側でセッション状態（保存されない）→ --commit は価格〜申請を1セッションで実行
 *   5. 有料ラインは body.innerText（可視テキスト）で assert（各コントロールに非表示代替ラベルがあり DOM 検査は誤検知）
 *   6. 確認モーダルの表示価格が catalog.priceYen と一致しなければ確定しない
 *   7. 本文に配布URL（brain/dist）が含まれない場合は ABORT（商品実体なし公開の防止）
 *
 * 使い方:
 *   node scripts/brain-publish.mjs --service brain-civil-essay-kit                # 下書きまで
 *   node scripts/brain-publish.mjs --service <id> --commit                        # 公開申請まで
 *   node scripts/brain-publish.mjs --service <id> --edit-url <url> [--commit]     # 既存ドラフト再開
 */
import { appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, launchContext, waitForLogin, assertAccount,
  readCatalog, readListings, writeBackCatalog, DIST_DIR, DIST_BASE_URL,
} from './lib/brain-session.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const SERVICE = getArg('--service');
const EDIT_URL = getArg('--edit-url');
const COMMIT = argv.includes('--commit');
const AGREE = argv.includes('--agree');
const FORCE = argv.includes('--force-resubmit');
if (!SERVICE) { console.error('--service <id> required（brain-products.ts の id）'); process.exit(1); }

const OUT = join(ROOT, '.tmp', `brain-publish-${SERVICE}.log`);
writeFileSync(OUT, `# brain-publish ${SERVICE} ${COMMIT ? 'COMMIT' : 'DRAFT'}\n`, 'utf8');
const log = (s) => { console.log(s); appendFileSync(OUT, s + '\n'); };
const shot = (name) => join(ROOT, '.tmp', name);

// --- SoT 検証（起動前ゲート） ------------------------------------------------
const svc = readCatalog().find((s) => s.id === SERVICE);
if (!svc) { console.error(`ABORT: カタログに "${SERVICE}" が無い`); process.exit(1); }
if ((svc.status === 'submitted' || svc.status === 'listed') && !FORCE) {
  console.error(`ABORT: ${SERVICE} は既に ${svc.status}（二重申請防止）。再申請は --force-resubmit`);
  process.exit(1);
}
const listing = readListings()[SERVICE];
if (!listing?.bodyText) { console.error('ABORT: listings に bodyText が無い'); process.exit(1); }
const IMAGE = join(ROOT, listing.imagePath || '');
if (!existsSync(IMAGE)) { console.error(`ABORT: imagePath 不在: ${listing.imagePath}`); process.exit(1); }
if (!svc.distFile || !existsSync(join(DIST_DIR, svc.distFile))) {
  console.error(`ABORT: 配布 ZIP 不在: ${svc.distFile}（.claude/config/brain/dist/）`); process.exit(1);
}
const distUrl = DIST_BASE_URL + svc.distFile;
if (!listing.bodyText.includes(distUrl)) {
  console.error(`ABORT: 本文に配布URLが無い（商品実体なし公開の防止）: ${distUrl}`); process.exit(1);
}
const MARKER = listing.paidMarker || 'ここから先（有料エリア）';
if (!listing.bodyText.includes(MARKER)) { console.error(`ABORT: 本文に paidMarker が無い: ${MARKER}`); process.exit(1); }
const iMarker = listing.bodyText.indexOf(MARKER);
if (listing.bodyText.indexOf(distUrl) < iMarker) {
  console.error('ABORT: 配布URLが有料ラインより前にある（無料流出防止）'); process.exit(1);
}
log(`[prep] ${SERVICE} ¥${svc.priceYen} dist=${svc.distFile} mode=${COMMIT ? 'COMMIT(公開申請)' : 'DRAFT(下書き)'}`);

// --- ブラウザ ---------------------------------------------------------------
const ctx = await launchContext({ headless: false });
const page = ctx.pages()[0] || (await ctx.newPage());
try {
  await page.goto('https://brain-market.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const lg = await waitForLogin(page, { tag: '[publish]' });
  if (!lg.ok) { log(`ABORT: ${lg.reason}`); process.exit(2); }
  await assertAccount(page, { tag: '[publish]' });

  // 1. エディタへ（新規 or 既存）
  let editUrl = EDIT_URL;
  if (editUrl) {
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
  } else {
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button, a')).find((x) => /記事を書く/.test(x.innerText || ''));
      b?.click();
    });
    await page.waitForTimeout(3000);
    // 審査ガイドライン同意モーダル（同意はユーザー許可事項）
    const consent = await page.evaluate(() => /審査ガイドライン/.test(document.querySelector('.v-dialog, [role=dialog]')?.innerText || ''));
    if (consent) {
      if (!AGREE) { log('ABORT: 審査ガイドライン同意モーダルが表示。ユーザー許可の上で --agree を付けて再実行'); process.exit(3); }
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => /同意する/.test(x.innerText || ''));
        b?.click();
      });
      log('[1] 同意モーダル: 同意する（--agree 指定済み）');
    }
    await page.waitForTimeout(6000);
    editUrl = page.url();
  }
  if (!/\/a\/.+\/edit/.test(page.url())) { log(`ABORT: エディタ未到達 (${page.url()})`); await page.screenshot({ path: shot('brain-pub-noeditor.png') }); process.exit(3); }
  const articleId = page.url().match(/\/a\/([^/]+)\/edit/)[1];
  log(`[1] editor: ${page.url()} articleId=${articleId}`);

  // 2. タイトル（空のときのみ）
  const titleTa = page.locator('textarea[placeholder*="タイトル"]').first();
  const curTitle = await titleTa.inputValue().catch(() => '');
  if (!curTitle.trim()) { await titleTa.click(); await titleTa.fill(svc.title); log('[2] title set'); }
  else log(`[2] title 既存維持: "${curTitle.slice(0, 30)}..."`);

  // 3. 本文（ProseMirror・実質空のときのみ＝二重挿入防止）
  const pm = page.locator('.tiptap.ProseMirror').first();
  const curBody = await pm.innerText();
  if (curBody.trim().length > 50) log(`[3] 本文 既存 ${curBody.trim().length} 字 → 挿入スキップ`);
  else {
    await pm.click();
    for (const line of listing.bodyText.split(/\r?\n/)) {
      if (line.trim() === '') { await page.keyboard.press('Enter'); continue; }
      await page.keyboard.insertText(line);
      await page.keyboard.press('Enter');
    }
    log('[3] 本文挿入');
  }

  // 4. メイン画像（未設定なら。「販売設定に進む」でエラーモーダルが出るかで判定）
  await page.locator('button:has-text("下書き保存")').first().click().catch(() => {});
  await page.waitForTimeout(3000);
  await page.locator('button:has-text("販売設定に進む")').first().click();
  await page.waitForTimeout(3500);
  const imgErr = await page.evaluate(() => /メイン画像/.test(document.querySelector('.v-dialog, [role=dialog]')?.innerText || ''));
  if (imgErr) {
    await page.locator('button:has-text("閉じる")').first().click().catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator('input[type=file]').first().setInputFiles(IMAGE);
    await page.waitForTimeout(3000);
    const apply = page.locator('button:has-text("適用")').first();
    if (await apply.count()) { await apply.click(); await page.waitForTimeout(4000); }
    log('[4] メイン画像アップロード＋適用');
    await page.locator('button:has-text("下書き保存")').first().click().catch(() => {});
    await page.waitForTimeout(3000);
    await page.locator('button:has-text("販売設定に進む")').first().click();
    await page.waitForTimeout(3500);
  } else log('[4] メイン画像 設定済み');

  if (!COMMIT) {
    log(`\nRESULT: draft 完了。editUrl=${editUrl}\n公開申請は --commit で（価格〜申請は1セッションで実行される）`);
    await page.screenshot({ path: shot(`brain-pub-draft-${SERVICE}.png`) }).catch(() => {});
    process.exit(0);
  }

  // 5. 販売設定（価格はセッション状態＝毎回設定）
  await page.waitForTimeout(2000);
  const priceInput = page.locator('input[name="販売金額"]').first();
  if (!(await priceInput.count())) { log('ABORT: 販売設定ページ未到達（販売金額 input なし）'); await page.screenshot({ path: shot('brain-pub-nosales.png') }); process.exit(3); }
  await priceInput.click({ clickCount: 3 });
  await priceInput.fill(String(svc.priceYen));
  const shown = (await priceInput.inputValue()).replace(/[^\d]/g, '');
  if (shown !== String(svc.priceYen)) { log(`ABORT: 価格未反映 ("${shown}")`); process.exit(3); }
  log(`[5] 販売金額 = ${svc.priceYen}`);

  // 6. 有料エリア: paidMarker 直前のラインコントロールをクリック
  await page.locator('button:has-text("有料エリアの設定に進む")').first().click();
  await page.waitForTimeout(5000);
  const lineRes = await page.evaluate((MK) => {
    const isInner = (e, text) => (e.innerText || '').trim() === text && !Array.from(e.querySelectorAll('*')).some((c) => (c.innerText || '').trim() === text);
    const lines = Array.from(document.querySelectorAll('div,button,span,p')).filter((e) => isInner(e, 'ラインをこの場所に変更') || isInner(e, '有料ラインをこの場所に変更'));
    const marker = Array.from(document.querySelectorAll('p,div,h1,h2,h3')).find((e) => {
      const t = (e.innerText || '').trim();
      return t.includes(MK) && t.length < 80 && !Array.from(e.children).some((c) => (c.innerText || '').trim().includes(MK));
    });
    if (!marker) return { ok: false, reason: 'marker未検出' };
    const before = lines.filter((e) => e.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!before.length) return { ok: false, reason: 'marker前にコントロールなし' };
    before[before.length - 1].click();
    return { ok: true };
  }, MARKER);
  log(`[6] ライン設定: ${JSON.stringify(lineRes)}`);
  if (!lineRes.ok) { await page.screenshot({ path: shot('brain-pub-noline.png') }); process.exit(3); }
  await page.waitForTimeout(3500);
  // 可視テキスト assert（唯一・marker 直前）
  const a1 = await page.evaluate((MK) => {
    const txt = document.body.innerText;
    const occ = txt.split('有料ラインをこの場所に変更').length - 1;
    const ia = txt.indexOf('有料ラインをこの場所に変更');
    const im = txt.indexOf(MK);
    return { pass: occ === 1 && ia >= 0 && im > ia && (im - ia) < 80, occ, gap: im - ia };
  }, MARKER);
  log(`[6] assert: ${JSON.stringify(a1)}`);
  if (!a1.pass) { log('ABORT: ライン位置 assert 失敗 → 申請せず中断'); await page.screenshot({ path: shot('brain-pub-badline.png') }); process.exit(3); }

  // 7. 公開申請 → 確認モーダル（価格 assert）→ 確定
  await page.locator('button:has-text("公開申請する")').first().click();
  await page.waitForTimeout(3500);
  const modal = await page.evaluate(() => (document.querySelector('.v-dialog, [role=dialog], .v-overlay__content')?.innerText || '').slice(0, 400));
  const priceFmt = Number(svc.priceYen).toLocaleString('en-US');
  if (!/公開申請をしますか/.test(modal)) { log('ABORT: 確認モーダル未検出'); await page.screenshot({ path: shot('brain-pub-nomodal.png') }); process.exit(3); }
  if (!modal.includes(priceFmt)) { log(`ABORT: モーダル価格が ¥${priceFmt} でない`); await page.screenshot({ path: shot('brain-pub-badprice.png') }); process.exit(3); }
  log(`[7] モーダル assert OK（¥${priceFmt}）→ 最終確定`);
  await page.evaluate(() => {
    const d = document.querySelector('.v-dialog, [role=dialog], .v-overlay__content');
    const b = d && Array.from(d.querySelectorAll('button')).find((x) => /公開申請する/.test(x.innerText || ''));
    b?.click();
  });
  await page.waitForTimeout(8000);
  const after = await page.evaluate(() => ({ url: location.href, text: (document.body.innerText || '').slice(0, 300) }));
  await page.screenshot({ path: shot(`brain-pub-result-${SERVICE}.png`) }).catch(() => {});
  const success = /complete_published/.test(after.url) && /公開申請が完了しました/.test(after.text);
  if (success) {
    log('[8] ✓ 公開申請完了（審査は原則24h・結果はメール）');
    if (writeBackCatalog(SERVICE, articleId)) log(`[8] カタログ書き戻し: ${SERVICE} → submitted / articleId=${articleId}`);
    log('    ★ 審査通過メール確認後、カタログ status を listed へ手動 flip');
  } else {
    log(`[8] ✗ 成功シグナル未検出（url=${after.url}）→ 公開したと報告しない。スクショ確認`);
    process.exitCode = 2;
  }
  log(`RESULT: ${JSON.stringify({ service: SERVICE, mode: 'commit', ok: success, articleId })}`);
} finally {
  await page.waitForTimeout(1500);
  await ctx.close();
}
