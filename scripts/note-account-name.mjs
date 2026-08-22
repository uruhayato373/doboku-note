#!/usr/bin/env node
/**
 * note-account-name.mjs
 * ---------------------------------------------------------------------------
 * note の**クリエイター名（表示名 / nickname）**を確認・変更するブラウザ CLI。
 *
 * なぜ要るか（2026-08-11）: クリエイター名が誤って `dc i` に書き換わり、**全 736 記事・
 * クリエイターページ・メンバーシップ加入ページの著者名**がその表示になっていた。
 * note ID（urlname=dobokunote）は URL とスクリプトの account ゲートに使われるので無事だったが、
 * nickname は読者が見る唯一の名前で、ブランドの根幹（技術士・元発注者の合格体験者ポジション）に
 * 直結する。手作業で戻すと再発時に同じ調査をやり直すことになるため、確認と復旧を固定する。
 *
 * 実機仕様（2026-08-11）:
 *   - 変更フォームは `/settings/account/nickname`。`input[name="nickname"]` と「保存」だけ。
 *     アカウント設定ページの「変更」は chevron の SVG を子に持つ div で、
 *     innerText 完全一致の button/a としては拾えない（probe で空振りした原因）。
 *
 * 安全設計:
 *   - 既定は dry-run（現在値の表示のみ・書込なし）。変更は `--name <表示名> --commit`。
 *   - note ID が `dobokunote` であることを assert（別アカウントを書き換えない）。
 *   - 保存後にフォームを読み戻し、さらに **public API の nickname** まで実体検証する
 *     （「保存を押した」を成功と呼ばない）。
 *
 * 使い方:
 *   node scripts/note-account-name.mjs                          # 現在値の確認
 *   node scripts/note-account-name.mjs --name "doboku-note" --commit
 *
 * 真実源: memory `note-membership-publish` / .claude/knowledge/reference/note-api-verification.md
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const TMP = join(ROOT, '.tmp');
const CREATOR = 'dobokunote';
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const NAME = getArg('--name');
const COMMIT = argv.includes('--commit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(TMP, { recursive: true });

/** public API のクリエイター情報（未ログイン＝読者から見える値）。 */
const publicNickname = () => {
  const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0',
    `https://note.com/api/v2/creators/${CREATOR}`], { encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 });
  try { return JSON.parse(r.stdout)?.data?.nickname ?? null; } catch { return null; }
};

if (COMMIT && !NAME) { console.error('必須: --commit を使うときは --name <表示名>'); process.exit(1); }

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4000);
  const acct = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
  if (!acct.includes(CREATOR)) { console.error(`ABORT: note ID が ${CREATOR} でない`); await ctx.close(); process.exit(2); }
  console.log(`[1] account gate OK (note ID=${CREATOR})`);

  await page.goto('https://note.com/settings/account/nickname', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(3000);
  const input = page.locator('input[name="nickname"]');
  if (!(await input.count())) { console.error('ABORT: nickname 入力欄が無い'); await ctx.close(); process.exit(3); }
  const before = await input.first().inputValue();
  const pubBefore = publicNickname();
  console.log(`[2] 現在のクリエイター名: フォーム="${before}" / 公開API="${pubBefore}"`);

  if (!COMMIT) {
    console.log('\n[dry-run] 書込なしで終了。変更は --name "<表示名>" --commit。');
    await ctx.close(); process.exit(0);
  }
  if (before === NAME) { console.log('[3] 既に同じ値 → 何もしない'); await ctx.close(); process.exit(0); }

  await input.first().fill(NAME); await sleep(600);
  const filled = await input.first().inputValue();
  if (filled !== NAME) { console.error(`ABORT: 読み戻し不一致 "${filled}" ≠ "${NAME}"`); await ctx.close(); process.exit(4); }
  const save = page.getByRole('button', { name: '保存', exact: true });
  if (!(await save.count())) { console.error('ABORT: 「保存」ボタン未検出'); await ctx.close(); process.exit(5); }
  if (await save.first().isDisabled().catch(() => false)) { console.error('ABORT: 保存ボタンが disabled'); await ctx.close(); process.exit(6); }
  await save.first().click();
  await sleep(5000);
  await page.screenshot({ path: join(TMP, 'note-account-name-after.png'), fullPage: true });

  // 検証1: フォームを開き直して値を確認
  await page.goto('https://note.com/settings/account/nickname', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  const after = await page.locator('input[name="nickname"]').first().inputValue().catch(() => '(読めず)');
  console.log(`[4] 保存後フォーム: "${after}"`);

  // 検証2: 読者から見える値（public API）。反映に少し遅れることがあるのでリトライ。
  let pub = null;
  for (let i = 0; i < 6 && pub !== NAME; i++) { pub = publicNickname(); if (pub !== NAME) await sleep(4000); }
  console.log(`[5] 公開API の nickname: "${pub}"（期待 "${NAME}"）`);
  if (after !== NAME || pub !== NAME) { console.error('FAIL: クリエイター名が期待値になっていない'); process.exitCode = 7; }
  else console.log(`[done] クリエイター名を "${before}" → "${NAME}" に復旧`);
} finally {
  await ctx.close();
}
