import { expect, test } from '@playwright/test';
import { observeRuntimeErrors, representativePages } from './fixtures';

for (const target of representativePages) {
  test(`${target.path} が主要コンテンツを描画する`, async ({ page }) => {
    const assertNoRuntimeErrors = observeRuntimeErrors(page);
    const response = await page.goto(target.path);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('main')).toHaveCount(1);
    await expect(
      page.locator('main').getByRole('heading', { name: target.heading, exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    assertNoRuntimeErrors();
  });
}

test('存在しないURLで404案内と復帰リンクを表示する', async ({ page }) => {
  const response = await page.goto('/__e2e_not_found__');

  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByRole('link', { name: /ホーム/ })).toHaveAttribute('href', '/');
});
