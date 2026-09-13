// 期間内の計画と表示対象を1件ずつ照合する。日ごとの本数は計画が真実源。
export function validateReviewSchedule(data, plans) {
  const errors = [], expected = new Map(), actual = new Set(), byDay = new Map();
  const inPeriod = date => date >= data.from && date <= data.to;
  for (const post of plans.filter(p => inPeriod(p.date))) {
    const id = `${post.draft}:${post.tweet}`;
    if (!post.draft || !Number.isInteger(post.tweet)) errors.push(`${post.date}: 計画に原稿・番号がありません`);
    if (expected.has(id)) errors.push(`${id}: 計画が重複しています`);
    expected.set(id, post);
  }
  for (const row of data.rows) {
    if (actual.has(row.id)) errors.push(`${row.id}: 表示が重複しています`);
    actual.add(row.id);
    const post = expected.get(row.id);
    if (!post) errors.push(`${row.id}: 対象期間の計画にない原稿です`);
    else if (post.date !== row.date || post.time !== row.time) errors.push(`${row.id}: 計画と投稿日時が不一致`);
    const day = byDay.get(row.date) ?? [];
    day.push(row);
    byDay.set(row.date, day);
  }
  for (const id of expected.keys()) if (!actual.has(id)) errors.push(`${id}: 計画した原稿が欠落しています`);
  for (let d = new Date(data.from + 'T00:00:00Z'); d <= new Date(data.to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10), rows = byDay.get(date) ?? [];
    if (!rows.length) errors.push(`${date}: 投稿予定がありません`);
    if (rows.length > 3) errors.push(`${date}: 1日3件の上限を超えています`);
    const minutes = rows.map(r => Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3))).sort((a, b) => a - b);
    for (let i = 1; i < minutes.length; i++) if (minutes[i] - minutes[i - 1] < 60) errors.push(`${date}: 時刻重複または間隔不足`);
    if (rows.filter(r => ['note', 'coconala', 'brain'].includes(r.funnel)).length > 1) errors.push(`${date}: 販売投稿が1日1件を超えています`);
  }
  return errors;
}
