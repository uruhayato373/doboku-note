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
const FORCE = argv.includes('--force'); // 冪等スキップを無効化（中断ドラフト残骸の上書き等・原則使わない）
const SAVE_ONLY = argv.includes('--save-only'); // 挿入せず、既存下書き（CTA配置済）の publish フローのみ実行
const BEFORE_FIRST_H2 = argv.includes('--before-first-h2'); // 本文最初の H2 直前へ挿入（＝イントロ直後・冒頭の無料領域）
const KEEP_BOUNDARY = argv.includes('--keep-boundary'); // 有料記事: 境界を動かさず既存を保持して更新（試験問題H2が無い記事用）

const NOTE = getArg('--note');
const TEXT = getArg('--text');
const URL = getArg('--url');
// --after <needle>: 指定文字列(テキスト/URLキー)を含むブロックの直後に挿入（無料プレビュー内へ）。
// 省略時は本文末尾に追記。有料記事は末尾だと有料エリア＝購入者しか見えないため --after で free プレビューに置く。
const AFTER = getArg('--after');
// --boundary-h2 <regex>: 有料記事の境界基準にする H2 の先頭一致パターン（既定=試験問題|予想問題）。
// 例: 計算問題集は「## パターン 1…」が初の有料節 → --boundary-h2 'パターン'。
const BOUNDARY_RE = getArg('--boundary-h2') || '試験問題|予想問題';
if (!NOTE || !TEXT || !URL) { console.error('required: --note <noteId> --text "<文章>" --url <magazineUrl> [--after <needle>] [--boundary-h2 <regex>]'); process.exit(1); }
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
  if (SAVE_ONLY) {
    if (!already) { console.error(`ABORT: --save-only だが ${URL_KEY} が下書きに無い。保存対象なし。`); await ctx.close(); process.exit(13); }
    console.log(`[save-only] 既存下書きに ${URL_KEY} あり → 挿入せず publish フローのみ実行`);
  } else {
    if (already && !FORCE) { console.log(`[skip] 既に ${URL_KEY} が本文に存在（重複追記しない）。上書きは --force`); await ctx.close(); process.exit(0); }
    if (already && FORCE) console.log(`[force] ${URL_KEY} 既存だが --force で続行`);

    // 3. caret 位置決め（--before-first-h2＝最初のH2直前 / --after＝該当ブロック直後 / 既定＝本文末尾）
    const caret = await page.evaluate((arg) => {
      const { needle, beforeH2 } = arg;
      const ed = document.querySelector('[contenteditable=true]'); ed.focus();
      const r = document.createRange();
      const sel = () => { const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      if (beforeH2) {
        const h2 = ed.querySelector('h2');
        if (!h2) return 'no-h2';
        r.setStartBefore(h2); r.collapse(true); sel();
        return 'before-first-h2';
      }
      if (needle) {
        let target = null;
        for (const child of ed.children) {
          if ((child.textContent || '').includes(needle) || (child.innerHTML || '').includes(needle)) { target = child; break; }
        }
        if (!target) return 'anchor-not-found';
        r.setStartAfter(target); r.collapse(true); sel();
        return 'after-anchor';
      }
      r.selectNodeContents(ed); r.collapse(false); sel();
      return 'end';
    }, { needle: AFTER, beforeH2: BEFORE_FIRST_H2 });
    console.log(`[3] caret=${caret}`);
    if (caret === 'anchor-not-found') { console.error(`ABORT: --after "${AFTER}" に一致するブロックが本文に無い。挿入しない。`); await ctx.close(); process.exit(8); }
    if (caret === 'no-h2') { console.error('ABORT: 本文に H2 が無く --before-first-h2 の挿入位置を特定できない。'); await ctx.close(); process.exit(8); }
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
  }

  if (!COMMIT) {
    await page.screenshot({ path: join(ROOT, `.tmp/append-dry-${NOTE}.png`), fullPage: false });
    console.log(`[dry-run] 追記まで成功（未保存）。スクショ: .tmp/append-dry-${NOTE}.png。実更新は --commit。`);
    await ctx.close(); process.exit(0);
  }

  // 6. 公開に進む（自動保存の落ち着きを待ってからクリックし、設定ページ到達を polling）
  await sleep(3000); // 「保存中」が navigation を奪うのを避ける
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('ABORT: 「公開に進む」未検出。更新せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/append-nonext-${NOTE}.png`) }); await ctx.close(); process.exit(6); }
  let onSettings = false;
  for (let attempt = 0; attempt < 3 && !onSettings; attempt++) {
    if (await next.count()) { await next.first().click(); }
    for (let i = 0; i < 8; i++) {
      await sleep(1800);
      const a = await page.getByRole('button', { name: '有料エリア設定' }).count();
      const u = await page.getByRole('button', { name: '更新する', exact: true }).count();
      if (a || u) { onSettings = true; break; }
    }
  }
  if (!onSettings) { console.error('ABORT: 公開設定ページに到達せず（保存中/描画遅延）。保存せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/append-nosettings-${NOTE}.png`) }); await ctx.close(); process.exit(12); }

  // 6b. 有料記事なら 有料エリア設定 → 境界を「予想問題/試験問題」H2 直前へ再設定し検証（note-publish.mjs 由来）。
  //     既存境界と同じ位置に揃える＝paywall 非破壊。検証 NG なら保存せず中断（収益保護）。
  const area = page.getByRole('button', { name: '有料エリア設定' });
  if (await area.count() && KEEP_BOUNDARY) {
    // 試験問題型の境界が無い有料記事: 境界を動かさず既存を保持して更新（挿入は冒頭の無料領域なので境界は無関係）
    console.log('[6b] 有料記事フロー（既存境界を保持・動かさない）');
    await area.first().click(); await sleep(3500);
    const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
    await page.screenshot({ path: join(ROOT, `.tmp/append-keepboundary-${NOTE}.png`) });
    console.log('[6b] 既存境界line=' + hasLine);
    if (!hasLine) { console.error('ABORT: 有料記事だが既存境界lineを確認できず。保存せず中断（paywall保護）。'); await ctx.close(); process.exit(14); }
    // 境界は触らず 6c へ
  } else if (await area.count()) {
    console.log('[6b] 有料記事フロー（境界保持）');
    await area.first().click(); await sleep(3500);
    const t = await page.evaluate((bre) => {
      const RE = new RegExp('^(' + bre + ')');
      const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
      const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
      const hIdx = seq.findIndex((el) => el.tagName === 'H2' && RE.test((el.innerText || '').trim()));
      if (hIdx < 0) return { ok: false, reason: 'no boundary h2' };
      let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
      if (!btn) return { ok: false, reason: 'no preceding line-button' };
      document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
      return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
    }, BOUNDARY_RE);
    console.log('[6b] boundary target:', JSON.stringify(t));
    if (!t.ok) { console.error('ABORT: 有料境界の基準(試験/予想問題 H2)を特定できず。保存せず中断。'); await page.screenshot({ path: join(ROOT, `.tmp/append-boundary-${NOTE}.png`) }); await ctx.close(); process.exit(10); }
    await page.click('[data-np-target="1"]'); await sleep(2500);
    const v = await page.evaluate((bre) => {
      const RE = new RegExp('^(' + bre + ')');
      const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
      const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
      const hIdx = seq.findIndex((el) => el.tagName === 'H2' && RE.test((el.innerText || '').trim()));
      let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
      return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
    }, BOUNDARY_RE);
    console.log('[6b] boundary verify:', JSON.stringify(v));
    await page.screenshot({ path: join(ROOT, `.tmp/append-boundary-${NOTE}.png`) });
    if (!v.boundaryBeforeExam) { console.error('ABORT: 有料境界が「予想問題/試験問題」直前に揃わない。保存せず中断（paywall 保護）。'); await ctx.close(); process.exit(11); }
  }

  // 6c. 更新する（公開済み記事。新規の「投稿する/公開」とは別ラベル）
  let updated = false;
  for (const label of ['更新する', '更新']) {
    const b = page.getByRole('button', { name: label, exact: label === '更新する' });
    if (await b.count()) { await b.first().click(); updated = true; console.log(`[6c] 「${label}」クリック`); break; }
  }
  if (!updated) { console.error('ABORT: 「更新する」未検出。'); await page.screenshot({ path: join(ROOT, `.tmp/append-noupdate-${NOTE}.png`) }); await ctx.close(); process.exit(7); }

  // 6d. 更新通知ダイアログ「この記事が更新されたことを…通知しますか？」→ 必ず「いいえ」（購入者へ通知スパムを防ぐ）
  await sleep(2500);
  let notifyHandled = false;
  for (let i = 0; i < 6 && !notifyHandled; i++) {
    const no = page.getByRole('button', { name: 'いいえ', exact: true });
    if (await no.count()) { await no.first().click(); notifyHandled = true; console.log('[6d] 更新通知ダイアログ→「いいえ」'); break; }
    await sleep(1200);
  }
  if (!notifyHandled) console.log('[6d] 通知ダイアログ未検出（既に確定/通知なしの可能性）');
  await sleep(3000);
  await page.screenshot({ path: join(ROOT, `.tmp/append-done-${NOTE}.png`) });
  console.log(`[done] 更新完了（通知=いいえ・要 API 実体検証）。スクショ: .tmp/append-done-${NOTE}.png`);
} catch (e) {
  console.error('ERROR:', String(e).split('\n')[0]);
  exitCode = 9;
} finally {
  await ctx.close();
}
process.exit(exitCode);
