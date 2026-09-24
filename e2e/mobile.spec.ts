import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'mobile projectのみで実行');

// 旧 /category/ /docs/ は _redirects の 301 でしか存在せず dev では 404 になる（fixtures.ts 参照）
for (const path of [
  '/',
  '/links',
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

// /links は SNS のプロフィールから来る入口。アプリ内ブラウザの 1 画面目で資格カードのリンクに届かないと、
// 自分の資格を探す前に離脱される（2026-09-24: 紹介文と重複プロフィールで最初の資格リンクが 2.3 画面目だった）。
test('/links は最初の資格リンクがスマホの 1 画面目に収まる', async ({ page }) => {
  await page.goto('/links');
  const firstLink = page.locator('[id^="exam-"] a').first();
  await expect(firstLink).toBeVisible();

  const box = await firstLink.boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 0;
  expect(box, '最初の資格リンクの位置が取れない').not.toBeNull();
  expect(
    box!.y + box!.height,
    `最初の資格リンクの下端=${Math.round(box!.y + box!.height)}px, 画面の高さ=${viewportHeight}px`,
  ).toBeLessThanOrEqual(viewportHeight);
});

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
