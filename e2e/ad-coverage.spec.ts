import { expect, test } from '@playwright/test';

/**
 * 本文で広告も導線も無い区間の上限（2026-11-22 運営者判断「サイト全体の広告の置き方を共通に」）。
 * 本文の AdSense の決まり（src/lib/body-ad-rules.mjs）は字数・問題の数で割るので、画面の高さで外れていないかをここで確かめる。
 * 以前は本文の下半分に何も無い区間が PC で最大 16,700px・スマホで最大 2.9 万 px あった（技術士一次 R7 基礎・基準書 必携 3-2）。
 * 数えるのは本文の列（article）の中の AdSense の枠・転職・note・ココナラの導線で、測れた数が 0 のページは検査不成立として落とす。
 * 手元・プレビューの配信では AdSense は破線の目印になり、高さは本番の枠と同じ下限を取る（AdSlot）。
 */
const pages = [
  '/exam/pe-first-stage/primary/r07-basic',
  '/exam/civil-construction-1/secondary/r06',
  '/exam/civil-construction-2/guide/r08-secondary-answers',
  '/practice/formwork-removal-timing',
  '/standards/kinki/hikkei/chapters/3-2',
  '/standards/kinki/common/chapters/1-1',
] as const;

/**
 * 区間の上限（px）。2026-11-22 の手元の実測（変更後）は PC 1,500〜4,150px・スマホ 1,900〜6,700px で、長いのは割れない大きな表
 * （基準書 共通仕様書 1-1 の後半）と、手書きの CTA の前後に枠を置けない記事。変更前は PC 最大 16,700px・スマホ最大 2.9 万 px。
 */
const MAX_GAP = { desktop: 4500, mobile: 7000 } as const;

for (const path of pages) {
  // @layout: 区間の上限はデザインの許容値なので、落ちてもデプロイは止めない（夜間は別の Issue・e2e.yml）
  test(`${path} の本文に広告も導線も無い区間が長すぎない`, { tag: '@layout' }, async ({ page }, info) => {
    await page.goto(path);
    const result = await page.evaluate(() => {
      const article = document.querySelector('main article') ?? document.querySelector('main');
      if (!article) return null;
      const box = article.getBoundingClientRect();
      const top = box.top + scrollY;
      const bottom = box.bottom + scrollY;
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height >= 40 && getComputedStyle(el).visibility !== 'hidden';
      };
      const units = [...article.querySelectorAll('[data-adsense], [data-cta="affiliate"], [data-cta="note"], [data-cta="coconala"]')]
        .filter(visible)
        .map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; })
        .sort((a, b) => a.top - b.top);
      let cursor = top;
      let gap = 0;
      let at = top;
      for (const unit of units) {
        if (unit.top - cursor > gap) { gap = unit.top - cursor; at = cursor; }
        cursor = Math.max(cursor, unit.bottom);
      }
      if (bottom - cursor > gap) { gap = bottom - cursor; at = cursor; }
      return { units: units.length, height: Math.round(bottom - top), gap: Math.round(gap), at: Math.round(at - top) };
    });
    expect(result, '本文の列が見つからない').not.toBeNull();
    const kind = info.project.name.startsWith('mobile') ? 'mobile' : 'desktop';
    console.log(`${path} [${kind}] 本文 ${result!.height}px・枠と導線 ${result!.units} 個・最長の空き ${result!.gap}px（本文の先頭から ${result!.at}px）`);
    expect(result!.units, '枠と導線を 1 つも測れない（検査不成立）').toBeGreaterThan(0);
    expect(result!.gap, `本文の先頭から ${result!.at}px の位置から ${result!.gap}px 何も無い`).toBeLessThanOrEqual(MAX_GAP[kind]);
  });
}
