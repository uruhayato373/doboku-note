/** X の実予約を取得。ログイン画面・別アカウント・未完了の一覧を空キューと扱わない。 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { resolveProfileDir } from './playwright-auth-profile.mjs';
import { leanContextOptions } from './playwright-launch.mjs';

export function parseQueueDate(text) {
  const m = text.match(/(\d{4})年(\d+)月(\d+)日.*?(午前|午後)(\d+):(\d+)/);
  if (!m) return null;
  const hour = Number(m[5]) % 12 + (m[4] === '午後' ? 12 : 0);
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T${String(hour).padStart(2, '0')}:${m[6]}:00+09:00`;
}

/** 本文冒頭と予約分が一致した行だけを実在と扱う。 */
export function isTweetInQueue(tweet, rows) {
  const normalize = text => String(text || '').replace(/\s+/g, ' ').trim();
  const needle = normalize(tweet.text).slice(0, 40);
  const minute = value => Math.floor(Date.parse(value) / 60000);
  if (!needle || !Number.isFinite(minute(tweet.scheduled_at))) return false;
  return rows.some(row => minute(row.scheduledAt) === minute(tweet.scheduled_at) && normalize(row.text).includes(needle));
}

export async function readScheduledQueue({ root = process.cwd(), headless = true } = {}) {
  const { handle } = JSON.parse(fs.readFileSync(path.join(root, '.claude/config/x-account.json'), 'utf8'));
  const ctx = await chromium.launchPersistentContext(resolveProfileDir('x', { cwd: root, repoRoot: root }), leanContextOptions({
    headless, channel: 'chrome', viewport: { width: 1280, height: 1000 },
    locale: 'ja-JP', timezoneId: 'Asia/Tokyo', args: ['--disable-blink-features=AutomationControlled'],
  }));
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
    const account = page.locator('[data-testid="SideNav_AccountSwitcher_Button"]').first();
    await account.waitFor({ state: 'visible', timeout: 20000 });
    if (!(await account.innerText()).split(/\s+/).includes(`@${handle}`)) throw new Error(`X account mismatch: expected @${handle}`);
    await page.goto('https://x.com/compose/post/unsent/scheduled', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: '予約済み', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(2500);
    const rows = new Map(); let stable = 0;
    for (let i = 0; i < 100 && stable < 4; i++) {
      const size = rows.size;
      const buttons = page.getByRole('button').filter({ hasText: /\d{4}年\d+月\d+日.*送信されます/ });
      for (const text of await buttons.allInnerTexts()) {
        const scheduledAt = parseQueueDate(text);
        if (!scheduledAt) throw new Error('X queue date is unreadable');
        rows.set(text, { text, scheduledAt });
      }
      if (await buttons.count()) await buttons.last().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(650);
      stable = size === rows.size ? stable + 1 : 0;
    }
    if (stable < 4) throw new Error('X queue collection did not reach the end');
    if (!rows.size) {
      const body = await page.locator('body').innerText();
      if (!/予約(?:済み|設定した)(?:の)?(?:ポスト|ツイート)(?:は|が)(?:ありません|ないようです)/.test(body)) {
        throw new Error('X queue empty state was not confirmed');
      }
    }
    return { account: handle, checkedAt: new Date().toISOString(), complete: true, rows: [...rows.values()] };
  } finally { await ctx.close(); }
}
