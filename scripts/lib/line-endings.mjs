/**
 * 改行コードの健全性検査（単一 SSOT）。
 *
 * 2026-08-28 の事故:
 *   過去問18本の全行が \r\r\n（CR二重）に破損し、micromark が行末トークンを1つ多く
 *   解釈した結果、全行間に空行が挿入された扱いになって GFM テーブルが崩壊した。
 *   当時 pre-commit-mdx.mjs と validate-mdx.mjs の checkLineEndings は
 *   「CRLF と bare LF の混在」しか見ておらず、\r\r\n は \r\n を部分文字列に含むため
 *   検知をすり抜けた（偽緑）。
 *
 * 以降この検査は3箇所（pre-commit-mdx / validate-mdx / note-lint）から使うので、
 * ロジックを1本化してテスト（tests/line-endings.test.mjs）で固定する。
 */

/**
 * @typedef {{ reason: 'mixed' | 'consecutive-cr', message: string }} LineEndingIssue
 */

/**
 * 改行コードの異常を検出する。
 *
 * @param {string} content ファイル全文
 * @returns {LineEndingIssue | null} 正常なら null
 */
export function checkLineEndings(content) {
  // 連続 CR を先に見る。\r\r\n は \r\n を含むため mixed 判定では拾えず、
  // かつ実害（パーサーの行末解釈が壊れる）はこちらの方が大きい。
  if (/\r{2,}/.test(content)) {
    return {
      reason: "consecutive-cr",
      message:
        "Consecutive CR detected (\\r\\r\\n 等) — breaks GFM table/paragraph parsing",
    };
  }

  const hasCRLF = content.includes("\r\n");
  const afterCRLFRemoval = content.split("\r\n").join("");
  if (hasCRLF && afterCRLFRemoval.includes("\n")) {
    return {
      reason: "mixed",
      message: "Mixed line endings (CRLF + LF) — causes MDX parser errors",
    };
  }

  return null;
}
