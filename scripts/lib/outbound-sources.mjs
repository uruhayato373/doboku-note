// check-outbound-links が参照元のファイルから「検査する本文」を取り出す部品（2026-10-12）。
// X（content/sns/x）は予約の台帳 status.json の、まだ投稿していない原稿だけを見る。投稿済み・差し替え済み・取り下げは
// 直せない過去の記録で、tweets.md と計画（campaigns）は予定日が台帳の日程変更とずれる（090#27 は計画の日付が 9/9 でも
// 実際は 10/15 に予約中で、削除済みのマガジンを指していた）。
export const X_DIR = 'content/sns/x/';
export const X_DONE = new Set(['posted', 'replaced', 'cancelled']);

/** 参照元のファイルから、検査する本文を取り出す（純関数）。X は status.json の未投稿の原稿だけ、それ以外のファイル内容は丸ごと。 */
export function liveSourceOf(rel, src) {
  if (!rel.startsWith(X_DIR)) return src;
  if (!rel.endsWith('/status.json')) return '';
  let data;
  try { data = JSON.parse(src); } catch { return src; } // 壊れた台帳は丸ごと見る（黙って外さない）
  return Object.values(data?.tweets ?? {})
    .filter((t) => t && typeof t === 'object' && !X_DONE.has(t.status))
    .map((t) => `${t.text ?? ''}\n${t.target ?? ''}`)
    .join('\n');
}
