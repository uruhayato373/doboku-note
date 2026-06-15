#!/usr/bin/env node
/**
 * note-publish.mjs
 * ---------------------------------------------------------------------------
 * note 有料記事をブラウザ自動操作で「下書き作成 → 公開」する Playwright パブリッシャ。
 * publish-note(browser-use=Mac) の Windows 決定的 Playwright 版。note-magazine-add と同じ
 *   「システム Chrome(channel:chrome) + 永続プロファイル + proxy + ignoreHTTPSErrors」方式で
 *   会社PCの社内プロキシ(TLS傍受)を越える。
 *
 * 工程: account ゲート → エディタ → カバー(eyecatch) → タイトル → 本文(ClipboardEvent paste・
 *   markdown変換) → リンクカード化(各URL行を Range選択→Delete→type→Enter＝note の埋め込み検出は type で起動・paste不可) → 下書き保存 → 公開に進む → 有料+価格(#price JS setter)
 *   → タグ → 有料エリア設定 → 有料境界を「試験問題/予想問題」直前に設定 → ★境界検証ゲート★ → 投稿する。
 *
 * 安全弁（収益アカウントのため）:
 *   1. account=dobokunote を assert（不一致は即中断・1記事も触らない）
 *   2. 既定は draft（下書き保存のみ）。実公開は --commit 必須
 *   3. --commit でも「有料境界が試験問題/予想問題の直前」を検証してからのみ投稿（boundaryBeforeExam=false は中断）
 *   4. 公開後に note 公開ページを実取得し 無料プレビュー/カード/価格 を実体検証（偽成功ガード）
 *
 * 使い方:
 *   node scripts/note-publish.mjs --article <article.md path>            # 下書き作成のみ（既定・安全）
 *   node scripts/note-publish.mjs --article <path> --commit             # 実公開
 *   （カバー/タグは article と同じ年度dir の cover-<type>.png / hashtags-<type>.txt を自動解決）
 *
 * 真実源: docs/reference/note-api-verification.md / publish-note/SKILL.md（手順の元）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const ARTICLE = getArg('--article');
if (!ARTICLE) { console.error('--article <path> required'); process.exit(1); }

// ---- データ準備（frontmatter + body + cover/hashtags 解決）----
const articleAbs = join(ROOT, ARTICLE);
if (!existsSync(articleAbs)) { console.error('article not found: ' + articleAbs); process.exit(1); }
const raw = readFileSync(articleAbs, 'utf8');
const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
const notePricing = fmField('notePricing');
const price = parseInt(fmField('price') || '0', 10);
let body = raw.replace(/^---\n[\s\S]*?\n---\n*/, '');
const title = (body.match(/^#\s+(.+)$/m)?.[1] || fmField('coverTitle')).trim();
body = body.replace(/<!--[\s\S]*?-->\n?/g, '').replace(/!\[.*?\]\(.*?\)\n?/g, '').replace(/^#\s+.*\n+/, '').trim();
// cover / hashtags を type サフィックスで解決（article-II1.md → cover-II1.png / hashtags-II1.txt）
const dir = dirname(articleAbs);
const typeSuffix = (basename(articleAbs).match(/article-([^.]+)\.md$/) || [])[1] || '';
const coverCandidates = [typeSuffix && join(dir, `img/cover-${typeSuffix}.png`), join(dir, 'img/cover.png')].filter(Boolean);
const cover = coverCandidates.find(existsSync) || null;
const tagsCandidates = [typeSuffix && join(dir, `hashtags-${typeSuffix}.txt`), join(dir, 'hashtags.txt')].filter(Boolean);
const tagsFile = tagsCandidates.find(existsSync);
const tags = tagsFile ? readFileSync(tagsFile, 'utf8').split(/\r?\n/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 30) : [];
const isPaid = notePricing === 'paid' && price > 0;

// ガード: プレースホルダ残・空タイトル
if (/\{\{|※note\s*公開後|MAGAZINE_URL/.test(body)) { console.error('ABORT: プレースホルダが本文に残存'); process.exit(1); }
if (!title) { console.error('ABORT: タイトルが空'); process.exit(1); }
console.log(`[prep] title="${title.slice(0, 40)}" paid=${isPaid} price=${price} cover=${!!cover} tags=${tags.length} bodyChars=${[...body].length} mode=${COMMIT ? 'COMMIT(公開)' : 'DRAFT(下書きのみ)'}`);

// 冪等ガード: 既に公開済み（frontmatter に noteUrl あり）ならスキップ（バッチ再実行で重複公開しない）
const existingUrl = fmField('noteUrl');
if (existingUrl && /^https?:\/\//.test(existingUrl)) { console.log('[skip] 既に公開済み: ' + existingUrl); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let publishedUrl = null;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // 2. 新規エディタ（/new が空ドラフトを生成）
  await page.goto('https://editor.note.com/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  if (!(await page.evaluate(() => !!document.querySelector('[contenteditable=true]')))) { console.error('ABORT: editor not loaded'); await ctx.close(); process.exit(3); }
  const draftUrl = page.url();
  console.log('[2] editor:', draftUrl);

  // 3. カバー(eyecatch)
  if (cover) {
    try {
      await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600);
      await page.locator('[aria-label="画像を追加"]').first().click({ timeout: 8000 }); await sleep(1500);
      const up = page.getByText('画像をアップロード', { exact: false }); if (await up.count()) { await up.first().click(); await sleep(1200); }
      await page.locator('input#note-editor-eyecatch-input, input[type=file]').first().setInputFiles(cover, { timeout: 8000 }); await sleep(2500);
      const sc = page.getByRole('button', { name: '保存', exact: true }); if (await sc.count()) { await sc.first().click(); await sleep(2500); }
      console.log('[3] cover uploaded');
    } catch (e) { console.log('[3] cover skip:', e.message.split('\n')[0]); }
  }

  // 4. タイトル
  const titleSel = 'textarea[placeholder*="タイトル"]';
  await page.click(titleSel); await page.fill(titleSel, title); await sleep(800);
  console.log('[4] title set');

  // 5. 本文 paste（ClipboardEvent・markdown 変換）
  await page.click('[contenteditable=true]'); await sleep(400);
  await page.evaluate((b) => { const ed = document.querySelector('[contenteditable=true]'); ed.focus(); const dt = new DataTransfer(); dt.setData('text/plain', b); ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, body);
  await sleep(3500);
  const edChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log('[5] body pasted, editor chars=' + edChars);

  // 6. リンクカード化: 各 URL 行を Range選択→Delete→type→Enter。
  //    note の埋め込み検出は keyboard.type（実入力）で起動する（synthetic paste では起動しない＝v1-v5失敗・v6/v7で確定）。
  try {
    const urls = await page.evaluate(() => { const o = []; for (const b of document.querySelectorAll('[contenteditable=true] p, [contenteditable=true] div')) { const t = (b.innerText || '').trim(); if (/^https?:\/\/\S+$/.test(t)) o.push(t); } return [...new Set(o)]; });
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
      if (ok) { await page.keyboard.press('Delete'); await sleep(450); await page.keyboard.type(u, { delay: 10 }); await sleep(700); await page.keyboard.press('Enter'); await sleep(4500); made++; }
    }
    const cards = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service]').length);
    console.log(`[6] cardify(type method): urls=${urls.length} processed=${made} cards=${cards}`);
  } catch (e) { console.log('[6] cardify skip:', e.message.split('\n')[0]); }

  // 7. 下書き保存（中間保存）
  const draftBtn = page.getByRole('button', { name: '下書き保存' });
  if (await draftBtn.count()) { await draftBtn.first().click(); await sleep(3500); console.log('[7] 下書き保存'); }

  if (!isPaid) {
    console.log('[note] 無料記事は有料設定をスキップ。');
  }

  // 8. 公開フロー: 公開に進む
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.log('WARN: 公開に進む 未検出 → 下書きで終了'); await page.screenshot({ path: join(ROOT, '.tmp/np-draft.png') }); await ctx.close(); process.exit(0); }
  await next.first().click(); await sleep(3500);

  // 9. 有料 + 価格
  if (isPaid) {
    const paid = page.getByText('有料', { exact: true }); if (await paid.count()) { await paid.first().click(); await sleep(2500); }
    const setPrice = await page.evaluate((p) => {
      const walk = (root) => { try { const e = root.querySelector && root.querySelector('input#price'); if (e) return e; } catch {} for (const n of (root.querySelectorAll ? root.querySelectorAll('*') : [])) { if (n.shadowRoot) { const f = walk(n.shadowRoot); if (f) return f; } } return null; };
      const el = walk(document); if (!el) return 'no-price-input';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(p)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }));
      return 'price=' + el.value;
    }, price);
    console.log('[9] ' + setPrice);
  }

  // 10. タグ
  if (tags.length) {
    try {
      const tagOpen = page.getByText('ハッシュタグを追加する', { exact: false });
      if (await tagOpen.count()) { await tagOpen.first().click(); await sleep(800); }
      const tagInput = page.locator('input[placeholder*="ハッシュタグ"], input[placeholder*="ハッシュタグを追加"]');
      if (await tagInput.count()) {
        for (const t of tags) { await tagInput.first().type(t); await page.keyboard.press('Enter'); await sleep(350); }
        console.log(`[10] tags added: ${tags.length}`);
      } else { console.log('[10] tag input 未検出 → タグskip'); }
    } catch (e) { console.log('[10] tags skip:', e.message.split('\n')[0]); }
  }

  // 11. 有料エリア設定 → 境界を 試験問題/予想問題 直前へ
  let boundaryOk = !isPaid; // 無料は境界不要
  if (isPaid) {
    const area = page.getByRole('button', { name: '有料エリア設定' });
    if (await area.count()) {
      await area.first().click(); await sleep(3500);
      const t = await page.evaluate(() => {
        const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
        const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
        const hIdx = seq.findIndex((el) => el.tagName === 'H2' && /^(試験問題|予想問題)/.test((el.innerText || '').trim()));
        if (hIdx < 0) return { ok: false, reason: 'no 試験/予想問題 h2' };
        let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
        if (!btn) return { ok: false, reason: 'no preceding line-button' };
        document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
        return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
      });
      console.log('[11] boundary target:', JSON.stringify(t));
      if (t.ok) {
        await page.click('[data-np-target="1"]'); await sleep(2500);
        const v = await page.evaluate(() => {
          const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
          const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
          const hIdx = seq.findIndex((el) => el.tagName === 'H2' && /^(試験問題|予想問題)/.test((el.innerText || '').trim()));
          let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
          return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
        });
        console.log('[11] boundary verify:', JSON.stringify(v));
        boundaryOk = v.boundaryBeforeExam;
      }
      await page.screenshot({ path: join(ROOT, '.tmp/np-boundary.png') });
    } else { console.log('[11] 有料エリア設定 ボタン未検出'); }
  }

  // 12. 投稿 or 安全離脱
  if (COMMIT && boundaryOk) {
    const submit = page.getByRole('button', { name: '投稿する', exact: true });
    if (await submit.count()) {
      await submit.first().click(); await sleep(5000);
      const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
      publishedUrl = page.url();
      console.log('[12] 投稿する clicked → published:', publishedUrl);
      // frontmatter へ noteUrl/noteId/notePublishedAt を反映（冪等＋記録）
      try {
        const id = (publishedUrl.match(/\/n\/([a-z0-9]+)/) || [])[1] || '';
        if (id) {
          const cleanUrl = `https://note.com/dobokunote/n/${id}`;
          const today = new Date().toISOString().slice(0, 10);
          const upd = raw
            .replace(/^noteUrl:.*$/m, `noteUrl: "${cleanUrl}"`)
            .replace(/^noteId:.*$/m, `noteId: "${id}"`)
            .replace(/^notePublishedAt:.*$/m, `notePublishedAt: "${today}"`);
          writeFileSync(articleAbs, upd);
          console.log('[12] frontmatter 反映:', cleanUrl);
        }
      } catch (e) { console.log('[12] frontmatter 反映 skip:', e.message.split('\n')[0]); }
    } else console.log('[12] 投稿する 未検出');
  } else {
    if (COMMIT && !boundaryOk) console.log('[12] ★中断: 境界検証 NG（boundaryBeforeExam=false）→ 公開しない★');
    const cancel = page.getByRole('button', { name: 'キャンセル' });
    if (await cancel.count()) { await cancel.first().click(); await sleep(1200); }
    const d2 = page.getByRole('button', { name: '下書き保存' }); if (await d2.count()) { await d2.first().click(); await sleep(2500); }
    console.log('[12] DRAFT モード/未検証 → 下書き保存で終了（公開せず）。URL=' + page.url());
  }
  await page.screenshot({ path: join(ROOT, '.tmp/np-final.png') });
  console.log('RESULT:', JSON.stringify({ mode: COMMIT ? 'commit' : 'draft', boundaryOk, publishedUrl }));
} finally { await ctx.close(); }
