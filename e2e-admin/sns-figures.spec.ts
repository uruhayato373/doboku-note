import { test, expect } from '@playwright/test';

test('図解素材の管理画面と元図を開ける', async ({ page, request }) => {
  const response = await page.goto('/sns#figures');
  expect(response?.status()).toBe(200);
  const figures = page.locator('#figures');
  await expect(figures.getByText('図解素材', { exact: true })).toBeVisible();
  await expect(figures.getByText('水を増やせば土はよく締まるのか？', { exact: true })).toBeVisible();
  const compaction = figures.getByRole('row').filter({ hasText: '水を増やせば土はよく締まるのか？' });
  await expect(compaction.getByRole('link', { name: 'X原稿 #3', exact: true })).toBeVisible();
  const href = await figures.getByRole('link', { name: '元図を開く' }).first().getAttribute('href');
  expect(href).toMatch(/^\/media\/posts\/.*\.svg$/);
  const image = await request.get(href!);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/svg+xml');
});
