import { expect, test } from '@playwright/test';
import { ctaPages } from './fixtures';
import { inspectCtaStacksInPage } from '../scripts/lib/cta-stack-inspect.mjs';

for (const path of ctaPages) {
  test(`${path} のnote CTAが安全なURLを持つ`, async ({ page }) => {
    await page.goto(path);

    const noteLinks = page.locator('main a[href^="https://note.com/dobokunote/"]:visible');
    await expect(noteLinks.first()).toBeVisible();
    const hrefs = await noteLinks.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const url = new URL(href);
      expect(url.origin).toBe('https://note.com');
      expect(url.pathname).toMatch(/^\/dobokunote\/(?:n\/n[a-zA-Z0-9]+|m\/m[a-zA-Z0-9]+)\/?$/);
      if (url.searchParams.has('utm_source')) {
        expect(['site', 'doboku-note']).toContain(url.searchParams.get('utm_source'));
        expect(url.searchParams.get('utm_medium')).toBeTruthy();
        expect(url.searchParams.get('utm_campaign')).toBeTruthy();
      }
    }
  });
}

// 縦に続く商品導線（転職の横長バナー・note・ココナラ・AdSense）は同じ幅・同じ左端（規則は src/lib/cta-stack.ts）。
// 記事末で 740px のバナー・300px の note・2 列の片側のココナラがばらばらだった（2026-11-16 運営者指摘）。
// 導線が 1 つも測れないページは検査不成立として落とす（0 件の緑にしない）。
const ctaStackPages = [
  '/exam/civil-construction-1/guide/strategy',
  '/exam/concrete-chief-engineer/textbook/construction',
  '/exam/civil-construction-1/secondary/r06',
  '/exam/pe-water-supply/guide/hissu-kamoku',
  '/exam/civil-construction-1',
  '/tools/keiken-charcount',
  '/tools/kakomon-quiz/pe-first-stage',
] as const;

for (const path of ctaStackPages) {
  test(`${path} の縦に続く商品導線の幅と左端がそろっている`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle').catch(() => {});
    const { checked, mismatches } = await page.evaluate(inspectCtaStacksInPage);
    expect(checked, '商品導線を 1 つも測れていない（検査不成立）').toBeGreaterThan(0);
    expect(mismatches.map((m) => m.detail)).toEqual([]);
  });
}

// 右の欄の上詰めの組の下の空きの AdSense は、描画した空きの高さ 2,500px ごとに 1 枠（最大 3 枠）。手元では破線の目印で置き場を見せ、広告は要求しない。
test('右の欄の空きの AdSense は空きの高さで枠数が決まり、手元では目印が出る', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', '右の欄は PC 幅だけ');
  await page.goto('/exam/civil-construction-1/guide/strategy');
  const zone = page.locator('[data-article-sidebar-lower-ads]');
  await expect(zone).toHaveCount(1);
  const { height, visible } = await zone.evaluate((el) => ({
    // コンテナクエリは内容の箱（padding を除く）の高さで判定する
    height: el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom),
    visible: [...el.querySelectorAll('[data-lower-ad]')].filter((ad) => getComputedStyle(ad).display !== 'none').length,
  }));
  expect(visible, `空き ${Math.round(height)}px`).toBe(Math.min(3, Math.floor(height / 2500)));
  expect(visible).toBeGreaterThan(0);
  await expect(page.locator('aside [data-adsense][data-adsense-preview]').first()).toBeVisible();
  expect(await page.locator('script[data-adsense-loader]').count(), '手元では adsbygoogle.js を読まない').toBe(0);
});
