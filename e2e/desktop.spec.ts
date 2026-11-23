import { expect, test } from '@playwright/test';

// PC 幅だけで見る検査（右の欄など、スマホでは出ない部分）。mobile-chromium の testIgnore で外す。
// test.skip で外すと、夜間の check-e2e-execution がスキップを「適用対象の未実行」として落とす（2026-11-17 #1635）。

// 右の欄の上詰めの組の下の空きの AdSense（枠の高さと間隔の決まりは src/styles/globals.css の .rail-lower-ads と src/lib/rail-continuation.ts）。
// デザインの数値（枠の間隔・最大数）は写さず、壊れていないことだけを見る: 空きがあれば 1 枠以上出る・見えている枠が空きからはみ出さない。
// 手元では破線の目印で置き場を見せ、広告は要求しない。@layout: 落ちてもデプロイは止めない（夜間は別の Issue・e2e.yml）。
test('右の欄の空きに AdSense の枠が出て、空きからはみ出さず、手元では目印が出る', { tag: '@layout' }, async ({ page }) => {
  await page.goto('/exam/civil-construction-1/guide/strategy');
  const zone = page.locator('[data-article-sidebar-lower-ads]');
  await expect(zone).toHaveCount(1);
  const { height, visible, overflow } = await zone.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const ads = [...el.querySelectorAll('[data-lower-ad]')].filter((ad) => getComputedStyle(ad).display !== 'none');
    return {
      // コンテナクエリは内容の箱（padding を除く）の高さで判定する
      height: el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom),
      visible: ads.length,
      // 見えている枠の下端が空きの下端を 1px より超えるもの
      overflow: ads.filter((ad) => ad.getBoundingClientRect().bottom > box.bottom + 1).length,
    };
  });
  expect(height, '右の欄の下に空きが無い（検査不成立）').toBeGreaterThan(1000);
  expect(visible, `空き ${Math.round(height)}px に枠が 1 つも出ていない`).toBeGreaterThan(0);
  expect(overflow, '空きからはみ出した枠').toBe(0);
  await expect(page.locator('aside [data-adsense][data-adsense-preview]').first()).toBeVisible();
  expect(await page.locator('script[data-adsense-loader]').count(), '手元では adsbygoogle.js を読まない').toBe(0);
});
