/**
 * inconclusive-gate.mjs — 「取得に失敗した割合が大きすぎて、検査が成立していない」の判定（依存ゼロ）。
 *
 * CLAUDE.md §9「検査ゼロを PASS と呼ばない」の実装側。外部（note・X・YouTube・GitHub など）を 1 件ずつ取って照合する検査は、
 * 取得に失敗した分は「問題なし」とも「問題あり」とも言えない。失敗が支配的なら「全部緑」ではなく検査不成立（exit 1）で止める。
 * 以前は `MAX_FETCH_FAIL_RATE = 0.2` を各スクリプトが同名同値で定義し（7 本）、0.2 を直書きするもの（8 本）も混在していた。
 *
 * 値は実装の都合（外部 API の一時的な失敗をどこまで許すか）なので config/ には出さない。
 * check-workflow-health.mjs だけは 0.3 を別に持つ（gh で workflow の run を取る母集団は note の記事 URL と別で、値は導入時のまま。
 * 揃えると判定が変わるので寄せていない）。
 */

/** 取得失敗の割合の上限。これを「超えたら」検査不成立（ちょうど上限は成立） */
export const MAX_FETCH_FAIL_RATE = 0.2;

/**
 * 取得失敗が支配的か（failed / total が上限を超えているか）。total が 0 のときは false を返す
 * （「対象 0 件」は取得失敗ではなく、呼び出し側が「検査ゼロ」として別に扱う）。
 * @param {number} failed 取得に失敗した件数
 * @param {number} total 取得を試みた件数
 * @param {number} [max] 上限（既定は MAX_FETCH_FAIL_RATE）
 */
export function fetchFailDominant(failed, total, max = MAX_FETCH_FAIL_RATE) {
  return total > 0 && failed / total > max;
}
