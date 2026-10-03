#!/usr/bin/env node
/**
 * x-profile-sync.mjs — X の自己紹介（bio）を正本 config/x-account.json の profile.bio に合わせる。
 *
 * - X の Playwright 永続プロファイルで開き、ログイン中のアカウントが x-account.json の handle でなければ ABORT（別アカウントを書き換えない）
 * - 既定は dry-run（実物と正本の差を出すだけ）。`--commit` で編集画面の自己紹介を書き換えて保存し、プロフィールを読み直して一致を確かめる
 * - 文字数は x-account.json の limits.bio を超えたら書き込まない
 *
 * 使い方: npm run x-profile-sync [-- --commit]
 * 終了コード: 0＝一致（または書き換えて一致を確認）/ 1＝差分あり（dry-run）か書き換え後も不一致 / 2＝検査不成立（ログイン・アカウント・画面）
 */
import { chromium } from 'playwright';
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { readDataset } from './lib/dataset-io.mjs';

const TAG = '[x-profile-sync]';
const ROOT = process.cwd();
const COMMIT = process.argv.includes('--commit');
const account = readDataset(ROOT, 'config.x-account');
const want = account.profile.bio;
const limit = account.limits?.bio ?? 160;
const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim();

async function main() {
  if ([...want].length > limit) {
    console.error(`${TAG} 正本の bio が ${[...want].length} 字で上限 ${limit} を超える。書き込まない`);
    return 2;
  }
  const ctx = await chromium.launchPersistentContext(resolveProfileDir('x', { cwd: ROOT, repoRoot: ROOT }), leanContextOptions({
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  }));
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const me = await page.locator('a[data-testid="AppTabBar_Profile_Link"]').getAttribute('href', { timeout: 30000 }).catch(() => null);
    if (!me) {
      console.error(`${TAG} 検査不成立: ログインしていない（プロファイルで X にログインしてから再実行）`);
      return 2;
    }
    if (me.replace('/', '').toLowerCase() !== account.handle.toLowerCase()) {
      console.error(`${TAG} 検査不成立: ログイン中は @${me.replace('/', '')}。@${account.handle} に切り替えてから再実行（別アカウントは書き換えない）`);
      return 2;
    }
    await page.goto('https://x.com/settings/profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const box = page.locator('textarea[name="description"]');
    await box.waitFor({ timeout: 30000 });
    const live = await box.inputValue();
    if (norm(live) === norm(want)) {
      console.log(`${TAG} 一致（@${account.handle}・${[...want].length} 字）。書き換え不要`);
      return 0;
    }
    console.log(`${TAG} 差分あり\n--- 実物\n${live}\n--- 正本\n${want}`);
    if (!COMMIT) {
      console.log(`${TAG} dry-run。書き換えるには --commit`);
      return 1;
    }
    await box.fill(want);
    await page.locator('[data-testid="Profile_Save_Button"]').click();
    await page.waitForTimeout(3000);
    await page.goto(`https://x.com/${account.handle}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const after = await page.locator('[data-testid="UserDescription"]').innerText({ timeout: 30000 }).catch(() => '');
    // 表示側は URL を短縮・改行を保つので、URL を含まない正本は本文一致で確かめる
    if (norm(after) !== norm(want)) {
      console.error(`${TAG} 書き換え後の表示が正本と一致しない\n--- 表示\n${after}`);
      return 1;
    }
    console.log(`${TAG} 書き換えて表示の一致を確認（@${account.handle}）`);
    return 0;
  } finally {
    await ctx.close();
  }
}

process.exitCode = await main();
