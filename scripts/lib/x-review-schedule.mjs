// 元の月次計画を保持し、台帳に記録した日程変更だけを確認画面へ反映する。
export function resolveReviewPlans(plans, statuses) {
  return plans.map(post => {
    const original = `${post.date}T${post.time}`;
    const matches = statuses.filter(t => post.draft
      ? t.draft === post.draft && t.tweet === post.tweet
      : (t.original_scheduled_at ?? t.scheduled_at)?.slice(0, 16) === original);
    if (matches.length > 1) throw new Error(`${original}: 計画に対応する台帳が複数あります`);
    const t = matches[0];
    if (!t) return post;
    if ((t.original_scheduled_at ?? t.scheduled_at)?.slice(0, 16) !== original) {
      throw new Error(`${t.draft}:${t.tweet}: 日程変更前の日時と月次計画が不一致`);
    }
    if (!Number.isFinite(Date.parse(t.scheduled_at))) throw new Error(`${t.draft}:${t.tweet}: 変更後の日時が不正`);
    return { ...post, draft: t.draft, tweet: t.tweet,
      date: t.scheduled_at.slice(0, 10), time: t.scheduled_at.slice(11, 16) };
  });
}

// 期間内の実行計画と表示対象を1件ずつ照合する。
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
