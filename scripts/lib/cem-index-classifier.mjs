/**
 * 総監キーワードの crawled-not-indexed 候補を、次の手当て別に分類する純関数。
 * 統合・noindex は候補提示だけで、自動適用しない。
 */
export const CEM_INDEX_ACTIONS = [
  "KEEP",
  "IMPROVE",
  "CONSOLIDATE",
  "NOINDEX_REVIEW",
  "MONITOR",
];

export function classifyCemIndexCandidate(signal = {}) {
  const reasons = [];
  const hasDemand =
    (signal.clicksMax90d ?? 0) > 0 ||
    (signal.impressionsMax90d ?? 0) >= 5 ||
    (signal.activeUsersMax90d ?? 0) >= 2 ||
    (signal.sessionsMax90d ?? 0) > 0;

  if (hasDemand) {
    reasons.push("直近約90日のAPIスナップショットに検索需要または利用実績がある");
    return result("KEEP", 0.9, reasons, false);
  }

  if (!signal.notIndexedInLastTwoInspections) {
    reasons.push("直近2回のURL Inspectionで未登録が継続したことを確認できない");
    return result("MONITOR", 0.8, reasons, false);
  }

  if ((signal.daysSinceModified ?? Infinity) < 60) {
    reasons.push("公開または更新から60日未満で、評価待ちの可能性がある");
    return result("MONITOR", 0.75, reasons, false);
  }

  const examValue = (signal.examOccurrences ?? 0) > 0;
  const linkedValue = (signal.internalInbound ?? 0) >= 3;
  const substantial = (signal.contentChars ?? 0) >= 3000;
  if (examValue || linkedValue || substantial) {
    if (examValue) reasons.push(`過去問との紐付けが${signal.examOccurrences}件ある`);
    if (linkedValue) reasons.push(`関連キーワードからの内部流入が${signal.internalInbound}本ある`);
    if (substantial) reasons.push(`本文量が${signal.contentChars}文字あり、単純削除に向かない`);
    return result("IMPROVE", 0.8, reasons, false);
  }

  if (
    signal.proposedTarget &&
    (signal.proposedTargetScore ?? 0) >= 18 &&
    (signal.internalInbound ?? 0) <= 1 &&
    (signal.contentChars ?? 0) < 1800
  ) {
    reasons.push(`関連スコア${signal.proposedTargetScore}の登録済み候補がある`);
    reasons.push("需要・過去問紐付けがなく、内部流入と本文量も小さい");
    return result("CONSOLIDATE", 0.7, reasons, true);
  }

  if (
    !signal.proposedTarget &&
    (signal.internalInbound ?? 0) === 0 &&
    (signal.contentChars ?? 0) < 1200
  ) {
    reasons.push("需要・過去問紐付け・内部流入・明確な統合先がなく、本文量も小さい");
    return result("NOINDEX_REVIEW", 0.6, reasons, true);
  }

  reasons.push("固有ページとして残し、検索意図・導入・内部リンクを改善する余地がある");
  return result("IMPROVE", 0.65, reasons, false);
}

function result(action, confidence, reasons, requiresApproval) {
  return { action, confidence, reasons, requiresApproval };
}
