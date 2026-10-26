import { expect, test } from '@playwright/test';

test('全11機関（地方 10＋本省）を選択し、共通仕様書一覧へ移動できる', async ({ page }) => {
  await page.goto('/standards');

  const agencies = page.locator('#agencies');
  await expect(agencies).toBeVisible();
  await expect(agencies.locator('a[href^="/standards/"]')).toHaveCount(11);
  await agencies.getByRole('link', { name: /中部地方整備局/ }).click();

  await expect(page).toHaveURL(/\/standards\/chubu$/);
  await expect(page.getByRole('heading', { level: 1, name: /^中部地方整備局 土木工事共通仕様書/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /土木工事共通仕様書/ }).first()).toBeVisible();
});

test('仕様書の階層ナビをデスクトップとモバイルで利用できる', async ({ page }, testInfo) => {
  await page.goto('/standards/chubu');

  const sidebar = page.locator('[data-standards-sidebar]');
  const mobileNav = page.locator('[data-standards-mobile-nav]');
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(sidebar).toBeHidden();
    await expect(mobileNav).toBeVisible();
  } else {
    await expect(sidebar).toBeVisible();
    await expect(mobileNav).toBeHidden();
    await expect(sidebar.locator('[data-standards-nav="agencies"] a[aria-current="page"]')).toContainText('中部地方整備局');
  }

  await page.goto('/standards/chubu/common');
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('[data-standards-mobile-nav]')).toBeVisible();
  } else {
    const documentSidebar = page.locator('[data-standards-sidebar]');
    await expect(documentSidebar.locator('[data-standards-nav="tree"]')).toBeVisible();
    // 原本の逐語ページ（分冊・PDF ページ）への導線は出さない（2026-10-26 に公開をやめた）
    await expect(documentSidebar.locator('[data-standards-nav="parts"], [data-standards-nav="pages"]')).toHaveCount(0);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('テーマと仕様書を双方向に回遊できる', async ({ page }) => {
  await page.goto('/topics/safety-laws');
  await expect(page.getByRole('link', { name: /土木工事共通仕様書（案）令和8年4月改定/ })).toBeVisible();

  await page.goto('/standards/kinki/common');
  await expect(page.locator('[aria-labelledby="standard-related-topics"] a[href="/topics/safety-laws"]')).toBeVisible();

});

test('安全管理の実務記事から総監・土木施工管理・コンクリート資格へ移動できる', async ({ page }) => {
  await page.goto('/practice/oshms-pdca-site-operation');
  await expect(page.locator('main h1')).toContainText('建設現場でOSHMSを回す方法');
  await expect(page.locator('main a[href="/exam/pe-comprehensive-management/keywords/oshms"]')).toBeVisible();
  await expect(page.locator('main a[href="/exam/civil-construction-1"]')).toBeVisible();
  await expect(page.locator('main a[href="/exam/concrete-chief-engineer"]')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

// ---- 構造化章記事（レイヤー2） --------------------------------------------
// 章は PDF の分冊（50 ページ単位）ではなく原本の編・章で切っている。part 境界をまたぐ章が
// 9 本あるため、境界の前後で本文が欠けていないか・原典へ戻れるかを実データで固定する。

test('文書ページの主導線が「章から読む」で、章記事へ移動できる', async ({ page }) => {
  await page.goto('/standards/chubu/common');

  const chapters = page.getByRole('heading', { name: '章から読む', level: 2 });
  await expect(chapters).toBeVisible();
  // 原本の逐語ページ（分冊）の一覧は出さない（2026-10-26 に公開をやめた。照合はエージェントが文字起こしで行う）
  await expect(page.getByRole('heading', { name: '原典PDFページで確認する' })).toHaveCount(0);

  await page.getByRole('link', { name: /第3章 無筋・鉄筋コンクリート/ }).first().click();
  await expect(page).toHaveURL(/\/standards\/chubu\/common\/chapters\/1-3$/);
  await expect(page.locator('main h1')).toContainText('第3章 無筋・鉄筋コンクリート');
});

test('part-03 から part-04 をまたぐ章が、境界の前後とも 1 ページに収まっている', async ({ page }) => {
  // 1-3 は原本 p.133-161（part-03 の末尾から part-04 の PDF page 151 以降まで）
  await page.goto('/standards/chubu/common/chapters/1-3');

  const article = page.locator('[data-standards-chapter="1-3"]');
  // part-03 側（p.133 の第1節）と part-04 側（p.151 の第9節 暑中コンクリート）が同じ記事に並ぶ
  await expect(article.getByRole('heading', { name: '第1節 適用', level: 2 })).toBeVisible();
  await expect(article.getByRole('heading', { name: '第9節 暑中コンクリート', level: 2 })).toBeVisible();
  // 節の直下に条（1-3-9-1）が入り、見出しレベルが飛ばない
  await expect(article.getByRole('heading', { name: '1-3-9-1 一般事項', level: 3 })).toBeVisible();
});

test('章記事に原本の逐語ページ（分冊）への導線が無い', async ({ page }) => {
  // 原本の逐語ページは 2026-10-26 に公開をやめた（旧 URL は _redirects で章・文書へ転送）。利用者向けの画面に出さない
  await page.goto('/standards/chubu/common/chapters/1-3');
  const hrefs = await page.locator('main a').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(hrefs.filter((href) => /part-\d+/.test(href))).toEqual([]);
  await expect(page.locator('main a[data-source-pages]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '原典PDFページで確認する' })).toHaveCount(0);
  await expect(page.locator('main article header')).not.toContainText('原本PDF');
});

test('第1編から第2編へ切り替わる箇所が別の章記事に分かれている', async ({ page }, testInfo) => {
  // 原本 p.161 が第1編の末尾、p.162 から第2編。柱（running header）で切っている。
  await page.goto('/standards/chubu/common/chapters/1-3');

  const nav = page.locator(testInfo.project.name === 'mobile-chromium' ? '[data-standards-mobile-nav]' : '[data-standards-sidebar]');
  if (testInfo.project.name === 'mobile-chromium') await nav.locator(':scope > summary').click();
  await nav.locator('[data-standards-nav="tree"] summary').filter({ hasText: '材料編' }).click();
  await nav.locator('a[href="/standards/chubu/common/chapters/2-1"]').click();
  await expect(page).toHaveURL(/\/standards\/chubu\/common\/chapters\/2-1$/);
  await expect(page.locator('main h1')).toContainText('第1章 一般事項');
  await expect(page.locator('main').first()).toContainText('第2編 材料編');
});

test('複雑な表が横スクロールでき、ページ全体は横に溢れない', async ({ page }) => {
  await page.goto('/standards/chubu/common/chapters/1-3');

  // 表は原本と照合して組み直した表（content/sources/standards/tables）で出る。版面のコードブロックは残らない
  await expect(page.locator('[data-standards-chapter="1-3"] pre')).toHaveCount(0);
  const wrapper = page.locator('[data-standards-chapter="1-3"] .table-scroll').first();
  await expect(wrapper).toBeVisible();
  // 表はラッパーの中でスクロールする（内容を削らずに全列へ到達できる）
  const scrollable = await wrapper.evaluate((el) => getComputedStyle(el).overflowX);
  expect(scrollable).toBe('auto');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('章記事のナビが現在章を強調し、モバイルでは折りたたみになる', async ({ page }, testInfo) => {
  await page.goto('/standards/chubu/common/chapters/1-3');

  if (testInfo.project.name === 'mobile-chromium') {
    const mobileNav = page.locator('[data-standards-mobile-nav]');
    await expect(mobileNav).toBeVisible();
    await expect(page.locator('[data-standards-sidebar]')).toBeHidden();
    await mobileNav.locator(':scope > summary').click();
    await expect(mobileNav.locator('[data-standards-nav="tree"] a[aria-current="page"]')).toContainText(
      '無筋・鉄筋コンクリート',
    );
    return;
  }

  const sidebar = page.locator('[data-standards-sidebar]');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('[data-standards-nav="tree"] a[aria-current="page"]')).toContainText(
    '無筋・鉄筋コンクリート',
  );
  // 章記事では目次の表示中の章の下に節が出る。アンカーは本文見出しの id と一致していなければ飛べない。
  const firstSection = sidebar.locator('[data-standards-nav="sections"] a').first();
  const href = await firstSection.getAttribute('href');
  expect(href).toBeTruthy();
  await expect(page.locator(`[data-standards-chapter="1-3"] ${href}`)).toBeVisible();
});

test('章記事が light / dark どちらでも本文と罫線を判別できる', async ({ page }) => {
  await page.goto('/standards/chubu/common/chapters/1-3');

  const read = async (dark: boolean) => {
    await page.evaluate((on) => document.documentElement.classList.toggle('dark', on), dark);
    return page.evaluate(() => {
      const paragraph = document.querySelector('[data-standards-chapter] p');
      const heading = document.querySelector('[data-standards-chapter] h2');
      // 表の見出し（背景色は thead が持つ）で、文字と背景が同じ色に潰れていないことを見る
      const block = document.querySelector('[data-standards-chapter] table th');
      const blockHead = document.querySelector('[data-standards-chapter] table thead');
      return {
        text: getComputedStyle(paragraph as Element).color,
        rule: getComputedStyle(heading as Element).borderBottomColor,
        blockText: getComputedStyle(block as Element).color,
        blockBg: getComputedStyle(blockHead as Element).backgroundColor,
      };
    });
  };

  const light = await read(false);
  const dark = await read(true);
  // 透明・未設定に落ちていないこと（トークン未定義だと片方のテーマで文字や罫線が消える）
  for (const sample of [light, dark]) {
    expect(sample.text).not.toBe('rgba(0, 0, 0, 0)');
    expect(sample.rule).not.toBe('rgba(0, 0, 0, 0)');
    expect(sample.blockText).not.toBe(sample.blockBg);
  }
  // 本文色と罫線色がテーマで実際に切り替わる（片方のテーマのままだと必ず読みづらくなる）
  expect(light.text).not.toBe(dark.text);
  expect(light.rule).not.toBe(dark.rule);
});

test('章の途中で終わる part と、章の途中から始まる part の境界で本文が欠けない', async ({ page }) => {
  // 1-3 は原本 p.133-161。part-03 は p.150 で終わり part-04 が p.151 から始まるので、
  // この章は「part の途中で始まり、次の part の途中で終わる」二重の境界を持つ。
  // 分冊をまたいで本文が落ちていないことを、境界の直前・直後の条で確認する。
  await page.goto('/standards/chubu/common/chapters/1-3');
  const article = page.locator('[data-standards-chapter="1-3"]');

  // 第8節 型枠・支保 は p.149-151 で、分冊境界（part-03 は p.150 で終わり part-04 が p.151）を
  // 節の内側でまたぐ。次の第9節が part-04 側にあり、両方が同じ記事へ連続して載る。
  await expect(article.getByRole('heading', { name: '第8節 型枠・支保', level: 2 })).toBeVisible();
  await expect(article.getByRole('heading', { name: '第9節 暑中コンクリート', level: 2 })).toBeVisible();

  // 章の最初（p.133）と最後（p.161）の節が両方そろっていること
  await expect(article.getByRole('heading', { name: '第1節 適用', level: 2 })).toBeVisible();
  await expect(article.getByRole('heading', { name: '第15節 袋詰コンクリート', level: 2 })).toBeVisible();

});

test('最大の章（167ページ）は節ページに分かれ、節目次から目的の節へ移れる', async ({ page }, testInfo) => {
  // 3-2 は 18 節 167 ページ（本文約 488KB）。章ページは節の一覧にし、本文は
  // /chapters/3-2/sections/{節} の節ページで出す（config/standards-structure.json の sectionPages）。
  await page.goto('/standards/chubu/common/chapters/3-2');
  await expect(page.locator('[data-standards-section-index="3-2"] > ol > li')).toHaveCount(18);

  const nav = page.locator(testInfo.project.name === 'mobile-chromium' ? '[data-standards-mobile-nav]' : '[data-standards-sidebar]');
  if (testInfo.project.name === 'mobile-chromium') await nav.locator(':scope > summary').click();
  const toc = nav.locator('[data-standards-nav="sections"]');
  await expect(toc).toBeVisible();
  const links = toc.locator('a');
  await expect(links).toHaveCount(18);

  await links.nth(9).click();

  // 第10節の節ページへ移り、本文がそこにある（節目次は現在の節を強調する）
  await expect(page).toHaveURL(/\/standards\/chubu\/common\/chapters\/3-2\/sections\/10$/);
  await expect(page.locator('main article h1')).toContainText('第10節');
  await expect(page.locator('[data-standards-chapter="3-2"][data-standards-section="10"] h2').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('章記事の OGP がサイト既定ではなく章ごとの画像を指す', async ({ page }) => {
  // 344 章がすべて og-default.png だと SNS に貼っても中身が判別できない。
  // 章ごとの画像（機関名 + 第N編 + 第M章）を指していることを固定する。
  await page.goto('/standards/chubu/common/chapters/1-3');

  const image = page.locator('meta[property="og:image"]');
  await expect(image).toHaveAttribute(
    'content',
    /\/posts\/standards-articles\/chubu\/common\/chapters\/1-3\/ogp\.png$/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});
