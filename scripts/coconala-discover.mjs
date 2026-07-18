#!/usr/bin/env node
/**
 * coconala-discover.mjs — ココナラ出品フォームの構造ディスカバリ（selector 確定の入力）
 * ---------------------------------------------------------------------------
 * publish/edit スクリプトの selector を実機で確定するための「読み取り専用」偵察。
 * 何も入力・送信しない。ログイン済みプロファイルを確立し、新規出品フローの各ページの
 * DOM outline（フォーム要素・見出し・ボタン）とスクショを .tmp/coconala/discover/ へ出す。
 *
 * 初回はプロファイル未ログインのため headed で開き、ユーザーの手動ログインを待つ。
 * 一度ログインすればプロファイルに保持され、以後の publish/edit は無人で動く。
 *
 * 使い方:
 *   node scripts/coconala-discover.mjs --url /services/add          # 任意パスを偵察
 *   node scripts/coconala-discover.mjs --advance                    # 出品フローを content フォームまで進めて偵察
 *   node scripts/coconala-discover.mjs --advance --cat 12 --sub 254 --type 764  # cascading 発火で facet/価格 options も露出
 *
 * カテゴリ/価格/ジャンル(facet)の value が coconala 側でリニューアルされたら、この --advance で
 * 現行 options を再取得し、.claude/config/coconala-listings.json の category/genreFacets を是正する。
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, launchContext, waitForLogin, assertAccount, sleep } from './lib/coconala-session.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const CUSTOM_URL = getArg('--url');

const OUT = join(ROOT, '.tmp/coconala/discover');
mkdirSync(OUT, { recursive: true });

// 出品フロー入口（2026-07-18 実機確定）。サービス種別選択ページ。content フォームは
// 種別選択→「内容の入力に進む」で生成される下書き /mypage/services/{id}（--advance で辿る）。
const NEW_SERVICE_CANDIDATES = ['https://coconala.com/services/add'];

/** ページの構造を軽量にダンプ（フォーム要素・見出し・ボタン・ラベル・select options・facet） */
async function outline(page) {
  return page.evaluate(() => {
    const clip = (s, n = 80) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const desc = (el) => {
      const attrs = {};
      for (const a of ['id', 'name', 'type', 'placeholder', 'aria-label', 'role', 'data-testid', 'maxlength']) {
        const v = el.getAttribute?.(a);
        if (v) attrs[a] = v;
      }
      const cls = clip(el.className, 60);
      if (cls) attrs.class = cls;
      const out = { tag: el.tagName.toLowerCase(), text: clip(el.innerText || el.value, 50), attrs };
      if (el.tagName === 'SELECT') out.options = Array.from(el.options).map((o) => ({ value: o.value, text: clip(o.textContent, 40) }));
      if (el.type === 'checkbox' || el.type === 'radio') out.checked = el.checked;
      return out;
    };
    const pick = (sel) => Array.from(document.querySelectorAll(sel)).slice(0, 80).map(desc);
    return {
      url: location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => `${h.tagName}: ${clip(h.innerText, 60)}`),
      requiredRows: [...new Set(Array.from(document.querySelectorAll('*'))
        .filter((el) => el.children.length === 0 && /必須/.test(el.textContent || '') && (el.textContent || '').length < 10)
        .map((el) => clip(el.closest('tr,li,div,section')?.querySelector('th,dt,label,legend')?.textContent, 30)).filter(Boolean))].slice(0, 25),
      inputs: pick('input'),
      textareas: pick('textarea'),
      selects: pick('select'),
      facets: pick('input[name^="data[facets]"]'),
      buttons: pick('button, [role=button], a[class*=button]'),
      labels: Array.from(document.querySelectorAll('label')).slice(0, 60).map((l) => clip(l.innerText, 50)).filter(Boolean),
      contenteditable: pick('[contenteditable=true]'),
    };
  });
}

// 出品フローを content フォームまで進める（--advance）。service-type=テキストチャット→内容入力へ。
// さらに --cat/--sub/--type で cascading を発火させ facet options を露出させる。
async function advanceToContentForm(page) {
  await page.goto('https://coconala.com/services/add', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  for (let i = 0; i < 3; i++) {
    const hasModal = await page.evaluate(() => !!document.querySelector('[class*="serviceDialog"], .tw-z-modal'));
    if (!hasModal) break;
    const close = page.getByRole('button', { name: '閉じる' });
    if (await close.count()) { try { await close.first().click({ timeout: 4000 }); } catch {} }
    await page.keyboard.press('Escape'); await sleep(600);
  }
  const label = page.getByText('テキストチャット・', { exact: false });
  if (await label.count()) await label.first().click();
  await sleep(1200);
  const proceed = page.getByRole('button', { name: '内容の入力に進む' });
  if (await proceed.count()) { try { await proceed.first().click({ timeout: 10000 }); } catch {} }
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4000);
  // cascading（任意）: master/sub/type を選ぶと sub/type/facet の options が populate される
  const CAT = getArg('--cat'), SUB = getArg('--sub'), TYPE = getArg('--type');
  try {
    if (CAT) { await page.selectOption('#ServiceCategory', CAT); await sleep(2500); }
    if (SUB) { await page.selectOption('#ServiceSubCategory', SUB); await sleep(2000); }
    if (TYPE) { await page.selectOption('#ServiceMasterCategoryTypeId', TYPE); await sleep(2000); }
  } catch (e) { console.log('[discover] cascading skip:', e.message.split('\n')[0]); }
}

const ctx = await launchContext({ headless: false });
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. ログイン確立（初回は手動待ち）
  const lg = await waitForLogin(page, { tag: '[discover]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); await ctx.close(); process.exit(2); }
  console.log('[discover] ログイン確認 OK');

  // 2. アカウント名の推定（記録用・assert はしない）
  const acc = await assertAccount(page, { tag: '[discover]' });
  console.log('[discover] 推定ログイン名:', acc.seller || '(不明)');

  // 3a. --advance: 出品フローを content フォームまで進めて単独偵察
  if (argv.includes('--advance')) {
    await advanceToContentForm(page);
    const o = await outline(page);
    await page.screenshot({ path: join(OUT, 'advance-content-form.png'), fullPage: true });
    writeFileSync(join(OUT, 'advance.json'), JSON.stringify(o, null, 2));
    console.log(`[discover] advance → ${o.url}`);
    console.log('  必須:', o.requiredRows.join(' / '));
    const price = (o.selects.find((s) => s.attrs.id === 'ServicePrice')?.options || []).length;
    const cats = (o.selects.find((s) => s.attrs.id === 'ServiceCategory')?.options || []).length;
    console.log(`  select: ServiceCategory=${cats}件 ServicePrice=${price}件 facet=${o.facets.length}件 → .tmp/coconala/discover/advance.json`);
    await ctx.close();
    process.exit(0);
  }

  // 3b. 偵察対象を巡回
  const targets = CUSTOM_URL
    ? [CUSTOM_URL.startsWith('http') ? CUSTOM_URL : `https://coconala.com${CUSTOM_URL}`]
    : NEW_SERVICE_CANDIDATES;

  const report = { discoveredAt: new Date().toISOString(), seller: acc.seller || null, pages: [] };
  for (const url of targets) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
      await sleep(2500);
      const o = await outline(page);
      const safe = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
      await page.screenshot({ path: join(OUT, `${safe}.png`), fullPage: true });
      report.pages.push({ requested: url, landed: o.url, title: o.title, outline: o });
      console.log(`[discover] ${url} → ${o.url}  (h1/h2: ${o.headings.slice(0, 3).join(' | ')})`);
    } catch (e) {
      report.pages.push({ requested: url, error: e.message.split('\n')[0] });
      console.log(`[discover] ${url} → ERROR ${e.message.split('\n')[0]}`);
    }
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('[discover] 完了 → .tmp/coconala/discover/report.json ＋ 各スクショ');
} finally {
  await ctx.close();
}
