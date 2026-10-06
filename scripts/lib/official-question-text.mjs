// 過去問ページで「公式問題の逐語」が続く範囲を求める（表記統一・文体検査の対象から外すため）。
// 使う側: scripts/lint-ja.mjs（prh・表記）と .claude/scripts/lint-mdx-mobile.mjs（15-1〜15-3 の文体）。
// 判定はここだけに置く（2026-10-06: 2 か所に別々の判定があり、対象ページと範囲の終わり方が食い違っていた）。
//
// 問題見出しから解説の始まり（<details> か「### 解答・解説・学習」の見出し）までが公式問題の逐語。
//   技術士一次 ## Ⅰ-1-1 ／ 建設部門 ## Ⅰ-1・Ⅱ-1-1 ／ 土木施工管理の第1次検定 ## 問題 No.N ／ 第2次検定 ## 問題 N
// 解説の「N. ＜選択肢の原文＞ 理由」の行頭も同じ原文の引用。原文の表記（「受け入れ」「2か所」「土止め支保工」
// 全角の「Ｈ形鋼」等）は表記統一の対象にしない＝その範囲（行 → 末尾の桁）に出た指摘だけ除く。

const PE_CONSTRUCTION_SUBJECTS =
  'required|geotechnical|steel-concrete|urban-planning|river-coast|port-airport|power-civil|road|railway|tunnel|construction-planning|environment';

export const OFFICIAL_QUESTION_PAGE = new RegExp(
  String.raw`[\\/](?:` +
    String.raw`pe-first-stage[\\/][hr]\d{2}(?:-retry)?-(?:basic|aptitude|construction|water-supply)` +
    String.raw`|pe-construction[\\/]r\d{2}-(?:${PE_CONSTRUCTION_SUBJECTS})` +
    String.raw`|civil-construction-[12][\\/](?:primary-[a-z0-9-]+|secondary-[rh]\d{2})` +
    String.raw`)[\\/]article\.mdx$`,
);

const QUESTION_HEADING = /^##\s+(?:[ⅠⅡⅢⅣIVX]+[-－]\d|問題\s*(?:No\.\s*)?\d)/;
const COMMENTARY_START = /^<details\b|^#{2,4}\s+(?:解答|解説|学習)/;

/**
 * @param {string} text MDX 本文
 * @returns {Map<number, number>} 行番号（1 始まり）→ 原文が続く最後の桁（1 始まり・行全体なら Infinity）
 */
export function officialTextRanges(text) {
  const ranges = new Map();
  let inQuestion = false;
  let options = new Map();
  text.split(/\r?\n/).forEach((line, index) => {
    if (/^##\s/.test(line)) {
      inQuestion = QUESTION_HEADING.test(line);
      options = new Map();
    }
    if (COMMENTARY_START.test(line)) inQuestion = false;
    const option = /^([1-5])\.\s+(.+)$/.exec(line);
    if (inQuestion) {
      ranges.set(index + 1, Infinity);
      if (option) options.set(option[1], option[2].trim());
    } else if (option && options.get(option[1]) && option[2].startsWith(options.get(option[1]))) {
      ranges.set(index + 1, line.indexOf(option[2]) + options.get(option[1]).length);
    }
  });
  return ranges;
}

/** 公式問題の逐語の行（行全体）を空行に置き換えた行配列を返す。文体検査（15-x）用。 */
export function blankOfficialQuestionLines(lines, filePath) {
  if (!OFFICIAL_QUESTION_PAGE.test(filePath)) return lines;
  const ranges = officialTextRanges(lines.join('\n'));
  return lines.map((line, i) => (ranges.get(i + 1) === Infinity ? '' : line));
}
