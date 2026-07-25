import { expect, test } from '@playwright/test';
import { ctaPages } from './fixtures';

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
