// 過去問の年度コード（r07＝令和7年度・h30＝平成30年度・r01＝令和元年度）の表示と並べ順の唯一の実装。
// 2026-11-17 に、表示 5 か所・並べ順 9 か所に分かれていた実装をまとめた（資格トップの表がゼロ埋めのまま「令和07年度」と出ていた）。
// サイト（TS）とスクリプトの両方から読むので .mjs。tests/exam-year.test.mjs が表示と順を、tests/exam-year-ratchet.test.mjs が再実装を止める。

const YEAR_CODE = /^([rh])(\d{1,2})$/;
const YEAR_IN_TEXT = /(?:^|-)([rh])(\d{2})(?=-|$)/;

/**
 * 年度コードを元号と年に分ける。年度コードでなければ null
 * @param {string} code
 * @returns {{ era: 'r' | 'h', year: number } | null}
 */
export function parseExamYear(code) {
  const m = YEAR_CODE.exec(code);
  if (!m) return null;
  return { era: /** @type {'r' | 'h'} */ (m[1]), year: Number(m[2]) };
}

/**
 * 表示名（'r07' → '令和7年度'・'r01' → '令和元年度'・'h30' → '平成30年度'）。年度コードでなければそのまま返す
 * @param {string} code
 * @returns {string}
 */
export function examYearLabel(code) {
  const y = parseExamYear(code);
  if (!y) return code;
  if (y.era === 'r') return `令和${y.year === 1 ? '元' : y.year}年度`;
  return `平成${y.year}年度`;
}

/**
 * 並べ順の値（大きいほど新しい。令和は平成より後）。年度コードでなければ null
 * @param {string} code
 * @returns {number | null}
 */
export function examYearRank(code) {
  const y = parseExamYear(code);
  return y ? (y.era === 'r' ? 1000 : 0) + y.year : null;
}

/**
 * 新しい年度が先の比較関数（年度コードでないものは後ろ）
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareExamYearDesc(a, b) {
  return (examYearRank(b) ?? -1) - (examYearRank(a) ?? -1);
}

/**
 * slug などの文字列に含まれる年度コード（'civil-construction-1-primary-r07-a' → 'r07'）。無ければ null
 * @param {string} text
 * @returns {string | null}
 */
export function examYearIn(text) {
  const m = YEAR_IN_TEXT.exec(text);
  return m ? `${m[1]}${m[2]}` : null;
}
