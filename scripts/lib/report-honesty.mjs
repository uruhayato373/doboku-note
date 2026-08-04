/**
 * report-honesty.mjs — 「成功だけを数えて緑にする」を防ぐための純関数群。
 *
 * なぜ 1 箇所に集めるか:
 *   2026-08-04 の 1 セッションで、同じ形のバグを **3 本のスクリプトで**踏んだ。
 *     - `gsc-request-indexing`: 受理 10 件だけ出して button-not-found 3 件に触れず exit 0
 *     - `fetch-a8-ui-csv`: 2 レポート中 1 本が落ちても status="ok" / exit 0
 *     - `check-a8-report-due`: 構造的に必ず起きる crossCheck 超過を毎回 [要対応]（＝偽赤）
 *   いずれも「実行系でも、成功数だけを出さない・0 件と失敗を区別する」という
 *   CLAUDE.md §9 の規律に反していた。各スクリプトに埋め込むとテストできず再発するので、
 *   判定だけをここへ出してテストで固定する。
 *
 * 各スクリプトの表示文言は呼び出し側の責務。ここは「何を失敗と呼ぶか」だけを持つ。
 */

/**
 * 実行系の run 全体を ok / partial に判定する。
 *
 * 「例外が出なかった」を ok と呼ばない。1 単位でも成功扱いでなければ partial。
 *
 * @param {Array<{status?: string}>} units 実行単位（レポート・URL・ファイル等）
 * @param {{okStatuses?: string[]}} [opts] 成功とみなす status（既定は downloaded/dry-run-ok/skipped）
 * @returns {{status: 'ok'|'partial', failed: Array<{status?: string}>, total: number, okCount: number}}
 */
export function classifyRun(units, opts = {}) {
  const list = Array.isArray(units) ? units : [];
  const okStatuses = opts.okStatuses ?? ["downloaded", "dry-run-ok", "skipped"];
  const failed = list.filter((u) => !okStatuses.includes(u?.status));
  return {
    status: failed.length === 0 ? "ok" : "partial",
    failed,
    total: list.length,
    okCount: list.length - failed.length,
  };
}

/**
 * 「送ろうとして送れなかった」ものだけを抜き出す。
 *
 * 成功（accepted）・そもそも対象外（already-indexed）・意図的な打ち切り（limit-reached）は
 * 失敗ではない。それ以外は**すべて**失敗として扱う（未知の status を成功側へ倒さない）。
 *
 * @param {Array<{request?: {status?: string}}>} items
 * @param {{benignStatuses?: string[]}} [opts]
 * @returns {Array<{request?: {status?: string}}>}
 */
export function collectFailedRequests(items, opts = {}) {
  const benign = opts.benignStatuses ?? ["accepted", "already-indexed", "limit-reached"];
  return (Array.isArray(items) ? items : []).filter(
    (i) => i?.request && !benign.includes(i.request.status),
  );
}

/**
 * crossCheck の「口座横断がサイト別を上回る」超過を、想定内 / 異常に分ける。
 *
 * A8 には管理画面のサイト切替が無く、program-detail は口座単位のレポートなので
 * stats47 のクリックが**必ず**混じる。つまり超過そのものは常態で、無条件に警告すると
 * 毎回赤が出て本物の異常が埋もれる。大きさ（サイト別クリックに対する比）で分ける。
 *
 * 一方 shortfall（サイト別を allowlist で説明しきれない＝自社案件の写像もれ）は
 * 常に異常として扱う。こちらは取りこぼしで、収益の帰属が失われる。
 *
 * @param {{hasShortfall?: boolean, exceeded?: boolean, deltas?: {clicks?: {site?: number, delta?: number}}}} crossCheck
 * @param {{limit?: number}} [opts] limit=許容する超過比（既定 0.5＝サイト別の 50%）
 * @returns {{shortfall: boolean, exceeded: boolean, excessClicks: number, siteClicks: number,
 *            excessRatio: number|null, abnormal: boolean, limit: number}}
 */
export function classifyCrossCheck(crossCheck, opts = {}) {
  const limit = opts.limit ?? 0.5;
  const cc = crossCheck ?? {};
  const shortfall = cc.hasShortfall === true;
  const exceeded = cc.exceeded === true;
  const siteClicks = Number(cc.deltas?.clicks?.site ?? 0);
  const excessClicks = Number(cc.deltas?.clicks?.delta ?? 0);
  const excessRatio = exceeded && siteClicks > 0 ? excessClicks / siteClicks : null;
  const abnormal = exceeded && excessRatio != null && excessRatio > limit;
  return { shortfall, exceeded, excessClicks, siteClicks, excessRatio, abnormal, limit };
}

/**
 * 表示回数とクリックの計測窓が揃っているかを判定する。
 *
 * 表示イベントは途中から実装されたので、スナップショットの期間が実装日をまたぐと
 * 分母（表示）だけが短くなる。その状態で比を取ると CTR を数倍に過大評価する。
 * 揃っていないときに出してよいのは「上限」（クリックが全て計測期間に落ちた最悪ケース）だけ。
 *
 * @param {string|null} snapshotStartDate 'YYYY-MM-DD'
 * @param {string} measurementSince 'YYYY-MM-DD' 表示イベントの本番反映日
 * @returns {{aligned: boolean, reason: string}}
 */
export function isMeasurementWindowAligned(snapshotStartDate, measurementSince) {
  if (!snapshotStartDate) {
    return { aligned: false, reason: "スナップショットの開始日が不明" };
  }
  if (snapshotStartDate < measurementSince) {
    return {
      aligned: false,
      reason: `開始日 ${snapshotStartDate} が計測開始 ${measurementSince} より前＝分母だけが短い`,
    };
  }
  return { aligned: true, reason: "分子と分母が同じ窓" };
}
