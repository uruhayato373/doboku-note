// check-outbound-links が参照元のファイルから「検査する本文」を取り出す部品（2026-10-12）。
// X（content/sns/x）はファイルを見ず、コンテンツ台帳（loadXPosts）の、まだ投稿していない原稿だけを見る。投稿済み・停止（差し替え済み・
// 取り下げ）は直せない過去の記録で、tweets.md と計画（campaigns）は予定日が台帳の日程変更とずれる（090#27 は計画の日付が
// 9/9 でも実際は 10/15 に予約中で、削除済みのマガジンを指していた）。
export const X_DIR = 'content/sns/x/';
export const X_DONE = new Set(['posted', 'retired']); // loadXPosts の phase

/** 参照元のファイルから、検査する本文を取り出す（純関数）。X のファイルは見ない（台帳の行は liveXSources）、それ以外のファイル内容は丸ごと。 */
export function liveSourceOf(rel, src) {
  return rel.startsWith(X_DIR) ? '' : src;
}

/**
 * 台帳の X の投稿（loadXPosts の行）から、未投稿（phase が posted・retired 以外）の原稿の本文を取り出す（純関数）。
 * @returns {{ rel: string, text: string }[]} rel は参照元として出す tweets.md のパス
 */
export function liveXSources(posts) {
  return posts
    .filter((p) => !X_DONE.has(p.phase) && p.folder)
    .map((p) => ({
      rel: `${X_DIR}${String(p.row.legacyKey ?? '').split('#')[0] || `draft/${p.folder}`}/tweets.md`,
      text: [p.text ?? '', ...(p.thread ?? [])].join('\n'),
    }));
}
