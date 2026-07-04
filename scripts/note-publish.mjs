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
 *   markdown変換) → リンクカード化(各URL行を Range選択→Delete→type→Enter＝note の埋め込み検出は type で起動・paste不可)
 *   → 目次(H2>=3 で本文先頭に note ネイティブ目次 #toc-setting を挿入・Phase 6.5・--no-toc で抑止)
 *   → 下書き保存 → 公開に進む → 有料+価格(#price JS setter)
 *   → タグ → 有料エリア設定 → 有料境界を BOUNDARY 見出し（既定=「試験問題/予想問題」・frontmatter `paidBoundary` か `--boundary-regex` で上書き）直前に設定 → ★境界検証ゲート★ → 投稿する。
 *   公開後 writeback は frontmatter の note* 行が無ければ挿入する（setFmField・旧 replace-only は無音失敗した）。
 *
 * 安全弁（収益アカウントのため）:
 *   1. account=dobokunote を assert（不一致は即中断・1記事も触らない）
 *   2. 既定は draft（下書き保存のみ）。実公開は --commit 必須
 *   3. --commit でも「有料境界が BOUNDARY 見出しの直前」を検証してからのみ投稿（boundaryBeforeExam=false は中断）
 *   4. 公開後に note 公開ページを実取得し 無料プレビュー/カード/価格 を実体検証（偽成功ガード）
 *
 * 使い方:
 *   node scripts/note-publish.mjs --article <article.md path>                       # 下書き作成のみ（既定・安全）
 *   node scripts/note-publish.mjs --article <path> --commit                        # 即時公開
 *   node scripts/note-publish.mjs --article <path> --commit --schedule 2026-06-20T07:00  # 予約投稿（JST）
 *   （カバー/タグは article と同じ年度dir の cover-<type>.png / hashtags-<type>.txt を自動解決）
 *
 * 予約投稿（--schedule, note は無料で予約公開可）:
 *   - 即時公開の「投稿する」の代わりに 日時設定→日付→時刻→「予約投稿」を操作する。
 *   - 安全弁: 日時を UI で確定できないときは即時公開せず下書きに退避する（誤即時公開を防止）。
 *   - selector は scheduling.md 由来。初回実走で .tmp/np-sched-*.png を確認し必要なら調整すること。
 *
 * 真実源: docs/reference/note-api-verification.md / publish-note/SKILL.md（手順の元）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const ARTICLE = getArg('--article');
if (!ARTICLE) { console.error('--article <path> required'); process.exit(1); }
// --schedule "YYYY-MM-DDTHH:MM"（JST ローカル）。指定時は即時公開でなく予約投稿（note は無料で予約公開可）。
const SCHEDULE = getArg('--schedule');
let sched = null;
if (SCHEDULE) {
  const m = SCHEDULE.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!m) { console.error('--schedule format must be YYYY-MM-DDTHH:MM (JST)'); process.exit(1); }
  sched = { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], date: `${m[1]}-${m[2]}-${m[3]}`, raw: SCHEDULE };
}

// ---- データ準備（frontmatter + body + cover/hashtags 解決）----
// ARTICLE は相対（直接呼び）/絶対（note-publish-magazine の globSync 経由）どちらも受理。
// resolve は絶対パスをそのまま、相対は ROOT 基準で解決する（join だと絶対+絶対で二重化する）。
const articleAbs = resolve(ROOT, ARTICLE);
if (!existsSync(articleAbs)) { console.error('article not found: ' + articleAbs); process.exit(1); }
const raw = readFileSync(articleAbs, 'utf8');
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
const notePricing = fmField('notePricing');
const price = parseInt(fmField('price') || '0', 10);
let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
const title = (body.match(/^#\s+(.+)$/m)?.[1] || fmField('coverTitle')).trim();
body = body.replace(/<!--[\s\S]*?-->\r?\n?/g, '').replace(/!\[.*?\]\(.*?\)\r?\n?/g, '').trim().replace(/^#\s+.*(?:\r?\n)+/, '').trim();
// cover / hashtags を type サフィックスで解決（article-II1.md → cover-II1.png / hashtags-II1.txt）
const dir = dirname(articleAbs);
const typeSuffix = (basename(articleAbs).match(/article-([^.]+)\.md$/) || [])[1] || '';
const coverCandidates = [typeSuffix && join(dir, `img/cover-${typeSuffix}.png`), join(dir, 'img/cover.png')].filter(Boolean);
const cover = coverCandidates.find(existsSync) || null;
const tagsCandidates = [typeSuffix && join(dir, `hashtags-${typeSuffix}.txt`), join(dir, 'hashtags.txt')].filter(Boolean);
const tagsFile = tagsCandidates.find(existsSync);
const tags = tagsFile ? readFileSync(tagsFile, 'utf8').split(/\r?\n/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 99) : [];
const isPaid = notePricing === 'paid' && price > 0;
// 目次ブロック挿入（note ネイティブ #toc-setting・本文先頭）。H2 が 3 つ以上のとき自動挿入。
// markdown の #アンカーは note で機能しないため見出しジャンプの唯一手段。--no-toc で抑止。
const h2count = (body.match(/^##\s+/gm) || []).length;
const wantToc = !argv.includes('--no-toc') && h2count >= 3;
// 有料境界の見出し regex（H2 の innerText 先頭一致）。既定=総監/建設の「試験問題/予想問題」。
// 他コンテンツ型は frontmatter `paidBoundary` か `--boundary-regex` で上書き（例: 1級土木 工事別パック=「品質管理」）。
const BOUNDARY = getArg('--boundary-regex') || fmField('paidBoundary') || '試験問題|予想問題';

// ガード: プレースホルダ残・空タイトル
if (/\{\{|※note\s*公開後|MAGAZINE_URL/.test(body)) { console.error('ABORT: プレースホルダが本文に残存'); process.exit(1); }
if (!title) { console.error('ABORT: タイトルが空'); process.exit(1); }
// ガード: markdown 表（note 非対応・生パイプ表示になる）。note-lint のバックストップ。
// コードフェンス外の行頭パイプを検出したら公開しない（2026-07-04・9記事流出の再発防止）。
{
  let inFence = false;
  const pipeLine = body.split('\n').find((l) => { if (/^\s*```/.test(l)) inFence = !inFence; return !inFence && /^\s*\|/.test(l); });
  if (pipeLine) { console.error(`ABORT: markdown 表を検出（note 非対応・箇条書きへ変換せよ）: ${pipeLine.trim().slice(0, 50)}`); process.exit(1); }
}
console.log(`[prep] title="${title.slice(0, 40)}" paid=${isPaid} price=${price} cover=${!!cover} tags=${tags.length} h2=${h2count} toc=${wantToc} bodyChars=${[...body].length} mode=${COMMIT ? (sched ? `SCHEDULE(${sched.raw})` : 'COMMIT(即時公開)') : 'DRAFT(下書きのみ)'}`);

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

  // 1. account ゲート（ページ描画遅延に強い polling・偽 ABORT 防止）
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  let acct = false;
  // SPA 描画遅延＋polling 中のナビゲーションで evaluate が Execution context destroyed を投げるため
  // try/catch で吸収し、networkidle 後に十分な回数リトライする（偽 ABORT 防止・2026-07-04 堅牢化）
  for (let i = 0; i < 12; i++) { await sleep(2500); let t = ''; try { t = await page.evaluate(() => document.body.innerText || ''); } catch {} if (/dobokunote/.test(t)) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // 2. 新規エディタ（/new が空ドラフトを生成・描画遅延に強い polling）
  await page.goto('https://editor.note.com/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); }
  catch { console.error('ABORT: editor not loaded'); await ctx.close(); process.exit(3); }
  await sleep(2000);
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

  // 6.5 目次ブロック挿入（H2>=3・本文先頭）。note ネイティブ目次（button#toc-setting）。
  //     手順: 本文先頭に空段落を作る（caret-start→Enter→ArrowUp）→ 空行左「+」メニュー（aria-label=メニューを開く）
  //     → 目次ボタン（#toc-setting）クリック。空段落が肝で、無いと無音失敗する（editor-operations.md Phase 4.5）。
  //     検証は querySelector が note の目次 markup と一致せず当てにならないため screenshot(.tmp/np-toc.png) で目視。
  //     有料ラインより上（本文先頭）に入るため、無料プレビューで収録構成が見える。
  if (wantToc) {
    try {
      await page.click('[contenteditable=true]'); await sleep(400);
      await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); ed.focus();
        const r = document.createRange(); r.selectNodeContents(ed); r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      });
      await sleep(400);
      await page.keyboard.press('Enter'); await sleep(500);
      await page.keyboard.press('ArrowUp'); await sleep(1000);
      let inserted = false;
      const menu = page.locator('[aria-label="メニューを開く"]');
      if (await menu.count()) {
        await menu.first().click({ timeout: 8000 }); await sleep(1800);
        const toc = page.locator('#toc-setting');
        if (await toc.count()) { await toc.first().click({ timeout: 8000 }); await sleep(2000); inserted = true; }
        else console.log('[6.5] 目次ボタン(#toc-setting) 未検出 → menu 内容を screenshot');
      } else console.log('[6.5] +メニュー(メニューを開く) 未検出（空段落の確立に失敗の可能性）');
      const tocGuess = await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); if (!ed) return false;
        return !!ed.querySelector('[data-name=index],[data-index],.note-common-styles__textnote-index') ||
          /目次/.test((ed.innerText || '').split('\n').slice(0, 4).join('\n'));
      });
      await page.screenshot({ path: join(ROOT, '.tmp/np-toc.png') });
      console.log(`[6.5] TOC insert: attempted=${inserted} guess=${tocGuess}（.tmp/np-toc.png で目視確認）`);
    } catch (e) { console.log('[6.5] toc skip:', e.message.split('\n')[0]); }
  }

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

  // 11. 有料エリア設定 → 境界を BOUNDARY 見出し直前へ（既定=試験問題/予想問題・civil=品質管理）
  let boundaryOk = !isPaid; // 無料は境界不要
  if (isPaid) {
    const area = page.getByRole('button', { name: '有料エリア設定' });
    if (await area.count()) {
      await area.first().click(); await sleep(3500);
      const t = await page.evaluate((boundaryStr) => {
        const re = new RegExp('^(' + boundaryStr + ')');
        const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
        const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
        const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
        if (hIdx < 0) return { ok: false, reason: 'no boundary h2: ' + boundaryStr };
        let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
        if (!btn) return { ok: false, reason: 'no preceding line-button' };
        document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
        return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
      }, BOUNDARY);
      console.log('[11] boundary target:', JSON.stringify(t));
      if (t.ok) {
        await page.click('[data-np-target="1"]'); await sleep(2500);
        const v = await page.evaluate((boundaryStr) => {
          const re = new RegExp('^(' + boundaryStr + ')');
          const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
          const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
          const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
          let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
          return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
        }, BOUNDARY);
        console.log('[11] boundary verify:', JSON.stringify(v));
        boundaryOk = v.boundaryBeforeExam;
      }
      await page.screenshot({ path: join(ROOT, '.tmp/np-boundary.png') });
    } else { console.log('[11] 有料エリア設定 ボタン未検出'); }
  }

  // 12. 投稿 / 予約投稿 / 安全離脱
  // frontmatter へ noteUrl/noteId/notePublishedAt を反映（冪等＋記録）。予約時は publishDate=予約日。
  // frontmatter フィールドを「あれば置換・無ければ挿入」する（旧実装は replace のみで、行が
  // 無いと URL 記録が無音失敗し、冪等ガード(noteUrl 有無)も効かず一括で重複公開する事故になった。
  // 2026-07-02 是正）。挿入位置は noteMagazine 直後（正準）→ utmCampaign 直後 → 冒頭 --- の順で解決。
  const setFmField = (text, key, val) => {
    const line = `${key}: ${val}`;
    const re = new RegExp('^' + key + ':.*$', 'm');
    if (re.test(text)) return text.replace(re, line);
    if (/^noteMagazine:.*$/m.test(text)) return text.replace(/^(noteMagazine:.*)$/m, `$1\n${line}`);
    if (/^utmCampaign:.*$/m.test(text)) return text.replace(/^(utmCampaign:.*)$/m, `$1\n${line}`);
    return text.replace(/^(---\r?\n)/, `$1${line}\n`);
  };
  const writeBack = (url, publishDate, statusVal = 'published') => {
    try {
      const id = (url.match(/\/n(?:otes)?\/([a-z0-9]+)/) || [])[1] || '';
      if (id) {
        const cleanUrl = `https://note.com/dobokunote/n/${id}`;
        let upd = raw;
        upd = setFmField(upd, 'noteUrl', `"${cleanUrl}"`);
        upd = setFmField(upd, 'noteId', `"${id}"`);
        upd = setFmField(upd, 'notePublishedAt', `"${publishDate}"`);
        // noteStatus も書き戻す（draft 取り残しの再発防止）。即時=published / 予約=reserved。
        // 予約の go-live 後分は verify-note-status が published へ是正。
        upd = setFmField(upd, 'noteStatus', statusVal);
        writeFileSync(articleAbs, upd);
        console.log('[12] frontmatter 反映:', cleanUrl, publishDate, `status=${statusVal}`);
      }
    } catch (e) { console.log('[12] frontmatter 反映 skip:', e.message.split('\n')[0]); }
  };
  const saveDraftExit = async (why) => {
    console.log('[12] ' + why + ' → 下書き保存で終了（公開せず）。');
    const cancel = page.getByRole('button', { name: 'キャンセル' }); if (await cancel.count()) { await cancel.first().click(); await sleep(1200); }
    const d2 = page.getByRole('button', { name: '下書き保存' }); if (await d2.count()) { await d2.first().click(); await sleep(2500); }
  };

  if (COMMIT && boundaryOk && sched) {
    // --- 予約投稿フロー（--schedule 指定時。selector は scheduling.md 由来・first-run 要検証）---
    // 安全弁: 日時が UI に反映できないときは即時公開せず下書きへ退避（誤即時公開を防止）
    const pad = (n) => String(n).padStart(2, '0');
    const shot = async (t) => { try { await page.screenshot({ path: join(ROOT, `.tmp/np-sched-${t}.png`) }); } catch {} };
    let opened = false;
    for (const label of ['日時を指定して公開', '日時の設定', '公開日時', '投稿日時', '日時指定']) {
      const el = page.getByText(label, { exact: false });
      if (await el.count()) { try { await el.first().click(); opened = true; await sleep(1500); break; } catch {} }
    }
    await shot('open');
    let dateSet = false;
    for (let nav = 0; nav < 4 && opened && !dateSet; nav++) {
      const day = page.locator(`[aria-label*="${sched.y}年"][aria-label*="${sched.mo}月"][aria-label*="${sched.d}日"]`);
      if (await day.count()) { try { await day.first().click(); dateSet = true; await sleep(800); } catch {} }
      if (!dateSet) { const nx = page.getByRole('button', { name: /次の月|次月|Next/ }); if (await nx.count()) { await nx.first().click(); await sleep(600); } else break; }
    }
    const timeStr = `${pad(sched.h)}:${pad(sched.mi)}`;
    let timeSet = false;
    const timeItem = page.getByText(timeStr, { exact: true });
    if (await timeItem.count()) { try { await timeItem.first().click(); timeSet = true; await sleep(600); } catch {} }
    await shot('datetime');
    const reserveBtn = page.getByRole('button', { name: /予約投稿|予約する|予約設定/ });
    const hasReserve = await reserveBtn.count();
    console.log(`[12S] schedule=${sched.raw} opened=${opened} dateSet=${dateSet} timeSet=${timeSet} reserveBtn=${hasReserve}`);
    if (opened && dateSet && timeSet && hasReserve) {
      await reserveBtn.first().click(); await sleep(5000);
      const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
      publishedUrl = page.url();
      console.log('[12S] 予約投稿 clicked →', publishedUrl, '@', sched.raw);
      writeBack(publishedUrl, sched.date, 'reserved');
    } else {
      await shot('abort');
      await saveDraftExit('★中断: 予約投稿UIを確定できず（即時公開はしない・selector要first-run検証）★');
    }
  } else if (COMMIT && boundaryOk) {
    // --- 即時公開（既存）---
    const submit = page.getByRole('button', { name: '投稿する', exact: true });
    if (await submit.count()) {
      await submit.first().click(); await sleep(5000);
      const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
      publishedUrl = page.url();
      console.log('[12] 投稿する clicked → published:', publishedUrl);
      writeBack(publishedUrl, new Date().toISOString().slice(0, 10));
    } else console.log('[12] 投稿する 未検出');
  } else {
    if (COMMIT && !boundaryOk) console.log('[12] ★中断: 境界検証 NG（boundaryBeforeExam=false）→ 公開しない★');
    await saveDraftExit('DRAFT モード/未検証');
    console.log('[12] URL=' + page.url());
  }
  await page.screenshot({ path: join(ROOT, '.tmp/np-final.png') });
  console.log('RESULT:', JSON.stringify({ mode: COMMIT ? 'commit' : 'draft', boundaryOk, publishedUrl }));
} finally { await ctx.close(); }
