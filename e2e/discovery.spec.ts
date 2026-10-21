import { expect, test } from '@playwright/test';

test('テーマの絞り込み解除で全記事リンクが戻る', async ({ page }) => {
  await page.goto('/topics/concrete');
  const links = () => page.locator('main a').evaluateAll(a => a.map(x => x.getAttribute('href')).sort());
  const before = await links();
  await page.getByText('絞り込み', { exact: true }).click();
  const category = page.getByLabel('資格・領域');
  const value = await category.locator('option').nth(1).getAttribute('value');
  await category.selectOption(value!);
  await expect(page.locator('main details:visible')).toHaveCount(2);
  await page.getByLabel('記事を絞り込む').fill('no-matching-article-0000');
  await expect(page.getByText('条件に合う記事がありません。', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '絞り込みを解除' }).click();
  expect(await links()).toEqual(before);
});

test('追加した技術士2資格で検索結果を絞り込める', async ({ page }) => {
  test.setTimeout(120_000);
  let fragments = 0;
  page.on('request', request => { if (/\/fragment\//.test(request.url())) fragments++; });
  await page.goto('/search?q=コンクリート', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/「コンクリート」の検索結果:/)).toBeVisible({ timeout: 60_000 });
  const initialFragments = fragments;
  for (const [label, prefix] of [
    ['技術士 第一次試験', '/exam/pe-first-stage/'],
    // 絞り込みボタンはカテゴリの名前＝qualification-registry.json の正式名（ページの title は seoTitle で別）
    ['技術士（建設部門）', '/exam/pe-construction/'],
  ] as const) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect.poll(async () => {
      const paths = await page.locator('article h3 a').evaluateAll(a => a.map(x => x.getAttribute('href') ?? ''));
      return paths.length > 0 && paths.every(p => p.startsWith(prefix) && !p.endsWith('.html'));
    }, { timeout: 45_000 }).toBe(true);
  }
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('article h3 a').first()).toBeVisible();
  const first = await page.locator('article h3 a').first().getAttribute('href');
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.locator('article h3 a').first()).not.toHaveAttribute('href', first!);
  expect(fragments).toBe(initialFragments);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('OGP派生画像の取得失敗時も原本画像へ戻る', async ({ page }) => {
  await page.route('**/ogp-thumb-*.webp', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/exam/concrete-engineer');
  const image = page.locator('#sec-guide img').first();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('src', /\/ogp\.png$/);
  await expect(image).not.toHaveAttribute('srcset', /webp/);
  await expect(page.locator('#sec-guide a').first()).toHaveAttribute('href', /^\/exam\/concrete-engineer\//);
});

test('記事末から同じテーマ・同じ法令の他の資格・実務へ移動できる', async ({ page }) => {
  // 根拠法令 → この記事のテーマ → 関連記事 の順（content-taxonomy.md §6-3）
  await page.goto('/practice/accident-first-response');
  const laws = page.locator('section[aria-label="この記事の根拠法令"]');
  await expect(laws.getByText('同じ法令を扱う記事').first()).toBeVisible();
  await expect(laws.locator('[data-cta-label="law-siblings"] a[href^="/exam/"]').first()).toBeVisible();

  await page.goto('/exam/civil-construction-1/textbook/coast-port');
  const topic = page.locator('section[aria-label="この記事のテーマ"]');
  await expect(topic.locator('a[href="/topics/ports-coasts"]')).toBeVisible();
  // テーマのカードは同じ資格の記事を出さない（他の資格・実務へ送る）
  const hrefs = await topic.locator('a[data-cta-label="topic-hub:article"]').evaluateAll(a => a.map(x => x.getAttribute('href') ?? ''));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.every(h => !h.startsWith('/exam/civil-construction-1/'))).toBe(true);
});

test('資格のハブから、この資格の記事が属すテーマへ移動できる', async ({ page }) => {
  await page.goto('/exam/civil-construction-1');
  const topics = page.locator('[data-cta-label="category-topics"]');
  await expect(topics.locator('a[href="/topics/construction-management"]')).toBeVisible();
});

test('テーマのページから、分野・立場に合う有料教材（note）へ移動できる', async ({ page }) => {
  await page.goto('/topics/municipal-civil-engineers');
  const link = page.locator('a[data-cta="note"][data-cta-placement="topic-page"]').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /utm_content=topic-municipal-civil-engineers/);
});

test('法令と分野・立場を両方向に移動できる（根拠法令 → 関わるテーマ、関係法令 → 法令と分野の対応）', async ({ page }) => {
  await page.goto('/practice/river-act-framework');
  await expect(page.locator('[data-cta-label="law-topics"] a[href="/topics/rivers-disaster-prevention"]').first()).toBeVisible();
  // 自治体の土木担当シリーズでは、橋渡しカードが技術士の入口と立場のテーマを出す
  const bridge = page.locator('[data-cta="qualification-bridge"]');
  await expect(bridge.locator('a[data-cta-label="public-pe"]')).toBeVisible();
  await expect(bridge.locator('a[data-cta-label="municipal-hub"]')).toHaveAttribute('href', '/topics/municipal-civil-engineers');
  await page.goto('/topics/safety-laws');
  await expect(page.locator('[data-cta-label="law-directory"] a[href="/topics/municipal-civil-engineers"]').first()).toBeVisible();
});

test('育成中のテーマは noindex・公開ハブは index で、関連するテーマへ移動できる', async ({ page }) => {
  await page.goto('/topics/railways');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/topics/ports-coasts');
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
  await expect(page.locator('[data-cta-label="topic-related"] a').first()).toBeVisible();
});

test('法令ページ: 解説の後に関わるテーマ・計画・よく引かれる条・扱う記事が出て、記事とテーマから行き来できる', async ({ page }) => {
  await page.goto('/laws/road-act');
  await expect(page.locator('section[aria-label="この法令が関わるテーマ"] a[href="/topics/roads"]')).toBeVisible();
  await expect(page.locator('section[aria-label="関係する国の計画・施策・審議会"] li').first()).toBeVisible();
  await expect(page.locator('section[aria-label="よく引かれる条"] a[href*="#Mp-At_"]').first()).toBeVisible();
  await expect(page.locator('section[aria-label="この法令を扱う記事"] a[href^="/practice/"]').first()).toBeVisible();
  // 記事末の根拠法令から法令ページへ
  await page.goto('/practice/river-act-framework');
  await expect(page.locator('[data-cta-label="law-page"] a[href="/laws/river-act"]').first()).toBeVisible();
  // 分野のテーマから法令ページと国の計画へ
  await page.goto('/topics/roads');
  await expect(page.locator('[data-cta-label="topic-laws"] a[href="/laws/road-act"]').first()).toBeVisible();
  await expect(page.locator('[data-cta-label="policy-map"] li').first()).toBeVisible();
  await page.goto('/laws');
  await expect(page.locator('[data-cta-label="laws-index"] a[href="/laws/river-act"]').first()).toBeVisible();
});

test('法令名は、法令ページが無ければ解説記事（explainsLaw）へ向き、解説記事の記事末にも根拠法令が出る', async ({ page }) => {
  // 1級のテキストの「廃棄物処理法」→ 総監の用語「廃棄物処理法」
  await page.goto('/exam/civil-construction-1/textbook/waste-disposal-manifest');
  await expect(page.locator('[data-cta-label="law-page"] a[href="/exam/pe-comprehensive-management/keywords/waste-management-act"]').first()).toBeVisible();
  // 解説記事は本文が e-Gov にリンクしていなくても、記事末に e-Gov の条文と同じ法令を扱う記事が出る（自分へは戻さない）
  await page.goto('/exam/pe-comprehensive-management/keywords/air-pollution-control-act');
  const card = page.locator('[aria-label="この記事の根拠法令"]');
  await expect(card.locator('a[href="https://laws.e-gov.go.jp/law/343AC0000000097"]').first()).toBeVisible();
  await expect(card.locator('a[href="/exam/pe-comprehensive-management/keywords/air-pollution-control-act"]')).toHaveCount(0);
});

test('総監の大きなテーマは、記事の一覧をキーワード集の節で区切り、入口記事を「はじめに読む」に出す', async ({ page }, testInfo) => {
  await page.goto('/topics/economic-management');
  await expect(page.getByRole('heading', { name: 'はじめに読む' })).toBeVisible();
  await expect(page.locator('main ul.mb-6 a[href="/exam/pe-comprehensive-management/pillar/economic-management-pillar"]')).toBeVisible();
  await expect(page.locator('main details p', { hasText: '2.1 事業企画' })).toHaveCount(1);
  // ヘッダーから法令の一覧へ（法令はカテゴリとして資格一覧の「資格を問わない実務・法令」に並ぶ。スマホはメニューの中）
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'メニューを開く', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByRole('dialog', { name: 'メニュー', exact: true }).locator('a[href="/laws"]')).toBeVisible();
  } else {
    await page.locator('header').getByRole('button', { name: /資格一覧/ }).click();
    await expect(page.locator('header a[href="/laws"]')).toBeVisible();
  }
});
