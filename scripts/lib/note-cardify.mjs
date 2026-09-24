/**
 * note-cardify.mjs — note エディタの URL 行カード化・URL 見出し修復の共有実装
 *
 * 背景（2026-07-14 URL見出し化グリッチの根治）:
 *   旧 cardify（note-publish.mjs §6 / note-update-body.mjs [4] に重複実装）には 3 欠陥があった。
 *   (1) レース条件 — Enter 後の embed 変換は非同期なのに盲目 4500ms 待ち。変換中の DOM 再構築で
 *       次 URL の Range 選択が壊れ、カーソルが隣接見出しに落ちて URL が見出しに typed される
 *       （= note ネイティブ目次に URL が露出する事故。2026-07-14 に published 291本中 7本で確認）
 *   (2) 重複 URL — [...new Set(urls)] で dedup するため同一 URL の 2 箇所目が未処理。さらに
 *       TreeWalker が変換済みカード内のテキストを誤選択し得る
 *   (3) ブロック種の無検査 — 選択先が段落か見出しかを確認しない
 *   本実装は「毎回 DOM を再クエリ→段落ブロック限定で選択→カード生成完了を実測で待つ」ループに
 *   置き換え、(1)(2)(3) を同時に解消する。検知の最終防衛は check-note-live-headings.mjs（横断）と
 *   各スクリプトの公開後 API assert（assertNoUrlHeadings）。真実源: .claude/knowledge/reference/note-api-verification.md
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 次にカード化する bare URL 段落の位置を決める（純関数・単体テスト対象）。
 * カード化できなかった段落は bare のまま同じ位置に残るので、URL ごとに失敗回数ぶん
 * 先頭側の出現を飛ばす。飛ばさないと埋め込み不可の URL（brain-market 等）を先頭で
 * 打ち直し続け、後ろの URL が 1 本もカード化されない（2026-09-24 DN-0302）。
 * @param {string[]} urls エディタ内の bare URL 段落のテキスト（文書順）
 * @param {Map<string, number>} failed URL → カード化に失敗した回数
 * @returns {number} 対象の添字。無ければ -1
 */
export function pickBareUrlIndex(urls, failed) {
  const seen = new Map();
  for (let i = 0; i < urls.length; i++) {
    const n = (seen.get(urls[i]) || 0) + 1;
    seen.set(urls[i], n);
    if (n > (failed.get(urls[i]) || 0)) return i;
  }
  return -1;
}

/**
 * URL 単独行の段落を 1 つずつカード化する。
 * 毎イテレーションで「カード/見出し外にある bare URL 段落」を再探索するため、
 * 重複 URL・変換による DOM 再構築に対して安全。カード生成は実測で待つ（最大 waitMs）。
 * カードにならなかった URL は飛ばして後ろへ進み、failed として返す。
 * @returns {Promise<{processed:number, cards:number, failed:string[]}>}
 */
export async function cardifyBareUrls(page, { tag = '[cardify]', waitMs = 10000, guard = 40 } = {}) {
  let processed = 0;
  const failed = new Map();
  for (let i = 0; i < guard; i++) {
    // 次の bare URL 段落を選択（カード内・見出しは除外）。見つからなければ終了。
    const urls = await page.evaluate(listBareUrlBlocks);
    const idx = pickBareUrlIndex(urls, failed);
    if (idx < 0) break;
    const u = await page.evaluate(selectBareUrlBlock, idx);
    if (!u) break;
    const before = await countCards(page);
    await page.keyboard.press('Delete');
    await sleep(300);
    await page.keyboard.type(u, { delay: 10 });
    await sleep(400);
    await page.keyboard.press('Enter');
    // 変換完了を実測で待つ（カード数の増加）。増えないURL（埋め込み不可）はタイムアウトで失敗扱いにして飛ばす。
    let ok = false;
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
      await sleep(500);
      if ((await countCards(page)) > before) { ok = true; break; }
    }
    if (!ok) failed.set(u, (failed.get(u) || 0) + 1);
    processed++;
  }
  const cards = await countCards(page);
  const failedList = [...failed.keys()];
  console.log(`${tag} cardify: processed=${processed} cards=${cards}${failedList.length ? ` failed=${failedList.length}` : ''}`);
  for (const f of failedList) console.log(`${tag} ⚠ カード化されず素のリンクのまま: ${f}`);
  return { processed, cards, failed: failedList };
}

// page.evaluate に渡す関数（ブラウザ側で実行。外側のスコープを参照しない）
export function listBareUrlBlocks() {
  const ed = document.querySelector('[contenteditable=true]');
  if (!ed) return [];
  const out = [];
  for (const b of ed.querySelectorAll('p, div')) {
    if (b.closest('figure, [embedded-service], h1, h2, h3, h4, h5, h6')) continue;
    if (b.querySelector('p, h1, h2, h3, h4, h5, h6, figure')) continue; // ラッパー div を除外
    const t = (b.innerText || '').trim();
    if (/^https?:\/\/\S+$/.test(t)) out.push(t);
  }
  return out;
}

export function selectBareUrlBlock(idx) {
  const ed = document.querySelector('[contenteditable=true]');
  if (!ed) return null;
  let n = 0;
  for (const b of ed.querySelectorAll('p, div')) {
    if (b.closest('figure, [embedded-service], h1, h2, h3, h4, h5, h6')) continue;
    if (b.querySelector('p, h1, h2, h3, h4, h5, h6, figure')) continue;
    const t = (b.innerText || '').trim();
    if (!/^https?:\/\/\S+$/.test(t)) continue;
    if (n++ !== idx) continue;
    b.scrollIntoView({ block: 'center' });
    const r = document.createRange();
    r.selectNodeContents(b);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return t;
  }
  return null;
}

/**
 * URL が見出し（h1-6）に化けたブロックを修復する。
 * 見出しテキストが URL のみ → 見出しブロックごと削除して段落として type し直し（カード化）。
 * URL＋他テキスト混在は自動修復せず警告（手動修正対象として返す）。
 * @returns {Promise<{fixed:number, manual:string[]}>}
 */
export async function repairUrlHeadings(page, { tag = '[repair]', guard = 10 } = {}) {
  let fixed = 0;
  const manual = [];
  for (let i = 0; i < guard; i++) {
    const hit = await page.evaluate(() => {
      const ed = document.querySelector('[contenteditable=true]');
      if (!ed) return null;
      for (const h of ed.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        const t = (h.innerText || '').trim();
        const m = t.match(/https?:\/\/\S+/);
        if (!m) continue;
        if (t !== m[0]) return { url: m[0], mixed: true, text: t.slice(0, 80) };
        h.scrollIntoView({ block: 'center' });
        const r = document.createRange();
        r.selectNode(h); // 見出しブロックごと選択
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        return { url: m[0], mixed: false };
      }
      return null;
    });
    if (!hit) break;
    if (hit.mixed) {
      manual.push(hit.text);
      console.log(`${tag} URL混在見出しは自動修復せず（手動対象）: ${hit.text}`);
      break; // 同じ見出しを再検出して無限ループしないよう打ち切り
    }
    const before = await countCards(page);
    await page.keyboard.press('Delete');
    await sleep(400);
    await page.keyboard.type(hit.url, { delay: 10 });
    await sleep(400);
    await page.keyboard.press('Enter');
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) {
      await sleep(500);
      if ((await countCards(page)) > before) break;
    }
    fixed++;
  }
  if (fixed) console.log(`${tag} URL見出しを修復: ${fixed}件`);
  return { fixed, manual };
}

/** エディタ内に残る URL 見出しを列挙（保存前の自己検証用） */
export async function listUrlHeadingsInEditor(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return [];
    const out = [];
    for (const h of ed.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const t = (h.innerText || '').trim();
      if (/https?:\/\//.test(t)) out.push(`${h.tagName.toLowerCase()}: ${t.slice(0, 80)}`);
    }
    return out;
  });
}

/**
 * 公開後の実体検証: note public API で本文を取得し、見出しタグ内の URL を検出する。
 * ネットワーク失敗は fetchError として区別（偽陰性でジョブを落とさない）。
 * @returns {Promise<{ok:boolean, bad:string[], fetchError:string|null}>}
 */
export async function assertNoUrlHeadings(noteId, { retries = 2, delayMs = 3000 } = {}) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://note.com/api/v3/notes/${noteId}`, { signal: AbortSignal.timeout(20000) });
      const body = (await res.json())?.data?.body || '';
      const bad = [];
      for (const m of body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (/https?:\/\//.test(text)) bad.push(`h${m[1]}: ${text.slice(0, 80)}`);
      }
      return { ok: bad.length === 0, bad, fetchError: null };
    } catch (e) {
      lastErr = e;
      await sleep(delayMs);
    }
  }
  return { ok: false, bad: [], fetchError: String(lastErr?.message || lastErr) };
}

async function countCards(page) {
  return page.evaluate(countEditorCards);
}

export function countEditorCards() {
  return document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service]').length;
}
