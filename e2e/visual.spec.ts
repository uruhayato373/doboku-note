import { expect, test } from '@playwright/test';
import { representativeRoutes } from './routes';

/**
 * ビジュアルリグレッション（DN-0238）。
 *
 * CSS・Tailwind 変更によるレイアウト崩れは lint-ui でも axe（a11y.spec.ts）でも捕まらない
 * （Tailwind の transform 変種が本 build で無効だった件はこの種の見落とし）。
 * a11y.spec.ts と同じ代表テンプレ + `/links`（SNS プロフィールからの入口）を
 * desktop・mobile（playwright.config.ts の 2 project）× light/dark で `toHaveScreenshot` に固定する。
 *
 * 基準画像の更新手順は docs/operations/12_Playwright_E2E導入設計.md「基準画像の更新」を参照。
 * ローカルで `--update-snapshots` を使わない（フォントレンダリングが CI の ubuntu と異なり、
 * ローカル生成の基準を commit すると CI 側で常に赤くなる）。
 */
const visualRoutes = [...representativeRoutes, '/links'] as const;

// アニメーション・キャレット点滅を止める（スピナー等の途中状態でスクリーンショットが揺れるのを防ぐ）。
async function freezeMotion(page: import('@playwright/test').Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`visual (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const route of visualRoutes) {
      test(`${route} が基準画像と一致する`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'networkidle' });
        await expect(page.locator('main')).toBeVisible();
        await freezeMotion(page);

        // /search は Pagefind の索引取得＋検索が非同期。スピナーが消える（結果 or 0件表示に
        // 切り替わる）までスクリーンショットを取らない。
        if (route.startsWith('/search')) {
          await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 10_000 });
        }

        const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
        // 既定の expect.timeout（10s）だと、基準画像が無い1回目のキャプチャ（安定待ちを含む）が
        // 長い記事（/standards/kinki/... 等）で CI 上超過する（実機確認・2026-09-25）。
        await expect(page).toHaveScreenshot(`${colorScheme}-${slug}.png`, { fullPage: true, timeout: 30_000 });
      });
    }
  });
}
