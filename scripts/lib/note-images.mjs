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
 * 真実源: .claude/knowledge/reference/note-api-verification.md「live 本文整合性検査」
 */
import { existsSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// トークンは全角括弧＝markdown 変換されない・deriveProbe の probe 候補（記号なし16字以上）にならない。
const tokenFor = (n) => `〔〔IMG:${n}〕〕`;
const TOKEN_RE = /〔〔IMG:\d+〕〕/g;

/**
 * 著者オーソリティ バナーの記事ごとの複製は **生成物で git 管理外**（.gitignore の
 * `content/note/（任意の階層）/img/figure-author-authority*.png`）。原本は下の追跡ディレクトリにあり、
 * 各記事のコピーは scripts/distribute-author-authority-banner.mjs が原本を複製しただけ
 * （2026-09-23 に 251 枚すべてが原本 2 種とバイト一致することを確認）。
 *
 * そのため git の checkout（CI の ops-write・worktree）では記事側のファイルが無い。
 * 以前はここで「ファイル無し」として画像行を黙って除去しており、**CI で再公開した
 * 7 記事のライブからバナーが消えた**（2026-09-23）。記事側に無ければ原本で解決する。
 */
export const AUTHOR_BANNER_RE = /^figure-author-authority[^/]*\.png$/;
export const AUTHOR_BANNER_ORIGIN_DIR = 'content/note/共通/著者オーソリティ/img';

/** 記事側に無いバナーを追跡原本のパスへ解決する。該当しなければ null。 */
export function resolveAuthorBannerOrigin(abs) {
  const name = basename(abs);
  if (!AUTHOR_BANNER_RE.test(name)) return null;
  const i = abs.lastIndexOf('/content/note/');
  if (i < 0) return null;
  const origin = join(abs.slice(0, i), AUTHOR_BANNER_ORIGIN_DIR, name);
  return existsSync(origin) ? origin : null;
}

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
    let abs = resolve(articleDir, rel);
    if (!existsSync(abs)) {
      const origin = resolveAuthorBannerOrigin(abs);
      if (origin) abs = origin;
      else { missing.push(rel + '（ファイル無し・除去）'); return null; }
    }
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
export async function uploadAtCaret(page, abs, { uploadMs = 40000, acceptSrcChange = false } = {}) {
  const imgBefore = await countEditorImages(page);
  const srcBefore = acceptSrcChange
    ? await page.evaluate(() => [...document.querySelectorAll('[contenteditable=true] img')].map((image) => image.src))
    : [];
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
    const current = await page.evaluate(() => [...document.querySelectorAll('[contenteditable=true] img')].map((image) => image.src));
    if (current.length > imgBefore) return { ok: true, mode: 'insert' };
    if (acceptSrcChange && current.length === imgBefore && JSON.stringify(current) !== JSON.stringify(srcBefore)) {
      return { ok: true, mode: 'replace' };
    }
  }
  return { ok: false, reason: `アップロード滞留（>${uploadMs}ms）` };
}

/**
 * 挿入画像の CDN 確定を待つ。target 枚の非 blob `<img>` が揃うまで（または timeout）。
 * blob: プレビューが CDN URL に差し替わって初めて保存で live に載る。
 */
/**
 * CDN 確定待ちの上限を環境変数で伸ばせるようにする（2026-08-04 追加）。
 *
 * 既定（min 90 秒 / 20 秒per枚）は速い回線を前提にしている。会社 PC のプロキシ経由だと
 * note の CDN 確定がこれを超えることがあり、実測で 26 本バッチのうち 6 本が
 * `[4.4] 画像が CDN 確定せず` で中断した（保存はしないので破損はしないが、進まない）。
 * **待てば通る種類の失敗なので、環境ごとに待ちを伸ばせる必要がある**。
 * 判定そのもの（blob: でない img が target 個）は変えない＝緩めない。
 */
const SETTLE_MIN_MS = Number(process.env.NOTE_IMG_SETTLE_MIN_MS || 90_000);
// 20s/枚 → 45s/枚（2026-08-18）→ 90s/枚（2026-08-25・DN-0009）。
// 2026-08-17 の一括反映で画像持ち記事の 40% が CDN 確定待ちタイムアウトで落ちた（着手 15 件中 ABORT 6 件）。
// 45s/枚でも会社 PC 以外（自宅回線・別ネットワーク経路）で再現した（同一記事が dry-run で 3/3 確定 →
// 数分後の commit 再実行で 1/3 のみ確定・ABORT。ネットワーク経路一定でも結果が割れた＝プロキシだけが
// 原因ではなく、note 側 CDN 確定そのものに揺らぎがある）。90s/枚に伸ばしたところ同日 13/13 記事が確定
// （canary 2 本 + 強制再試行 1 本 + バッチ 10 本、いずれも 45s では未確定だった記事を含む）。
// 上限は「打ち切り」であって固定待ちではない（settleUploads は target に達した時点で即 return する）
// ので、速い記事は従来どおり速い＝既定を伸ばしても高速ケースの所要時間は増えない。
const SETTLE_PER_IMG_MS = Number(process.env.NOTE_IMG_SETTLE_PER_IMG_MS || 90_000);

/**
 * タイムアウト時の内訳を 2 種に分ける純関数（DN-0273・2026-09-24）。
 *
 * 「確定=1/3」の不足分には、(a) blob: プレビューのまま CDN 確定を待っている画像と、
 * (b) そもそもエディタから消えた画像（挿入したのに img 要素が無い）が混ざっていた。
 * (a) は待てば通るが (b) は待ちを伸ばしても直らない（2026-09-23 に 480〜720 秒へ伸ばしても
 * 毎回中断し、タイムアウト時の img を出すと 3 枚中 1 枚しか残っていなかった。同じ記事を
 * 待ちを戻して再実行すると 3/3 で通った）。同じ文言で出すと延長を繰り返す無駄が出るので分ける。
 * 判定は従来の `img:not([src^="blob:"])` と同じ（src 属性の無い img は確定側に数える）。
 * @param {Array<string|null>} srcs  エディタ内 img の src 属性（getAttribute('src')）の一覧
 * @param {number} target  確定を待つ枚数（挿入前から有った img を含む）
 * @returns {{settled:number, blob:number, missing:number}}
 */
export function classifyEditorImages(srcs, target) {
  const blob = srcs.filter((src) => typeof src === 'string' && src.startsWith('blob:')).length;
  return { settled: srcs.length - blob, blob, missing: Math.max(0, target - srcs.length) };
}

/**
 * 確定待ちで止まったときの中断理由。消えた画像が 1 枚でもあれば待ちでは直らないので img-lost。
 * @param {{missing?:number}|undefined} settle  settleUploads の戻り値（または insertImagesAtPlaceholders の r.settle）
 */
export function settleAbortReason(settle) {
  return settle?.missing > 0 ? 'img-lost' : 'img-settle';
}

export async function settleUploads(page, target, timeoutMs, tag = '[img]') {
  const t0 = Date.now();
  let c = { settled: 0, blob: 0, missing: 0 };
  while (Date.now() - t0 < timeoutMs) {
    const srcs = await page.evaluate(() => Array.from(document.querySelectorAll('[contenteditable=true] img'), (img) => img.getAttribute('src')));
    c = classifyEditorImages(srcs, target);
    if (c.settled >= target) return { ok: true, confirmed: c.settled, blob: c.blob, missing: c.missing };
    await sleep(1500);
  }
  console.log(`${tag} ⚠ CDN確定待ちタイムアウト（確定=${c.settled}/${target}・blob のまま ${c.blob} 枚・エディタに無い ${c.missing} 枚・上限 ${Math.round(timeoutMs / 1000)}s）`);
  if (c.missing > 0) {
    console.log(`${tag}   エディタに無い ${c.missing} 枚（挿入した画像が消えた）。待ちを伸ばしても直らないので、同じ記事を単発で再実行する（note-update-body は --force-retry）`);
  } else {
    console.log(`${tag}   待てば通る場合は NOTE_IMG_SETTLE_MIN_MS / NOTE_IMG_SETTLE_PER_IMG_MS で上限を伸ばす`);
  }
  return { ok: false, confirmed: c.settled, blob: c.blob, missing: c.missing };
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
 * @returns {Promise<{inserted:number, failed:Array<{token:string,reason:string}>, leftover:string[], settled:boolean, settle:{target:number, confirmed:number, blob:number, missing:number}}>}
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
  const target = startImgs + inserted;
  const settled = await settleUploads(page, target, Math.max(SETTLE_MIN_MS, inserted * SETTLE_PER_IMG_MS), tag);

  const leftover = await listLeftoverTokens(page);
  console.log(`${tag} 画像挿入: inserted=${inserted}/${images.length} failed=${failed.length} leftover=${leftover.length} 確定=${settled.confirmed}/${target}${settled.ok ? '' : ` blob=${settled.blob} 消失=${settled.missing}`}`);
  if (failed.length) console.log(`${tag} 失敗: ${failed.map((f) => f.reason).join(' / ')}`);
  // settled(boolean) は従来どおり。内訳は settle に足す（中断理由は settleAbortReason(r.settle)）。
  return { inserted, failed, leftover, settled: settled.ok, settle: { target, confirmed: settled.confirmed, blob: settled.blob, missing: settled.missing } };
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
  const settled = await settleUploads(page, startImgs + inserted, Math.max(SETTLE_MIN_MS / 3, inserted * SETTLE_PER_IMG_MS / 2.5), tag);
  console.log(`${tag} 画像挿入(anchor): inserted=${inserted}/${images.length} failed=${failed.length} 確定=${settled.confirmed}/${startImgs + inserted}`);
  if (failed.length) console.log(`${tag} 失敗: ${failed.map((f) => f.reason).join(' / ')}`);
  // settled を返さないと --images-only の呼び出し側（!r.settled）が常に中断していた（2026-09-24 発見）
  return { inserted, failed, settled: settled.ok, settle: settled };
}

export { TOKEN_RE };
