import { isTweetInQueue } from './x-scheduled-queue.mjs';

const DAY = 86400000;
const jstDay = time => new Date(time + 9 * 3600000).toISOString().slice(0, 10);

/** 実予約だけで翌日から7日間を検査。公開完了の判定はしない。 */
export function assessQueueHealth({ snapshot, tweets, articles = [], account, now = Date.now() }) {
  if (!snapshot?.complete || snapshot.account !== account || !Array.isArray(snapshot.rows)) {
    throw new Error('完全な対象アカウントの実予約一覧が必要です');
  }
  const age = now - Date.parse(snapshot.checkedAt);
  if (!Number.isFinite(age) || age < -60000 || age > 15 * 60000) throw new Error('実予約一覧の取得日時が不正または15分以上前です');
  if (snapshot.rows.some(row => !Number.isFinite(Date.parse(row.scheduledAt)) || !row.text)) throw new Error('予約行の日時または本文が不正です');
  const rows = snapshot.rows.filter(row => Date.parse(row.scheduledAt) > now);
  const issues = [];
  const horizon = now + 7 * DAY;
  for (const tweet of tweets) {
    if (!['queued', 'scheduled'].includes(tweet.status) || tweet.manual_only) continue;
    const at = Date.parse(tweet.scheduled_at);
    if (!Number.isFinite(at) || !tweet.text) throw new Error(`台帳の日時または本文が不正です: ${tweet.ref}`);
    if (at <= now) continue; // キュー不在を公開完了とも失敗ともみなさない
    if ((tweet.status === 'queued' || at <= horizon) && !isTweetInQueue(tweet, rows)) {
      issues.push({ code: tweet.status === 'queued' ? 'missing_reservation' : 'unsubmitted_plan', ref: tweet.ref, at: tweet.scheduled_at });
    }
  }
  const counts = new Map();
  const times = new Map();
  for (const row of rows) {
    const at = Date.parse(row.scheduledAt);
    counts.set(jstDay(at), (counts.get(jstDay(at)) || 0) + 1);
    const minute = Math.floor(at / 60000);
    times.set(minute, (times.get(minute) || 0) + 1);
  }
  for (let day = 1; day <= 7; day++) {
    const date = jstDay(now + day * DAY);
    if (!counts.has(date)) issues.push({ code: 'empty_day', date });
  }
  for (const [date, count] of counts) if (count > 3) issues.push({ code: 'daily_limit', date, count });
  for (const [minute, count] of times) if (count > 1) issues.push({ code: 'duplicate_time', at: new Date(minute * 60000).toISOString(), count });
  const last = rows.length ? Math.max(...rows.map(row => Date.parse(row.scheduledAt))) : null;
  if (last === null || last <= horizon) issues.push({ code: 'queue_ending', at: last === null ? null : new Date(last).toISOString() });
  for (const article of articles) {
    const at = Date.parse(article.scheduled_at);
    const teaserAt = Date.parse(article.teaser_scheduled_at);
    if (!Number.isFinite(at) || !Number.isFinite(teaserAt)) throw new Error(`Articleの日時が不正です: ${article.ref}`);
    if (at > now - 3600000) continue; // 公開処理の猶予1時間
    if (article.status !== 'published' || !article.article_url || !article.published_at) {
      issues.push({ code: 'article_overdue', ref: article.ref, at: article.scheduled_at });
    } else if (teaserAt > now && (!article.teaser || !isTweetInQueue(article.teaser, rows))) {
      issues.push({ code: 'teaser_missing', ref: article.ref, at: article.teaser_scheduled_at });
    } else if (teaserAt <= now && article.teaser?.status !== 'posted') {
      issues.push({ code: 'teaser_publication_unconfirmed', ref: article.ref, at: article.teaser_scheduled_at });
    }
  }
  return { status: issues.length ? 'ACTION_REQUIRED' : 'PASS', account, checkedAt: snapshot.checkedAt,
    futureReservations: rows.length, lastReservedAt: last === null ? null : new Date(last).toISOString(),
    coverageFrom: jstDay(now + DAY), coverageTo: jstDay(now + 7 * DAY), issues };
}
