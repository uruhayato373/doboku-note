#!/usr/bin/env node
/**
 * note-append-cta.mjs
 * ---------------------------------------------------------------------------
 * 公開済み note 記事の「本文末尾」に CTA（文章 + URL リンクカード）を type 方式で
 * 追記して「更新する」Playwright オートメーション。note-publish.mjs（新規公開）の
 * Windows 実証パターン（システム Chrome + 永続プロファイル + proxy・URL カード化は
 * keyboard.type で起動）を流用し、browser-use update-mode(Mac・未導入) の代替とする。
 *
 * なぜ安全か:
 *   - 追記のみ（caret を末尾へ → Enter → type）。本文の全消去・paste をしない＝
 *     edit 画面の paste 無音失敗による「空更新事故」が原理的に起きない。
 *   - 既定は dry-run（更新ボタンを押さずスクショのみ）。実更新は --commit 必須。
 *   - 冪等: 追記 URL が既にエディタ本文にあればスキップ（再実行で重複追記しない）。
 *   - account=dobokunote を assert（不一致は即中断）。本文が空に近ければ中断（誤記事ガード）。
 *
 * 使い方:
 *   node scripts/note-append-cta.mjs --note <noteId> --text "<文章>" --url <magazineUrl>            # dry-run（安全・既定）
 *   node scripts/note-append-cta.mjs --note <noteId> --text "<文章>" --url <magazineUrl> --commit   # 実更新（公開に進む→更新する）
 *
 * 前提: .local/playwright-note-profile が note.com/dobokunote にログイン済み
 *       （初回のみ `npm run note-edit-session` で手動ログイン）。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');

const NOTE = getArg('--note');
const TEXT = getArg('--text');
const URL = getArg('--url');
if (!NOTE || !TEXT || !URL) { console.error('required: --note <noteId> --text "<文章>" --url <magazineUrl>'); process.exit(1); }
// マガジン key（m... / n...）を URL から抽出（DOM 冪等チェック用の安定キー）
const URL_KEY = (URL.match(/\/(?:m|n)\/([a-z0-9]+)/) || [])[1] || URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(ROOT, '.tmp'), { recursive: true });

console.log(`[prep] note=${NOTE} urlKey=${URL_KEY} mode=${COMMIT ? 'COMMIT(更新する)' : 'DRY-RUN(更新しない)'}`);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
let exitCode = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート（dobokunote）
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote（未ログイン/別アカウント）'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // 2. 既存記事の編集画面（/new ではない）
  await page.goto(`https://editor.note.com/notes/${NOTE}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); }
  catch { console.error('ABORT: editor 未ロード（noteId/編集権限を確認）'); await ctx.close(); process.exit(3); }
  await sleep(2000);

  // 2b. 誤記事ガード: 本文が空に近ければ中断（既存本文があることを確認）
  const baseChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log(`[2] editor loaded, 既存本文chars=${baseChars}`);
  if (baseChars < 200) { console.error(`ABORT: 本文が短すぎる（chars=${baseChars}）。誤記事/空更新を防ぐため中断。`); await ctx.close(); process.exit(4); }

  // 2c. 冪等チェック: 追記 URL が既に本文にあればスキップ
  const already = await page.evaluate((k) => (document.querySelector('[contenteditable=true]')?.innerHTML || '').includes(k), URL_KEY);
  if (already) { console.log(`[skip] 既に ${URL_KEY} が本文に存在（重複追記しない）`); await ctx.close(); process.exit(0); }

  // 3. caret を本文末尾へ
  await page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]'); ed.focus();
    const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await sleep(500);

  // 4. 追記: Enter → 文章 type → Enter → URL type → Enter（URL は type で OGP カード化）
  await page.keyboard.press('Enter'); await sleep(400);
  await page.keyboard.type(TEXT, { delay: 8 }); await sleep(700);
  await page.keyboard.press('Enter'); await sleep(400);
  await page.keyboard.type(URL, { delay: 10 }); await sleep(700);
  await page.keyboard.press('Enter'); await sleep(4800);

  // 5. 反映検証（URL key がエディタ DOM に入ったか）
  const ok = await page.evaluate((k) => (document.querySelector('[contenteditable=true]')?.innerHTML || '').includes(k), URL_KEY);
  const cards = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service]').length);
  const afterChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log(`[5] 追記反映=${ok} cards=${cards} chars ${baseChars}→${afterChars}`);
  if (!ok) { console.error('ABORT: 追記が DOM に反映されず。更新しない。'); await page.screenshot({ path: join(ROOT, '.tmp/append-fail.png') }); await ctx.close(); process.exit(5); }

  if (!COMMIT) {
    await page.screenshot({ path: join(ROOT, `.tmp/append-dry-${NOTE}.png`), fullPage: false });
    console.log(`[dry-run] 追記まで成功（未保存）。スクショ: .tmp/append-dry-${NOTE}.png。実更新は --commit。`);
    await ctx.close(); process.exit(0);
  }

  // 6. 公開に進む → 更新する（2段）
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('ABORT: 「公開に進む」未検出。更新せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/append-nonext-${NOTE}.png`) }); await ctx.close(); process.exit(6); }
  await next.first().click(); await sleep(3500);
  // 公開済み記事は「更新する」（新規の「投稿する/公開」とは別ラベル）
  let updated = false;
  for (const label of ['更新する', '更新']) {
    const b = page.getByRole('button', { name: label, exact: label === '更新する' });
    if (await b.count()) { await b.first().click(); updated = true; console.log(`[6] 「${label}」クリック`); break; }
  }
  if (!updated) { console.error('ABORT: 「更新する」未検出。'); await page.screenshot({ path: join(ROOT, `.tmp/append-noupdate-${NOTE}.png`) }); await ctx.close(); process.exit(7); }
  await sleep(5000);
  await page.screenshot({ path: join(ROOT, `.tmp/append-done-${NOTE}.png`) });
  console.log(`[done] 更新完了（要 API 実体検証）。スクショ: .tmp/append-done-${NOTE}.png`);
} catch (e) {
  console.error('ERROR:', String(e).split('\n')[0]);
  exitCode = 9;
} finally {
  await ctx.close();
}
process.exit(exitCode);
