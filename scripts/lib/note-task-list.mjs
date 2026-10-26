/**
 * note-task-list.mjs — note 記事の本文に Markdown のタスクリスト（`- [ ] ...`）が無いかの判定。
 *
 * note はタスクリスト記法に対応せず、`[ ]` を記号のまま箇条書きと並べて出す（2026-W43 の公開画面の目視で
 * 口頭試験対策の本文に確認・DN-0830）。チェック欄は「- □ ...」のように文字で書く。
 *
 * 判定は本文の `- [ ] ` / `- [x] ` / `* [X] `（行頭、字下げ可）。frontmatter とコードブロック（```）は見ない。
 */
const TASK_RE = /^\s*[-*] \[[ xX]\] /;

/** @returns {{line:number, text:string}[]} 該当行（行番号は元ファイル基準） */
export function findTaskLists(content) {
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
    if (TASK_RE.test(l)) hits.push({ line: i + 1, text: l.trim().slice(0, 40) });
  }
  return hits;
}
