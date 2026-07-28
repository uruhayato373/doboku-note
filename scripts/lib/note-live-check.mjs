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
 * 偽陰性でジョブを落とさない。真実源: .claude/knowledge/reference/note-api-verification.md
 *
 * 取得は curl 経路（2026-07-28 修正）: Node の fetch は HTTP(S)_PROXY を見ないため会社 PC では
 *   **全件失敗し、公開後 assert が一度も機能していなかった**（note-update-body 実行時に
 *   「[5e] API検証がネットワークで未達」が毎回出ていた）。curl はプロキシ env を自動利用し
 *   --ssl-no-revoke で schannel の失効確認エラーを回避する。
 *   なお「fetchError では落とさない」のは publish/update 側の話（公開自体は成功しているため）。
 *   横断スイープ側は取得失敗が支配的なら落とすこと＝検査ゼロを PASS と呼ばないため。
 */
import { spawnSync } from 'node:child_process';

// Windows でも動く同期 sleep（Unix の `sleep` バイナリに依存しない）。
const sleepSync = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

export async function fetchNoteBody(noteId, { retries = 2, delayMs = 3000 } = {}) {
  let lastErr = 'unknown';
  for (let i = 0; i <= retries; i++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const out = (r.stdout || '').trim();
    if (out.startsWith('{')) {
      try { return { body: JSON.parse(out)?.data?.body || '', error: null }; }
      catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${out.slice(0, 40)})`;
    }
    if (i < retries) sleepSync(delayMs);
  }
  return { body: '', error: String(lastErr) };
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
