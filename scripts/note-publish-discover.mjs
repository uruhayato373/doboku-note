#!/usr/bin/env node
/**
 * note 公開ダイアログの「メンバーシップ限定」コントロールを特定する probe（読み取り専用）。
 * -------------------------------------------------------------------------
 * 目的: note-publish.mjs に membershipOnly 対応を実装するための構造ダンプ。
 * 既存の下書き（会員限定にしたい記事）を開き「公開に進む」まで進めて、
 * 公開範囲まわりのコントロールを列挙するだけ。**保存・公開はしない**。
 *
 * 位置づけ: coconala-discover.mjs と同じ「読み取り専用の偵察」。selector を実機で確定するための
 * 入力を作るだけで、何も入力・保存・公開しない。note-publish.mjs は notePricing:'membership' を
 * 解さず isPaid=false 扱い＝**一般公開**してしまう（2026-08-05 実測）ため、会員限定公開を
 * 実装するにはこの probe で公開範囲のコントロールを確定させる必要がある。
 *
 * 使い方: node scripts/note-publish-discover.mjs <noteId>
 *   例) node scripts/note-publish-discover.mjs n66570efb6d23   # W1 の下書き
 * 出力: .tmp/note/publish-probe/publish-dialog-<noteId>.{json,png}
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const OUT = join(ROOT, '.tmp/note/publish-probe');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NOTE = process.argv[2];
if (!NOTE) { console.error('usage: node .tmp/note-publish-dialog-probe.mjs <noteId>'); process.exit(1); }

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome', headless: false, ignoreHTTPSErrors: true,
  ...(PROXY ? { proxy: { server: PROXY } } : {}),
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  if (!(await page.evaluate(() => document.body.innerText.includes('dobokunote')))) {
    console.error('ABORT: account が dobokunote でない'); await ctx.close(); process.exit(2);
  }
  console.log('[1] account gate OK');

  await page.goto(`https://editor.note.com/notes/${NOTE}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4000);
  console.log('[2] editor loaded:', page.url());

  // 「公開に進む」= note-publish.mjs と同じ導線。ここから先は設定画面（保存はしない）
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('「公開に進む」未検出'); await ctx.close(); process.exit(3); }
  await next.first().click({ timeout: 15000 });
  await sleep(5000);
  console.log('[3] 公開設定画面:', page.url());

  const dump = await page.evaluate(() => {
    const clip = (s, n = 100) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const near = (el) => clip(el.closest('label,li,div,section')?.innerText, 80);
    return {
      url: location.href,
      text: clip(document.body.innerText, 6000),
      radios: Array.from(document.querySelectorAll('input[type=radio]')).map((el) => ({
        name: el.name, value: el.value, checked: el.checked, id: el.id, near: near(el),
      })),
      switches: Array.from(document.querySelectorAll('[role=switch],input[type=checkbox]')).map((el) => ({
        role: el.getAttribute('role') || 'checkbox',
        checked: el.checked ?? el.getAttribute('aria-checked'),
        id: el.id, near: near(el),
      })),
      // 「メンバーシップ」「有料」「無料」を含む可視要素（選択肢のカード型UIを拾う）
      choices: Array.from(document.querySelectorAll('button,[role=button],label,div[class*=select],div[class*=card]'))
        .filter((el) => /メンバーシップ|有料|無料|限定/.test(el.innerText || ''))
        .map((el) => ({ tag: el.tagName.toLowerCase(), cls: clip(el.className, 60), text: clip(el.innerText, 60) }))
        .slice(0, 30),
    };
  });
  await page.screenshot({ path: join(OUT, `publish-dialog-${NOTE}.png`), fullPage: true });
  writeFileSync(join(OUT, `publish-dialog-${NOTE}.json`), JSON.stringify(dump, null, 2));
  console.log('[4] text（先頭1500字）:\n' + dump.text.slice(0, 1500));
  console.log('\n[4] radios:'); dump.radios.forEach((r) => console.log(`   name=${r.name} value=${r.value} checked=${r.checked} :: ${r.near}`));
  console.log('\n[4] choices:'); dump.choices.forEach((c) => console.log(`   ${c.tag} :: ${c.text}`));
  console.log('\n→ .tmp/note/publish-probe/ に JSON とスクショ。**保存・公開はしていない**');
} finally {
  await ctx.close();
}
