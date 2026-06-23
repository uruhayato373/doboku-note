#!/usr/bin/env node
/**
 * note-update-body.mjs
 * ---------------------------------------------------------------------------
 * 既公開 note 記事の本文を差し替える Playwright アップデータ。
 * note-publish.mjs の「新規作成→公開」と対で、「編集→保存」のみを担う。
 *
 * 前提: frontmatter に noteId が設定済み（公開済み記事のみ対象）。
 *
 * 使い方:
 *   node scripts/note-update-body.mjs --article <article.md path>
 *   node scripts/note-update-body.mjs --list <list.txt>   # 複数ファイル
 *
 * 処理:
 *   1. account ゲート（dobokunote 確認）
 *   2. editor.note.com/notes/{noteId}/edit へ遷移
 *   3. 本文を Ctrl+A → ClipboardEvent paste で置換
 *   4. リンクカード化（URL行を type→Enter）
 *   5. 下書き保存（公開状態は変えない）
 *
 * 注意: カバー画像・タイトル・タグは変更しない。本文のみ差し替え。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ARTICLE_ARG = getArg('--article');
const LIST_ARG = getArg('--list');

if (!ARTICLE_ARG && !LIST_ARG) { console.error('--article <path> or --list <file> required'); process.exit(1); }

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateArticle(page, { abs, noteId, body }) {
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

  // 3. 本文を全選択→paste で置換
  const ed = page.locator('[contenteditable=true]').first();
  await ed.click();
  await sleep(400);
  await page.keyboard.press('Control+a');
  await sleep(300);
  await page.evaluate((b) => {
    const el = document.querySelector('[contenteditable=true]');
    el.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', b);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, body);
  await sleep(3500);
  const edChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log(`[3] body pasted, editor chars=${edChars}`);

  // 4. リンクカード化（note-publish.mjs §6 と同じ手順）
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
        await page.keyboard.press('Delete');
        await sleep(450);
        await page.keyboard.type(u, { delay: 10 });
        await sleep(700);
        await page.keyboard.press('Enter');
        await sleep(4500);
        made++;
      }
    }
    const cards = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service]').length);
    console.log(`[4] cardify: urls=${urls.length} processed=${made} cards=${cards}`);
  } catch (e) { console.log('[4] cardify skip:', e.message.split('\n')[0]); }

  // 5. 下書き保存（公開状態を変えない）
  try {
    const draftBtn = page.getByRole('button', { name: '下書き保存' });
    if (await draftBtn.count()) {
      await draftBtn.first().click();
      await sleep(3000);
      console.log('[5] 下書き保存 OK');
    } else {
      // 自動保存が有効なエディタは保存ボタンが非表示の場合がある
      console.log('[5] 下書き保存ボタン未検出 → 自動保存に委ねる');
    }
  } catch (e) { console.log('[5] save skip:', e.message.split('\n')[0]); }

  console.log(`[OK] ${noteId} updated`);
  return true;
}

const articles = loadArticles();
console.log(`=== note-update-body: ${articles.length} 件 ===`);

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
      const result = await updateArticle(page, parsed);
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
process.exit(fail > 0 ? 1 : 0);
