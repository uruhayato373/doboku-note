/**
 * note-status.mjs — frontmatter の noteStatus 行だけを置換する純関数（verify-note-status --fix が使う）
 * ---------------------------------------------------------------------------
 * 2026-09-19: 旧実装は frontmatter の正規表現が LF 専用（`---\n`）で、CRLF の記事（Windows 由来・
 * pack-lineup の会員記事）は 1 バイトも書き換えないまま「是正済み」と数えられていた（学科09・W8 で実発生）。
 * CRLF/LF どちらも受け付け、行末コードは保持し、frontmatter 外の行には触らない。
 * 書き換えの有無は呼び出し側が `next !== raw` で数える（書けなかったものを是正済みと呼ばない）。
 */
export function setNoteStatus(raw, value) {
  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---)/);
  if (!m) return raw;
  const head = m[1];
  if (!/^noteStatus:.*$/m.test(head)) return raw; // 行が無ければ何もしない
  return raw.replace(head, head.replace(/^noteStatus:.*$/m, `noteStatus: ${value}`));
}
