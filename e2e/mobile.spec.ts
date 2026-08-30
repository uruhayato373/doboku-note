import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'mobile projectのみで実行');

// 旧 /category/ /docs/ は _redirects の 301 でしか存在せず dev では 404 になる（fixtures.ts 参照）
for (const path of [
  '/',
  '/exam/civil-construction-1',
  '/exam/pe-comprehensive-management/guide/keyword-2026',
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

  // 「メニューを閉じる」は背景オーバーレイとダイアログ内の×の 2 つある（どちらも閉じる正しい導線）。
  // ここで見たいのは明示的な閉じるボタンなので、ダイアログの内側に絞る。
  await page.getByRole('dialog').getByRole('button', { name: 'メニューを閉じる' }).click();
  await expect(openButton).toHaveAttribute('aria-expanded', 'false');
});
