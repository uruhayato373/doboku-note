/**
 * note-attach.mjs — note エディタへのファイル添付（PDF ダウンロードカード）の共有実装
 *
 * note-attach-file.mjs（単体添付 CLI）の中核を関数化したもの。同一ブラウザセッション内で
 * 添付できるので、**全文置換のあとに同じセッションで添付を復元**する用途に使える
 * （note-update-body --reattach-pdf）。
 *
 * なぜ必要か: note の PDF 添付はプラットフォーム機能で markdown に現れない。全文置換
 * （Ctrl+A → Delete → paste）は添付カードごと消し、SoT には戻す材料が無いため
 * **購入者が代金を払って PDF を受け取れなくなる**（2026-07-28 に建設部門 196 本で発生）。
 * 従来は「添付を検出したら中断」しかなく、本文を直したい記事は手作業の再添付が必要だった。
 *
 * caret 位置の注意: `Control+End` は Windows 専用で Mac では効かず、PDF が本文先頭
 * （＝無料プレビュー内）に入って**有料 PDF が無料流出**する（2026-07-04 実測）。
 * ここでは JS の Range で contenteditable 末尾へ確実に移動する。
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** エディタ本文に見えている添付ファイル名（*.pdf）。全文置換の前に記録して復元に使う。 */
export async function listAttachedFiles(page) {
  return await page.evaluate(() =>
    ((document.querySelector('[contenteditable=true]')?.innerText || '').match(/\S+\.pdf/gi) || []),
  );
}

/** エディタ内の埋め込み（figure / embedded-service / data-name）の数。添付成否の判定に使う。 */
export async function countEmbeds(page) {
  return await page.evaluate(() =>
    document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service], [contenteditable=true] [data-name]').length,
  );
}

/**
 * エディタへファイルを1件添付する。保存はしない（呼び出し側が公開フローを回す）。
 * @param {import('playwright').Page} page
 * @param {string} fileAbs 添付する絶対パス
 * @param {{anchor?: string|null, timeoutMs?: number}} opts anchor 指定時はその文字列を含む最小段落の直後へ挿入
 * @returns {Promise<{ok:boolean, reason?:string, embedsBefore:number, embedsAfter:number}>}
 */
export async function attachFileInEditor(page, fileAbs, { anchor = null, timeoutMs = 40000 } = {}) {
  await page.click('[contenteditable=true]');
  await sleep(500);
  const pos = await page.evaluate((a) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return { ok: false };
    ed.focus();
    let target = null;
    if (a) {
      let best = Infinity;
      for (const b of ed.querySelectorAll('p, h1, h2, h3, h4, h5, li')) {
        const t = b.textContent || '';
        if (t.includes(a) && t.length < best) { target = b; best = t.length; }
      }
      if (!target) return { ok: false };
    }
    const node = target || ed;
    const r = document.createRange();
    r.selectNodeContents(node);
    r.collapse(false); // false=末尾
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return { ok: true, anchored: !!target };
  }, anchor);
  if (!pos.ok) return { ok: false, reason: anchor ? `anchor 未検出: ${anchor}` : 'editor 未検出', embedsBefore: 0, embedsAfter: 0 };

  await sleep(400);
  await page.keyboard.press('Enter');
  await sleep(1200);

  const embedsBefore = await countEmbeds(page);
  const menu = page.locator('[aria-label="メニューを開く"]');
  if (!(await menu.count())) return { ok: false, reason: 'メニューを開く 未検出', embedsBefore, embedsAfter: embedsBefore };
  await menu.last().click({ timeout: 8000 });
  await sleep(1200);

  const fileItem = page.getByText('ファイル', { exact: true });
  if (!(await fileItem.count())) return { ok: false, reason: 'メニューに「ファイル」未検出', embedsBefore, embedsAfter: embedsBefore };

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 12000 }),
    fileItem.first().click(),
  ]);
  await chooser.setFiles(fileAbs);

  // アップロード完了をポーリング（note のアップロードは遅延・混雑する）
  const base = fileAbs.split(/[\\/]/).pop();
  let embedsAfter = embedsBefore;
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    await sleep(3000);
    const st = await page.evaluate((b) => {
      const ed = document.querySelector('[contenteditable=true]');
      const embeds = document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service], [contenteditable=true] [data-name]').length;
      return { embeds, hasFile: (ed?.innerText || '').includes(b) };
    }, base);
    embedsAfter = st.embeds;
    if (st.embeds > embedsBefore || st.hasFile) return { ok: true, embedsBefore, embedsAfter };
  }
  return { ok: false, reason: 'アップロード後にカードが現れない', embedsBefore, embedsAfter };
}

/**
 * 添付ファイル名 → ローカル実ファイルの解決。記事 dir 直下と dir/pdf/ を探す。
 * 復元できない添付が1つでもあれば呼び出し側は**全文置換をしない**（消して戻せない状態を作らない）。
 */
export function resolveLocalFiles(names, articleDir, { existsSync, readdirSync, join }) {
  const pool = [];
  for (const d of [articleDir, join(articleDir, 'pdf')]) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (/\.pdf$/i.test(f)) pool.push({ base: f, abs: join(d, f) });
  }
  const resolved = [];
  const missing = [];
  for (const n of names) {
    const base = n.split(/[\\/]/).pop();
    const hit = pool.find((p) => p.base === base) || pool.find((p) => p.base.replace(/\.pdf$/i, '') === base.replace(/\.pdf$/i, ''));
    hit ? resolved.push(hit) : missing.push(base);
  }
  return { resolved, missing, poolSize: pool.length };
}
