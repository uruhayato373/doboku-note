import { expect, test } from '@playwright/test';

// PC 幅だけで見る検査（右の欄など、スマホでは出ない部分）。mobile-chromium の testIgnore で外す。
// test.skip で外すと、夜間の check-e2e-execution がスキップを「適用対象の未実行」として落とす（2026-11-17 #1635）。

// 右の欄の上詰めの組の下の空きの AdSense は、空きが 624px あれば 1 枠目、以降 1,000px ごとに 1 枠（最大 40 枠・src/styles/globals.css の .rail-lower-ads と src/lib/rail-continuation.ts）。手元では破線の目印で置き場を見せ、広告は要求しない。
test('右の欄の空きの AdSense は空きの高さで枠数が決まり、手元では目印が出る', async ({ page }) => {
  await page.goto('/exam/civil-construction-1/guide/strategy');
  const zone = page.locator('[data-article-sidebar-lower-ads]');
  await expect(zone).toHaveCount(1);
  const { height, visible } = await zone.evaluate((el) => ({
    // コンテナクエリは内容の箱（padding を除く）の高さで判定する
    height: el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom),
    visible: [...el.querySelectorAll('[data-lower-ad]')].filter((ad) => getComputedStyle(ad).display !== 'none').length,
  }));
  const expected = height < 624 ? 0 : Math.min(40, Math.floor((height - 624) / 1000) + 1);
  expect(visible, `空き ${Math.round(height)}px`).toBe(expected);
  expect(visible).toBeGreaterThan(0);
  await expect(page.locator('aside [data-adsense][data-adsense-preview]').first()).toBeVisible();
  expect(await page.locator('script[data-adsense-loader]').count(), '手元では adsbygoogle.js を読まない').toBe(0);
});
