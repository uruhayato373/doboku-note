/**
 * note-inline-code.mjs — note 記事の本文にインラインのバッククォート（`〇〇` など）が無いかの判定。
 *
 * note はインラインコードを描画せず、バッククォートを記号のまま本文に出す（2026-09-23 に公開 906 本中
 * 248 本で確認・DN-0277）。原稿の目印は【〇〇】、数値・式はそのまま書く。
 *
 * 判定は本文の `...`（1 行内・中身 1 文字以上）。frontmatter とコードブロック（```）は見ない。
 */
const INLINE_RE = /`[^`\n]+`/g;

/** @returns {{line:number, text:string}[]} 出現ごと（行番号は元ファイル基準） */
export function findInlineCode(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  const hits = [];
  let inFence = false;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (const m of l.matchAll(INLINE_RE)) hits.push({ line: i + 1, text: m[0] });
  }
  return hits;
}
