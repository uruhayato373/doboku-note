import { expect, test } from '@playwright/test';
import { standardsRenderTargets } from '../scripts/lib/standards-render-targets.mjs';

/**
 * 公的基準の章・節ページを実際に描画して、読めない形になっていないかを数値で確かめる。
 *
 * 2026-10-16、長い文のセルが 1〜2 文字幅に押しつぶされる・はみ出す表にキーボードで届かない、を
 * 利用者が画面で見つけた。生成物の検査（check-standard-articles）は文字と件数は見るが描画は見ない。
 *
 * 対象は「中身が異なるページすべて」。共通仕様書 8 文書は本文がほぼ同じなので、
 *   - 比較の基準である近畿版の全章・全節ページ
 *   - 別の仕様書である北海道版の全章・全節ページ
 *   - 近畿版と差分がある地域版の章（content/site/standards-articles/comparison.json の changedChapterIds）
 * を描画する。対象は manifest と比較データから決めるので、改訂で差分が増えれば対象も増える。
 */
/** これより長い文のセルは、この幅（文字数 × フォントサイズ）より細くなってはいけない */
const LONG_CELL_CHARS = 12;
const MIN_LONG_CELL_EM = 4;

const targets = standardsRenderTargets('content/site/standards-articles') as string[];

test('描画の対象が manifest と比較データから決まっている（検査ゼロを合格にしない）', () => {
  // 近畿版 43 章＋節ページ、北海道版 43 章＋節ページ、差分のある地域版の章
  expect(targets.length).toBeGreaterThan(100);
  expect(targets.some((url) => url.startsWith('/standards/hokkaido/'))).toBeTruthy();
  expect(targets.some((url) => !url.startsWith('/standards/kinki/') && !url.startsWith('/standards/hokkaido/'))).toBeTruthy();
});

for (const url of targets) {
  test(`描画: ${url} の表が読める形で、ページが横にはみ出さない`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('main article h1')).toBeVisible();
    // はみ出しの測定と tabindex はハイドレーション後に付くので、読み込みが落ち着いてから測る
    await page.waitForLoadState('networkidle');

    const report = await page.evaluate(
      ({ longChars, minEm }) => {
        const article = document.querySelector('[data-standards-chapter], [data-standards-section-index]');
        const squeezed: string[] = [];
        for (const cell of Array.from(document.querySelectorAll<HTMLElement>('[data-standards-chapter] table :is(td, th)'))) {
          const text = (cell.textContent ?? '').trim();
          if ([...text].length <= longChars) continue;
          const fontSize = parseFloat(getComputedStyle(cell).fontSize) || 16;
          if (cell.getBoundingClientRect().width < fontSize * minEm) squeezed.push(text.slice(0, 20));
        }
        return {
          hasBody: Boolean(article),
          squeezed,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      },
      { longChars: LONG_CELL_CHARS, minEm: MIN_LONG_CELL_EM },
    );

    expect(report.hasBody, '章・節の本文（または節の一覧）が無い').toBeTruthy();
    expect(report.squeezed, `長い文のセルが ${MIN_LONG_CELL_EM} 文字幅より細く押しつぶされている`).toEqual([]);
    expect(report.pageOverflow, 'ページ全体が横にはみ出している').toBeLessThanOrEqual(1);
    // tabindex はハイドレーション後に付く（StandardScrollTable）。表の多いページは時間がかかるので待ってから判定する
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              Array.from(document.querySelectorAll<HTMLElement>('[data-standards-chapter] .table-scroll')).filter(
                (wrapper) => wrapper.scrollWidth > wrapper.clientWidth + 1 && wrapper.getAttribute('tabindex') !== '0',
              ).length,
          ),
        { message: '横にはみ出す表にキーボードで届かない（tabindex が無い）', timeout: 15_000 },
      )
      .toBe(0);
  });
}
