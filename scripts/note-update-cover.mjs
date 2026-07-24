/**
 * note-update-cover.mjs — 公開済み note 記事の「カバー画像(eyecatch)」をライブ差し替えする
 *
 * note-publish.mjs（新規公開）/ note-update-body.mjs（本文差し替え）と対で、
 * 「カバーだけを最新版へ差し替え→更新する」を担う。
 * cover.png をサイト側で再デザイン（G2/キャラ variant 等）した後、ライブ note に未反映の
 * "stale カバー" を解消する。検出は `cover.png` の git 最終コミット日 > frontmatter notePublishedAt。
 *
 * 使い方:
 *   node scripts/note-update-cover.mjs --article <article.md path>            # DRY（差し替え load 確認まで・保存しない）
 *   node scripts/note-update-cover.mjs --article <article.md path> --commit   # ライブ反映（公開に進む→更新する）
 *   node scripts/note-update-cover.mjs --list <list.txt> --commit             # 複数（# 始まりは無視）
 *
 * フロー（doOne）:
 *   editor 遷移 → (既存カバーあれば)カバーimg(img[src*=st-note] top<360)click → 「削除」(button exact)
 *   → button[name=画像を追加] click → モーダル「画像をアップロード」を fileChooser で受け setFiles
 *   → トリミング「保存」(exact) → 新カバー load 確認(st-note|blob|uploads, top<380, 10×polling)＝fail-safe
 *   → --commit のみ: 公開に進む →
 *        [有料] 有料エリア設定 click → 「このラインより先を有料にする」line present を読み取り検証
 *               （line は動かさない＝本文を触らないので paywall 境界は元々保持される）→ 無ければ ABORT
 *        [無料] スキップ
 *      → 更新する(exact) → 更新通知は必ず「いいえ」（購入者への通知スパム防止）
 *
 * fail-safe:
 *   - 新カバー load 未確認なら「更新する」を押さない（coverless 化を防ぐ）
 *   - 有料記事で境界 line を確認できないなら ABORT（paywall 保護）
 *
 * 検証: ライブ反映後は note API v3 で eyecatch が新 ID・can_read=false・price 不変 を確認すること
 *   （proxy ではなく実体検証。[[feedback_note_prepublish_verify_not_proxy]]）
 *
 * 制約: 永続プロファイル(.local/playwright-note-profile)は 1 Chrome インスタンスのみ
 *   ＝複数 list を並列実行不可。大量は 20-28 件チャンク×逐次（background）で回す。
 *
 * 真実源/関連: .claude/knowledge/design-system/note-cover.md / .claude/knowledge/reference/note-api-verification.md
 * 終了コード: 0 = 全件成功 / 1 = 1件以上失敗 / 2 = account gate 失敗
 */
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const COMMIT = process.argv.includes('--commit');
const getA = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const ART = getA('--article');
const LIST = getA('--list');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arts() {
  if (LIST) return readFileSync(resolve(ROOT, LIST), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  if (ART) return [ART];
  console.error('usage: --article <path> | --list <file>  [--commit]');
  process.exit(2);
}
function parse(p) {
  const abs = resolve(ROOT, p);
  const raw = readFileSync(abs, 'utf8').replace(/^﻿/, '');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
  const f = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
  const noteId = f('noteId');
  const pricing = f('notePricing');
  const m = abs.match(/article-([A-Za-z0-9-]+)\.md$/);
  const cover = m ? join(dirname(abs), 'img', `cover-${m[1]}.png`) : join(dirname(abs), 'img', 'cover.png');
  return { abs, noteId, pricing, cover };
}

async function doOne(page, { abs, noteId, pricing, cover }) {
  const tag = abs.split(/[/\\]/).slice(-3).join('/');
  console.log(`\n[article] ${noteId} ${tag} pricing=${pricing}`);
  if (!/^n[0-9a-f]{6,}$/.test(noteId)) { console.error('[skip] noteId不正:', noteId); return false; }
  if (!existsSync(cover)) { console.error('[skip] cover.png無し'); return false; }
  await page.goto(`https://editor.note.com/notes/${noteId}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); await sleep(4000);
  // 1. 既存カバーを削除（差し替え方式）
  let addBtn = page.getByRole('button', { name: '画像を追加' });
  if (!(await addBtn.count())) {
    let box = null;
    for (let i = 0; i < 8 && !box; i++) {
      box = await page.evaluate(() => { const img = [...document.querySelectorAll('img')].find((i) => /st-note/.test(i.src || '') && i.getBoundingClientRect().top < 360 && i.width > 140); if (!img) return null; const r = img.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
      if (!box) await sleep(1500);
    }
    if (!box) { console.error('[FAIL] 既存カバー検出不可'); return false; }
    await page.mouse.click(box.x, box.y); await sleep(1500);
    const del = page.getByRole('button', { name: '削除', exact: true });
    if (!(await del.count())) { console.error('[FAIL] 削除ボタン無し'); return false; }
    await del.first().click(); await sleep(2500); console.log('[del] 既存カバー削除');
    addBtn = page.getByRole('button', { name: '画像を追加' });
    for (let i = 0; i < 6 && !(await addBtn.count()); i++) await sleep(1000);
  }
  if (!(await addBtn.count())) { console.error('[FAIL] 「画像を追加」未出現'); return false; }
  // 2. 新カバーをアップロード（モーダル「画像をアップロード」→fileChooser。input 直接設定は不可）
  await addBtn.first().click(); await sleep(2000);
  try {
    const [ch] = await Promise.all([page.waitForEvent('filechooser', { timeout: 9000 }), page.getByText('画像をアップロード', { exact: false }).first().click()]);
    await ch.setFiles(cover);
  } catch (e) { console.error('[FAIL] アップロード:', e.message.split('\n')[0]); return false; }
  await sleep(4000);
  const save = page.getByRole('button', { name: '保存', exact: true });
  if (await save.count()) { await save.first().click(); console.log('[crop] 保存'); await sleep(3000); }
  // 3. 新カバー load 確認（fail-safe）
  let okImg = false;
  for (let i = 0; i < 10 && !okImg; i++) {
    okImg = await page.evaluate(() => [...document.querySelectorAll('img')].some((i) => /st-note|blob:|uploads/.test(i.src || '') && i.getBoundingClientRect().top < 380 && i.width > 110));
    if (!okImg) await sleep(1200);
  }
  if (!okImg) { console.error('[FAIL] 新カバー未確認→保存中断(coverless防止)'); await page.screenshot({ path: join(ROOT, `.tmp/nc-fail-${noteId}.png`) }); return false; }
  console.log('[ok] 新カバー load確認');
  if (!COMMIT) { console.log('[dry] 未保存'); return true; }
  // 4. 公開に進む → 設定ページ
  await sleep(1500);
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('[FAIL] 公開に進む無し'); return false; }
  await next.first().click();
  let onSet = false;
  for (let i = 0; i < 10; i++) { await sleep(1800); if (await page.getByRole('button', { name: '有料エリア設定' }).count() || await page.getByRole('button', { name: '更新する', exact: true }).count()) { onSet = true; break; } }
  if (!onSet) {
    // membership 連携記事等で設定ページ構造が異なるケースの診断（2026-07-25）
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 40));
    console.error('[FAIL] 設定ページ未到達 buttons=' + JSON.stringify(btns));
    await page.screenshot({ path: join(ROOT, `.tmp/nc-noset-${noteId}.png`), fullPage: false });
    return false;
  }
  // 4b. 有料記事 = paywall 境界の読み取り検証（line は動かさない・本文不触なので保持される）
  const area = page.getByRole('button', { name: '有料エリア設定' });
  if (await area.count()) {
    await area.first().click(); await sleep(3500);
    const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
    await page.screenshot({ path: join(ROOT, `.tmp/nc-paywall-${noteId}.png`) });
    if (!hasLine) { console.error('[ABORT] 有料境界line未確認→保存中断(paywall保護)'); return false; }
    console.log('[paywall] 境界line確認OK(保持・未移動)');
  } else {
    console.log('[free] 有料エリア設定なし=無料記事');
  }
  // 4c. 更新する → 通知いいえ
  const upd = page.getByRole('button', { name: '更新する', exact: true });
  for (let i = 0; i < 6 && !(await upd.count()); i++) await sleep(1000);
  if (!(await upd.count())) { console.error('[FAIL] 更新する未検出'); return false; }
  await upd.first().click(); console.log('[save] 更新する');
  await sleep(2500);
  for (let i = 0; i < 6; i++) { const no = page.getByRole('button', { name: 'いいえ', exact: true }); if (await no.count()) { await no.first().click(); console.log('[save] 通知いいえ'); break; } await sleep(1200); }
  await sleep(3000);
  console.log('[OK] ライブ反映完了');
  return true;
}

const list = arts();
console.log(`=== note-update-cover: ${list.length}件 mode=${COMMIT ? 'COMMIT' : 'DRY'} ===`);
const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, channel: 'chrome', ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'] });
let ok = 0, fail = 0; const fails = [];
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(1500); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT account(dobokunote 未ログイン)'); await ctx.close(); process.exit(2); }
  console.log('[1] account OK');
  for (const p of list) { try { (await doOne(page, parse(p))) ? ok++ : (fail++, fails.push(p)); } catch (e) { console.error('[ERR]', p, e.message.split('\n')[0]); fail++; fails.push(p); } if (list.length > 1) await sleep(2000); }
} finally { await ctx.close(); }
console.log(`\n[done] ok=${ok} fail=${fail}/${list.length}`);
if (fails.length) console.log('FAILS:\n' + fails.join('\n'));
process.exit(fail > 0 ? 1 : 0);
