import { expect, test } from '@playwright/test';

test('テーマの絞り込み解除で全記事リンクが戻る', async ({ page }) => {
  await page.goto('/topics/concrete');
  const links = () => page.locator('main a').evaluateAll(a => a.map(x => x.getAttribute('href')).sort());
  const before = await links();
  await page.getByText('絞り込み', { exact: true }).click();
  const category = page.getByLabel('資格・領域');
  const value = await category.locator('option').nth(1).getAttribute('value');
  await category.selectOption(value!);
  await expect(page.locator('main details:visible')).toHaveCount(2);
  await page.getByLabel('記事を絞り込む').fill('no-matching-article-0000');
  await expect(page.getByText('条件に合う記事がありません。', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '絞り込みを解除' }).click();
  expect(await links()).toEqual(before);
});

test('追加した技術士2資格で検索結果を絞り込める', async ({ page }) => {
  test.setTimeout(120_000);
  let fragments = 0;
  page.on('request', request => { if (/\/fragment\//.test(request.url())) fragments++; });
  await page.goto('/search?q=コンクリート', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/「コンクリート」の検索結果:/)).toBeVisible({ timeout: 60_000 });
  const initialFragments = fragments;
  for (const [label, prefix] of [
    ['技術士 第一次試験', '/exam/pe-first-stage/'],
    ['技術士第二次試験（建設部門）', '/exam/pe-construction/'],
  ] as const) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect.poll(async () => {
      const paths = await page.locator('article h3 a').evaluateAll(a => a.map(x => x.getAttribute('href') ?? ''));
      return paths.length > 0 && paths.every(p => p.startsWith(prefix) && !p.endsWith('.html'));
    }, { timeout: 45_000 }).toBe(true);
  }
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('article h3 a').first()).toBeVisible();
  const first = await page.locator('article h3 a').first().getAttribute('href');
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.locator('article h3 a').first()).not.toHaveAttribute('href', first!);
  expect(fragments).toBe(initialFragments);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('OGP派生画像の取得失敗時も原本画像へ戻る', async ({ page }) => {
  await page.route('**/ogp-thumb-*.webp', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/exam/concrete-engineer');
  const image = page.locator('#sec-guide img').first();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('src', /\/ogp\.png$/);
  await expect(image).not.toHaveAttribute('srcset', /webp/);
  await expect(page.locator('#sec-guide a').first()).toHaveAttribute('href', /^\/exam\/concrete-engineer\//);
});
