import { expect, test } from '@playwright/test';
import { ctaPages } from './fixtures';
import { inspectCtaStacksInPage, inspectFeedAdsInPage } from '../scripts/lib/cta-stack-inspect.mjs';

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

// 記事の一覧のインフィード広告（src/lib/feed-ads.ts）は一覧の項目の間にあり、前後の項目と同じ幅。1 ページ 3 枠まで。
// 広告が 1 枠も無いと検査不成立として落とす（0 件の緑にしない）。手元では目印が出る。
for (const path of ['/exam/civil-construction-1', '/practice']) {
  test(`${path} のインフィード広告は一覧の項目の間にあり、幅がそろう`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle').catch(() => {});
    const { checked, total, mismatches } = await page.evaluate(inspectFeedAdsInPage);
    expect(total, 'インフィード広告が無い（検査不成立）').toBeGreaterThan(0);
    expect(checked).toBeGreaterThan(0);
    expect(mismatches.map((m) => m.detail)).toEqual([]);
    await expect(page.locator('[data-adsense^="inFeed"][data-adsense-preview]').first()).toBeVisible();
  });
}
