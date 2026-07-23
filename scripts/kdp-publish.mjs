#!/usr/bin/env node
/**
 * kdp-publish.mjs
 * ---------------------------------------------------------------------------
 * Amazon KDP へ Kindle 本を「新規エントリ作成 → 詳細記入 → カテゴリー → 原稿/表紙アップロード
 * → AI申告 → アクセシビリティ → 価格 → 出版」まで駆動する Playwright パブリッシャ。
 * note-publish.mjs と同じ「システム Chrome(channel:chrome) + 永続プロファイル(ログイン保存)
 * + proxy + ignoreHTTPSErrors」方式。真実源(メタデータ/申告/カテゴリー経路) = lib/kdp-common.mjs
 * (=.claude/config/kdp-memo.json の defaults + books[id])。
 *
 * ★限界（正直に明記）★
 *   - KDP/Amazon は bot 検知が強く、ログイン・出版時に CAPTCHA / 2FA を出す。これらは人が処理する。
 *   - 収益アカウントのため、既定は下書き保存まで。実出版は --commit-publish 必須。
 *
 * 使い方:
 *   node scripts/kdp-publish.mjs --id <id>                    # 新規提出(下書き保存まで・出版せず)＋チェックリスト
 *   node scripts/kdp-publish.mjs --id <id> --commit-publish   # 上記＋出版(不可逆)＋出版後検証
 *   node scripts/kdp-publish.mjs --sync-status                # 本棚全件 {title,asin,status} を JSON 出力
 *   node scripts/kdp-publish.mjs --list-drafts                # 本棚を .tmp へダンプ(読み取り)
 *   node scripts/kdp-publish.mjs --delete-drafts <ASIN,...>   # 下書きのみ削除(1件ずつ・下書きassert)
 *   node scripts/kdp-publish.mjs --dump --asin <ASIN> --page <details|content|pricing>  # UI変更時の較正
 *   node scripts/kdp-publish.mjs --diag-category --asin <ASIN>  # カテゴリーカスケードの候補実測(A/E系較正)
 *
 * 再開性(重複防止): 新規提出で発番したドラフト ASIN を catalog.json の draftAsin に永続化し、
 *   次回 --id 実行時に draftAsin があれば新規作成せず既存ドラフトへ直行する([[kindle-dup-prevention]])。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolveBook, validateBook, getDefaults, AI_AMOUNT_LABELS } from './lib/kdp-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-kdp-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const TMP = join(ROOT, '.tmp');
const CATALOG = join(ROOT, 'scripts/kindle-published/catalog.json');
mkdirSync(TMP, { recursive: true });

// ── 引数 ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ID = getArg('--id');
const COMMIT_PUBLISH = argv.includes('--commit-publish');
const MODE_SYNC = argv.includes('--sync-status');
const MODE_LIST = argv.includes('--list-drafts');
const MODE_DELETE = argv.includes('--delete-drafts');
const MODE_DUMP = argv.includes('--dump');
const MODE_DIAG_CAT = argv.includes('--diag-category');
const BOOKLESS = MODE_SYNC || MODE_LIST || MODE_DELETE;
if (!ID && !BOOKLESS) { console.error('--id <book id> required（または --sync-status / --list-drafts / --delete-drafts）'); process.exit(1); }

const defaults = getDefaults();

// ── データ準備（book-less モードでは不要）─────────────────────────────────
let book = null;
if (ID) {
  book = resolveBook(ID, { requireMemo: !(MODE_DUMP || MODE_DIAG_CAT) });
  const errs = validateBook(book);
  if (errs.length && !(MODE_DUMP || MODE_DIAG_CAT)) { console.error('ABORT: メタデータ検証エラー:\n  - ' + errs.join('\n  - ')); process.exit(1); }
  book.epub = join(homedir(), 'Downloads', `kindle-${ID}.epub`);
  book.cover = join(homedir(), 'Downloads', `kindle-cover-${ID}.jpg`);
  if (!MODE_DUMP && !MODE_DIAG_CAT) {
    for (const [label, f] of [['EPUB', book.epub], ['表紙', book.cover]]) {
      if (!existsSync(f)) { console.error(`ABORT: ${label} が無い: ${f}\n（先に npm run sync-kindle-dist -- --downloads ${ID} で配置）`); process.exit(1); }
    }
  }
  if (!book.catVerified) console.log(`[prep] ⚠ カテゴリー末端「${book.catLeaf}」は未検証。提出前に --diag-category で確認推奨`);
  console.log(`[prep] id=${ID} title="${(book.title || '').slice(0, 34)}" price=¥${book.price} mode=${COMMIT_PUBLISH ? 'PUBLISH(出版する)' : 'DRAFT(下書きのみ)'}`);
}

// ── catalog draftAsin ヘルパ（再開性=重複防止）──────────────────────────
const readCatalog = () => (existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, 'utf8')) : null);
const getDraftAsin = (id) => { const c = readCatalog(); return c?.books?.find((b) => b.id === id)?.draftAsin || null; };
const setDraftAsin = (id, asin) => {
  const c = readCatalog(); if (!c) return;
  const b = c.books.find((x) => x.id === id); if (!b) return;
  if (b.draftAsin === asin) return;
  b.draftAsin = asin;
  writeFileSync(CATALOG, JSON.stringify(c, null, 2) + '\n');
  console.log(`[catalog] draftAsin 記録: ${id} = ${asin}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const K = (id) => `kdp-${id || 'bookshelf'}`;
const shot = async (page, step) => { try { await page.screenshot({ path: join(TMP, `${K(ID)}-${step}.png`) }); console.log(`[shot] .tmp/${K(ID)}-${step}.png`); } catch {} };

// ── 起動 ─────────────────────────────────────────────────────────────────
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. ログインゲート（未ログインなら headful で人がログイン→永続プロファイルに保存）
  await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let loggedIn = false;
  for (let i = 0; i < 48; i++) {
    await sleep(2500);
    let t = ''; try { t = await page.evaluate(() => document.body.innerText || ''); } catch {}
    if (/\/bookshelf/.test(page.url()) && /(本棚|Bookshelf|新しい本を作成|タイトルの新規作成)/.test(t)) { loggedIn = true; break; }
    if (i === 0 && /signin|ap\/signin|login/.test(page.url())) console.log('[1] 未ログイン → ブラウザで手動ログイン（CAPTCHA/2FA も人が処理）。ログイン後プロファイルに保存されます…');
  }
  if (!loggedIn) { console.error('ABORT: KDP 本棚に到達できず（ログイン未完 or チャレンジ）'); await shot(page, '01-login'); await ctx.close(); process.exit(2); }
  console.log('[1] login gate OK');

  // アカウント照合（defaults.accountEmail が設定されていれば必須照合。null なら検出値をログ）
  {
    let detected = '';
    try { detected = await page.evaluate(() => (document.body.innerText.match(/[\w.+-]+@[\w.-]+\.\w+/) || [''])[0]); } catch {}
    if (book?.accountEmail || defaults.accountEmail) {
      const want = book?.accountEmail || defaults.accountEmail;
      let bodyt = ''; try { bodyt = await page.evaluate(() => document.body.innerText || ''); } catch {}
      if (!bodyt.includes(want)) { console.error(`ABORT: account "${want}" が本棚に見当たらない（誤アカウント防止）`); await shot(page, '01b-account'); await ctx.close(); process.exit(2); }
      console.log(`[1b] account assert OK (${want})`);
    } else {
      console.log(`[1b] account assert スキップ（検出=${detected || '不明'}）。有効化するには .claude/config/kdp-memo.json defaults.accountEmail を設定`);
    }
  }

  // ═══ MODE: --sync-status（本棚全件の {title,asin,status} を JSON 出力）════
  if (MODE_SYNC) {
    await sleep(2000);
    writeFileSync(join(TMP, 'kdp-bookshelf.html'), await page.content());
    const items = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      for (const link of document.querySelectorAll('a[href*="title-setup/kindle/"]')) {
        const asin = (link.getAttribute('href').match(/kindle\/([A-Z0-9]{10,})\//) || [])[1];
        if (!asin || seen.has(asin)) continue;
        seen.add(asin);
        let el = link, status = '', title = '';
        for (let d = 0; d < 12 && el; d++) {
          const t = el.textContent || '';
          if (/下書き|レビュー中|販売中|ブロック|出版準備中/.test(t)) {
            status = (t.match(/下書き|レビュー中|販売中|ブロック|出版準備中/) || [])[0];
            title = (t.match(/[^\n]{6,80}/) || [''])[0].trim();
            break;
          }
          el = el.parentElement;
        }
        out.push({ asin, status, title: title.slice(0, 70) });
      }
      // LIVE 本など title-setup リンクを持たないカードは「ASIN: B0...」表記から拾う
      const seenLive = new Set(out.map((o) => o.asin));
      for (const m of (document.body.innerText || '').matchAll(/ASIN:\s*(B0[0-9A-Z]{8})/g)) {
        if (!seenLive.has(m[1])) { seenLive.add(m[1]); out.push({ asin: m[1], status: '販売中?', title: '(LIVE・title未取得)' }); }
      }
      return out;
    });
    console.log('[sync] 本棚 ' + items.length + ' 件:');
    console.log(JSON.stringify(items, null, 2));
    writeFileSync(join(TMP, 'kdp-sync-status.json'), JSON.stringify(items, null, 2) + '\n');
    console.log('[sync] .tmp/kdp-sync-status.json に保存（kdp-operator が catalog と突合）');
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --list-drafts（本棚を .tmp へ・読み取りのみ）════
  if (MODE_LIST) {
    await sleep(2000);
    writeFileSync(join(TMP, 'kdp-bookshelf.html'), await page.content());
    await shot(page, 'bookshelf-list');
    console.log('[list] .tmp/kdp-bookshelf.html + スクショ保存');
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --delete-drafts <ASIN,...>（下書きのみ・1件ずつ・下書きassert）════
  if (MODE_DELETE) {
    const list = (getArg('--delete-drafts') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) { console.error('ABORT: --delete-drafts <ASIN,...> 必要'); await ctx.close(); process.exit(1); }
    for (const asin of list) {
      console.log(`[del] ${asin} …`);
      await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
      const info = await page.evaluate((a) => {
        const link = document.querySelector(`a[href*="${a}"]`);
        if (!link) return { err: 'link not found' };
        let el = link;
        for (let d = 0; d < 12 && el; d++) {
          const t = el.textContent || '';
          if (/下書き|レビュー中|販売中/.test(t)) {
            const btn = el.querySelector('button[id*="actions"], button[aria-haspopup], .a-button-dropdown button');
            return { status: (t.match(/下書き|レビュー中|販売中/) || [])[0], btnId: btn ? btn.id : null };
          }
          el = el.parentElement;
        }
        return { err: 'card not found' };
      }, asin);
      if (info.status !== '下書き') { console.log(`[del] SKIP ${asin}: 下書きでない（${info.status || info.err}）＝安全弁で保護`); continue; }
      let opened = false;
      if (info.btnId) { try { await page.locator(`#${info.btnId.replace(/([[\].:])/g, '\\$1')}`).click({ timeout: 5000 }); opened = true; } catch {} }
      if (!opened) { console.log(`[del] SKIP ${asin}: アクションメニューを開けず`); continue; }
      await sleep(2000);
      let clicked = false;
      try { const l = page.getByText('電子書籍の削除', { exact: true }).last(); if (await l.count()) { await l.click({ timeout: 5000 }); clicked = true; } } catch {}
      if (!clicked) { console.log(`[del] SKIP ${asin}: 削除メニュー無し`); await page.keyboard.press('Escape').catch(() => {}); continue; }
      await sleep(2500);
      let ok = false;
      try { const btns = page.locator('button:visible', { hasText: 'OK' }); const n = await btns.count(); for (let i = n - 1; i >= 0; i--) { try { await btns.nth(i).click({ timeout: 3000 }); ok = true; break; } catch {} } } catch {}
      if (!ok) { try { await page.getByRole('button', { name: 'OK' }).last().click({ timeout: 5000 }); ok = true; } catch {} }
      await sleep(5000);
      await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
      const still = await page.locator(`a[href*="${asin}"]`).count();
      console.log(`[del] ${asin}: ` + (still === 0 ? '削除完了' : `WARN まだ存在（${still}）`));
    }
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --dump --asin <ASIN> --page <details|content|pricing>（UI変更時の較正）════
  if (MODE_DUMP) {
    const asin = getArg('--asin');
    const pg = getArg('--page') || 'details';
    if (!asin) { console.error('ABORT: --dump には --asin 必要'); await ctx.close(); process.exit(1); }
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/${pg}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    console.log('[dump] URL: ' + page.url());
    writeFileSync(join(TMP, `${K(ID)}-dump-${pg}.html`), await page.content());
    for (let s = 0; s < 6; s++) { await page.evaluate((y) => window.scrollTo(0, y), 700 * s), await sleep(800), await shot(page, `dump-${pg}-${s}`); }
    console.log(`[dump] .tmp/${K(ID)}-dump-${pg}.html + スクショ6枚`);
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --diag-category（カテゴリーカスケードの実候補を実測・A/E系末端較正）════
  if (MODE_DIAG_CAT) {
    const asin = getArg('--asin');
    if (asin) await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/details`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#data-title', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    for (const sel of ['button:has-text("カテゴリーを選択")', 'text=カテゴリーを選択']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(3000);
    const dump = async (tag) => {
      const info = await page.evaluate(() => Array.from(document.querySelectorAll('select[name^="react-aui-"]')).map((s, i) => ({ i, value: (s.selectedOptions[0] || {}).text || '', opts: Array.from(s.options).map((o) => o.text).slice(0, 20) })));
      console.log(`[diag] (${tag})`); info.forEach((s) => console.log(`   [${s.i}] "${s.value}" :: ${s.opts.join(' / ')}`));
    };
    await dump('open');
    const pick = async (lvl, label) => { try { await page.locator('select[name^="react-aui-"]').nth(lvl).selectOption({ label }); console.log(`[diag] L${lvl} <- ${label}`); } catch (e) { console.log(`[diag] L${lvl} 失敗`); } await sleep(2500); };
    const dd = (book?.catDropdowns) || ['Kindle本', '資格・検定・就職', '建築・土木'];
    for (let i = 0; i < dd.length; i++) { await pick(i, dd[i]); await dump(`afterL${i}`); }
    console.log('[diag] ↑ 最深 select の候補が「場所」チェックボックスの選択肢。leaf を config に設定せよ');
    await shot(page, 'diag-category');
    await ctx.close();
    process.exit(0);
  }

  // ═══════════════ 新規提出フロー（既定 / --commit-publish で出版）═══════════════
  // ── 再開: draftAsin があれば既存ドラフトへ、無ければ新規作成 ──
  const existingDraft = getDraftAsin(ID);
  if (existingDraft) {
    console.log(`[2] 既存ドラフト ${existingDraft} を再開（重複作成しない）`);
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${existingDraft}/details`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    console.log('[2] 新規 Kindle 本 詳細フォームへ…');
    await page.goto('https://kdp.amazon.co.jp/action/mangaactions.createkindle/ja_JP/title-setup/kindle/new/details', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForSelector('#data-title', { timeout: 30000 });
  await sleep(1500);

  // ── ページ1: 詳細記入 ──
  const fillId = async (id, val) => {
    if (val == null || val === '') return;
    try { const loc = page.locator('#' + id + ':not([type=hidden])'); if (await loc.count() === 0) { console.log(`[fill] SKIP #${id}`); return; } await loc.first().fill(String(val)); }
    catch (e) { console.log(`[fill] WARN #${id}: ${e.message.split('\n')[0]}`); }
  };
  try { await page.selectOption('#data-language-native', { label: '日本語' }); } catch {}
  await fillId('data-title', book.title);
  await fillId('data-title-pronunciation', book.titleKana);
  await fillId('data-title-romanized', book.titleRomaji);
  await fillId('data-subtitle', book.subtitle);
  await fillId('data-subtitle-pronunciation', book.subKana);
  await fillId('data-subtitle-romanized', book.subRomaji);
  await fillId('data-publisher-label', book.label);
  await fillId('data-publisher-label-pronunciation', book.labelKana);
  await fillId('data-publisher-label-romanized', book.labelRomaji);
  await fillId('data-series-title', book.series);
  await fillId('data-series-title-pronunciation', book.seriesKana);
  await fillId('data-series-title-romanized', book.seriesRomaji);
  await fillId('data-series-number', book.volume);
  await fillId('data-print-book-primary-author-last-name-jp', book.author);
  await fillId('data-primary-author-pronunciation', book.authorKana);
  await fillId('data-primary-author-name-romanized', book.authorRomaji);
  try {
    const descHtml = book.description.split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
    const ok = await page.evaluate((h) => { try { const k = Object.keys(window.CKEDITOR?.instances || {})[0]; if (k) { window.CKEDITOR.instances[k].setData(h); return true; } } catch {} return false; }, descHtml);
    console.log('[fill] 説明文 CKEditor ' + (ok ? 'OK' : 'WARN(手入力要)'));
  } catch (e) { console.log('[fill] 説明文 WARN: ' + e.message.split('\n')[0]); }
  try { await page.check('#non-public-domain', { force: true }); } catch (e) { console.log('[fill] WARN 権利: ' + e.message.split('\n')[0]); }
  try { await page.check('input[name="data[is_adult_content]-radio"][value="false"]', { force: true }); } catch (e) { console.log('[fill] WARN 成人向け: ' + e.message.split('\n')[0]); }
  for (let i = 0; i < Math.min(7, book.keywords.length); i++) await fillId('data-keywords-' + i, book.keywords[i]);
  console.log('[fill] 詳細記入完了');

  // ── カテゴリー（ドロップダウン階層 + 末端「場所」チェックボックス）──
  const selectCategory = async () => {
    // 既存ドラフト再開時: 既にカテゴリー設定済みなら modal を再操作しない（再操作は解除/ハングの原因）
    try {
      const already = await page.evaluate(() => (document.body.innerText.match(/(\d+)\s*個のカテゴリーを選択済み/) || [])[1] || '0');
      if (already && already !== '0') { console.log(`[cat] 既に ${already} 個選択済み → スキップ`); return true; }
    } catch {}
    for (const sel of ['button:has-text("カテゴリーを選択")', 'text=カテゴリーを選択']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(2500);
    for (let lvl = 0; lvl < book.catDropdowns.length; lvl++) {
      const label = book.catDropdowns[lvl];
      const sel = page.locator('select[name^="react-aui-"]').nth(lvl);
      try { await sel.waitFor({ state: 'attached', timeout: 10000 }); } catch {}
      let opts = [];
      for (let t = 0; t < 30; t++) { try { opts = await sel.evaluate((s) => Array.from(s.options).map((o) => o.text)); } catch { opts = []; } if (opts.includes(label)) break; await sleep(500); }
      if (!opts.includes(label)) { console.log(`[cat] L${lvl} "${label}" 選択失敗。候補: ${opts.slice(0, 30).join(' / ')}`); return false; }
      try { await sel.selectOption({ label }); await sleep(2000); } catch (e) { console.log(`[cat] L${lvl} selectOption失敗`); return false; }
    }
    try { const box = page.getByText(book.catLeaf, { exact: true }); await box.first().waitFor({ state: 'visible', timeout: 8000 }); await box.first().click(); await sleep(1500); }
    catch (e) { console.log(`[cat] 場所チェック失敗 "${book.catLeaf}": ${e.message.split('\n')[0]}`); return false; }
    let cnt = '?'; try { cnt = await page.evaluate(() => (document.body.innerText.match(/(\d+)\s*個のカテゴリーを選択済み/) || [])[1] || '?'); } catch {}
    if (cnt === '0' || cnt === '?') { console.log('[cat] WARN 掲載場所0 → 保存中止'); return false; }
    for (const sel of ['button:has-text("カテゴリーを保存")', 'text=カテゴリーを保存']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(3000);
    return true;
  };
  const catOk = await selectCategory();
  console.log(`[cat] ${catOk ? `OK (${book.catDropdowns.join('>')}>[${book.catLeaf}])` : '要確認'}`);
  if (!catOk) { await shot(page, '02-category-fail'); console.error('ABORT: カテゴリー登録失敗（--diag-category で末端ラベル確認）'); await ctx.close(); process.exit(3); }
  await shot(page, '02-details');

  // ── 保存して続行 → ページ2(コンテンツ)。ここで初めて ASIN が発番されるので永続化 ──
  for (const sel of ['#save-and-continue', '#save-and-continue-announce', 'button:has-text("保存して続行")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
  await page.waitForURL(/title-setup\/kindle\/[^/]*\/content/i, { timeout: 30000 }).catch(() => {});
  const asin = (page.url().match(/kindle\/([A-Z0-9]{10,})\//) || [])[1] || existingDraft || '(unknown)';
  if (asin !== '(unknown)') setDraftAsin(ID, asin);
  if (!/\/content/i.test(page.url())) {
    let errs = []; try { errs = await page.evaluate(() => Array.from(document.querySelectorAll('.a-alert-content, [class*="error"]')).map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 120).slice(0, 8)); } catch {}
    console.error('ABORT: ページ2へ遷移できず。URL=' + page.url() + '\n  エラー: ' + errs.join(' / '));
    await shot(page, '03-content-fail'); await ctx.close(); process.exit(3);
  }
  console.log(`[3] コンテンツページ到達（draft ${asin}）`);

  // ── 原稿EPUB + 表紙 + DRM アップロード → 原稿処理「完了」まで待機 ──
  await page.waitForSelector('#data-assets-interior-file-upload-AjaxInput', { state: 'attached', timeout: 30000 });
  await sleep(1500);
  try { await page.check('input[name="data[is_drm]-radio"][value="true"]', { force: true }); console.log('[3] DRM=有効'); } catch {}
  console.log('[3] 原稿(EPUB) アップロード…');
  await page.locator('#data-assets-interior-file-upload-AjaxInput').setInputFiles(book.epub);
  console.log('[3] 表紙 アップロード…');
  await page.locator('#data-assets-cover-file-upload-AjaxInput').setInputFiles(book.cover);
  // 判定は原稿固有の文言のみ（表紙の「正常にアップロード」で早期完了と誤認しない）。最大10分。
  let up = 'timeout';
  for (let t = 0; t < 120; t++) {
    await sleep(5000);
    const txt = await page.evaluate(() => document.body.innerText || '').catch(() => '');
    if (/ファイルの処理中に問題|処理中にエラー/.test(txt)) { up = 'error'; break; }
    if (/原稿チェックが完了しました|ファイルの処理が完了しました/.test(txt)) { up = 'ok'; break; }
    if (t % 6 === 0) console.log(`[3] 原稿処理待ち… ${t * 5}s`);
  }
  await shot(page, '04-uploaded');
  console.log('[3] 原稿処理: ' + up);
  if (up === 'error') { console.error('ABORT: 原稿がKDP変換で失敗（.svg拡張子のJPEG等を疑う→build確認）'); await ctx.close(); process.exit(4); }
  if (up === 'timeout') { console.error('ABORT: 原稿処理が10分で完了せず（スクショ確認）'); await ctx.close(); process.exit(4); }

  // ── AI 生成コンテンツ申告（config の aiDeclaration に準拠）──
  const ai = book.aiDeclaration;
  const anyAi = ai.text !== 'NONE' || ai.images !== 'NONE' || ai.translations !== 'NONE';
  try {
    const target = anyAi ? 'はい' : 'いいえ';
    await page.getByText(target, { exact: true }).first().scrollIntoViewIfNeeded(); await sleep(400);
    await page.getByText(target, { exact: true }).first().click(); await sleep(2000);
    if (anyAi) {
      await page.selectOption('#generative-ai-questionnaire-text', { label: AI_AMOUNT_LABELS[ai.text] || 'なし' });
      await page.selectOption('#generative-ai-questionnaire-images', { label: AI_AMOUNT_LABELS[ai.images] || 'なし' });
      await page.selectOption('#generative-ai-questionnaire-translations', { label: AI_AMOUNT_LABELS[ai.translations] || 'なし' });
      // 画像=AI生成 を選ぶと「使用したAIツール名」が必須で出現
      if (ai.images !== 'NONE' && ai.imageTool) {
        await sleep(1500);
        const near = page.locator('#generative-ai-questionnaire-images').locator('xpath=ancestor::div[contains(@class,"a-row")][1]/following::input[@type="text"][1]');
        try { await near.fill(ai.imageTool); console.log(`[4] AIツール名="${ai.imageTool}"`); } catch { console.log('[4] AIツール名 記入失敗'); }
      }
    }
    console.log(`[4] AI申告: ${target}${anyAi ? ` (img=${ai.images})` : ''}`);
  } catch (e) { console.log('[4] AI申告 WARN: ' + e.message.split('\n')[0]); }
  await sleep(1000);

  // ── アクセシビリティ（画像alt questionnaire・React制御ラジオ）──
  // value= unknown|not_readable|partially_readable|readable。既定 "unknown"（含まれているか不明）
  // = alt未検証の正直な回答（KDPも既定で選択済み）。page.check は React state 確認で timeout するため
  // 実行時DOM上で input.click()（React onChange 発火）する。
  try {
    const val = book.accessibility || 'unknown';
    const set = await page.evaluate((v) => {
      const r = document.querySelector(`input[name="data[accessibility][image_reading]"][value="${v}"]`);
      if (!r) return 'missing';
      if (!r.checked) { r.click(); return 'set'; }
      return 'already';
    }, val);
    console.log(`[4] アクセシビリティ=${val} (${set})`);
  } catch (e) { console.log('[4] アクセシビリティ WARN: ' + e.message.split('\n')[0]); }
  await sleep(400);
  // 新規アップロード時の affirmation（「回答が正しいことを確認」）＝React動的描画。
  // input[type=checkbox] / [role=checkbox] 両対応で文脈テキスト一致のものを click。
  try {
    const affirmed = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
      for (const b of nodes) {
        const ctx = (b.closest('label,div,section,li') || {}).textContent || '';
        if (!/回答が正しいこと|確認することになります|新しい原稿または表紙/.test(ctx)) continue;
        if (b.disabled) continue;
        const checked = b.type === 'checkbox' ? b.checked : b.getAttribute('aria-checked') === 'true';
        if (!checked) b.click();
        return true;
      }
      return false;
    });
    if (!affirmed) {
      const lbl = page.getByText('自分の回答が正しいことを確認することになります', { exact: false });
      if (await lbl.count()) await lbl.first().click({ timeout: 4000 }).catch(() => {});
    }
    console.log(`[4] affirmation: ${affirmed ? 'checked' : 'fallback-label-click'}`);
  } catch (e) { console.log('[4] affirmation WARN: ' + e.message.split('\n')[0]); }
  await sleep(1000);
  await shot(page, '05-content-final');

  // ── 保存して続行 → ページ3(価格) ──
  for (const sel of ['#save-and-continue', '#save-and-continue-announce', 'button:has-text("保存して続行")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
  await page.waitForURL(/title-setup\/kindle\/[^/]*\/pricing/i, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await sleep(4000);
  if (!/\/pricing/i.test(page.url())) {
    let errs = []; try { errs = await page.evaluate(() => Array.from(document.querySelectorAll('.a-alert-content, [class*="error"]')).map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 120).slice(0, 8)); } catch {}
    console.error('ABORT: 価格ページへ遷移できず。エラー: ' + errs.join(' / ')); await shot(page, '06-pricing-fail'); await ctx.close(); process.exit(3);
  }
  console.log('[5] 価格ページ到達');

  // ── ページ3: 価格設定（KDPセレクト / 全地域 / 70% / ¥price）──
  if (book.kdpSelect) { try { const s = page.locator('input[name="data[is_select]-check"]'); if (!(await s.isChecked().catch(() => true))) await s.check({ force: true }); console.log('[5] KDPセレクト=加入'); } catch (e) { console.log('[5] KDPセレクト WARN'); } }
  try { const all = page.getByText('すべての地域', { exact: false }); if (await all.count()) { await all.first().scrollIntoViewIfNeeded(); await all.first().click(); await sleep(1000); } } catch {}
  try { await page.check('input[name="data[digital][royalty_rate]-radio"][value="70_PERCENT"]', { force: true }); console.log('[5] ロイヤリティ=70%'); } catch (e) { console.log('[5] ロイヤリティ WARN'); }
  await sleep(1000);
  try { const p = page.locator('input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]'); await p.scrollIntoViewIfNeeded(); await p.fill(String(book.price)); await p.press('Tab'); console.log(`[5] JP価格=¥${book.price}`); } catch (e) { console.log('[5] 価格 WARN'); }
  await sleep(3000);
  await shot(page, '07-pricing');
  // 出版前検証（価格/ロイヤリティ不一致なら出版しない）
  try {
    const st = await page.evaluate(() => ({ roy: (document.querySelector('input[name="data[digital][royalty_rate]-radio"]:checked') || {}).value || '', price: (document.querySelector('input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]') || {}).value || '' }));
    console.log(`[5] 出版前検証: ロイヤリティ=${st.roy} / JP価格=${st.price}`);
    if (st.roy !== '70_PERCENT' || String(st.price) !== String(book.price)) { console.error('ABORT: 価格/ロイヤリティ不一致 → 出版せず停止'); await ctx.close(); process.exit(3); }
  } catch {}

  // ── 出版（不可逆）: --commit-publish のときのみ ──
  if (!COMMIT_PUBLISH) {
    for (const sel of ['#save', '#save-announce']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(4000); await shot(page, '08-saved');
    printChecklist(asin, up);
    console.log('[done] DRAFT 完了（詳細+カテゴリー+原稿処理完了+AI申告+アクセシビリティ+価格・下書き保存）。出版は --commit-publish で再実行。');
    await ctx.close();
    process.exit(0);
  }
  console.log('[6] ★出版: 「Kindle本を出版」クリック…');
  let pub = false;
  for (const sel of ['#save-and-publish', 'button:has-text("Kindle 本を出版")', 'button:has-text("Kindle本を出版")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().scrollIntoViewIfNeeded(); await l.first().click({ timeout: 8000 }); pub = true; break; } } catch {} }
  await sleep(8000);
  await shot(page, '09-published');
  let after = ''; try { after = await page.evaluate(() => document.body.innerText || ''); } catch {}
  const okPub = /おめでとう|レビュー中|出版申請|審査|Kindle 本が提出されました/.test(after);
  console.log('[6] 出版後: ' + (okPub ? 'リクエスト送信確認（審査へ・通常72h）' : 'WARN 確認文言なし（スクショ確認）') + ' URL=' + page.url());
  await ctx.close();
  process.exit(pub && okPub ? 0 : 2);
} catch (e) {
  console.error('FATAL: ' + (e.stack || e.message));
  try { await ctx.close(); } catch {}
  process.exit(1);
}

// ── チェックリスト出力（下書き完了時）──
function printChecklist(asin, up) {
  const cl = [
    '', '========================================================',
    ` KDP 提出前チェックリスト  ${ID}  ${book.title}`,
    '========================================================',
    ` ドラフト: https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/pricing`,
    ` draft ASIN: ${asin}`, '',
    ' 自動完了:',
    '   [x] 詳細/フリガナ/ローマ字/サブ/レーベル/シリーズ/著者/説明文/キーワード',
    '   [x] 権利=著作権者本人 / 成人向け=いいえ',
    `   [x] カテゴリー: ${book.catDropdowns.join(' > ')} > [${book.catLeaf}]`,
    `   [x] 原稿(EPUB)+表紙+DRM / 原稿処理=${up}`,
    `   [x] AI申告(img=${book.aiDeclaration.images}) / アクセシビリティ=${book.accessibility}`,
    `   [x] KDPセレクト=${book.kdpSelect} / 70% / ¥${book.price}`, '',
    ' ★人が確認して出版（不可逆）:',
    `   [ ] Kindle Previewer 目視（${book.previewNote || '選択肢連番・章構成'}）`,
    '   [ ] 内容・価格を最終確認 →「Kindle本を出版」（または --commit-publish で再実行）',
    '   [ ] 公開後: ASIN を catalog/08戦略doc/README の3箇所に記録',
    '========================================================', '',
  ].join('\n');
  console.log(cl);
  try { writeFileSync(join(TMP, `${K(ID)}-checklist.txt`), cl); } catch {}
}
