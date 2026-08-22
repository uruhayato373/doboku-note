import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'mobile projectのみで実行');

for (const path of [
  '/',
  '/category/civil-construction-1',
  '/docs/pe-comprehensive-management-keyword-2026',
]) {
  test(`${path} がページ全体を横方向へ押し広げない`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `scrollWidth=${dimensions.scrollWidth}, clientWidth=${dimensions.clientWidth}`,
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test('モバイルメニューを開閉できる', async ({ page }) => {
  await page.goto('/');

  const openButton = page.getByRole('button', { name: 'メニューを開く' });
  await openButton.click();
  await expect(openButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: 'メニューを閉じる' }).click();
  await expect(openButton).toHaveAttribute('aria-expanded', 'false');
});
