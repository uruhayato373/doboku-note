#!/usr/bin/env node
/**
 * brain-insert-figures.mjs — Brain 記事本文の指定段落の直後に画像を挿入する（tiptap）
 * ---------------------------------------------------------------------------
 * 仕組み（2026-07-23 実測）: 段落にカーソル→行の「＋」(_addContentButton_)→メニュー「画像」
 * (._item_ 内 span._itemLabel_=画像)→ 隠し input[type=file][accept=image] に setInputFiles。
 * 本スクリプトは本文への画像挿入と「一時保存(下書き)」までを行い、公開申請はしない。
 * 申請の仕上げは brain-publish --commit --force-resubmit（--replace-body は付けない＝本文/画像保持）。
 *
 * 使い方: node scripts/brain-insert-figures.mjs --edit-url <url> --figures <json>
 *   figures json = [{ "after": "段落に含まれる文字列", "image": "絶対 or リポジトリ相対パス" }, ...]
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { ROOT, launchContext, waitForLogin, assertAccount } from './lib/brain-session.mjs';
import { insertFigures } from './lib/brain-figures.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const EDIT_URL = getArg('--edit-url');
const FIG_JSON = getArg('--figures');
if (!EDIT_URL || !FIG_JSON) { console.error('--edit-url と --figures <json> が必要'); process.exit(1); }
const figures = JSON.parse(readFileSync(FIG_JSON, 'utf8'));
for (const f of figures) { const p = isAbsolute(f.image) ? f.image : join(ROOT, f.image); if (!existsSync(p)) { console.error(`ABORT: 画像不在 ${f.image}`); process.exit(1); } f._abs = p; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await launchContext({ headless: false });
const page = ctx.pages()[0] || (await ctx.newPage());
try {
  await page.goto('https://brain-market.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const lg = await waitForLogin(page, { tag: '[figures]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); process.exit(2); }
  await assertAccount(page, { tag: '[figures]' });
  await page.goto(EDIT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const pm = page.locator('.tiptap.ProseMirror').first();
  if (!(await pm.count())) { console.error('ABORT: エディタ未到達'); process.exit(3); }

  // 挿入ロジックは共有 lib（brain-publish の --insert-figures と同一）
  try { await insertFigures(page, pm, figures, { ROOT }); }
  catch (e) { console.error('ABORT:', e.message); await page.screenshot({ path: join(ROOT, '.tmp/brain-fig-fail.png') }).catch(() => {}); process.exit(3); }

  await page.locator('button:has-text("一時保存")').first().click().catch(async () => { await page.locator('button:has-text("下書き保存")').first().click().catch(() => {}); });
  await sleep(3000);
  await page.screenshot({ path: join(ROOT, '.tmp/brain-fig-done.png'), fullPage: true }).catch(() => {});
  console.log('RESULT: 画像挿入＋一時保存 完了（公開申請はしていない）。', page.url());
} finally {
  await sleep(1200);
  await ctx.close();
}
