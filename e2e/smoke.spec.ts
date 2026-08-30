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

// 旧 URL の 301。`public/_redirects`（1,202 行）は Cloudflare Pages が処理するもので
// next.config に redirects() は無いため、dev サーバーでは検査できなかった。その結果
// URL 移行のあと `/category/` `/docs/` を指したままのフィクスチャが「常に 404 で赤」に
// なっても誰も直さない状態が続いた。ビルド成果物を配信する構成になったので、ここで
// 実際に 301 が出ることを固定しておく。
for (const [from, to] of [
  ['/category/civil-construction-1', '/exam/civil-construction-1'],
  ['/docs/pe-comprehensive-management-keyword-2026', '/exam/pe-comprehensive-management/guide/keyword-2026'],
] as const) {
  test(`旧URL ${from} が正規URLへ 301 で転送される`, async ({ page }) => {
    const response = await page.goto(from);

    // 追跡後の最終 URL が正規 URL であること（連鎖せず 1 回で着くこと）
    expect(new URL(page.url()).pathname).toBe(to);
    expect(response?.ok()).toBeTruthy();
    const chain = response?.request().redirectedFrom();
    expect(chain, 'リダイレクトが発生していない').not.toBeNull();
    expect(chain?.redirectedFrom(), 'リダイレクトが連鎖している').toBeNull();
  });
}
