/** Meta inserts photos in upload completion order. Finish each photo before adding the next. */
export async function uploadInstagramImagesInOrder(page, images) {
  const remove = page.getByRole('button', { name: '写真を削除', exact: true });
  if (await remove.count()) throw new Error('画像が残っています。重複追加を防ぐため停止します');
  let orderedPaths = [];
  for (const [index, file] of images.entries()) {
    const add = page.getByRole('button', { name: /写真.*追加/u }).first();
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    await add.click();
    await (await chooserPromise).setFiles(file);
    await page.waitForFunction(expected => {
      const buttons = [...document.querySelectorAll('[role="button"],button')]
        .filter(e => (e.textContent || '').replace(/[\s\u200b]/gu, '') === '写真を削除');
      if (buttons.length !== expected) return false;
      return buttons.every(e => {
        const img = e.closest('[role="listitem"]')?.querySelector('img');
        return img?.complete && img.naturalWidth > 10 && /^https:/u.test(img.src);
      });
    }, index + 1, { timeout: 120000 });
    const paths = await remove.evaluateAll(buttons => buttons.map(button =>
      new URL(button.closest('[role="listitem"]').querySelector('img').src).pathname));
    if (orderedPaths.some((value, i) => paths[i] !== value) || new Set(paths).size !== paths.length) {
      throw new Error('追加した画像の並び順が変化しました。確定せず停止します');
    }
    orderedPaths = paths;
    console.log(`📷 画像 ${index + 1}/${images.length} の処理完了`);
  }
  if (await remove.count() !== images.length) throw new Error('画像枚数が一致しません');
  return images.map((file, i) => ({ file, remotePath: orderedPaths[i] }));
}
