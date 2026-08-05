#!/usr/bin/env node
/**
 * note-membership-plan-edit.mjs
 * ---------------------------------------------------------------------------
 * note メンバーシップ「土木セコカン合格ラボ」の**既存プラン**の内容
 * （プラン名 / 説明 / 会費 / 人数制限=定員 / 特典マガジンの紐付け）を編集して**保存**するブラウザ CLI。
 *
 * 位置づけ・安全設計（重要）:
 *   - **保存（「プランを変更する」）は非公開ドラフトのまま**＝可逆。公開（③ プランを公開しよう）は
 *     不可逆なので**本スクリプトの守備外**（運営者が UI で明示実施）。ここでは会費・説明の下ごしらえ
 *     までを担い、公開クリックはしない。
 *   - 既定は **dry-run**（現在値の読取＋スクショのみ・書込なし）。実書込は `--commit` 必須。
 *   - `note-magazine-add-articles` と同じ「システム Chrome（channel:'chrome'）＋永続プロファイル
 *     （.local/playwright-note-profile）＋proxy＋ignoreHTTPSErrors」で会社PCの社内プロキシを越える。
 *   - **account=dobokunote を assert**（不一致は即中断・1フィールドも触らない）。
 *   - 各ステップ .tmp/ にスクショ。
 *
 * プラン ID（2026-07-01 実機 probe）:
 *   - 4956c2d4f928 = 通年プラン（過去問＆月例予想・定員なし）→ 会費 ¥1,480 予定
 *   - ceacc4bb4574 = 添削つきプラン（受験シーズン・定員制）→ 会費 ¥2,980 予定・**定員は添削実測後に確定**
 *   （最新は `https://note.com/membership/settings/manage` の各プラン「編集」リンクで確認）
 *
 * 使い方:
 *   # 現在値の確認（ブラウザ起動・読取のみ）
 *   node scripts/note-membership-plan-edit.mjs --plan 4956c2d4f928
 *   # 会費だけ設定して保存（非公開のまま・可逆）
 *   node scripts/note-membership-plan-edit.mjs --plan 4956c2d4f928 --price 1480 --commit
 *   # 定員つきプラン（添削・定員確定後）
 *   node scripts/note-membership-plan-edit.mjs --plan ceacc4bb4574 --price 2980 --limit 10 --commit
 *   # 名前・説明も上書き（任意）
 *   node scripts/note-membership-plan-edit.mjs --plan <id> --name "…" --desc "…" --commit
 *   # 特典マガジンを紐付ける（タイトル部分一致・カンマ区切りで複数）
 *   node scripts/note-membership-plan-edit.mjs --plan <id> --benefit-magazine "週次お題ラボ" --commit
 *
 * 会費（--price）の制約: **作成済みプランの会費は note の UI に入力欄が無く変更できない**
 *   （静的テキスト表示・2026-08-06 実機確認。両プランとも `input[name=price]` が存在しない）。
 *   このスクリプトは会費指定を黙って skip するので、値を変えたつもりにならないこと。
 *
 * 真実源: .claude/knowledge/reference/note-api-verification.md / エージェント: note-membership-operator
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const TMP = join(ROOT, '.tmp');
const CREATOR = 'dobokunote';
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const PLAN = getArg('--plan');
const PRICE = getArg('--price');
const NAME = getArg('--name');
const DESC = getArg('--desc');
const LIMIT = getArg('--limit');           // 定員（人数制限を有効化して数値設定）。省略時は触らない
// 特典マガジンの紐付け（タイトル部分一致・カンマ区切り）。省略時は触らない。
const BENEFIT_MAGS = (getArg('--benefit-magazine') || '').split(',').map((s) => s.trim()).filter(Boolean);
const COMMIT = argv.includes('--commit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!PLAN) { console.error('必須: --plan <planId>（/membership/settings/manage の各プラン「編集」リンク末尾）'); process.exit(1); }

mkdirSync(TMP, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome', headless: false, ignoreHTTPSErrors: true,
  ...(PROXY ? { proxy: { server: PROXY } } : {}),
});
const page = ctx.pages()[0] || await ctx.newPage();

// --- account gate ---
await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(3000);
if (!(await page.evaluate(() => document.body.innerText.includes('dobokunote')))) {
  console.error('ABORT: account が dobokunote でない（誤爆防止）'); await ctx.close(); process.exit(2);
}
console.log('[1] account gate OK (dobokunote)');

// --- open plan edit ---
const url = `https://note.com/membership/settings/plans/${PLAN}/edit`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
if (!/plans\/.+\/edit/.test(page.url())) { console.error('ABORT: プラン編集画面に到達できず。planId 確認:', page.url()); await ctx.close(); process.exit(3); }
// プロキシ遅延対策: フォーム本体（プラン名/説明の入力）が描画されるまで待つ。
// 「プラン編集」ヘッダだけ先に出てフォームが未描画のまま操作すると空振りする（会社PCで頻発）。
try {
  await page.waitForSelector('textarea, input[type="text"]:not([name="q"])', { timeout: 30000 });
  await page.waitForSelector('button:has-text("プランを変更する")', { timeout: 15000 }).catch(() => {});
} catch { console.error('ABORT: フォーム未描画（プロキシ遅延？）。再実行してください。'); await page.screenshot({ path: join(TMP, `mplan-${PLAN}-noform.png`), fullPage: true }); await ctx.close(); process.exit(7); }
await sleep(1500);
console.log('[2] plan edit:', page.url());

// フィールド locator（probe 2026-07-01 由来）
const priceInput = page.locator('input[name="price"]');
const nameInput = page.getByRole('textbox').filter({ hasNot: page.locator('[name="q"]') }).first(); // プラン名（先頭の text 入力）
// 人数制限トグル: 実機 probe（2026-07-01）で aria-label が空・DOM順も不定と判明。
// 「参加人数を制限する」を近傍テキストに持つ [role=switch] を in-page で特定して data 属性でタグ付けし、
// それをクリックする（他の ON 済みスイッチ＝メンバー限定の記事 等を誤爆しないため）。
async function tagLimitSwitch() {
  return await page.evaluate(() => {
    document.querySelectorAll('[data-np-limit]').forEach((e) => e.removeAttribute('data-np-limit'));
    const sw = [...document.querySelectorAll('[role="switch"],input[type="checkbox"]')].find((s) => {
      let p = s; for (let k = 0; k < 6; k++) { p = p.parentElement; if (!p) break; const t = (p.innerText || '').replace(/\s+/g, ' ').trim(); if (t.includes('参加人数を制限する') && t.length < 40) return true; } return false;
    });
    if (!sw) return false; sw.setAttribute('data-np-limit', '1'); return true;
  });
}
const saveBtn = page.getByRole('button', { name: 'プランを変更する' });

// --- read current state ---
const cur = await page.evaluate(() => {
  const price = document.querySelector('input[name="price"]');
  const nameEl = [...document.querySelectorAll('input[type="text"]')].find((i) => i.name !== 'q');
  const limitOn = [...document.querySelectorAll('[role=switch],input[type=checkbox]')].some((e) => /制限/.test(e.getAttribute('aria-label') || '') && (e.getAttribute('aria-checked') === 'true' || e.checked));
  return { price: price ? price.value : '(no field)', name: nameEl ? nameEl.value : '(no field)', limitOn };
});
console.log('[3] 現在値:', JSON.stringify(cur));
await page.screenshot({ path: join(TMP, `mplan-${PLAN}-before.png`), fullPage: true });

if (!COMMIT) {
  console.log('\n[dry-run] 書込なしで終了。実設定は --commit を付ける。');
  console.log('  例: node scripts/note-membership-plan-edit.mjs --plan', PLAN, PRICE ? `--price ${PRICE}` : '--price <円>', '--commit');
  await ctx.close(); process.exit(0);
}

// --- COMMIT: fill fields（保存のみ・公開しない）---
if (NAME) { await nameInput.fill(NAME); console.log('[4] プラン名 set'); await sleep(500); }
if (DESC) {
  const descArea = page.locator('textarea').first();
  await descArea.fill(DESC); console.log('[4] 説明 set'); await sleep(500);
}
if (PRICE) {
  if (!(await priceInput.count())) {
    // 会費が既設定のプランは入力欄でなく静的テキスト表示になり input[name=price] が無い。
    // その場合は「既に設定済み」として skip（中断しない）。値の一致は目視/検証で確認する。
    const shown = (await page.evaluate(() => (document.body.innerText.match(/([\d,]+)\s*円\/月/) || [])[1] || ''));
    console.log(`[4] 会費フィールド無し（既設定=${shown || '不明'}円/月）→ 会費はスキップ（変更するには note UI で編集モードにする）`);
  } else {
    await priceInput.fill(String(PRICE)); console.log('[4] 会費 set:', PRICE); await sleep(500);
  }
}
if (LIMIT) {
  // 人数制限トグル（近傍テキストで特定した switch）を ON にしてから数値入力（現状 OFF 前提）
  if (!(await tagLimitSwitch())) { console.error('ABORT: 「参加人数を制限する」トグル未検出（フォーム未描画？）'); await ctx.close(); process.exit(8); }
  const sw = page.locator('[data-np-limit="1"]').first();
  const before = await sw.getAttribute('aria-checked').catch(() => null);
  if (before !== 'true') { await sw.click({ force: true }).catch(() => {}); await sleep(1500); }
  const after = await sw.getAttribute('aria-checked').catch(() => null);
  console.log(`[4] 人数制限トグル: ${before} → ${after}`);
  if (after !== 'true') { console.error('ABORT: 人数制限トグルを ON にできず（保存しない）'); await page.screenshot({ path: join(TMP, `mplan-${PLAN}-toggle.png`), fullPage: true }); await ctx.close(); process.exit(10); }
  // ON 後に現れる数値入力（price 以外の number）が描画されるまで待つ
  let filled = false;
  for (let tries = 0; tries < 6 && !filled; tries++) {
    const nums = page.locator('input[type="number"]');
    const n = await nums.count();
    for (let i = 0; i < n; i++) {
      const el = nums.nth(i);
      const name = await el.getAttribute('name').catch(() => '');
      if (name !== 'price') { await el.fill(String(LIMIT)); console.log('[4] 定員 set:', LIMIT); filled = true; break; }
    }
    if (!filled) await sleep(1500);
  }
  if (!filled) { console.error('ABORT: 定員の数値入力欄が見つからず（保存しない）'); await page.screenshot({ path: join(TMP, `mplan-${PLAN}-nolimit.png`), fullPage: true }); await ctx.close(); process.exit(9); }
  await sleep(500);
}

// 特典マガジンの紐付け（「特典マガジンを選択」→ 対象行の「選択」→ ダイアログの「保存」）。
// 押下後に「選択済」へ変わったことを確認できない行は失敗として扱い、紐付けたつもりにしない。
if (BENEFIT_MAGS.length) {
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /特典マガジンを選択/.test(x.innerText || ''));
    if (!b) return false; b.click(); return true;
  });
  if (!opened) { console.error('ABORT: 「特典マガジンを選択」ボタン未検出（保存しない）'); await ctx.close(); process.exit(11); }
  await sleep(4000);
  const results = [];
  for (const wanted of BENEFIT_MAGS) {
    const r = await page.evaluate((label) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const btns = [...document.querySelectorAll('button')].filter((b) => /^(選択|選択済)$/.test(norm(b.innerText)));
      for (const b of btns) {
        let el = b.parentElement;
        for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
          const t = norm(el.innerText);
          if (t.includes(label) && t.length <= label.length + 40) {
            const before = norm(b.innerText);
            if (before === '選択') b.click();
            return { found: true, before, row: t.slice(0, 60) };
          }
        }
      }
      return { found: false };
    }, wanted);
    await sleep(2000);
    if (!r.found) { results.push({ wanted, ok: false, why: '行が見つからない' }); continue; }
    const state = await page.evaluate((label) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const btns = [...document.querySelectorAll('button')].filter((b) => /^(選択|選択済)$/.test(norm(b.innerText)));
      for (const b of btns) {
        let el = b.parentElement;
        for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
          const t = norm(el.innerText);
          if (t.includes(label) && t.length <= label.length + 40) return norm(b.innerText);
        }
      }
      return '(row-gone)';
    }, wanted);
    results.push({ wanted, ok: state === '選択済', before: r.before, after: state, row: r.row });
  }
  results.forEach((r) => console.log(`[4b] 特典マガジン「${r.wanted}」: ${r.before ?? '-'} → ${r.after ?? r.why} / ok=${r.ok}`));
  await page.screenshot({ path: join(TMP, `mplan-${PLAN}-benefit.png`), fullPage: true });
  if (results.some((r) => !r.ok)) { console.error('ABORT: 特典マガジンを選択済にできず（プランは保存しない）'); await ctx.close(); process.exit(12); }
  const saved = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === '保存');
    if (!b) return false; b.click(); return true;
  });
  console.log('[4b] ダイアログ「保存」click =', saved);
  if (!saved) { console.error('ABORT: ダイアログの「保存」未検出'); await ctx.close(); process.exit(13); }
  await sleep(3500);
}

await page.screenshot({ path: join(TMP, `mplan-${PLAN}-filled.png`), fullPage: true });

// save（＝プランを変更する。非公開ドラフトのまま・公開はしない）
if (!(await saveBtn.count())) { console.error('ABORT: 「プランを変更する」ボタン未検出'); await ctx.close(); process.exit(5); }
const disabled = await saveBtn.first().isDisabled().catch(() => false);
if (disabled) { console.error('ABORT: 保存ボタンが disabled（必須項目未充足）。プラン名/説明/会費を確認'); await page.screenshot({ path: join(TMP, `mplan-${PLAN}-disabled.png`), fullPage: true }); await ctx.close(); process.exit(6); }
await saveBtn.first().click();
await sleep(4000);
await page.screenshot({ path: join(TMP, `mplan-${PLAN}-after.png`), fullPage: true });

// verify（保存後、価格が反映されたか再読取）
const after = await page.evaluate(() => {
  const price = document.querySelector('input[name="price"]');
  return { price: price ? price.value : '(page changed)', url: location.href };
});
console.log('[5] 保存後:', JSON.stringify(after));
console.log('[done] プラン内容を保存（非公開のまま）。公開は運営者が「③ プランを公開しよう」で明示実施。');
await ctx.close();
