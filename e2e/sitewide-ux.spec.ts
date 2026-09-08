import { expect, test } from '@playwright/test';

test('スマホメニューを末尾まで操作でき、背面を動かさず閉じると元の位置へ戻る', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/standards');
  await expect(page.locator('button[title^="現在:"]:visible')).toBeVisible();
  const trigger = page.getByRole('button', { name: 'メニューを開く', exact: true });
  await expect(trigger).not.toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
  const before = await page.evaluate(() => window.scrollY);
  // viewport外のヘッダーを自動スクロールせず、キーボード相当の開閉を発火する。
  await trigger.evaluate((button: HTMLButtonElement) => button.click());
  const menu = page.getByRole('dialog', { name: 'メニュー', exact: true });
  await expect(menu).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  const top = await page.locator('body').evaluate(e => e.style.top);
  await menu.evaluate(e => { e.scrollTop = e.scrollHeight; });
  const last = menu.getByRole('link', { name: 'About', exact: true });
  await expect(last).toBeInViewport();
  expect(await page.locator('body').evaluate(e => e.style.top)).toBe(top);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
  await trigger.evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole('dialog').getByRole('link', { name: '計算・演習', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/?$/);
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');
});

test('OSの明暗どちらでも初回から1回で配色を切り替え、再読み込みでも維持する', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('doboku-note-theme'));
    await page.reload();
    const toggle = page.locator('button[title^="現在:"]:visible');
    await expect(toggle).toHaveAttribute('aria-label', colorScheme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え');
    await toggle.click();
    await expect.poll(() => page.locator('html').evaluate(e => e.classList.contains('dark'))).toBe(colorScheme === 'light');
    await page.reload();
    await expect.poll(() => page.locator('html').evaluate(e => e.classList.contains('dark'))).toBe(colorScheme === 'light');
  }
});

test('検索の資格・ページが再読み込みと戻るで復元され、リセットはURLも消去する', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/search?q=コンクリート');
  await expect(page.getByText(/「コンクリート」の検索結果:/)).toBeVisible({ timeout: 60_000 });
  const filter = page.getByRole('button', { name: '技術士 第一次試験', exact: true });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/category=pe-first-stage/);
  await expect(page.getByRole('button', { name: '次へ', exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('button[aria-current="page"]')).toHaveText('2');
  await page.reload();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('button[aria-current="page"]')).toHaveText('2', { timeout: 60_000 });
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator('button[aria-current="page"]')).toHaveText('1');
  await page.getByRole('button', { name: '資格のみ解除', exact: true }).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(page).toHaveURL(/q=/);
  await page.getByRole('button', { name: '検索をリセット', exact: true }).click();
  await expect(page).toHaveURL(/\/search\/?$/);
  await page.reload();
  await expect(page.locator('main input[type="text"]')).toHaveValue('');
});
