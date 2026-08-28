import { test, expect } from '@playwright/test';

/**
 * 文書ビュー（/docs）と TODO の結線を、実ブラウザで固定する。
 *
 * 守りたい事故（2026-08-18 に実際に踏んだ）:
 *   - catch-all が URL エンコードのまま届き、日本語ディレクトリの詳細が 404 になる
 *   - パストラバーサルで root 外が読める
 *   - 文書 ↔ TODO の相互リンクが切れる
 *   - 760px 以下で右レールが本文を押しのける
 *
 * 2026-08-18 の情報アーキテクチャ移行で `/project` は `/docs` へ畳み、`docs/project/{01_戦略,…}` は
 * `docs/{strategy,…}` へフラット化した。旧 Project タブが持っていた警告・関連タスクのレールは
 * /docs の詳細でそのまま出る（機能を落としていない）。
 */

const SEO_DOC = '/docs/strategy/13_土木公務員SEO戦略2026-08';

test('文書一覧が出て、件数と絞り込みが効く', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: '文書', level: 1 })).toBeVisible();
  const cards = page.locator('a.knowledge-card');
  const before = await cards.count();
  expect(before).toBeGreaterThan(30);

  await page.getByLabel('文書を検索').fill('SEO');
  await page.getByRole('button', { name: '絞り込む' }).click();
  await expect(cards).not.toHaveCount(before);
});

test('日本語パスの詳細が開き、目次アンカーが本文 id と一致する', async ({ page }) => {
  await page.goto(SEO_DOC);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const tocHrefs = await page.locator('.project-rail a[href^="#"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!.slice(1)),
  );
  expect(tocHrefs.length).toBeGreaterThan(0);
  const bodyIds = await page
    .locator('.knowledge-document h2[id], .knowledge-document h3[id]')
    .evaluateAll((els) => els.map((e) => e.id));
  for (const href of tocHrefs) expect(bodyIds).toContain(href);
});

test('文書 → TODO → 文書 を往復できる', async ({ page }) => {
  await page.goto(SEO_DOC);
  const ref = page.locator('.project-ref').first();
  await expect(ref).toBeVisible();
  await ref.click();

  await expect(page).toHaveURL(/\/todo\?id=DN-\d{4}/);
  await expect(page.locator('.todo-card-hit')).toHaveCount(1);

  await page.locator('.todo-card-hit a[href^="/docs/"]').first().click();
  await expect(page).toHaveURL(/\/docs\/[^/]+\//);
});

test('旧 /project は /docs へリダイレクトする（詳細は 1 段深い docs/project へ）', async ({ page }) => {
  await page.goto('/project');
  await expect(page).toHaveURL(/\/docs$/);

  await page.goto('/project/01_戦略/13_土木公務員SEO戦略2026-08');
  await expect(page).toHaveURL(new RegExp(encodeURI('/docs/strategy/')));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('/content は本文を読まずにチャネルを数え、ドリルダウンできる', async ({ page }) => {
  await page.goto('/content');
  await expect(page.getByRole('heading', { name: 'コンテンツ', level: 1 })).toBeVisible();
  const cards = page.locator('a.knowledge-card');
  expect(await cards.count()).toBeGreaterThan(0);

  // Brain / Kindle は専用画面（/content/brain・/content/kindle）へ誘導するため、
  // 汎用ドリルダウンの検証からは除く（DN-0103 Phase 04・Kindle 管理ビュー新設時）。
  const genericCards = page.locator('a.knowledge-card:not([href="/content/brain"]):not([href="/content/kindle"])');
  expect(await genericCards.count()).toBeGreaterThan(0);
  await genericCards.first().click();
  await expect(page).toHaveURL(/\/content\/.+~/);
  await expect(page.locator('.content-listing')).toBeVisible();
});

test('/plans は read-only（完了・削除の操作を置かない）', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByRole('heading', { name: '実装計画', level: 1 })).toBeVisible();
  // 「絞り込む」以外のボタンが本文に増えていたら、read-only の約束が崩れている
  // （左ナビのテーマ切替はページの操作ではないので main の中だけを見る）
  const labels = await page.locator('main').getByRole('button').allInnerTexts();
  expect(labels.filter((t) => t.trim() && t.trim() !== '絞り込む')).toEqual([]);
});

test('存在しない文書とトラバーサル候補は 404', async ({ page }) => {
  for (const path of ['/docs/no-such-doc', '/docs/%2e%2e/%2e%2e/CLAUDE', '/content/no-such~']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test('/docs の目的・チャネル・保持区分フィルタが URL query として保存・復元される（DN-0103 Phase 02）', async ({ page }) => {
  await page.goto('/docs');
  const before = await page.locator('a.knowledge-card').count();

  await page.getByLabel('チャネル').selectOption('brain');
  await page.getByRole('button', { name: '絞り込む' }).click();

  await expect(page).toHaveURL(/channel=brain/);
  const filtered = page.locator('a.knowledge-card');
  await expect(filtered).not.toHaveCount(before);
  await expect(filtered.first()).toBeVisible();
  for (const chip of await filtered.locator('.doc-channel-chips .chip-outline').allInnerTexts()) {
    expect(chip).toContain('Brain');
  }

  // reload しても select の選択状態が URL query から復元される
  await page.reload();
  await expect(page.getByLabel('チャネル')).toHaveValue('brain');
});

test('docs 詳細のタイトル直下に目的・チャネル・保持区分のバッジが出る（Brain override 文書）', async ({ page }) => {
  await page.goto('/docs/products/brain-r8-policy-prediction-skill/00-product-concept');
  const row = page.locator('.doc-taxonomy-row');
  await expect(row).toBeVisible();
  await expect(row).toContainText('商品仕様');
  await expect(row).toContainText('Brain');
});

test('Obsidian callout は div.callout へ、GFM table は div.table-wrap へ変換される', async ({ page }) => {
  await page.goto('/docs/operations/06_seo-note-synergy-strategy');
  await expect(page.locator('.knowledge-document .callout').first()).toBeVisible();
  await expect(page.locator('.knowledge-document .callout-title').first()).toBeVisible();

  await page.goto('/docs/reviews/2026-07-19-civil-note-content-funnel-audit');
  await expect(page.locator('.knowledge-document .table-wrap table').first()).toBeVisible();
});

test('760px 以下では右レールが本文の上へ回る', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SEO_DOC);
  const rail = await page.locator('.project-rail').boundingBox();
  const body = await page.locator('.knowledge-document').boundingBox();
  expect(rail && body).toBeTruthy();
  expect(rail!.y).toBeLessThan(body!.y);
});
