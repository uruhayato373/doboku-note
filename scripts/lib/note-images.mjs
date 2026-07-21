/**
 * note-images.mjs — note エディタ本文への「インライン画像アップロード」共有実装
 *
 * 背景（2026-07-15 本文画像欠落の根治）:
 *   note-publish.mjs / note-update-body.mjs は本文の `![alt](img/xxx.png)` を paste 前処理で
 *   **除去**していた（画像は手動アップロードが旧運用）。結果、SoT に図があるのに live に載らない
 *   記事が published 291本中 33本・計58枚超あった（2026-07-15 実測）。本モジュールは:
 *     (1) extractBodyImages — 画像行を除去せず一意トークン `〔〔IMG:n〕〕` に置換して paste 本文に残す
 *     (2) insertImagesAtPlaceholders — paste 後にトークン段落を「＋」メニュー→画像アップロードで実画像へ
 *   置換方式（除去ではなく）にすることで挿入位置を SoT の順序どおりに保つ。
 *
 *   実証済みプリミティブの流用:
 *     - 「＋」メニュー（[aria-label="メニューを開く"]）→ getByText('画像')→ filechooser→ setFiles
 *       ＝ note-attach-file.mjs（ファイル添付）と同型。ラベルが「ファイル」→「画像」に替わるだけ。
 *     - トークン段落の DOM 再クエリ→scrollIntoView→Range.selectNodeContents→Delete
 *       ＝ lib/note-cardify.mjs（URL 行カード化）と同型。
 *     - アップロード完了は `<img>` 数増加を最大 40s ポーリング（note の遅延対策）。
 *
 * 真実源: docs/reference/note-api-verification.md「live 本文整合性検査」
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// トークンは全角括弧＝markdown 変換されない・deriveProbe の probe 候補（記号なし16字以上）にならない。
const tokenFor = (n) => `〔〔IMG:${n}〕〕`;
const TOKEN_RE = /〔〔IMG:\d+〕〕/g;

/**
 * 本文 markdown の画像行 `^![alt](path)$` を一意トークンへ置換する（除去しない）。
 * ファイルが存在しない画像行のみ従来どおり除去し WARN 収集する。
 * @param {string} body  frontmatter 除去済みの本文
 * @param {string} articleDir  article.md のあるディレクトリ絶対パス（相対 img/ 解決用）
 * @returns {{ body:string, images:Array<{token:string,abs:string,alt:string}>, missing:string[] }}
 */
export function extractBodyImages(body, articleDir) {
  const images = [];
  const missing = [];
  let n = 0;
  // 画像は「単独行」のみ対象（インライン画像は note で稀・本プロジェクトの図は全て単独行）。
  const out = body.split('\n').map((line) => {
    const m = line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (!m) return line;
    const alt = m[1] || '';
    const rel = m[2].trim();
    // 外部 URL 画像は対象外（除去＝従来挙動）。ローカル相対パスのみアップロード対象。
    if (/^https?:\/\//.test(rel)) { missing.push(rel + '（外部URL・除去）'); return null; }
    const abs = resolve(articleDir, rel);
    if (!existsSync(abs)) { missing.push(rel + '（ファイル無し・除去）'); return null; }
    const token = tokenFor(n++);
    images.push({ token, abs, alt });
    return token;
  }).filter((l) => l !== null).join('\n');
  return { body: out, images, missing };
}

/** エディタ内の本文 `<img>` 数（リンクカード figure は img を含まないので誤算しない）。 */
export async function countEditorImages(page) {
  return page.evaluate(() => document.querySelectorAll('[contenteditable=true] img').length);
}

/** エディタ本文に残っているトークン文字列を列挙（保存前ゲート用）。 */
export async function listLeftoverTokens(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]');
    const txt = ed ? ed.innerText || '' : '';
    return (txt.match(/〔〔IMG:\d+〕〕/g) || []);
  });
}

/**
 * caret 位置に画像を 1 枚アップロードする内部ヘルパー（＋メニュー→画像→filechooser→完了待ち）。
 * 呼び出し前に caret が挿入したい空段落にあること。@returns {Promise<{ok:boolean, reason?:string}>}
 */
async function uploadAtCaret(page, abs, { uploadMs = 40000 } = {}) {
  const imgBefore = await countEditorImages(page);
  // 「＋」ブロックメニューを開く。caret 行の 1 個のみ存在するため .last() が active（note-attach-file 実証方式）。
  const menuBtn = page.locator('[aria-label="メニューを開く"]');
  if (!(await menuBtn.count())) return { ok: false, reason: '＋メニュー未検出' };
  try { await menuBtn.last().click({ timeout: 8000 }); } catch { return { ok: false, reason: '＋メニュークリック失敗' }; }
  await sleep(1500);

  const item = page.getByText('画像', { exact: true });
  if (!(await item.count())) { await page.keyboard.press('Escape').catch(() => {}); return { ok: false, reason: 'メニューに「画像」未検出' }; }
  let chooser;
  try {
    [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 12000 }),
      item.first().click({ timeout: 5000 }),
    ]);
  } catch {
    const up = page.getByText('画像をアップロード', { exact: false });
    if (await up.count()) {
      try { [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 12000 }), up.first().click()]); } catch { /* noop */ }
    }
  }
  if (!chooser) { await page.keyboard.press('Escape').catch(() => {}); return { ok: false, reason: 'filechooser 不発' }; }
  await chooser.setFiles(abs);

  const t0 = Date.now();
  while (Date.now() - t0 < uploadMs) {
    await sleep(1500);
    if ((await countEditorImages(page)) > imgBefore) return { ok: true };
  }
  return { ok: false, reason: `アップロード滞留（>${uploadMs}ms）` };
}

/**
 * 挿入画像の CDN 確定を待つ。target 枚の非 blob `<img>` が揃うまで（または timeout）。
 * blob: プレビューが CDN URL に差し替わって初めて保存で live に載る。
 */
async function settleUploads(page, target, timeoutMs, tag = '[img]') {
  const t0 = Date.now();
  let confirmed = 0;
  while (Date.now() - t0 < timeoutMs) {
    const c = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] img:not([src^="blob:"])').length);
    confirmed = c;
    if (c >= target) return { ok: true, confirmed: c };
    await sleep(1500);
  }
  console.log(`${tag} ⚠ CDN確定待ちタイムアウト（確定=${confirmed}/${target}）`);
  return { ok: false, confirmed };
}

/** 直近挿入 figure のキャプションへ alt を best-effort 入力（失敗は無害）。 */
async function captionLast(page, alt) {
  try {
    const capBox = await page.evaluate(() => {
      const figs = document.querySelectorAll('[contenteditable=true] figure');
      const fig = figs[figs.length - 1];
      if (!fig) return null;
      const cap = fig.querySelector('figcaption, [contenteditable][data-placeholder], textarea, input');
      if (!cap) return null;
      cap.scrollIntoView({ block: 'center' });
      const rr = cap.getBoundingClientRect();
      return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
    });
    if (capBox) {
      await page.mouse.click(capBox.x, capBox.y); await sleep(300);
      await page.keyboard.type(alt, { delay: 8 }); await sleep(300);
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* caption best-effort */ }
}

/**
 * paste 済み本文の各トークン段落を、実画像アップロードに置き換える。
 * 逐次処理（最大 images.length 枚）。1 枚失敗しても続行し failed に記録する。
 * @returns {Promise<{inserted:number, failed:Array<{token:string,reason:string}>, leftover:string[]}>}
 */
export async function insertImagesAtPlaceholders(page, images, { tag = '[img]', captionize = true, uploadMs = 40000 } = {}) {
  let inserted = 0;
  const failed = [];
  const startImgs = await countEditorImages(page);
  const tokenPresent = (tk) => page.evaluate((t) => ((document.querySelector('[contenteditable=true]')?.innerText || '').includes(t)), tk);
  const selectToken = (tk) => page.evaluate((t) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return false;
    for (const b of ed.querySelectorAll('p, div')) {
      if (b.closest('figure, [embedded-service], h1, h2, h3, h4, h5, h6')) continue;
      if (b.querySelector('p, h1, h2, h3, h4, h5, h6, figure')) continue;
      if ((b.innerText || '').trim() !== t) continue;
      b.scrollIntoView({ block: 'center' });
      const r = document.createRange(); r.selectNodeContents(b);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      return true;
    }
    return false;
  }, tk);

  for (const { token, abs, alt } of images) {
    // (a) トークン段落を選択→Delete。ProseMirror 再描画で selection が失われ Delete 空振りする
    //     ことがあるため、トークンが消えるまで最大3回 再選択+Delete（消えないと leftover ABORT になる）。
    if (!(await selectToken(token))) { failed.push({ token, reason: 'token段落を特定できず' }); continue; }
    let deleted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.keyboard.press('Delete'); await sleep(400);
      if (!(await tokenPresent(token))) { deleted = true; break; }
      await selectToken(token); await sleep(200);
    }
    if (!deleted) { failed.push({ token, reason: 'token削除に失敗（selection race）' }); continue; }

    // (b-d) caret にアップロード
    const up = await uploadAtCaret(page, abs, { uploadMs });
    if (!up.ok) { failed.push({ token, reason: up.reason }); continue; }

    // (e) キャプション（best-effort）
    if (captionize && alt) await captionLast(page, alt);
    inserted++;
  }

  // (f) settle: 挿入した全画像が CDN 確定（src が blob: でない）になるまで待つ。
  //     保存前に確定していないと live に載らず img 欠落になる（枚数比例の待ち・最低90s）。
  //     全確定で早期 return するため、遅い記事のみ長く待つ（速い記事のコストは不変）。
  const settled = await settleUploads(page, startImgs + inserted, Math.max(90000, inserted * 20000), tag);

  const leftover = await listLeftoverTokens(page);
  console.log(`${tag} 画像挿入: inserted=${inserted}/${images.length} failed=${failed.length} leftover=${leftover.length} 確定=${settled.confirmed}/${startImgs + inserted}`);
  if (failed.length) console.log(`${tag} 失敗: ${failed.map((f) => f.reason).join(' / ')}`);
  return { inserted, failed, leftover, settled: settled.ok };
}

/**
 * 全文置換をせず、既存 live 本文の各画像の「アンカー段落」（直前の非空テキスト行）末尾に
 * 画像を追加挿入する（--images-only 用・PDF添付カード/境界/本文を触らない）。
 * 冪等: 呼び出し前に「live img 数 >= 期待枚数」なら呼び出し側で skip すること。
 * @param {Array<{abs:string, alt:string, anchor:string}>} images  anchor=直前非空行の正規化先頭30字
 * @returns {Promise<{inserted:number, failed:Array<{anchor:string,reason:string}>}>}
 */
export async function insertImagesAfterAnchors(page, images, { tag = '[img-only]', captionize = true, uploadMs = 40000 } = {}) {
  let inserted = 0;
  const failed = [];
  const startImgs = await countEditorImages(page);
  for (const { abs, alt, anchor } of images) {
    // アンカー段落を特定し、その末尾に空段落を作って caret を置く。
    const placed = await page.evaluate((a) => {
      const norm = (s) => (s || '').replace(/\s+/g, '').slice(0, 30);
      const ed = document.querySelector('[contenteditable=true]');
      if (!ed) return false;
      for (const b of ed.querySelectorAll('p, li, h2, h3')) {
        if (b.closest('figure, [embedded-service]')) continue;
        if (norm(b.innerText).startsWith(a) && a.length >= 6) {
          b.scrollIntoView({ block: 'center' });
          const r = document.createRange();
          r.selectNodeContents(b); r.collapse(false); // 末尾
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
          return true;
        }
      }
      return false;
    }, anchor);
    if (!placed) { failed.push({ anchor, reason: 'アンカー段落を特定できず' }); continue; }
    await page.keyboard.press('Enter'); await sleep(600); // アンカー直後に空段落

    const up = await uploadAtCaret(page, abs, { uploadMs });
    if (!up.ok) { failed.push({ anchor, reason: up.reason }); continue; }
    if (captionize && alt) await captionLast(page, alt);
    inserted++;
  }
  const settled = await settleUploads(page, startImgs + inserted, Math.max(30000, inserted * 8000), tag);
  console.log(`${tag} 画像挿入(anchor): inserted=${inserted}/${images.length} failed=${failed.length} 確定=${settled.confirmed}/${startImgs + inserted}`);
  if (failed.length) console.log(`${tag} 失敗: ${failed.map((f) => f.reason).join(' / ')}`);
  return { inserted, failed };
}

export { TOKEN_RE };
