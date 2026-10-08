import { expect, test } from '@playwright/test';

test('多問の過去問は折りたたみ番号一覧と問1への直行で読める', async ({ page }) => {
  await page.goto('/exam/civil-construction-1/primary/r07-a');
  const nav = page.getByRole('navigation', { name: '問題番号へ移動' });
  await expect(nav.locator('details')).not.toHaveAttribute('open', '');
  await nav.locator('summary').click();
  const chips = nav.locator('ol a');
  await expect(chips).toHaveCount(66);
  expect(await chips.evaluateAll(els => els.every(el => {
    const r = el.getBoundingClientRect();
    return r.width >= 44 && r.height >= 44;
  }))).toBe(true);
  await nav.locator('summary').click();
  await nav.getByRole('link', { name: '問1から読む' }).click();
  const heading = page.locator('main .prose-blog h2').first();
  await expect(heading).toBeInViewport();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /全66問/);
});

test('仕様書の表は横に続くときだけ案内を出し、キーボードでも読める', async ({ page }) => {
  await page.goto('/standards/kinki/common/chapters/1-3');
  await expect(page.locator('main article header')).toContainText('原本PDF');
  const table = page.locator('.standard-verbatim').first();
  await expect(table).toBeVisible();
  const overflows = await table.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  if (overflows) {
    await expect(table).toHaveAttribute('aria-describedby', /.+/);
    await table.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => table.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  } else {
    await expect(table).not.toHaveAttribute('aria-describedby');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('JavaScriptなしでも番号一覧を開いて問題へ移動できる', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/exam/civil-construction-1/primary/r07-a`);
    const nav = page.getByRole('navigation', { name: '問題番号へ移動' });
    await nav.locator('summary').click();
    await expect(nav.locator('ol a')).toHaveCount(66);
    await nav.getByRole('link', { name: '問題 66 へ移動', exact: true }).click();
    await expect(page.getByRole('heading', { name: '問題 No.66', exact: true })).toBeInViewport();
  } finally {
    await context.close();
  }
});
