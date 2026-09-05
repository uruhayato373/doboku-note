#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-append-list-links.mjs — 公開済み note 記事の既存リスト（<ul>）へ
 *   インラインリンク項目 `<li><p><a href>タイトル</a> — 説明</p></li>` を追加する（ライブ反映）。
 *
 * なぜ専用ツールか（2026-07-05 実証）:
 *   - 編集画面(`notes/<id>/edit`)では ClipboardEvent paste が無音失敗（update-mode.md danger）。
 *   - `[text](url)` の type はリテラル残存で変換されない／bare URL の type はカード化する
 *     ＝もくじの「<a>title</a> — 説明」形式のインラインリンクは type では作れない。
 *   - 代わりに **対象 <ul> の末尾 <li> へ `insertAdjacentHTML('afterend', ...)` で valid な兄弟 li を
 *     挿入 → `input` イベントで ProseMirror が取り込む** と「更新する」で保存に残る（API 実査で確認）。
 *   - execCommand の <ul> 全体置換は ProseMirror 再正規化で h3 巻き込み崩れが出るため、
 *     **ul 末尾への兄弟 li 挿入（本ツールの方式）が最も安定**。
 *
 * 主用途: note 導線 D2（公開マガジンが L2 もくじに未収録）の**ライブ反映**（ソース追記は手動、
 *   audit-note-funnel が D2 検出）。note-append-cta（末尾/冒頭への CTA カード追記＝D5）とは別operation。
 *
 * 使い方:
 *   node scripts/note-append-list-links.mjs --spec <path.json>            # DRY（挿入→DOM検証→スクショ・未保存）
 *   node scripts/note-append-list-links.mjs --spec <path.json> --commit   # 実保存（公開に進む→更新する→通知いいえ）+ API 実査
 *
 * spec JSON:
 *   {
 *     "note": "n4fde0f62dc20",
 *     "sections": [
 *       { "anchorMagId": "m150c9db08902",
 *         "items": [ { "url": "https://note.com/dobokunote/m/xxxx", "title": "…", "desc": " — …" } ] }
 *     ]
 *   }
 *   anchorMagId = 追加先セクションの既存 <ul> を特定するための、その節に既にある任意のマガジン/記事ID。
 *
 * 前提: `OS標準auth rootのnote profile` が note.com/dobokunote にログイン済み（アカウントゲートで assert）。
 * 終了コード: 0=成功/DRY・2=account・3=editor・4=本文短すぎ・5=DOM検証NG・6-8=保存フロー・9=例外。
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const SPEC = getArg('--spec');
if (!SPEC) { console.error('required: --spec <path.json> [--commit]'); process.exit(1); }
const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
const NOTE = spec.note;
const SECTIONS = spec.sections || [];
if (!NOTE || !SECTIONS.length) { console.error('spec に note と sections が必要'); process.exit(1); }
const magId = (u) => (u.match(/\/m\/([a-z0-9]+)/) || u.match(/\/n\/([a-z0-9]+)/) || [])[1] || u;
const ALL_IDS = SECTIONS.flatMap((s) => s.items.map((i) => magId(i.url)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(ROOT, '.tmp'), { recursive: true });
console.log(`[prep] note=${NOTE} sections=${SECTIONS.length} items=${ALL_IDS.length} mode=${COMMIT ? 'COMMIT' : 'DRY'}`);

const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, channel: 'chrome', viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'] });
let exitCode = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  // 1. account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK');
  // 2. 編集画面
  await page.goto(`https://editor.note.com/notes/${NOTE}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); } catch { console.error('ABORT: editor 未ロード'); await ctx.close(); process.exit(3); }
  await sleep(1500);
  const baseChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log('[2] editor loaded, chars=' + baseChars);
  if (baseChars < 300) { console.error('ABORT: 本文が短すぎる（誤記事/空更新ガード）'); await ctx.close(); process.exit(4); }
  // 冪等
  const already = await page.evaluate((ids) => { const h = document.querySelector('[contenteditable=true]').innerHTML; return ids.every((id) => h.includes(id)); }, ALL_IDS);
  if (already) { console.log('[skip] 全項目が既に本文に存在'); await ctx.close(); process.exit(0); }
  // 3. セクションごとに ul 末尾へ兄弟 li 挿入
  for (const sec of SECTIONS) {
    const r = await page.evaluate(({ anchorMagId, items }) => {
      const ed = document.querySelector('[contenteditable=true]');
      const anchorA = ed.querySelector(`a[href*="${anchorMagId}"]`);
      if (!anchorA) return 'no-anchor';
      const ul = anchorA.closest('ul');
      if (!ul) return 'no-ul';
      const mid = (u) => (u.match(/\/[mn]\/([a-z0-9]+)/) || [])[1];
      const add = items.filter((it) => !ul.innerHTML.includes(mid(it.url)));
      if (!add.length) return 'all-present';
      let last = ul.querySelector('li:last-child');
      for (const it of add) {
        const html = `<li><p><a href="${it.url}">${it.title}</a>${it.desc || ''}</p></li>`;
        last.insertAdjacentHTML('afterend', html);
        last = last.nextElementSibling;
      }
      ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return 'ok:' + add.length;
    }, sec);
    console.log('  [sec ' + sec.anchorMagId + '] ' + r);
    if (r === 'no-anchor' || r === 'no-ul') { console.error('ABORT: 挿入失敗 ' + r + '（anchorMagId が本文の該当 ul に無い）'); await page.screenshot({ path: join(ROOT, `.tmp/list-links-fail-${NOTE}.png`) }); await ctx.close(); process.exit(8); }
    await sleep(600);
  }
  await sleep(800);
  // 4. DOM 検証: 全項目が <a> かつ <li> 内
  const verify = await page.evaluate((ids) => {
    const ed = document.querySelector('[contenteditable=true]');
    const res = {};
    for (const id of ids) {
      const a = ed.querySelector(`a[href*="${id}"]`);
      let inLi = false, n = a; while (n && n !== ed) { if (n.tagName === 'LI') { inLi = true; break; } n = n.parentElement; }
      res[id] = { anchor: !!a, inLi };
    }
    return { res, chars: (ed.innerText || '').length };
  }, ALL_IDS);
  console.log('[3] DOM検証(<a>/li内):', JSON.stringify(verify.res), 'chars', baseChars, '→', verify.chars);
  const allOk = ALL_IDS.every((id) => verify.res[id].anchor && verify.res[id].inLi);
  await page.screenshot({ path: join(ROOT, `.tmp/list-links-${COMMIT ? 'commit' : 'dry'}-${NOTE}.png`), fullPage: false });
  if (!allOk) { console.error('ABORT: DOM に全項目の inline <a>(li内) が揃わず。保存しない。'); await ctx.close(); process.exit(5); }
  if (!COMMIT) { console.log(`[dry] DOM検証OK・未保存。スクショ: .tmp/list-links-dry-${NOTE}.png。実保存は --commit`); await ctx.close(); process.exit(0); }
  // 5. 保存
  await sleep(3000);
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('ABORT: 公開に進む 未検出'); await page.screenshot({ path: join(ROOT, `.tmp/list-links-nonext-${NOTE}.png`) }); await ctx.close(); process.exit(6); }
  let onSettings = false;
  for (let attempt = 0; attempt < 3 && !onSettings; attempt++) {
    if (await next.count()) await next.first().click();
    for (let i = 0; i < 8; i++) { await sleep(1800); if (await page.getByRole('button', { name: '更新する', exact: true }).count()) { onSettings = true; break; } }
  }
  if (!onSettings) { console.error('ABORT: 公開設定に到達せず'); await page.screenshot({ path: join(ROOT, `.tmp/list-links-nosettings-${NOTE}.png`) }); await ctx.close(); process.exit(6); }
  let updated = false;
  for (const label of ['更新する', '更新']) { const b = page.getByRole('button', { name: label, exact: label === '更新する' }); if (await b.count()) { await b.first().click(); updated = true; console.log('[4] 「' + label + '」クリック'); break; } }
  if (!updated) { console.error('ABORT: 更新する 未検出'); await ctx.close(); process.exit(7); }
  await sleep(2500);
  for (let i = 0; i < 6; i++) { const no = page.getByRole('button', { name: 'いいえ', exact: true }); if (await no.count()) { await no.first().click(); console.log('[5] 更新通知→いいえ'); break; } await sleep(1200); }
  await sleep(3500);
  await page.screenshot({ path: join(ROOT, `.tmp/list-links-done-${NOTE}.png`) });
  console.log('[done] 更新完了・要 API 実体検証（curl /api/v3/notes/' + NOTE + ' の body に各 ID が <a> で含まれるか）');
  await ctx.close();
} catch (e) { console.error('ERROR:', String(e).split('\n')[0]); exitCode = 9; await ctx.close(); }
process.exit(exitCode);
