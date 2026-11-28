/**
 * coconala-send.mjs — ココナラのトークルームへメッセージを送るときの判定（純関数・依存ゼロ）。
 *
 * なぜ要るか: 2026-11-28、診断の納品文と PDF をトークルームへ送るのに、その場で Playwright を 5 回書き直した。
 * 送信ボタンは役割の名前（getByRole）では見つからず、添付の表示名は 2 つの要素に分かれて「…」で切られ、
 * 案内の吹き出しがボタンに重なる。途中で止まった回が送信済みか分からず、二重送信の恐れもあった。
 * 使う側: scripts/coconala/coconala-send.mjs。
 */

/** 本文の指紋（空白を除いた先頭 30 字）。送信済みかどうかを画面の文字から判定するのに使う。 */
export function messageFingerprint(text) {
  return String(text).replace(/\s+/g, '').slice(0, 30);
}

/** 画面の文字（空白を除く）に指紋が何回現れるか。 */
export function countFingerprint(pageText, fp) {
  if (!fp) return 0;
  const hay = String(pageText).replace(/\s+/g, '');
  let n = 0;
  for (let i = hay.indexOf(fp); i >= 0; i = hay.indexOf(fp, i + fp.length)) n++;
  return n;
}

/**
 * 添付が入力欄の近くに表示されているか。表示名は「小論文診断結果_R7テー」「マⅠ.pdf」のように
 * 葉の要素に分かれ、長いと「…」で切られる。葉の文字をつないだ中に、ファイル名の先頭 8 字と拡張子があれば表示ありとする。
 * @param {string[]} leafTexts 入力欄の箱の中の、子を持たない要素の文字
 */
export function attachmentShown(leafTexts, fileName) {
  const joined = leafTexts.map((t) => String(t).trim()).join('');
  const base = String(fileName).replace(/\.[^.]+$/, '');
  const ext = (String(fileName).match(/\.[^.]+$/) || [''])[0];
  return joined.includes(base.slice(0, 8)) && (!ext || joined.includes(ext));
}
