import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessQueueHealth } from '../scripts/lib/x-queue-health.mjs';

const now = Date.parse('2026-09-14T21:00:00+09:00');
function input() {
  const rows = Array.from({ length: 10 }, (_, i) => ({ text: `本文${i}`, scheduledAt: `2026-09-${15 + i}T07:10:00+09:00` }));
  return { now, account: 'doboku373', snapshot: { account: 'doboku373', complete: true, checkedAt: new Date(now).toISOString(), rows },
    tweets: rows.map((r, i) => ({ ref: `draft/${i}`, text: r.text, scheduled_at: r.scheduledAt, status: 'queued' })) };
}
test('実予約の連続7日を確認。終了予定日だけではPASSにしない', () => {
  const data = input();
  assert.equal(assessQueueHealth(data).status, 'PASS');
  data.snapshot.rows.splice(2, 1);
  const issues = assessQueueHealth(data).issues;
  assert(issues.some(i => i.code === 'empty_day' && i.date === '2026-09-17'));
  assert(issues.some(i => i.code === 'missing_reservation' && i.ref === 'draft/2'));
});
test('台帳がqueuedでも実予約の時刻変更を検出', () => {
  const data = input(); data.snapshot.rows[0].scheduledAt = '2026-09-15T08:00:00+09:00';
  assert(assessQueueHealth(data).issues.some(i => i.code === 'missing_reservation'));
});
test('今日の朝に投稿済みで空でも翌日から判定、7日先の未投入は通知', () => {
  const data = input();
  data.tweets.push({ ref: 'today', text: '公開未確認', status: 'queued', scheduled_at: '2026-09-14T07:00:00+09:00' });
  assert.equal(assessQueueHealth(data).status, 'PASS');
  data.tweets.push({ ref: 'new', text: '未投入原稿', status: 'scheduled', scheduled_at: '2026-09-20T12:00:00+09:00' });
  assert(assessQueueHealth(data).issues.some(i => i.code === 'unsubmitted_plan'));
});
test('最後の1件が遠くても途中の空白を見逃さない。予約終了は7日前に通知', () => {
  const data = input(); data.snapshot.rows = [data.snapshot.rows.at(-1)];
  assert.equal(assessQueueHealth(data).issues.filter(i => i.code === 'empty_day').length, 7);
  data.snapshot.rows = input().snapshot.rows.slice(0, 7);
  assert(assessQueueHealth(data).issues.some(i => i.code === 'queue_ending'));
});
test('ログイン失敗・別アカウント・不完全/古い取得は正常扱いしない', () => {
  for (const update of [{ complete: false }, { account: 'other' }, { checkedAt: '2026-09-01' }, { rows: [{ text: '投稿', scheduledAt: 'invalid' }] }]) {
    const data = input(); Object.assign(data.snapshot, update);
    assert.throws(() => assessQueueHealth(data));
  }
});
test('予約ゼロ・同分重複・日3件超を検出', () => {
  const empty = input(); empty.snapshot.rows = [];
  assert(assessQueueHealth(empty).issues.some(i => i.code === 'queue_ending'));
  const data = input(); data.snapshot.rows.push(...Array.from({ length: 3 }, () => ({ ...data.snapshot.rows[0] })));
  const codes = assessQueueHealth(data).issues.map(i => i.code);
  assert(codes.includes('duplicate_time')); assert(codes.includes('daily_limit'));
});
test('Article公開の猶予1時間後に遅延、公開後の告知未予約を検出', () => {
  const data = input();
  const article = { ref: 'Article-1', status: 'drafted', scheduled_at: '2026-09-14T20:30:00+09:00', teaser_scheduled_at: '2026-09-15T07:10:00+09:00' };
  data.articles = [article];
  assert.equal(assessQueueHealth(data).status, 'PASS');
  article.scheduled_at = '2026-09-14T19:00:00+09:00';
  assert(assessQueueHealth(data).issues.some(i => i.code === 'article_overdue'));
  Object.assign(article, { status: 'published', article_url: 'https://x.com/i/article/1', published_at: article.scheduled_at });
  assert(assessQueueHealth(data).issues.some(i => i.code === 'teaser_missing'));
  article.teaser = data.tweets[0];
  assert.equal(assessQueueHealth(data).status, 'PASS');
});
test('Article告知は予約時刻超過だけで公開扱いにしない', () => {
  const data = input();
  data.articles = [{ ref: 'Article-1', status: 'published', article_url: 'https://x.com/i/article/1', published_at: '2026-09-13T19:00:00+09:00', scheduled_at: '2026-09-13T19:00:00+09:00', teaser_scheduled_at: '2026-09-14T07:00:00+09:00', teaser: { status: 'queued' } }];
  assert(assessQueueHealth(data).issues.some(i => i.code === 'teaser_publication_unconfirmed'));
});
