import { expect, test } from '@playwright/test';

// PC 幅だけで見る検査（右の欄など、スマホでは出ない部分）。mobile-chromium の testIgnore で外す。
// test.skip で外すと、夜間の check-e2e-execution がスキップを「適用対象の未実行」として落とす（2026-11-17 #1635）。

// 右の欄の最後の追従ブロック（src/components/ui/RailFollow・2026-11-23）。上の束と組が流れ切ったあと画面の上端に残り、現在地の目次と AdSense 1 枠を見せる。
// 以前は組の下の空きに縦長の AdSense を 1,000px ごとに最大 40 枠並べていた（長い章で 1 ページ 71 枠になり、AdSense は上から約 19 枠しか処理しなかった）。
// 手元では破線の目印で置き場を見せ、広告は要求しない。@layout: 落ちてもデプロイは止めない（夜間は別の Issue・e2e.yml）。
test('右の欄の最後の追従ブロックは下へ読んでも画面に残り、目次の現在地が動き、手元では目印が出る', { tag: '@layout' }, async ({ page }) => {
  await page.goto('/standards/kinki/common/chapters/1-3');
  const follow = page.locator('aside [data-rail-follow]');
  await expect(follow).toHaveCount(1);
  expect(await follow.evaluate((el) => el.nextElementSibling === null), '追従ブロックは欄の最後').toBe(true);
  expect(await page.locator('aside [data-adsense]').count(), '右の欄の AdSense は組の 2 枠＋追従の 1 枠まで').toBeLessThanOrEqual(3);
  const box = follow.locator(':scope > div');
  const active = () => follow.locator('a.active').first().textContent();
  const scrollTo = async (y: number) => {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await expect.poll(() => box.evaluate((el) => Math.round(el.getBoundingClientRect().top)), { message: `${y}px で画面の上端に残る` }).toBe(16);
  };
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(Math.round(height * 0.3));
  // 現在地はスクロールの次の描画で決まるので、付くまで・変わるまで待つ
  await expect.poll(active, { message: '現在地の目次' }).toBeTruthy();
  const first = await active();
  await scrollTo(Math.round(height * 0.6));
  await expect.poll(active, { message: '読み進めると現在地が変わる' }).not.toBe(first);
  await expect(follow.locator('[data-adsense][data-adsense-preview]')).toBeVisible();
  expect(await page.locator('script[data-adsense-loader]').count(), '手元では adsbygoogle.js を読まない').toBe(0);
});
