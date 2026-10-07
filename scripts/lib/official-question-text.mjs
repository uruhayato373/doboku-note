// 過去問ページで「公式問題の逐語」が続く範囲を求める（表記統一・文体検査の対象から外すため）。
// 使う側: scripts/lint-ja.mjs（prh・表記）と .claude/scripts/lint-mdx-mobile.mjs（15-1〜15-3 の文体）。
// 判定はここだけに置く（2026-10-06: 2 か所に別々の判定があり、対象ページと範囲の終わり方が食い違っていた）。
//
// 問題見出しから解説の始まり（<details> か「### 解答・解説・学習」の見出し）までが公式問題の逐語。
//   技術士一次 ## Ⅰ-1-1 ／ 建設部門 ## Ⅰ-1・Ⅱ-1-1 ／ 総監 ## Ⅰ-1-1 ／ 土木施工管理の第1次検定 ## 問題 No.N ／ 第2次検定 ## 問題 N ／ 測量士 ## No.N
//   1級土木 二次の分野別過去問（secondary-*-past-problems）は年度の見出し ## 令和2年度〔問題1〕・### 令和2年度 No.1 から
// 解説の「N. ＜選択肢の原文＞ 理由」の行頭も同じ原文の引用。原文の表記（「受け入れ」「2か所」「土止め支保工」
// 全角の「Ｈ形鋼」等）は表記統一の対象にしない＝その範囲（行 → 末尾の桁）に出た指摘だけ除く。

const PE_CONSTRUCTION_SUBJECTS =
  'required|geotechnical|steel-concrete|urban-planning|river-coast|port-airport|power-civil|road|railway|tunnel|construction-planning|environment';

export const OFFICIAL_QUESTION_PAGE = new RegExp(
  String.raw`[\\/](?:` +
    String.raw`pe-first-stage[\\/][hr]\d{2}(?:-retry)?-(?:basic|aptitude|construction|water-supply)` +
    String.raw`|pe-construction[\\/]r\d{2}-(?:${PE_CONSTRUCTION_SUBJECTS})` +
    String.raw`|civil-construction-[12][\\/](?:primary-[a-z0-9-]+|secondary-[rh]\d{2}|secondary-[a-z-]+-past-problems)` +
    // 2026-10-06（DN-0549）: 総監の択一（## Ⅰ-1-1）と測量士の択一（## No.N）も同じ逐語の範囲を持つ
    String.raw`|pe-comprehensive-management[\\/][hr]\d{2}-primary` +
    String.raw`|surveyor[\\/]primary-r\d{2}` +
    String.raw`)[\\/]article\.mdx$`,
);

const QUESTION_HEADING = /^##\s+(?:[ⅠⅡⅢⅣIVX]+[-－]\d|問題\s*(?:No\.\s*)?\d|No\.\s*\d)/;
// 分野別過去問の設問見出し（h2 と h3 がある）。2026-10-07（DN-0553）: 設問文の転記が prh に止められ、図の寸法も直せなかった
const PAST_PROBLEM_HEADING = /^#{2,3}\s+(?:令和|平成)(?:\d+|元)年度/;
const COMMENTARY_START = /^<details\b|^#{2,4}\s+(?:解答|解説|学習)/;

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
    if (/^##\s/.test(line) || PAST_PROBLEM_HEADING.test(line)) {
      inQuestion = QUESTION_HEADING.test(line) || PAST_PROBLEM_HEADING.test(line);
      options = new Map();
    }
    if (COMMENTARY_START.test(line)) inQuestion = false;
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

/** 公式問題の逐語が行全体を占める行番号（1 始まり）の集合。対象ページでなければ空。 */
export function officialQuestionLines(lines, filePath) {
  if (!OFFICIAL_QUESTION_PAGE.test(filePath)) return new Set();
  const ranges = officialTextRanges(lines.join('\n'));
  return new Set([...ranges].filter(([, end]) => end === Infinity).map(([line]) => line));
}

/** 公式問題の逐語の行（行全体）を空行に置き換えた行配列を返す。文体検査（15-x）用。 */
export function blankOfficialQuestionLines(lines, filePath) {
  const official = officialQuestionLines(lines, filePath);
  // 見出し行は残す（文体検査が節の区切りに使う）
  return official.size === 0 ? lines : lines.map((line, i) => (official.has(i + 1) && !/^#{1,6}\s/.test(line) ? '' : line));
}
