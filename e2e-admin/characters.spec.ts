import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('.claude/config/character-poses.json', 'utf8'));

test('キャラクター台帳から検索・絞り込み・3案比較ができる', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  await page.goto('/gallery/characters');
  await expect(page.getByRole('heading', { name: 'キャラクター素材', exact: true })).toBeVisible();
  await expect(page.locator('[data-pose]')).toHaveCount(manifest.poses.length);
  await page.getByLabel('確認状態', { exact: true }).selectOption('needs-fix');
  await expect(page.locator('[data-pose]')).toHaveCount(manifest.poses.filter((p: { quality?: { status: string } }) => p.quality?.status === 'needs-fix').length);
  await expect(page.locator('[data-pose="surprised"]')).toContainText('ヘルメット');
  await page.getByRole('button', { name: '条件をクリア' }).click();
  await page.getByLabel('用途', { exact: true }).selectOption('question');
  await page.getByLabel('推奨配置', { exact: true }).selectOption('right');
  const expected = manifest.poses.filter((p: { composition: { uses: string[]; placements: string[] } }) => p.composition.uses.includes('question') && p.composition.placements.includes('right'));
  await expect(page.locator('[data-pose]')).toHaveCount(expected.length);
  await page.getByRole('button', { name: '条件をクリア' }).click();
  for (const slug of ['pointing', 'thinking', 'explaining']) await page.locator(`[data-pose="${slug}"]`).getByLabel('比較する').check();
  const comparison = page.getByRole('region', { name: '選択ポーズの比較' });
  await expect(comparison.locator('article')).toHaveCount(3);
  await expect(page.locator('[data-pose="smile"]').getByLabel('比較する')).toBeDisabled();
  await comparison.screenshot({ path: `.tmp/sns-design-mockups/comparison-${test.info().project.name}.png` });
  await page.getByLabel('ポーズを検索').fill('存在しないポーズ');
  await expect(page.locator('[data-pose]')).toHaveCount(0);
  await expect(comparison.locator('article')).toHaveCount(3);
  await page.getByRole('button', { name: '比較を解除' }).click();
  await expect(comparison).toHaveCount(0);
  await page.getByRole('button', { name: '条件をクリア' }).click();
  await page.getByLabel('背景', { exact: true }).selectOption('navy');
  await expect(page.locator('[data-pose="pointing"] img')).toBeVisible();
  await expect.poll(() => page.locator('[data-pose="pointing"] img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: `.tmp/sns-design-mockups/catalog-${test.info().project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: `.tmp/sns-design-mockups/catalog-${test.info().project.name}-dark.png`, fullPage: true });
  const download = page.waitForEvent('download');
  await page.locator('[data-pose="pointing"]').getByRole('link', { name: 'PNGを保存' }).click();
  expect((await download).suggestedFilename()).toBe('pointing.png');
});

test('全身・腰上・胸上を切り替え、原寸上限と書き出しガードを確認できる', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto('/gallery/characters');
  const pointing = page.locator('[data-pose="pointing"]');
  await page.getByLabel('表示する切り取り', { exact: true }).selectOption('bust');
  await page.getByLabel('書き出し幅', { exact: true }).selectOption('1080');
  await expect(pointing).toContainText('解像度不足');
  await expect(pointing).toContainText('500 × 430px');
  await expect.poll(() => pointing.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(360);
  const download = page.waitForEvent('download');
  await pointing.getByRole('link', { name: '選択した切り取りを保存' }).click();
  expect((await download).suggestedFilename()).toBe('pointing-bust-500.png');
  await expect(page.locator('[data-pose="whiteboard"]')).toContainText('説明面を切らない');
  await expect(page.locator('[data-pose="whiteboard"] img')).toHaveCount(0);
  await expect(page.locator('[data-pose="surprised"]').getByRole('link', { name: '選択した切り取りを保存' })).toHaveCount(0);
  for (const path of [
    '/api/character-frame/surprised?download=1',
    '/api/character-frame/whiteboard?frame=bust',
    '/api/character-frame/pointing?width=999999',
    '/api/character-frame/pointing?frame=__proto__',
    '/api/character-frame/unknown',
    '/api/character-frame/pointing?preview=1&download=1',
  ]) expect((await request.get(path)).status()).toBe(400);
  for (const slug of ['pointing', 'thinking', 'explaining']) await page.locator(`[data-pose="${slug}"]`).getByLabel('比較する').check();
  for (const frame of ['full', 'waist', 'bust']) {
    await page.getByLabel('表示する切り取り', { exact: true }).selectOption(frame);
    await page.getByLabel('背景', { exact: true }).selectOption('navy');
    for (const pose of manifest.poses) {
      const card = page.locator(`[data-pose="${pose.slug}"]`);
      if (pose.framing.variants[frame].box) {
        await card.scrollIntoViewIfNeeded();
        await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.tmp/character-framing-qa/${frame}-${test.info().project.name}.png`, fullPage: true });
    const comparison = page.getByRole('region', { name: '選択ポーズの比較' });
    await comparison.screenshot({ path: `.tmp/character-framing-qa/comparison-${frame}-${test.info().project.name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.getByRole('region', { name: '選択ポーズの比較' }).screenshot({ path: `.tmp/character-framing-qa/comparison-bust-${test.info().project.name}-dark.png` });
});
