#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-magazine-create.mjs
 * note掲載文.txt 駆動で note マガジンを新規作成（/magazines/new）。
 * 既定 probe（フォーム構造ダンプ・作成しない）。--commit で作成。--dir <magazineDir>。
 * 既定は有料(単体)。--free でメンバーシップ特典マガジン用の**無料マガジン**を作る
 * （無料は 価格/アピール/カテゴリ の入力欄が無く、タイトルと説明だけ・2026-08-06 実測）。
 * note-edit-magazine（編集専用）が扱わない「新規作成」を担う。
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNoteText } from './lib/note-meta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const FREE = argv.includes('--free');
const DIR = getArg('--dir');
if (!DIR) { console.error('--dir <magazineDir> required'); process.exit(1); }
const txtPath = join(ROOT, DIR, 'note掲載文.txt');
if (!existsSync(txtPath)) { console.error('note掲載文.txt not found: ' + txtPath); process.exit(1); }
const meta = parseNoteText(readFileSync(txtPath, 'utf8'));
console.log('[meta]', JSON.stringify({ title: meta.title, setPrice: meta.setPrice, descLen: (meta.description || '').length, appealLen: (meta.appealPoint || '').length }));
const price = parseInt(String(meta.setPrice || '').replace(/[^0-9]/g, ''), 10) || 0;
if (!meta.title) { console.error('ABORT: title 解析失敗'); process.exit(1); }
if (!FREE && !price) { console.error('ABORT: price 解析失敗（無料マガジンなら --free）', price); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(4000);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { console.log('ABORT account'); await ctx.close(); process.exit(2); }
  await page.goto('https://note.com/magazines/new', { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(5000);
  console.log('URL:', page.url());
  // フォーム構造ダンプ
  const form = await page.evaluate(() => ({
    radios: Array.from(document.querySelectorAll('input[type=radio],[role=radio]')).map((r) => (r.closest('label')?.innerText || r.getAttribute('aria-label') || '').trim().slice(0, 12)).filter(Boolean),
    textInputs: Array.from(document.querySelectorAll('input[type=text]')).map((i) => i.placeholder || i.getAttribute('aria-label') || '').slice(0, 6),
    numberInputs: Array.from(document.querySelectorAll('input[type=number]')).map((i) => i.placeholder || '').length,
    textareas: Array.from(document.querySelectorAll('textarea')).map((t) => t.placeholder || '').slice(0, 6),
    selects: Array.from(document.querySelectorAll('select')).map((s) => Array.from(s.options).map((o) => o.text).slice(0, 8)),
    buttons: Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 12),
    bodyHints: ['有料', '無料', 'マガジン名', 'カテゴリ', 'アピール', '価格'].filter((h) => document.body.innerText.includes(h)),
  }));
  console.log('[form-initial]', JSON.stringify(form, null, 1));
  // 種別タブを選択（有料(単体) は price/アピール/カテゴリ を出現させる。無料は出ない）
  const kind = FREE ? '無料' : '有料(単体)';
  const kindBtn = page.getByRole('button', { name: kind, exact: true });
  if (await kindBtn.count()) { await kindBtn.first().click(); await sleep(2500); console.log('clicked ' + kind); }
  else console.log('WARN: 種別タブ「' + kind + '」未検出');
  const form2 = await page.evaluate(() => ({
    numberInputs: Array.from(document.querySelectorAll('input[type=number]')).map((i) => i.placeholder || i.getAttribute('aria-label') || i.id || '').slice(0, 6),
    priceInput: !!document.querySelector('input[type=number], input#price'),
    textareasNow: Array.from(document.querySelectorAll('textarea')).map((t) => (t.placeholder || '').slice(0, 24)).slice(0, 6),
    selects: Array.from(document.querySelectorAll('select')).map((s) => Array.from(s.options).map((o) => o.text).slice(0, 12)),
    appealHint: document.body.innerText.includes('アピール'),
    categoryHint: document.body.innerText.includes('カテゴリ'),
    buttons: Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 12),
  }));
  console.log('[form-after-paid]', JSON.stringify(form2, null, 1));
  await page.screenshot({ path: join(ROOT, '.tmp/mag-new-paid.png') });
  if (!COMMIT) { console.log('PROBE のみ（--commit で作成）'); await ctx.close(); process.exit(0); }

  // --- 作成（note掲載文.txt 駆動）---
  await page.locator('input[type=text]').first().fill(meta.title); await sleep(400);
  // 説明欄の placeholder は種別で異なる（有料=「…まとめ…」/ 無料=「例: ステキなクリエイター…」）。
  // 無料フォームには textarea が1つしかないので first() で拾う（2026-08-06 実測）。
  const descSel = FREE ? 'textarea' : 'textarea[placeholder*="まとめ"]';
  await page.locator(descSel).first().fill(meta.description); await sleep(400);
  if (!FREE) {
    await page.locator('input[type=number]').first().fill(String(price)); await sleep(400);
    const appeal = page.locator('textarea[placeholder*="購読"]');
    if (await appeal.count()) { await appeal.first().fill(meta.appealPoint); await sleep(400); }
    const sel = page.locator('select');
    if (await sel.count()) { await sel.first().selectOption({ label: 'キャリア' }).catch(async () => { await sel.first().selectOption({ index: 1 }); }); await sleep(400); }
  }
  // 読み戻し検証
  const filled = await page.evaluate((sel) => ({
    title: document.querySelector('input[type=text]')?.value || '',
    price: document.querySelector('input[type=number]')?.value || '',
    descLen: (document.querySelector(sel)?.value || '').length,
    appealLen: (document.querySelector('textarea[placeholder*="購読"]')?.value || '').length,
    category: (() => { const s = document.querySelector('select'); return s ? s.options[s.selectedIndex]?.text : ''; })(),
  }), descSel);
  console.log('[filled]', JSON.stringify(filled));
  await page.screenshot({ path: join(ROOT, '.tmp/mag-create-filled.png') });
  // 読み戻しゲート: タイトルは必須一致。価格は有料のときだけ見る（無料は入力欄が無い）。
  // 説明が空のまま作ると必須未充足で作成が通らないので、ここで一緒に見る。
  if (filled.title !== meta.title || (!FREE && filled.price !== String(price)) || !filled.descLen) {
    console.log('ABORT: 読み戻し不一致→作成中止'); await ctx.close(); process.exit(3);
  }
  // 作成（リダイレクト遅延に強い polling で key 取得）
  await page.getByRole('button', { name: '作成' }).first().click();
  let url = '', key = '';
  for (let i = 0; i < 12; i++) {
    await sleep(2000); url = page.url();
    key = (url.match(/\/m\/(m[a-z0-9]+)/) || [])[1] || '';
    if (key) break;
  }
  // フォールバック: URL 未遷移でも作成済みのことがある→ API でタイトル一致のマガジン key を引く
  if (!key) {
    try {
      const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', 'https://note.com/api/v2/creators/dobokunote/contents?kind=magazine&page=1'], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
      const d = JSON.parse(r.stdout); const hit = (d?.data?.contents || []).find((m) => m.name === meta.title);
      if (hit) { key = hit.key; console.log('[created] URL未遷移→API でkey回収:', key); }
    } catch {}
  }
  console.log('[created] URL:', url, '| key:', key || '(取得失敗・API/手動確認)');
  await page.screenshot({ path: join(ROOT, '.tmp/mag-created.png') });
} finally { await ctx.close(); }
