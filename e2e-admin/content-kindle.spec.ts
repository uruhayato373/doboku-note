import { test, expect } from '@playwright/test';

/**
 * /content/kindle（Kindle 管理ビュー新設）の read-only 契約を実ブラウザで固定する。
 *
 * 守りたい事故:
 *   - kdp-memo.json（accountEmail 等の秘密混じり）の値が画面へ漏れる
 *   - write action（再ビルド・提出・状態同期・任意 CLI 実行）が生える
 *   - Kindle channel が汎用ファイル一覧のまま専用画面へ誘導しない
 *   - /content の Kindle カードが汎用ドリルダウンのままで専用画面へ誘導しない
 */

test('/content/kindle は書籍・状態・ロイヤリティを表示し、write action を持たない', async ({ page }) => {
  await page.goto('/content/kindle');
  await expect(page.getByRole('heading', { name: 'Kindle', level: 1 })).toBeVisible();

  // B-G系・A系それぞれ代表 1 冊が表示される
  await expect(page.getByRole('link', { name: 'コンクリート診断士 体系解説＋四肢択一演習98問' })).toBeVisible();

  // status バッジ（live）が出る
  await expect(page.getByText('live').first()).toBeVisible();

  // read-only: 書き込み系ボタンが無い
  const buttons = await page.locator('main').getByRole('button').allInnerTexts();
  const writeButtons = buttons.filter((t) =>
    /公開|申請|保存|削除|アップロード|upload|価格変更|status|実行|送信|再ビルド|提出/.test(t),
  );
  expect(writeButtons).toEqual([]);

  // フォーム（POST 等の書き込み経路）が無い
  expect(await page.locator('form').count()).toBe(0);
});

test('/content/kindle は kdp-memo.json 由来の秘密値を出力しない', async ({ page }) => {
  const res = await page.goto('/content/kindle');
  const html = await res!.text();
  expect(html).not.toContain('accountEmail');
  expect(html).not.toContain('kdp-memo.json');
});

test('/content の Kindle カードは KPI を表示し /content/kindle へリンクする', async ({ page }) => {
  await page.goto('/content');
  const kindleCard = page.locator('a.knowledge-card', { hasText: 'Kindle' });
  await expect(kindleCard).toBeVisible();
  await expect(kindleCard).toContainText('冊');
  await expect(kindleCard).toContainText('live');
  await kindleCard.click();
  await expect(page).toHaveURL(/\/content\/kindle$/);
});

test('Kindle は左ナビの「販売状態」から Kindle タブで到達できる', async ({ page }) => {
  // 2026-09-26 のナビ再編でチャネルはサイドバーの枝にせず、/product/status のタブにした（domains.json navRules）
  await page.goto('/');
  await page.locator('[data-slot=sidebar] a[href="/product/status"]').first().click();
  await expect(page).toHaveURL(/\/product\/status/);
  await page.locator('nav.filterbar').getByRole('link', { name: 'Kindle', exact: true }).click();
  await expect(page).toHaveURL(/\/product\/status\?ch=kindle$/);
  await expect(page.getByRole('link', { name: 'コンクリート診断士 体系解説＋四肢択一演習98問' })).toBeVisible();
  await expect(page.locator('nav.filterbar').getByRole('link', { name: '原稿' })).toHaveAttribute('href', '/content/content~kindle');
});

test('表紙サムネイルが /media/kindle 経由で配信される', async ({ page }) => {
  await page.goto('/content/kindle');
  const img = page.locator('img[src^="/media/kindle"]').first();
  await expect(img).toBeVisible();
  const src = await img.getAttribute('src');
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
});
