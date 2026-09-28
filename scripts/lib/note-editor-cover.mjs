// note-editor-cover.mjs — note エディタ上でカバー画像（eyecatch）を差し替える手順（保存はしない）。
//
// note-update-body（記事単位の更新）が、本文・タグと同じ 1 回の「更新する」の中で呼ぶ。
// 既存カバーを削除 → 「画像を追加」→ モーダル「画像をアップロード」を fileChooser で受ける → トリミング「保存」
// → 新カバーの読み込みを確認、まで。「公開に進む」以降は呼び出し側（publishLive）が行う。
//
// 罠（2026-09-18 実測）: note のエディタはカバーの削除とアップロードを「更新する」より前に live へ書く。
// ここで失敗すると live のカバーが空になっている可能性がある。呼び出し側は失敗を記録し、次の実行で同じ記事を
// もう一度差し替える（台帳にカバーを記録しないので、次回も要登録として残る）。
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {import('playwright').Page} page エディタを開いた状態のページ
 * @param {string} coverAbs アップロードする PNG の絶対パス
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function replaceCoverInEditor(page, coverAbs) {
  // 1. 既存カバーを削除（差し替え方式）
  let addBtn = page.getByRole('button', { name: '画像を追加' });
  if (!(await addBtn.count())) {
    let box = null;
    for (let i = 0; i < 8 && !box; i++) {
      box = await page.evaluate(() => {
        const img = [...document.querySelectorAll('img')].find((i) => /st-note/.test(i.src || '') && i.getBoundingClientRect().top < 360 && i.width > 140);
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      });
      if (!box) await sleep(1500);
    }
    if (!box) return { ok: false, reason: '既存カバーを検出できない' };
    await page.mouse.click(box.x, box.y); await sleep(1500);
    const del = page.getByRole('button', { name: '削除', exact: true });
    if (!(await del.count())) return { ok: false, reason: '削除ボタンが無い' };
    await del.first().click(); await sleep(2500);
    console.log('[cover] 既存カバー削除');
    addBtn = page.getByRole('button', { name: '画像を追加' });
    for (let i = 0; i < 6 && !(await addBtn.count()); i++) await sleep(1000);
  }
  if (!(await addBtn.count())) return { ok: false, reason: '「画像を追加」が出ない' };
  // 2. 新カバーをアップロード（input へ直接設定すると受け付けない）
  await addBtn.first().click(); await sleep(2000);
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 9000 }),
      page.getByText('画像をアップロード', { exact: false }).first().click(),
    ]);
    await chooser.setFiles(coverAbs);
  } catch (e) {
    return { ok: false, reason: `アップロード失敗: ${e.message.split('\n')[0]}` };
  }
  await sleep(4000);
  const save = page.getByRole('button', { name: '保存', exact: true });
  if (await save.count()) { await save.first().click(); console.log('[cover] トリミング保存'); await sleep(3000); }
  // 3. 新カバーの読み込み確認。スリープ復帰直後の遅いページで 12 秒では取り逃がした（2026-09-18）ので 45 秒待つ
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate(() => [...document.querySelectorAll('img')].some((i) => /st-note|blob:|uploads/.test(i.src || '') && i.getBoundingClientRect().top < 380 && i.width > 110));
    if (ok) { console.log('[cover] 新カバー読み込み確認'); return { ok: true }; }
    await sleep(1500);
  }
  return { ok: false, reason: '新カバーの読み込みを確認できない（削除は live に反映済みの可能性あり）' };
}
