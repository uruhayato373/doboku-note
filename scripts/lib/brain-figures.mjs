/**
 * brain-figures.mjs — Brain tiptap エディタ本文の指定段落直後に画像を挿入する共有ロジック。
 * 仕組み（2026-07-23 実測）: 段落にカーソル→行の「＋」(_addContentButton_)→メニュー「画像」
 * → 隠し input[type=file][accept=image] へ setFiles / filechooser。
 * brain-insert-figures.mjs（単体）と brain-publish.mjs（--insert-figures）が共用。
 */
import { join, isAbsolute } from 'node:path';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param page Playwright page
 * @param pm   ProseMirror locator（page.locator('.tiptap.ProseMirror').first()）
 * @param figures [{ after: '段落に含まれる文字列', image: '絶対 or ROOT 相対パス' }]
 */
export async function insertFigures(page, pm, figures, { ROOT, log = console.log } = {}) {
  for (const f of figures) {
    const abs = isAbsolute(f.image) ? f.image : join(ROOT, f.image);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
    const para = pm.locator('p', { hasText: f.after }).first();
    if (!(await para.count())) throw new Error(`段落未検出 "${f.after}"`);
    await para.scrollIntoViewIfNeeded();
    await para.click();
    await page.keyboard.press('End');
    await sleep(500);
    // ＋メニューを開く（対象行にホバー→見える＋→「画像」項目の可視を待つ・最大4回）
    const imgItem = page.getByText('画像', { exact: true }).first();
    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt++) {
      await para.hover();
      await sleep(700);
      const addBtn = page.locator('button[class*="addContentButton"]:visible').first();
      if (await addBtn.count()) { await addBtn.click({ force: true }).catch(() => {}); }
      try { await imgItem.waitFor({ state: 'visible', timeout: 4000 }); opened = true; } catch {}
      if (!opened) { await page.keyboard.press('Escape').catch(() => {}); await para.click(); await page.keyboard.press('End'); await sleep(400); }
    }
    if (!opened) throw new Error(`メニュー「画像」未検出 "${f.after}"`);
    const before = await pm.locator('img').count();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null),
      imgItem.click(),
    ]);
    if (chooser) { await chooser.setFiles(abs); }
    else { await page.locator('input[type=file][accept*="image"]').first().setInputFiles(abs); }
    let ok = false;
    for (let i = 0; i < 30; i++) { await sleep(1000); if ((await pm.locator('img').count()) > before) { ok = true; break; } }
    if (!ok) throw new Error(`アップロード未確認 "${f.after}"`);
    log(`[fig] "${f.after.slice(0, 16)}" ← ${f.image.split('/').pop()} OK`);
    await sleep(1500);
  }
}
