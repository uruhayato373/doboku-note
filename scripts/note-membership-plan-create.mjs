#!/usr/bin/env node
/**
 * note-membership-plan-create.mjs
 * ---------------------------------------------------------------------------
 * note メンバーシップの**プランを新規作成**するブラウザ CLI（/membership/settings/plans/new）。
 *
 * なぜ独立したスクリプトが要るか（2026-08-06 実機確定）:
 *   作成フォームは **プラン名 と 説明 だけ**で、会費・人数制限の欄が無い。会費は作成後の
 *   編集ページで初めて設定でき、**一度設定すると静的テキストになり二度と変更できない**
 *   （入力欄も編集ボタンも消える）。つまり「会費を変える」唯一の手段が
 *   「新しいプランを作る」であり、その入口がここ。会費・定員・特典マガジンの設定は
 *   作成後に `note-membership-plan-edit.mjs --plan <新ID>` で行う。
 *
 * 安全設計:
 *   - 既定は dry-run（フォーム構造ダンプのみ・作成しない）。実作成は `--commit`。
 *   - account=dobokunote を assert。
 *   - 作成されるプランは**非公開**（公開＝フォロワーへ通知が飛ぶ不可逆操作は守備外）。
 *   - 入力後に読み戻して一致を確認してから「プランを作成する」を押す。
 *
 * 使い方:
 *   node scripts/note-membership-plan-create.mjs --name "…" --desc "…"            # dry-run
 *   node scripts/note-membership-plan-create.mjs --name "…" --desc "…" --commit   # 作成
 *
 * 真実源: memory `note-membership-publish` / エージェント: note-membership-operator
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const TMP = join(ROOT, '.tmp');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const NAME = getArg('--name');
const DESC = getArg('--desc');
const COMMIT = argv.includes('--commit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!NAME || !DESC) { console.error('必須: --name <プラン名> --desc <説明・140字以内>'); process.exit(1); }
// note の説明欄は 140 字上限。超過は保存ボタンが disabled になり原因が分かりにくいので先に落とす。
if ([...DESC].length > 140) { console.error(`ABORT: 説明が ${[...DESC].length} 字（上限140）`); process.exit(1); }
mkdirSync(TMP, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) {
    console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2);
  }
  console.log('[1] account gate OK (dobokunote)');

  // 作成前のプラン一覧を控える（作成後の差分で新 planId を確実に特定するため）
  await page.goto('https://note.com/membership/settings/manage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(3500);
  const before = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/plans/"]')]
    .map((a) => (a.getAttribute('href').match(/plans\/([a-z0-9]+)\//) || [])[1]).filter(Boolean))]);
  console.log('[2] 既存プラン:', JSON.stringify(before));

  await page.goto('https://note.com/membership/settings/plans/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4500);

  // 作成フォームの本体入力は「name 属性の無い text input」と textarea の1つずつ
  // （name=q は画面上部の検索欄。拾うと検索窓に打ち込んで無反応になる）。
  const nameInput = page.locator('input[type=text]:not([name="q"])').first();
  const descArea = page.locator('textarea').first();
  if (!(await nameInput.count()) || !(await descArea.count())) {
    console.error('ABORT: 作成フォームの入力欄を特定できず'); await ctx.close(); process.exit(3);
  }
  if (!COMMIT) {
    const form = await page.evaluate(() => ({
      buttons: [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter(Boolean).slice(-4),
      priceField: !!document.querySelector('input[name="price"]'),
    }));
    console.log('[dry-run] フォーム:', JSON.stringify(form));
    console.log('[dry-run] 書込なしで終了。実作成は --commit。');
    await ctx.close(); process.exit(0);
  }

  await nameInput.fill(NAME); await sleep(500);
  await descArea.fill(DESC); await sleep(500);
  const filled = await page.evaluate(() => ({
    name: document.querySelector('input[type=text]:not([name="q"])')?.value || '',
    desc: document.querySelector('textarea')?.value || '',
  }));
  console.log('[3] filled:', JSON.stringify({ name: filled.name, descLen: [...filled.desc].length }));
  await page.screenshot({ path: join(TMP, 'mplan-new-filled.png'), fullPage: true });
  if (filled.name !== NAME || filled.desc !== DESC) {
    console.error('ABORT: 読み戻し不一致 → 作成中止'); await ctx.close(); process.exit(4);
  }

  const createBtn = page.getByRole('button', { name: 'プランを作成する' });
  if (!(await createBtn.count())) { console.error('ABORT: 「プランを作成する」未検出'); await ctx.close(); process.exit(5); }
  if (await createBtn.first().isDisabled().catch(() => false)) {
    console.error('ABORT: 作成ボタンが disabled（必須項目未充足）'); await ctx.close(); process.exit(6);
  }
  await createBtn.first().click();
  await sleep(5000);

  // 新 planId を「一覧の差分」で特定する（作成直後の URL がプラン編集へ遷移しないことがあるため）
  let created = '';
  for (let i = 0; i < 8 && !created; i++) {
    await page.goto('https://note.com/membership/settings/manage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    const after = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/plans/"]')]
      .map((a) => (a.getAttribute('href').match(/plans\/([a-z0-9]+)\//) || [])[1]).filter(Boolean))]);
    created = after.find((k) => !before.includes(k)) || '';
  }
  await page.screenshot({ path: join(TMP, 'mplan-new-created.png'), fullPage: true });
  if (!created) { console.error('[4] FAIL: 新プランを一覧差分で特定できず（画面を確認）'); process.exitCode = 7; }
  else console.log(`[4] 作成 OK: planId=${created}\n    次: node scripts/note-membership-plan-edit.mjs --plan ${created} --price <円> --commit`);
} finally {
  await ctx.close();
}
