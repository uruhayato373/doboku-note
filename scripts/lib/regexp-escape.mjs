/**
 * regexp-escape.mjs — 文字列を正規表現のリテラルとして使うためのエスケープ（依存ゼロ）。
 *
 * なぜ要るか: scripts/ に同じ escapeRegExp が 16 か所以上書き写されていて、逃がす記号が少しずつ違った
 * （path-literals.mjs は「.」だけ逃がして CodeQL の Incomplete string escaping に指摘された。DN-0588）。
 * 文字列を new RegExp の中へ入れるときは、ここから import する
 * （tests/script-helpers-ratchet.test.mjs が各自の定義を増やさない）。
 *
 * 逃がすのは正規表現の特殊文字すべて（. * + ? ^ $ { } ( ) | [ ] \）。
 * `-` と `/` は文字クラスの外では特殊でなく、`u` フラグ付きでは `\-` が不正になるので逃がさない
 * （文字クラスの中へ入れる用途には使わない）。
 */
export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
