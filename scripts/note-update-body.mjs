#!/usr/bin/env node
/**
 * note-update-body.mjs
 * ---------------------------------------------------------------------------
 * 既公開 note 記事の本文を「全文置換」してライブ反映する Playwright アップデータ。
 * note-publish.mjs（新規作成→公開）と対で、「本文差し替え→更新する」を担う。
 *
 * 前提: frontmatter に noteId が設定済み（公開済み記事のみ対象）。
 *
 * 使い方:
 *   node scripts/note-update-body.mjs --article <article.md path>            # dry-run（既定・安全）
 *   node scripts/note-update-body.mjs --article <article.md path> --commit   # 実ライブ反映（公開に進む→更新する）
 *   node scripts/note-update-body.mjs --list <list.txt> --commit             # 複数記事を一括ライブ反映
 *   npm 経由: npm run note-update-body -- --article <path> [--commit]
 *
 * 追加オプション:
 *   --probe "<文字列>"        paste 成功検証に使う必須文字列（単一記事時のみ。省略時は本文から自動導出）
 *   --keep-boundary           有料記事: 既存の有料境界を動かさず保持して更新（試験問題 H2 が無い記事用）
 *   --boundary-h2 "<regex>"   有料境界の基準にする H2 先頭一致パターン（既定 = 試験問題|予想問題）
 *
 * 処理:
 *   1. account ゲート（dobokunote 確認）
 *   2. editor.note.com/notes/{noteId}/edit へ遷移
 *   3. 本文置換 = 全選択(macOS=Meta+A / それ以外=Ctrl+A) → Delete でエディタを空に → ClipboardEvent paste
 *      （空エディタへの paste は成功する＝note-publish.mjs の /new 空エディタと同条件）
 *      ※ macOS で Ctrl+A は行頭移動(emacs binding)で全選択にならず空化に失敗→本文二重化するため Meta+A 必須。
 *      paste 直後に probe 文字列が contenteditable.innerText に入ったか検証。
 *      無ければ保存せず中断（無音失敗による空更新事故を防止）。
 *   4. URL 行のリンクカード化（type→Enter）
 *   4.5 目次ブロック再挿入（H2>=3・最初のh2直前・--no-toc で抑止）。全文置換で目次が消えるため note-publish と同手順で再挿入。
 *   5. ライブ反映:
 *        --commit なし = dry-run（スクショのみ・更新しない）
 *        --commit あり = 公開に進む →（有料記事なら有料境界保持/再設定）→ 更新する → 更新通知は必ず「いいえ」
 *        ※ 無料記事のライブ更新は publishLive の「更新する」ボタン検出が未対応（既知の残課題）。
 *
 * なぜ「下書き保存」だけでは反映されないか:
 *   公開済み記事の autosave 下書きは browser close で破棄され、再オープンで公開版がロードされる。
 *   ＝ライブには一切反映されない。同一セッション内で「更新する」まで到達して初めて反映される。
 *
 * 注意: カバー画像・タイトル・タグは変更しない。本文のみ差し替え。
 * 実行はローカル（note ログイン済みプロファイルのある Windows/Mac）限定。会社 PC で可（channel:'chrome'）。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ARTICLE_ARG = getArg('--article');
const LIST_ARG = getArg('--list');
const PROBE_ARG = getArg('--probe');             // 単一記事時の明示 probe（省略時は自動導出）
const COMMIT = argv.includes('--commit');         // 実ライブ反映（既定は dry-run）
const KEEP_BOUNDARY = argv.includes('--keep-boundary'); // 有料: 境界を動かさず保持
const BOUNDARY_RE = getArg('--boundary-h2') || '試験問題|予想問題';

// 目次が「最初のh2より後」に入って直せなかった記事（バッチ末尾サマリで失敗として可視化する）
const tocProblems = [];

if (!ARTICLE_ARG && !LIST_ARG) { console.error('--article <path> or --list <file> required'); process.exit(1); }

mkdirSync(join(ROOT, '.tmp'), { recursive: true });

function loadArticles() {
  if (LIST_ARG) {
    const listPath = resolve(ROOT, LIST_ARG);
    return readFileSync(listPath, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  }
  return [ARTICLE_ARG];
}

function parseArticle(articlePath) {
  const abs = resolve(ROOT, articlePath);
  if (!existsSync(abs)) { throw new Error('not found: ' + abs); }
  const raw = readFileSync(abs, 'utf8').replace(/^﻿/, ''); // strip BOM
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
  const noteId = fmField('noteId');
  if (!noteId || !/^n[0-9a-f]{6,}$/.test(noteId)) { throw new Error('noteId missing or invalid: ' + noteId); }
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
  // note-publish.mjs と同じ前処理: コメント・画像・H1行を除去
  body = body.replace(/<!--[\s\S]*?-->\r?\n?/g, '').replace(/!\[.*?\]\(.*?\)\r?\n?/g, '').trim().replace(/^#\s+.*(?:\r?\n)+/, '').trim();
  return { abs, noteId, body };
}

/**
 * paste 成功検証用の probe を本文から自動導出する。
 * マークダウン記号・URL を含まない「素の散文」行を選び、innerText で確実に一致する 24 字前後を返す。
 * paste 後の innerText.includes(probe) が真なら本文が DOM に載った証拠。
 */
function deriveProbe(body) {
  const lines = body.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  // マークダウン構造・URL・記号を含まない素の行（見出し/箇条書き/引用/表/強調/リンクを除外）
  const clean = lines.filter(s =>
    !/https?:\/\//.test(s) &&
    !/[#>|*_`\[\]()~]/.test(s) &&
    !/^[-+]\s/.test(s) &&
    s.length >= 16
  );
  const pick = clean.length ? clean.sort((a, b) => b.length - a.length)[Math.floor(clean.length / 2)] || clean[0] : null;
  if (pick) {
    const start = Math.max(0, Math.floor((pick.length - 24) / 2));
    return pick.slice(start, start + 24).trim();
  }
  // フォールバック: 記号を剥がした素のテキストの先頭 20 字
  const flat = body.replace(/[#>|*_`\[\]()~\-]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').trim();
  return flat.slice(0, 20);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function emptyAndPaste(page, body, probe) {
  // 3. 本文置換: Ctrl+A → Delete で空に → ClipboardEvent paste（空エディタ paste 成功条件を再現）
  const ed = page.locator('[contenteditable=true]').first();
  await ed.click(); await sleep(400);
  // 全選択: macOS は Meta+A（Ctrl+A は行頭移動の emacs binding で空化に失敗し本文二重化する）。
  const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
  await page.keyboard.press(selectAll); await sleep(300);
  await page.keyboard.press('Delete'); await sleep(800);
  const emptiedChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').trim().length);
  console.log(`[3a] emptied editor chars=${emptiedChars}`);
  await page.evaluate((b) => {
    const el = document.querySelector('[contenteditable=true]'); el.focus();
    const dt = new DataTransfer(); dt.setData('text/plain', b);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, body);
  await sleep(3500);
  const edChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log(`[3b] body pasted, editor chars=${edChars}`);

  // 3c. paste 成功検証（probe が DOM に入ったか）— 無ければ呼び出し側で中断
  const hasProbe = await page.evaluate((p) => (document.querySelector('[contenteditable=true]')?.innerText || '').includes(p), probe);
  console.log(`[3c] probe="${probe}" in editor: ${hasProbe}`);
  return hasProbe;
}

async function cardify(page) {
  // 4. リンクカード化（note-publish.mjs §6: URL 単独行を type→Enter で OGP カード化）
  try {
    const urls = await page.evaluate(() => {
      const o = [];
      for (const b of document.querySelectorAll('[contenteditable=true] p, [contenteditable=true] div')) {
        const t = (b.innerText || '').trim();
        if (/^https?:\/\/\S+$/.test(t)) o.push(t);
      }
      return [...new Set(o)];
    });
    let made = 0;
    for (const u of urls) {
      const ok = await page.evaluate((url) => {
        const ed = document.querySelector('[contenteditable=true]'); ed.focus();
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let node = null, n;
        while ((n = w.nextNode())) { if ((n.textContent || '').trim() === url) { node = n; break; } }
        if (!node) return false;
        const r = document.createRange(); r.selectNodeContents(node);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); return true;
      }, u);
      if (ok) {
        await page.keyboard.press('Delete'); await sleep(450);
        await page.keyboard.type(u, { delay: 10 }); await sleep(700);
        await page.keyboard.press('Enter'); await sleep(4500);
        made++;
      }
    }
    const cards = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service]').length);
    console.log(`[4] cardify: urls=${urls.length} processed=${made} cards=${cards}`);
  } catch (e) { console.log('[4] cardify skip:', e.message.split('\n')[0]); }
}

/**
 * 4.5. 目次ブロック挿入（H2>=3・最初のh2直前）。note ネイティブ目次（button#toc-setting）。
 * note-publish.mjs Phase 6.5 と同一手順。全文置換で目次が消えるため再挿入する（editor-operations.md）。
 * 挿入後に「目次 < 最初のh2」を DOM で自己検証（導入分断の再発防止・WARN のみ）。screenshot(.tmp/nu-toc-*.png) も残す。
 */
// 目次ノードを最初の h2 の直前に 1 回挿入する（内部）。挿入できたら true。
async function tocInsertOnce(page) {
  await page.click('[contenteditable=true]'); await sleep(400);
  const ok = await page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]'); ed.focus();
    const h = ed.querySelector('h2'); if (!h) return false;
    h.scrollIntoView({ block: 'center' });
    const r = document.createRange(); r.selectNodeContents(h); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    return true;
  });
  if (!ok) { console.log('[4.5] h2 未検出 → TOC skip'); return false; }
  await sleep(400);
  await page.keyboard.press('Enter'); await sleep(500);
  await page.keyboard.press('ArrowUp'); await sleep(1000);
  // caret に最も近い +メニュー を座標クリック（.first() は最上部を掴み位置ずれする）
  const box = await page.evaluate(() => {
    const sel = window.getSelection(); const cy = (sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect().top : 0) || 0;
    const b = Array.from(document.querySelectorAll('[aria-label="メニューを開く"]'));
    if (!b.length) return null;
    b.sort((p, q) => Math.abs(p.getBoundingClientRect().top - cy) - Math.abs(q.getBoundingClientRect().top - cy));
    const rr = b[0].getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
  });
  if (!box) { console.log('[4.5] +メニュー(メニューを開く) 未検出'); return false; }
  await page.mouse.click(box.x, box.y); await sleep(1800);
  const toc = page.locator('#toc-setting');
  if (!(await toc.count())) { console.log('[4.5] 目次ボタン(#toc-setting) 未検出'); return false; }
  await toc.first().click({ timeout: 8000 }); await sleep(2000);
  return true;
}

// 目次ノードが最初の h2 より前にあるか自己検証。{ ok: true|false|null }（null=検出保留）。
async function tocVerify(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]'); if (!ed) return { ok: null, reason: 'no editor' };
    const kids = Array.from(ed.querySelectorAll('*'));
    const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
    const tocIdx = kids.findIndex(isToc);
    const h2Idx = kids.findIndex((el) => el.tagName === 'H2');
    if (tocIdx < 0) return { ok: null, reason: 'toc node 未検出（検証保留・screenshot 参照）' };
    if (h2Idx < 0) return { ok: null, reason: 'h2 未検出' };
    return { ok: tocIdx < h2Idx, tocIdx, h2Idx };
  });
}

// 目次を「最初の h2 の直前」に挿入する。
// 旧実装は body 先頭(selectNodeContents(ed) collapse)に入れ、note の ProseMirror では導入段落
// （例「こんな人のための記事です」）の途中に割り込み、見出し→目次→本文リストと導入を分断する不具合
// になった（2026-07-04 是正・9記事で発生）。再発防止として挿入後に「目次 < 最初のh2」を自己検証し、
// 後ろにあれば誤配置分を除去して 1 回だけ再挿入する。再挿入後も直らない場合は 'misplaced' を返し、
// 呼び出し元がバッチ末尾のサマリで**失敗として可視化**する（WARN ログ埋没による再発の防止）。
// 戻り値: 'ok' | 'skip'(h2<3等) | 'misplaced' | 'unverified'(検出保留)。
async function insertTocBlock(page, noteId) {
  try {
    if (!(await tocInsertOnce(page))) return 'skip';
    let chk = await tocVerify(page);
    if (chk.ok === false) {
      console.log(`[4.5] ⚠ 目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ 誤配置分を除去して再挿入`);
      // 誤配置の目次ノードを除去してから 1 回だけ入れ直す。
      await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); if (!ed) return;
        const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
        ed.querySelectorAll('*').forEach((el) => { if (isToc(el)) el.remove(); });
      });
      await sleep(600);
      await tocInsertOnce(page);
      chk = await tocVerify(page);
    }
    await page.screenshot({ path: join(ROOT, `.tmp/nu-toc-${noteId}.png`) });
    if (chk.ok === true) { console.log('[4.5] 位置検証 OK（目次 < 最初のh2）'); return 'ok'; }
    if (chk.ok === false) { console.log(`[4.5] ⚠ 再挿入後も目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ サマリで失敗計上`); return 'misplaced'; }
    console.log(`[4.5] 位置検証 保留: ${chk.reason}（.tmp/nu-toc-${noteId}.png で目視）`); return 'unverified';
  } catch (e) { console.log('[4.5] toc skip:', e.message.split('\n')[0]); return 'skip'; }
}

/**
 * 5(commit). 公開に進む →（有料なら境界保持）→ 更新する → 更新通知「いいえ」
 * note-append-cta.mjs:144-219 を移植。戻り値 = 成否。
 */
async function publishLive(page, noteId) {
  // 公開に進む（自動保存の落ち着きを待ってからクリックし、設定ページ到達を polling）
  await sleep(3000);
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('[5] ABORT: 「公開に進む」未検出。更新せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-nonext-${noteId}.png`) }); return false; }
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
  if (!onSettings) { console.error('[5] ABORT: 公開設定ページに到達せず。保存せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-nosettings-${noteId}.png`) }); return false; }

  // 5b. 有料記事なら 有料エリア設定。無料記事は area ボタンが無い＝この節を飛ばす。
  const area = page.getByRole('button', { name: '有料エリア設定' });
  if (await area.count() && KEEP_BOUNDARY) {
    // 試験問題型の境界が無い有料記事: 境界を動かさず既存を保持
    console.log('[5b] 有料記事フロー（既存境界を保持・動かさない）');
    await area.first().click(); await sleep(3500);
    const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
    await page.screenshot({ path: join(ROOT, `.tmp/nu-keepboundary-${noteId}.png`) });
    console.log('[5b] 既存境界line=' + hasLine);
    if (!hasLine) { console.error('[5b] ABORT: 有料記事だが既存境界lineを確認できず。保存せず中断（paywall保護）。'); return false; }
  } else if (await area.count()) {
    // 全文置換で境界が消える有料記事: 「試験問題/予想問題」H2 直前へ境界を再設定し検証
    console.log('[5b] 有料記事フロー（境界を試験/予想問題 H2 直前へ再設定）');
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
    console.log('[5b] boundary target:', JSON.stringify(t));
    if (!t.ok) { console.error('[5b] ABORT: 有料境界の基準(試験/予想問題 H2)を特定できず。保存せず中断。--keep-boundary か --boundary-h2 を検討。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) }); return false; }
    // 「ラインをこの場所に変更」ボタンは note 側の再描画で detach しやすく、Playwright の
    // actionability 待ち（stable 判定）だと "element is not stable / detached" で 30s タイム
    // アウトする（2級 コンクリート工/品質管理 で再現）。DOM の native .click() を evaluate で
    // 直接叩いて stability 待ちを回避する（React の click ハンドラは native click で発火する）。
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('[data-np-target="1"]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    });
    if (!clicked) { console.error('[5b] ABORT: data-np-target ボタンを DOM 上で特定できず。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) }); return false; }
    await sleep(2500);
    const v = await page.evaluate((bre) => {
      const RE = new RegExp('^(' + bre + ')');
      const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
      const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
      const hIdx = seq.findIndex((el) => el.tagName === 'H2' && RE.test((el.innerText || '').trim()));
      let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
      return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
    }, BOUNDARY_RE);
    console.log('[5b] boundary verify:', JSON.stringify(v));
    await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) });
    if (!v.boundaryBeforeExam) { console.error('[5b] ABORT: 有料境界が「予想問題/試験問題」直前に揃わない。保存せず中断（paywall 保護）。'); return false; }
  } else {
    console.log('[5b] 無料記事（有料エリア設定ボタンなし）→ 境界処理をスキップ');
  }

  // 5c. 更新する（公開済み記事。新規の「投稿する/公開」とは別ラベル）
  let updated = false;
  for (const label of ['更新する', '更新']) {
    const b = page.getByRole('button', { name: label, exact: label === '更新する' });
    if (await b.count()) { await b.first().click(); updated = true; console.log(`[5c] 「${label}」クリック`); break; }
  }
  if (!updated) { console.error('[5c] ABORT: 「更新する」未検出。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-noupdate-${noteId}.png`) }); return false; }

  // 5d. 更新通知ダイアログ→必ず「いいえ」（購入者へ通知スパムを防ぐ）
  await sleep(2500);
  let notifyHandled = false;
  for (let i = 0; i < 6 && !notifyHandled; i++) {
    const no = page.getByRole('button', { name: 'いいえ', exact: true });
    if (await no.count()) { await no.first().click(); notifyHandled = true; console.log('[5d] 更新通知ダイアログ→「いいえ」'); break; }
    await sleep(1200);
  }
  if (!notifyHandled) console.log('[5d] 通知ダイアログ未検出（既に確定/通知なしの可能性）');
  await sleep(3000);
  await page.screenshot({ path: join(ROOT, `.tmp/nu-done-${noteId}.png`) });
  return true;
}

async function updateArticle(page, { abs, noteId, body }, probe) {
  console.log(`\n[article] ${noteId} — ${abs.split(/[/\\]/).slice(-2).join('/')}`);

  // 2. 編集 URL へ遷移
  const editUrl = `https://editor.note.com/notes/${noteId}/edit`;
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  try {
    await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
  } catch {
    console.error('[FAIL] editor not loaded for', noteId);
    await page.screenshot({ path: join(ROOT, `.tmp/nu-fail-${noteId}.png`) });
    return false;
  }
  await sleep(2000);
  console.log(`[2] editor loaded: ${page.url()}`);

  // 3. 全文置換（empty→paste→probe 検証）
  const hasProbe = await emptyAndPaste(page, body, probe);
  if (!hasProbe) {
    console.error(`[FAIL] paste 失敗（probe 未検出）。保存せず中断（空更新事故防止）: ${noteId}`);
    await page.screenshot({ path: join(ROOT, `.tmp/nu-pastefail-${noteId}.png`) });
    return false;
  }

  // 4. リンクカード化
  await cardify(page);

  // 4.5 目次ブロック（H2>=3・最初のh2直前・--no-toc で抑止）。全文置換で消えるため再挿入。
  const h2count = (body.match(/^##\s+/gm) || []).length;
  if (!argv.includes('--no-toc') && h2count >= 3) {
    const tocStatus = await insertTocBlock(page, noteId);
    if (tocStatus === 'misplaced') tocProblems.push(noteId);
  }

  // 5. ライブ反映 or dry-run
  if (!COMMIT) {
    await page.screenshot({ path: join(ROOT, `.tmp/nu-dry-${noteId}.png`), fullPage: false });
    console.log(`[dry-run] paste まで成功（未反映）。スクショ: .tmp/nu-dry-${noteId}.png。実反映は --commit。`);
    return true;
  }
  const live = await publishLive(page, noteId);
  if (!live) { console.error(`[FAIL] ライブ反映に失敗: ${noteId}`); return false; }
  console.log(`[OK] ${noteId} ライブ反映完了（要 API 実体検証: curl --ssl-no-revoke https://note.com/api/v3/notes/${noteId}）`);
  return true;
}

const articles = loadArticles();
console.log(`=== note-update-body: ${articles.length} 件 / mode=${COMMIT ? 'COMMIT(ライブ反映)' : 'DRY-RUN(反映しない)'} ===`);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

let ok = 0, fail = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; }
  }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  for (const artPath of articles) {
    try {
      const parsed = parseArticle(artPath);
      // probe: 単一記事は --probe 優先、それ以外は本文から自動導出（list 時は各記事ごと自動）
      const probe = (articles.length === 1 && PROBE_ARG) ? PROBE_ARG : deriveProbe(parsed.body);
      const result = await updateArticle(page, parsed, probe);
      if (result) ok++; else fail++;
    } catch (e) {
      console.error('[ERROR]', artPath, e.message);
      fail++;
    }
    if (articles.length > 1) await sleep(2000);
  }
} finally {
  await ctx.close();
}

console.log(`\n[done] ok=${ok} fail=${fail} / ${articles.length}`);
if (tocProblems.length) {
  console.error(`[done] ⚠ 目次位置NG（導入分断の疑い・再挿入しても直らず）: ${tocProblems.length} 件 → ${tocProblems.join(', ')}`);
  console.error('       各記事の .tmp/nu-toc-<id>.png を目視し、必要なら手動で目次を最初のh2直前へ移動すること。');
}
process.exit(fail > 0 || tocProblems.length > 0 ? 1 : 0);
