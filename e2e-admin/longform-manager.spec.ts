import { test, expect } from '@playwright/test';

const URL = '/sns/youtube/longform?m=2026-10&e=civil-construction-2';
const QUALITY = '② 品質管理｜試験をした、だけで終わらせない';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  // SSR直後のクリックを避け、検索が実際に動くことでclientの準備を確認する。
  await page.getByPlaceholder('動画名で検索').fill('__no_matching_video__');
  await expect(page.getByRole('table').first().getByText('該当なし')).toBeVisible();
  await page.getByPlaceholder('動画名で検索').fill('');
  await expect(page.getByRole('button', { name: QUALITY, exact: true })).toBeVisible();
});

test('一覧は3列で、予約と未予約を区別し、制作メモ・停止履歴は詳細へ寄せる', async ({ page }) => {
  const table = page.getByRole('table').first();
  await expect(table.getByRole('columnheader')).toHaveCount(3);
  await expect(table.getByRole('row')).toHaveCount(8);
  await expect(table.getByText('予約済み', { exact: true })).toHaveCount(6);
  await expect(table.getByText('未予約', { exact: true })).toHaveCount(1);
  await expect(table.getByText('civil-construction-2/', { exact: false })).toHaveCount(0);
  await expect(table.getByText('停止中', { exact: true })).toHaveCount(0);
  expect(await page.locator('form').getAttribute('method')).toBe('get');
});

test('動画名から右側で詳細を開き、実予約と制作目標・確認期限を別々に確認する', async ({ page }) => {
  const trigger = page.getByRole('button', { name: QUALITY, exact: true });
  await trigger.click();
  const panel = page.getByRole('dialog', { name: QUALITY });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('2026-10-19 20:00', { exact: true })).toBeVisible();
  await expect(panel.getByText('確認期限', { exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: '制作メモ' })).toBeVisible();
  await expect(panel.getByRole('link', { name: '画像・動画を確認' })).toHaveAttribute('href', /hinshitsu-touan-gutaika/);
  await expect(panel.getByRole('link', { name: 'YouTubeで確認' })).toHaveAttribute('href', /7fEJR-WD8Ng/);
  await panel.getByText('台帳情報', { exact: true }).click();
  await expect(panel.getByText('civil-construction-2/hinshitsu-touan-gutaika/youtube.longform', { exact: true })).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('表示切替で予約・公開・停止を確認し、月と資格の条件を保持する', async ({ page }) => {
  for (const [value, label, count] of [['scheduled', '予約済み', 6], ['published', '公開済み', 2], ['stopped', '停止中', null]] as const) {
    await page.getByRole('combobox', { name: '表示', exact: true }).selectOption(value);
    await page.getByRole('button', { name: '絞り込む', exact: true }).click();
    await expect(page).toHaveURL(/e=civil-construction-2.*m=2026-10.*s=/);
    await expect(page.getByRole('combobox', { name: '月', exact: true })).toHaveValue('2026-10');
    const table = page.getByRole('table').first();
    // 停止した動画は過去の実予約日ではなく、現在の制作目標が10月の行を表示する。
    if (value !== 'stopped') await expect(table.getByText(label, { exact: true })).toHaveCount(count);
    else expect(await table.getByText(label, { exact: true }).count()).toBeGreaterThan(0);
  }
});

test('一覧と詳細が画面幅に収まり、内容をスクロールして確認できる', async ({ page }, testInfo) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/design-review/longform/${testInfo.project.name}-light-list.png`, fullPage: true });
  await page.getByRole('button', { name: QUALITY, exact: true }).click();
  const panel = page.getByRole('dialog', { name: QUALITY });
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/design-review/longform/${testInfo.project.name}-light-detail.png`, fullPage: true });
});
