import { expect, test } from '@playwright/test';

test('全国10機関を選択し、共通仕様書一覧へ移動できる', async ({ page }) => {
  await page.goto('/standards');

  const selector = page.getByLabel('地方整備局等を選んで表示');
  await expect(selector).toBeVisible();
  await expect(selector.locator('option')).toHaveCount(11);
  await selector.selectOption('chubu');

  await expect(page).toHaveURL(/\/standards\/chubu$/);
  await expect(page.getByRole('heading', { name: '中部地方整備局', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /土木工事共通仕様書/ }).first()).toBeVisible();
});

test('テーマと仕様書を双方向に回遊できる', async ({ page }) => {
  await page.goto('/topics/safety-laws');
  await expect(page.getByRole('link', { name: /土木工事共通仕様書（案）令和8年4月改定/ })).toBeVisible();

  await page.goto('/standards/kinki/common');
  await expect(page.getByRole('link', { name: '安全管理・関係法令' })).toBeVisible();

  await page.goto('/standards/kinki/hikkei/part-08');
  await expect(page.getByRole('link', { name: '安全管理・関係法令' })).toBeVisible();
});

test('安全管理の実務記事から総監・土木施工管理・コンクリート資格へ移動できる', async ({ page }) => {
  await page.goto('/practice/oshms-pdca-site-operation');
  await expect(page.locator('main h1')).toContainText('建設現場でOSHMSを回す方法');
  await expect(page.locator('main a[href="/exam/pe-comprehensive-management/keywords/oshms"]')).toBeVisible();
  await expect(page.locator('main a[href="/exam/civil-construction-1"]')).toBeVisible();
  await expect(page.locator('main a[href="/exam/concrete-chief-engineer"]')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
