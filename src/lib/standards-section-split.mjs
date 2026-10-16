/**
 * standards-section-split — 章記事を節ページへ分けるときの切り出しと URL の単一真実源。
 *
 * 第3編第2章 一般施工は原本 167 ページ・HTML 約 2MB の 1 ページだった。生成器
 * （scripts/build-standard-articles.mjs）が manifest の章に `splitBySection: true` を立てた章だけ、
 * サイトは章ページを節の一覧にし、本文を節ページ（/chapters/{章}/sections/{節}）で出す。
 *
 * 章の Markdown は 1 本のまま持つ（比較・公開データ・検査はそれを読む）。節への切り出しは
 * 表示の段で行い、その規則をここに 1 つだけ置く。サイトのページと check-standard-articles が
 * 同じ関数を使うので、「表示では切れているのに検査は別の切り方を見ている」状態にならない。
 */

/** 生成器が書く節見出し（`## 第3節 共通的工種`）。節番号だけで照合する（題名はエスケープで変わりうる）。 */
const SECTION_HEADING = /^## 第(\d+)節 /;
const FENCE = /^\s*(`{3,}|~{3,})/;

/**
 * 章の Markdown を「最初の節見出しより前」と「節ごと」に分ける。
 * 行を 1 本も落とさない: `[...preamble, ...sections.flatMap((s) => s.lines)]` が元の行の並びと一致する。
 * コードブロックの中の `## 第N節` は見出しではないので切らない。
 *
 * @param {string} markdown
 * @returns {{ preamble: string[], sections: { number: number, lines: string[] }[] }}
 */
export function splitChapterBySection(markdown) {
  const preamble = [];
  const sections = [];
  let current = null;
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) fenced = !fenced;
    const match = fenced ? null : line.match(SECTION_HEADING);
    if (match) {
      current = { number: Number(match[1]), lines: [line] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : preamble).push(line);
  }
  return { preamble, sections };
}

/**
 * 節ページの本文を作る。先頭の `## 第N節` はページの H1 が担うので落とし、
 * 残りの見出しを 1 段ずつ上げる（### 条 → ##、#### 項 → ###）。上げないと H1 の次が H3 になり段が飛ぶ。
 * アンカー ID は見出しの文字列から作られる（src/lib/toc.ts）ので、段を上げても変わらない。
 *
 * @param {string[]} lines splitChapterBySection が返した節の行（先頭が節見出し）
 * @returns {string}
 */
export function sectionPageMarkdown(lines) {
  let fenced = false;
  const body = lines.slice(1).map((line) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return line;
    }
    return !fenced && /^#{3,6} /.test(line) ? line.slice(1) : line;
  });
  while (body.length && !body[0].trim()) body.shift();
  return body.join('\n');
}

/**
 * 節ページの URL。
 * @param {{ agencyId: string, documentId: string }} document
 * @param {{ chapterId: string }} chapter
 * @param {number} sectionNumber
 */
export function standardSectionPath(document, chapter, sectionNumber) {
  return `/standards/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}/sections/${sectionNumber}`;
}
