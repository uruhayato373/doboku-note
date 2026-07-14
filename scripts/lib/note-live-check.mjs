/**
 * note-live-check.mjs — note 公開本文の「live 整合性」検査の共有実装
 *
 * note public API（/api/v3/notes/{id}）で本文 HTML を取得し、3 種の破損を検出する:
 *   (1) URL 見出し   — <h1-6> 内に http(s) URL（cardify グリッチ・note ネイティブ目次に URL 露出）
 *   (2) 空引用       — <blockquote> が中身空（複数行 blockquote が paste で脱落した痕跡）
 *   (3) 画像欠落     — 本文 <img> 数 < SoT 期待枚数（本文画像が除去されて live に載らない）
 *
 * 各スクリプトの公開後 assert（note-update-body [5e] / note-publish [13]）と横断スイープ
 * （check-note-live-headings.mjs）の双方から使う。ネットワーク失敗は fetchError で区別し
 * 偽陰性でジョブを落とさない。真実源: docs/reference/note-api-verification.md
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchNoteBody(noteId, { retries = 2, delayMs = 3000 } = {}) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://note.com/api/v3/notes/${noteId}`, { signal: AbortSignal.timeout(20000) });
      return { body: (await res.json())?.data?.body || '', error: null };
    } catch (e) {
      lastErr = e;
      await sleep(delayMs);
    }
  }
  return { body: '', error: String(lastErr?.message || lastErr) };
}

/** <h1-6> 内に URL を含む見出しのテキスト一覧。 */
export function findUrlHeadings(html) {
  const bad = [];
  for (const m of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (/https?:\/\//.test(text)) bad.push(`h${m[1]}: ${text.slice(0, 70)}`);
  }
  return bad;
}

/** 中身が空の <blockquote> の数（タグ除去後 trim が空）。 */
export function countEmptyBlockquotes(html) {
  let n = 0;
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)) {
    if (!m[1].replace(/<[^>]+>/g, '').trim()) n++;
  }
  return n;
}

/** 本文 <img> タグ数（リンクカード <figure> は img を含まないので誤算しない）。 */
export function countImgs(html) {
  return (html.match(/<img\b/g) || []).length;
}

/**
 * 公開後の実体検証。expectedImgs を渡すと画像欠落も判定する（null/undefined なら画像検査 skip）。
 * @returns {Promise<{ok:boolean, urlHeadings:string[], emptyBq:number, imgLive:number, imgShort:boolean, fetchError:string|null}>}
 */
export async function assertLiveBody(noteId, { expectedImgs = null } = {}) {
  const { body, error } = await fetchNoteBody(noteId);
  if (error) return { ok: false, urlHeadings: [], emptyBq: 0, imgLive: 0, imgShort: false, fetchError: error };
  const urlHeadings = findUrlHeadings(body);
  const emptyBq = countEmptyBlockquotes(body);
  const imgLive = countImgs(body);
  const imgShort = expectedImgs != null && imgLive < expectedImgs;
  const ok = urlHeadings.length === 0 && emptyBq === 0 && !imgShort;
  return { ok, urlHeadings, emptyBq, imgLive, imgShort, fetchError: null };
}
