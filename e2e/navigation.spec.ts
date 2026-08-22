import { expect, test } from '@playwright/test';
import { categoryJourneys } from './fixtures';

for (const journey of categoryJourneys) {
  test(`トップから${journey.categoryName}を経由して記事へ到達する`, async ({ page }) => {
    await page.goto('/');

    const categoryLink = page.locator(`main a[href="${journey.categoryPath}"]`).first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await expect(page).toHaveURL(new RegExp(`${journey.categoryPath}$`));
    await expect(page.getByRole('heading', { name: journey.categoryName, exact: false }).first()).toBeVisible();

    const articleLink = page.locator('main a[href^="/docs/"]:visible').first();
    await expect(articleLink).toBeVisible();
    const articlePath = await articleLink.getAttribute('href');
    expect(articlePath).toMatch(/^\/docs\/[^#?]+/);
    await articleLink.click();

    await expect(page).toHaveURL(/\/docs\//);
    await expect(page.locator('main h1').first()).toBeVisible();
  });
}
