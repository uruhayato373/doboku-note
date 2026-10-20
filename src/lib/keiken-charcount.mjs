/**
 * keiken-charcount — 経験記述の答案の字数の数え方の単一真実源（DN-0787）。
 *
 * サイトの字数ツール（src/app/tools/keiken-charcount/KeikenCharcountClient.tsx）と、note 原稿の字数を
 * 検査する scripts/keiken-charcount.mjs が同じ関数を使う。以前は別々に書かれていて、目印【〇〇】の括弧を
 * スクリプトは数えず（DN-0277）サイトは数えていたため、note の模範答案を貼った読者に記事と違う字数が出ていた。
 *
 * 規則: HTML タグ（<sup> 等）・バッククォート・* と空白を除く。目印【〇〇】の括弧は答案に書かないので数えず、
 * 中の 〇（プレースホルダ）は数える。数えるのはコードポイント単位。
 *
 * @param {string} s
 * @returns {number}
 */
export function countAnswerChars(s) {
  // タグは変化が無くなるまで除く（字数を数えるだけで HTML は出さないが、入れ子の <<a>b> を 1 回で残さない）
  let text = String(s);
  for (let prev = ''; prev !== text; ) {
    prev = text;
    text = text.replace(/<[^>]+>/g, '');
  }
  const clean = text
    .replace(/`/g, '')
    .replace(/【([〇○]+)】/g, '$1')
    .replace(/\*/g, '')
    .replace(/\s/g, '');
  return [...clean].length;
}
