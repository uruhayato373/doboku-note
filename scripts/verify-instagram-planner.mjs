#!/usr/bin/env node
/** Meta Business Suite の月間プランナーを短時間で読み、予約時刻と任意テキストを照合する。 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const account = JSON.parse(readFileSync(join(ROOT, '.claude/config/ig-account.json'), 'utf8'));
const argv = process.argv.slice(2);
const value = (name, fallback = '') => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
};
const expected = value('--expect');
const expectedText = value('--text');
if (expected && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(expected)) {
  throw new Error('--expect は YYYY-MM-DDTHH:MM 形式です');
}
const { resolveProfileDir } = await import(
  pathToFileURL(join(ROOT, 'scripts/lib/playwright-auth-profile.mjs')).href
);
const profile = resolveProfileDir(account.authService, { cwd: ROOT, repoRoot: ROOT });
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  channel: 'chrome',
  viewport: { width: 1500, height: 1400 },
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
});
const page = context.pages()[0] || await context.newPage();
try {
  await page.goto(account.plannerUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(7000);
  if (/login|checkpoint|two_factor/u.test(page.url())) throw new Error('Metaログインが必要です');
  await page.locator('[role="button"], button').filter({ hasText: /^月$/u }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(4000);
  const body = await page.locator('body').innerText();
  const days = await page.$$eval('*', (nodes) => nodes
    .filter((node) => /^\d{1,2}日$/u.test((node.textContent || '').trim()) && node.children.length === 0)
    .map((node) => { const rect = node.getBoundingClientRect(); return { day: (node.textContent || '').trim(), x: Math.round(rect.x), y: Math.round(rect.y) }; }));
  const chips = await page.$$eval('*', (nodes) => nodes
    .filter((node) => /^\d{1,2}:\d{2}$/u.test((node.textContent || '').trim()) && node.children.length === 0)
    .map((node) => { const rect = node.getBoundingClientRect(); return { time: (node.textContent || '').trim(), x: Math.round(rect.x), y: Math.round(rect.y) }; }));
  const byDay = {};
  for (const chip of chips) {
    let best = null;
    let distance = Number.POSITIVE_INFINITY;
    for (const day of days) {
      if (chip.y < day.y || Math.abs(chip.x - day.x) >= 80 || chip.y - day.y >= 260) continue;
      const candidate = Math.abs(chip.x - day.x) + (chip.y - day.y) * 0.2;
      if (candidate < distance) { best = day; distance = candidate; }
    }
    if (best) (byDay[best.day] ||= []).push(chip.time);
  }
  const time = expected ? expected.slice(11, 16) : '';
  const dayLabel = expected ? `${Number(expected.slice(8, 10))}日` : '';
  const timeFound = !time || chips.some((chip) => chip.time === time) || body.includes(time);
  const dateTimeFound = !expected || (byDay[dayLabel] || []).includes(time);
  const textFound = !expectedText || body.includes(expectedText);
  const debugDir = join(ROOT, '.local/playwright-ig-bs-debug');
  mkdirSync(debugDir, { recursive: true });
  const screenshot = join(debugDir, 'planner-latest.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const result = {
    checkedAt: new Date().toISOString(),
    account: account.handle,
    expected: expected || null,
    expectedText: expectedText || null,
    timeFound,
    dateTimeFound,
    textFound,
    pass: dateTimeFound,
    daySlots: byDay,
    timeChips: [...new Set(chips.map((chip) => chip.time))].sort(),
    screenshot: screenshot.slice(ROOT.length + 1),
  };
  const stateDir = join(ROOT, '.claude/state/ig-reconcile');
  if (existsSync(stateDir)) writeFileSync(join(stateDir, 'planner-latest.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await context.close();
}
