/**
 * 過去問 MDX の破損解説パターン検出（共有モジュール）
 *
 * 2 種類のパターンを検出:
 *   Pattern 1 (P1): 文頭欠落 — `1. 」と規定されている ✅` のように行頭が閉じカギから始まる
 *   Pattern 2 (P2): ExamPoint summary 欠落 — `summary="」..."` のように本文が欠落
 *
 * 注: `**...❌**` パターンは site 全体で「誤り選択肢の太字強調」として意図的に使われているため
 * 誤検知が多すぎる（1661 件中大半が正常）。syntactic には分離不能なため除外し、
 * 意味破損（設問肢と同じ内容なのに誤りと判定）は /improve-article の対話で検出する。
 *
 * CLI（audit.mjs）と pre-commit-mdx.mjs の両方から呼び出される。
 */

/**
 * @typedef {Object} Finding
 * @property {"P1-headless" | "P2-examPoint-empty"} pattern
 * @property {number} line 1-origin
 * @property {string} snippet 最大 120 文字
 */

const PATTERNS = [
  {
    id: "P1-headless",
    // 行頭が「N. 」で、直後が閉じカギ「」」から始まる（文本体欠落）
    regex: /^\s*\d+\.\s+」/,
    description: "解説の文頭が閉じカギから始まる（本文欠落）",
  },
  {
    id: "P2-examPoint-empty",
    // summary="」..." or summary="" （ExamPoint summary が欠落または閉じカギだけで始まる）
    regex: /summary="(?:」|\s*")/,
    description: "ExamPoint の summary が欠落・閉じカギだけで始まる",
  },
];

/**
 * @param {string} content MDX 本文
 * @returns {Finding[]}
 */
export function detectBrokenExplanations(content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PATTERNS) {
      if (p.regex.test(line)) {
        findings.push({
          pattern: p.id,
          line: i + 1,
          snippet: line.slice(0, 120),
        });
      }
    }
  }
  return findings;
}

export { PATTERNS };
