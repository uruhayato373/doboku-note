/**
 * 空コンテナ検出（共有モジュール）
 *
 * `<Callout>…</Callout>` の中身が空（空白・JSX コメント・HTML コメントのみ）の
 * ものを検出する。Callout は読者へのメッセージを内包する目的のコンポーネントで、
 * 中身が無い Callout はタイトルだけの無意味な枠になる。
 *
 * 発生経緯（再発防止の対象事故）:
 *   2026-05-17 の inject-theme-backlinks が一次過去問に
 *   「本問のテーマ別解説」Callout を 135 個挿入（中身は essay-mlit-* への
 *   逆リンク行）。2026-05-18 の essay-mlit-* 撤回に伴う一括リンク削除が
 *   行単位で実行され、Callout の中身だった行が消えたのに枠は残り、空の
 *   Callout が 135 個残留した。空 Callout は MDX 構文的には有効なため
 *   コンパイルチェックでは捕捉できない → 構造検査としてこのルールが必要。
 *
 * CLI（audit.mjs）と pre-commit-mdx.mjs の両方から呼び出される。
 */

/**
 * @typedef {Object} Finding
 * @property {"E1-empty-callout"} pattern
 * @property {number} line 1-origin
 * @property {string} snippet 最大 120 文字
 */

const CALLOUT_RE = /<Callout\b[^>]*>([\s\S]*?)<\/Callout>/g;
const JSX_COMMENT_RE = /\{\/\*[\s\S]*?\*\/\}/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

/**
 * MDX 本文から空 Callout を検出する。
 *
 * @param {string} content MDX 本文（frontmatter 除去後）
 * @returns {Finding[]}
 */
export function detectEmptyContainers(content) {
  const findings = [];
  CALLOUT_RE.lastIndex = 0;
  let m;
  while ((m = CALLOUT_RE.exec(content)) !== null) {
    const inner = m[1]
      .replace(JSX_COMMENT_RE, "")
      .replace(HTML_COMMENT_RE, "")
      .trim();
    if (inner === "") {
      const line = content.slice(0, m.index).split(/\r?\n/).length;
      findings.push({
        pattern: "E1-empty-callout",
        line,
        snippet: m[0].split(/\r?\n/)[0].slice(0, 120),
      });
    }
  }
  return findings;
}

export const PATTERNS = [
  {
    id: "E1-empty-callout",
    description: "<Callout> の中身が空（空白・コメントのみ）— タイトルだけの無意味な枠",
  },
];
