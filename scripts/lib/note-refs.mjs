/**
 * note-refs.mjs — 本文中の note.com 参照（記事/マガジン）を抜き出す共有ロジック。
 *
 * check-outbound-links.mjs から切り出した（副作用なしでテストするため。呼び出し元は
 * トップレベルでネットワーク I/O を走らせる構造なので、テストから直接 import できない）。
 */
import matter from 'gray-matter';

export const NOTE_URL = /https?:\/\/(?:www\.)?note\.com\/([A-Za-z0-9_-]+)\/(n|m)\/([A-Za-z0-9]+)/g;

/**
 * 1 ファイル分の本文から note.com 参照を抜き出す（純関数）。
 * frontmatter の noteId（この記事自身の note URL）は自己参照であって送客先ではない。
 * 2026-08-27 実測: 予約投稿（--schedule）した記事の noteUrl がこれで「送客先が切れている」
 * と誤検知された（自分自身は当然まだ公開時刻前で not_found を返す）。実測では 879 件の
 * 参照のうち 807 件がこの自己参照ノイズで、真の送客先は 364 件だった。
 * @param {string} src ファイル本文（frontmatter 込みの生テキスト）
 * @returns {{kind:'n'|'m', id:string}[]}
 */
export function extractNoteRefs(src) {
  let selfNoteId = null;
  try { selfNoteId = matter(src).data?.noteId || null; } catch { /* frontmatter が壊れていても本文走査は続ける */ }
  const out = [];
  for (const m of src.matchAll(NOTE_URL)) {
    if (m[2] === 'n' && selfNoteId && m[3] === selfNoteId) continue;
    out.push({ kind: m[2], id: m[3] });
  }
  return out;
}
