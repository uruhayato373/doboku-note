#!/usr/bin/env node
// note-convert-to-paid.mjs — 既に「無料」で公開済みの note 記事を「有料（price + paidBoundary）」へ変換する。
//
// 背景: note-publish は isPaid = notePricing==='paid' && price>0 で判定するため、price 欄が無い
// 「有料のはずの記事」を無料公開してしまう事故が起きる。本スクリプトは既存 note を開き、
// 公開に進む → 有料選択 + 価格設定 → 有料エリア設定で境界を paidBoundary 直前へ → 更新する、
// を行う（本文は触らない）。note-publish の有料+境界ロジック（steps 9/11）を踏襲。
//
// 使い方:
//   node scripts/note-convert-to-paid.mjs --list <file> --commit   # 1行1 article パス
//   node scripts/note-convert-to-paid.mjs --article <path> --commit
// 安全弁: account=dobokunote assert・price>0 かつ paidBoundary 必須・境界検証(boundaryBeforeExam)が
//   false なら保存せず中断・更新後に公開API で price>0 を検証。

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchNoteContext, assertAccountGate, sleep } from './lib/note-browser.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const LIST = getArg('--list');
const ARTICLE = getArg('--article');
const fmField = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };

if (!LIST && !ARTICLE) { console.error('--list <file> or --article <path> required'); process.exit(1); }
const arts = LIST ? readFileSync(LIST, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [ARTICLE];

// 事前解決
const jobs = [];
for (const a of arts) {
  if (!existsSync(a)) { console.log(`[skip] file なし: ${a}`); continue; }
  const raw = readFileSync(a, 'utf8');
  const noteId = fmField(raw, 'noteId') || (fmField(raw, 'noteUrl').match(/n[0-9a-f]{10,}/) || [])[0];
  const price = parseInt(fmField(raw, 'price') || '0', 10);
  const boundary = fmField(raw, 'paidBoundary');
  if (!noteId) { console.log(`[skip] noteId なし（未公開?）: ${a}`); continue; }
  if (!(price > 0)) { console.log(`[skip] price>0 なし: ${a}`); continue; }
  if (!boundary) { console.log(`[skip] paidBoundary なし: ${a}`); continue; }
  jobs.push({ a, noteId, price, boundary });
}
console.log(`[plan] 変換対象 ${jobs.length} 記事`);
if (!COMMIT) { console.log('[dry-run] --commit で実行'); process.exit(0); }
if (!jobs.length) process.exit(0);

const liveePrice = async (id) => {
  try { const r = await fetch(`https://note.com/api/v3/notes/${id}`, { signal: AbortSignal.timeout(20000) }); const j = await r.json(); return j?.data?.price; } catch { return null; }
};

const ctx = await launchNoteContext({ viewport: { width: 1366, height: 1000 } });
let ok = 0, fail = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const gate = await assertAccountGate(page, { url: null, attempts: 10, intervalMs: 2000 });
  if (!gate.ok) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK');

  for (const j of jobs) {
    try {
      console.log(`\n[article] ${j.noteId} price=${j.price} boundary="${j.boundary}"`);
      await page.goto(`https://editor.note.com/notes/${j.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
      await sleep(3000);
      // 公開に進む
      const next = page.getByRole('button', { name: '公開に進む' });
      if (!(await next.count())) { console.error('[2] ABORT: 公開に進む 未検出'); fail++; continue; }
      await next.first().click(); await sleep(3500);
      // 有料 + 価格
      const paid = page.getByText('有料', { exact: true }); if (await paid.count()) { await paid.first().click(); await sleep(2500); }
      const setPrice = await page.evaluate((p) => {
        const walk = (root) => { try { const e = root.querySelector && root.querySelector('input#price'); if (e) return e; } catch {} for (const n of (root.querySelectorAll ? root.querySelectorAll('*') : [])) { if (n.shadowRoot) { const f = walk(n.shadowRoot); if (f) return f; } } return null; };
        const el = walk(document); if (!el) return 'no-price-input';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(p)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }));
        return 'price=' + el.value;
      }, j.price);
      console.log('[3] ' + setPrice);
      if (setPrice === 'no-price-input') { console.error('[3] ABORT: 価格入力未検出'); fail++; continue; }
      // 有料エリア設定 → 境界
      const area = page.getByRole('button', { name: '有料エリア設定' });
      if (!(await area.count())) { console.error('[4] ABORT: 有料エリア設定 未検出'); fail++; continue; }
      await area.first().click(); await sleep(3500);
      const t = await page.evaluate((b) => {
        const re = new RegExp('^(' + b + ')');
        const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
        const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
        const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
        if (hIdx < 0) return { ok: false, reason: 'no boundary h2: ' + b };
        let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
        if (!btn) return { ok: false, reason: 'no preceding line-button' };
        document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
        return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
      }, j.boundary);
      console.log('[4] boundary target:', JSON.stringify(t));
      if (!t.ok) { console.error('[4] ABORT: 境界解決不能'); fail++; continue; }
      await page.evaluate(() => { const el = document.querySelector('[data-np-target="1"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.click(); } });
      await sleep(2500);
      const v = await page.evaluate((b) => {
        const re = new RegExp('^(' + b + ')');
        const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
        const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
        const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
        let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
        return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
      }, j.boundary);
      console.log('[4] boundary verify:', JSON.stringify(v));
      if (!v.boundaryBeforeExam) { console.error('[4] ABORT: 境界がBOUNDARY直前でない→保存せず中断'); await page.screenshot({ path: join(ROOT, `.tmp/nctp-${j.noteId}.png`) }); fail++; continue; }
      // 更新する
      const upd = page.getByRole('button', { name: '更新する', exact: true });
      if (!(await upd.count())) { console.error('[5] ABORT: 更新する 未検出'); fail++; continue; }
      await upd.first().click(); await sleep(2500);
      const no = page.getByRole('button', { name: 'いいえ', exact: true });
      if (await no.count()) { await no.first().click(); await sleep(800); }
      console.log('[5] 更新する');
      // 検証
      await sleep(3000);
      const lp = await liveePrice(j.noteId);
      if (lp === j.price) { console.log(`[6] OK live price=${lp}`); ok++; }
      else { console.error(`[6] FAIL: live price=${lp} 期待${j.price} → 手動確認`); fail++; }
    } catch (e) { console.error(`[FAIL] ${j.noteId}: ${e.message.split('\n')[0]}`); fail++; }
  }
} finally { await ctx.close(); }
console.log(`\n[done] ok=${ok} fail=${fail} / ${jobs.length}`);
process.exit(fail ? 1 : 0);
