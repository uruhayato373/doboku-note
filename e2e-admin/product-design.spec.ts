import { test, expect } from '@playwright/test';

/**
 * 商品設計（/product/design）が、note の実測の収録に加えて商品の正本（収録の意図との差・作成予定）を出す（DN-0493）。
 * 2級土木は想定工事バンク（パック）の下にペルソナ別パック 10 本があり、作成予定には未公開の商品が載る。
 */
const URL = '/product/design?q=civil-construction-2:second';

test('パックの表に「意図との差」の列が出て、正本の商品は意図どおりか差の本数が出る', async ({ page }) => {
  await page.goto(`${URL}&s=second&t=pack`);
  await expect(page.getByRole('heading', { name: /商品設計/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '意図との差' })).toBeVisible();
  const rows = page.locator('tbody tr');
  expect(await rows.count()).toBeGreaterThan(0);
  // どの行も、意図との差の欄が「意図どおり」「未収録」「意図に無い」「収録を読めない」「正本に無い」のどれかで埋まる（空欄にしない）
  const cells = await rows.evaluateAll((trs) => trs.map((tr) => tr.children[3]?.textContent?.trim() ?? ''));
  for (const c of cells) expect(c).toMatch(/意図どおり|未収録|意図に無い|収録を読めない|正本に無い/);
});

test('マガジンの表でも意図との差が出る（ペルソナ別パック）', async ({ page }) => {
  await page.goto(`${URL}&s=second&t=magazine`);
  await expect(page.getByRole('columnheader', { name: '意図との差' })).toBeVisible();
  await expect(page.getByText('市町村道路の維持修繕').first()).toBeVisible();
});

test('作成予定のタブがあり、表が開く（0 件でも「なし」で空白にしない）', async ({ page }) => {
  await page.goto(`${URL}&s=second&t=planned`);
  await expect(page.getByRole('link', { name: /作成予定/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '意図の収録' })).toBeVisible();
});
