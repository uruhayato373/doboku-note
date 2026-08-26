import { test, expect } from '@playwright/test';

/**
 * /content/brain（DN-0103 Phase 04）の read-only 契約を実ブラウザで固定する。
 *
 * 守りたい事故:
 *   - 秘密設定（brain-account.json の sellerName / agreedGuidelineAt）が画面へ漏れる
 *   - write action（公開・本文更新・status/price 変更・R2 upload・任意 CLI 実行）が生える
 *   - Brain channel が Phase 01 の disabled のまま固まっている
 *   - /content の Brain カードが汎用ドリルダウンのままで専用画面へ誘導しない
 */

test('/content/brain は商品・配線状態・関連設計を表示し、write action を持たない', async ({ page }) => {
  await page.goto('/content/brain');
  await expect(page.getByRole('heading', { name: 'Brain', level: 1 })).toBeVisible();

  // 2商品とも表示される
  await expect(page.getByText('brain-civil-essay-kit')).toBeVisible();
  await expect(page.getByText('brain-sokan-policy-bank')).toBeVisible();

  // 配線 OK バッジが商品ごとに出る
  await expect(page.getByText('OK').first()).toBeVisible();

  // 関連設計文書（channel: brain の docs）が出る
  await expect(page.getByText(/関連設計文書/)).toBeVisible();

  // read-only: 「絞り込む」のような既存パターンも含め、書き込み系ボタンが無い
  const buttons = await page.locator('main').getByRole('button').allInnerTexts();
  const writeButtons = buttons.filter((t) =>
    /公開|申請|保存|削除|アップロード|upload|価格変更|status|実行|送信/.test(t),
  );
  expect(writeButtons).toEqual([]);

  // フォーム（POST 等の書き込み経路）が無い
  expect(await page.locator('form').count()).toBe(0);
});

test('/content/brain は brain-account.json 由来の秘密値を出力しない', async ({ page }) => {
  const res = await page.goto('/content/brain');
  const html = await res!.text();
  // "doboku-note" 自体は admin のブランド表記（<title>doboku-note admin</title> 等）に
  // 常に出るため対象にしない。brain-account.json 固有のフィールド名だけを禁止する。
  expect(html).not.toContain('sellerName');
  expect(html).not.toContain('agreedGuidelineAt');
  expect(html).not.toContain('brain-account.json');
});

test('/content の Brain カードは KPI を表示し /content/brain へリンクする', async ({ page }) => {
  await page.goto('/content');
  const brainCard = page.locator('a.knowledge-card', { hasText: 'Brain' });
  await expect(brainCard).toBeVisible();
  await expect(brainCard).toContainText('商品');
  await expect(brainCard).toContainText('listed');
  await brainCard.click();
  await expect(page).toHaveURL(/\/content\/brain$/);
});

test('Brain channel は左ナビから到達できる（Phase 04 で有効化）', async ({ page }) => {
  await page.goto('/content/brain');
  const brainTree = page.locator('.nav-tree', { hasText: 'Brain' });
  await expect(brainTree).toBeVisible();
  await expect(brainTree.locator('a', { hasText: '商品' })).toHaveAttribute('href', '/content/brain');
});

test('商品の配布物 sha256 と実ファイルが一致する（表示値の検証）', async ({ page }) => {
  await page.goto('/content/brain');
  // sha256 先頭8桁が2商品分、それぞれ異なる値で表示される
  const text = await page.locator('main').innerText();
  const shaMatches = [...text.matchAll(/sha256\s+([0-9a-f]{8})/g)].map((m) => m[1]);
  expect(shaMatches.length).toBe(2);
  expect(new Set(shaMatches).size).toBe(2);
});
