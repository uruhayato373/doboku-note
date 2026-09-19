import { readFileSync, writeFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * アクセシビリティ（axe-core・WCAG 2.1 A/AA）のラチェットゲート。
 *
 * - critical は 0 件でなければ落ちる（例: ボタンに名前が無い＝支援技術で操作不能）。
 * - serious は `e2e/a11y-baseline.json` に記録した件数を**超えたら**落ちる（ルール×ページ×配色）。
 *   既知の色コントラスト不足（dark モードで `text-white` の背景が薄色に反転する等）を
 *   直すまでの間、悪化だけを止める。基準の更新は `A11Y_UPDATE_BASELINE=1 npm run test:e2e:a11y`
 *   を **修正を確認してから** 実行し、減った件数を commit する（増やす方向の更新はしない）。
 * - moderate / minor は annotations に出すだけ。
 *
 * 対象は代表テンプレート 8 種 × light/dark。desktop project だけで回す（配色・DOM は共通）。
 */
const BASELINE_PATH = 'e2e/a11y-baseline.json';
const UPDATE = process.env.A11Y_UPDATE_BASELINE === '1';

export const a11yRoutes = [
  '/',
  '/exam/pe-comprehensive-management',
  '/exam/pe-comprehensive-management/keywords/alarp-principle',
  '/exam/civil-construction-1/secondary/r06',
  '/exam/civil-construction-1/textbook/network-schedule',
  '/standards/kinki/common/chapters/1-3',
  '/tools/keiken-charcount',
  '/search?q=コンクリート',
] as const;

type Baseline = Record<string, Record<string, number>>;

function loadBaseline(): Baseline {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  } catch {
    return {};
  }
}

const baseline = loadBaseline();
const observed: Baseline = {};

test.skip(({ isMobile }) => isMobile, 'desktop project のみで実行');

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`a11y (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const route of a11yRoutes) {
      test(`${route} に critical 違反が無く、serious が基準を超えない`, async ({ page }, testInfo) => {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        const key = `${colorScheme} ${route}`;
        const serious: Record<string, number> = {};
        const critical: string[] = [];
        for (const v of results.violations) {
          const line = `[${v.impact}] ${v.id} ×${v.nodes.length} — ${v.help}\n    ${v.nodes[0]?.html?.slice(0, 160) ?? ''}`;
          if (v.impact === 'critical') critical.push(line);
          else if (v.impact === 'serious') serious[v.id] = v.nodes.length;
          else testInfo.annotations.push({ type: `a11y-${v.impact ?? 'unknown'}`, description: line });
        }
        observed[key] = serious;

        expect(critical, `critical:\n${critical.join('\n')}`).toEqual([]);

        if (UPDATE) return;
        const allowed = baseline[key] ?? {};
        const regressions = Object.entries(serious)
          .filter(([rule, n]) => n > (allowed[rule] ?? 0))
          .map(([rule, n]) => `${rule}: ${n} 件（基準 ${allowed[rule] ?? 0}）`);
        expect(
          regressions,
          `serious が基準（${BASELINE_PATH}）を超過:\n${regressions.join('\n')}\n\n` +
            results.violations
              .filter((v) => v.impact === 'serious')
              .map((v) => `  ${v.id}: ${v.help}\n    ${v.nodes[0]?.html?.slice(0, 160) ?? ''}`)
              .join('\n'),
        ).toEqual([]);
      });
    }
  });
}

test.afterAll(() => {
  if (!UPDATE) return;
  const merged: Baseline = { ...loadBaseline(), ...observed };
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
});
