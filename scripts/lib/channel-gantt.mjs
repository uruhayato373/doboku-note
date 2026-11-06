/**
 * チャネルの年間の枠をバーチャートの段に並べる。月の並びは 4 月始まりなので、年度をまたぐ枠は 2 本のバーに分かれる。
 * 管理画面 /plan/roadmap?tab=channels が読む。
 */

/** 枠の期間を、月の並びの上で途切れないひと続きに分ける。start は 0 始まりの列、span は月数 */
export function slotSegments(window, months) {
  const segments = [];
  months.forEach((month, index) => {
    if (month < window.from || month > window.to) return;
    const last = segments.at(-1);
    if (last && last.start + last.span === index) last.span += 1;
    else segments.push({ start: index, span: 1 });
  });
  return segments;
}

/**
 * 枠を重ならない段へ並べる。同じ枠の分割されたバーは同じ段に置く。
 * @param items [{ window, ... }]
 * @returns 段の配列。段は [{ item, start, span }] で、左から順に並ぶ
 */
export function layoutLanes(items, months) {
  const placed = items
    .map((item) => ({ item, segments: slotSegments(item.window, months) }))
    .filter(({ segments }) => segments.length)
    .sort((a, b) => a.segments[0].start - b.segments[0].start);
  const lanes = [];
  for (const { item, segments } of placed) {
    const free = (lane) => segments.every((s) => lane.used.every((u) => s.start + s.span <= u.start || u.start + u.span <= s.start));
    let lane = lanes.find(free);
    if (!lane) lanes.push((lane = { used: [], bars: [] }));
    lane.used.push(...segments);
    lane.bars.push(...segments.map((s) => ({ item, ...s })));
  }
  return lanes.map((lane) => lane.bars.sort((a, b) => a.start - b.start));
}
