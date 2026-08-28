/**
 * note 記事の「答案本文域」の境界（単一 SSOT）。
 *
 * 総監・建設部門の記述式記事は `## 試験問題` / `## 予想問題` / `## A 案` / `## B 案` 以降が
 * 模範答案の連続散文になる。答案は散文で一続きに書くのが試験の作法（箇条書き禁止・
 * 各施策600字以内）なので、段落長ルールを当ててはいけない領域である。
 *
 * 2026-08-28 の事故: note-lint の checkParagraphLength は「模範論文＝有料」という代理指標
 * （notePricing が free でなければ除外）でこの領域を外そうとしていたが、
 * `技術士総監/R8本試験模範解答例`（notePricing: free だが本文は14立場の模範解答）で破綻し、
 * 答案本文の散文59件を「段落が長すぎる」と誤検出していた。
 * 一方 reflow-note-paragraphs.mjs は最初からこの見出し境界で答案域を保護しており、
 * **flag する側（note-lint）が fix する側（reflow）の触らない箇所を報告する**
 * ＝修正不能な違反が出る状態になっていた。両者が同じ境界を見るようここへ集約する。
 *
 * 注意: 有料境界（paidBoundary・既定 `試験問題|予想問題`）とは別物。あちらは「どこから
 * 有料エリアか」で、こちらは「どこから散文答案か」。A 案 / B 案 を含む点が異なる。
 */

/** 答案本文域の開始を示す H2 見出し */
export const ANSWER_SECTION_PATTERN = /^##\s*(試験問題|予想問題|A 案|B 案)/;

/**
 * 答案パーツの構造マーカー（`**①施策の内容…**：` `**③最も重大な障害と対応方策**：` 等）。
 *
 * 施策バンク系の記事（`R8設問3施策全集` など）は `## 試験問題` を持たず、施策ごとに
 * ①②③ の答案パーツが並ぶ構成になる。見出し境界では拾えないが、これらは答案本文と
 * 同じ散文が仕様なので段落長ルールの対象外にする（2026-08-28・当該記事で28件が
 * この形の誤検出だった。同ファイルで実際に分割すべき説明文は1件のみ）。
 */
export const ANSWER_PART_PATTERN = /^\*\*[①②③④⑤]/;

/** 段落が答案パーツ（散文が仕様）かどうか */
export function isAnswerPart(paragraph) {
  return ANSWER_PART_PATTERN.test(String(paragraph).trim());
}

/**
 * 空行区切りブロック配列から答案域の開始 index を返す。
 * 見つからなければ blocks.length（＝全ブロックが答案域外）。
 */
export function findAnswerStartBlock(blocks) {
  const idx = blocks.findIndex((b) => ANSWER_SECTION_PATTERN.test(String(b).trim()));
  return idx === -1 ? blocks.length : idx;
}

/**
 * 行配列から答案域の開始行 index（0 始まり）を返す。
 * 見つからなければ lines.length（＝全行が答案域外）。
 */
export function findAnswerStartLine(lines) {
  const idx = lines.findIndex((l) => ANSWER_SECTION_PATTERN.test(String(l).trim()));
  return idx === -1 ? lines.length : idx;
}
