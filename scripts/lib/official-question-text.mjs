// 過去問ページで「公式問題の逐語」が続く範囲を求める（表記統一・校正の対象から外すため）。
// 問題見出し（技術士一次は ## Ⅰ-1-1 等、土木施工管理の第1次検定は ## 問題 No.N）から <details> までが公式問題の逐語。
// 解説の「N. ＜選択肢の原文＞ 理由」の行頭も同じ原文の引用。原文の表記（「受け入れ」「2か所」「土止め支保工」
// 全角の「Ｈ形鋼」等）は表記統一の対象にしない＝その範囲（行 → 末尾の桁）に出た指摘だけ除く。

export const OFFICIAL_QUESTION_PAGE =
  /[\\/](?:pe-first-stage[\\/][hr]\d{2}(?:-retry)?-(?:basic|aptitude|construction|water-supply)|civil-construction-[12][\\/]primary-[a-z0-9-]+)[\\/]article\.mdx$/;

const QUESTION_HEADING = /^##\s+(?:[ⅠⅡⅢⅣ]-\d|問題\s*No\.\s*\d)/;

/** 解説の選択肢行のうち、設問の選択肢を引用している長さ（引用でなければ 0）。
 * 設問の文末の「。」を落とした引用（「…2か所設ける ✅」）や、末尾だけ言い換えた引用（「…構造とし，上側鉄筋には…」→「…構造とする ✅」）も
 * 原文の引用として扱う。共通の頭が設問の 8 割に満たなければ自前の解説（言い換え）として表記統一の対象に残す（2026-10-06 primary-h28-a）。 */
const QUOTE_MIN_RATIO = 0.8;
function quotedLength(questionOption, explanation) {
  const q = questionOption.replace(/。$/, '');
  let i = 0;
  while (i < q.length && q[i] === explanation[i]) i++;
  return i >= q.length * QUOTE_MIN_RATIO ? i : 0;
}

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
    } else if (/^<details>/.test(line)) {
      inQuestion = false;
    }
    const option = /^([1-5])\.\s+(.+)$/.exec(line);
    if (inQuestion) {
      ranges.set(index + 1, Infinity);
      if (option) options.set(option[1], option[2].trim());
    } else if (option && options.get(option[1])) {
      const quoted = quotedLength(options.get(option[1]), option[2]);
      if (quoted > 0) ranges.set(index + 1, line.indexOf(option[2]) + quoted);
    }
  });
  return ranges;
}
