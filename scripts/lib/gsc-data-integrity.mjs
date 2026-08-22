/** GSC performanceスナップショットを全件診断に使えるか判定する純関数。 */
export function assessGscPerformanceSnapshot(data, label) {
  const reasons = [];
  if (!data) reasons.push(`${label}: スナップショットがない`);
  else {
    const count = data.meta?.row_count ?? data.rows?.length ?? 0;
    if (count === 0) reasons.push(`${label}: 0行のためperformance診断が成立しない`);
    if (data.meta?.truncated === true) reasons.push(`${label}: truncated=trueのため上位行だけで全体判断できない`);
    if (data.meta?.truncated == null) reasons.push(`${label}: truncatedメタがなく完全性を確認できない`);
  }
  return { healthy: reasons.length === 0, reasons };
}
