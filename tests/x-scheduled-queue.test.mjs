import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseQueueDate, isTweetInQueue} from '../scripts/lib/x-scheduled-queue.mjs';
test('Xの日本語予約日時をJSTへ変換する（正午・深夜）',()=>{
 assert.equal(parseQueueDate('2026年10月1日(木)の午前7:12に送信されます'),'2026-10-01T07:12:00+09:00');
 assert.equal(parseQueueDate('2026年10月1日(木)の午後0:41に送信されます'),'2026-10-01T12:41:00+09:00');
 assert.equal(parseQueueDate('2026年10月1日(木)の午前12:10に送信されます'),'2026-10-01T00:10:00+09:00');
 assert.equal(parseQueueDate('ログインしてください'),null);
});
test('同じ本文でも日付・時刻の違う予約を成功と判定しない',()=>{
 const tweet={text:'工事全体の説明と、自分が判断・対応したことを分ける。',scheduled_at:'2026-09-15T07:10:00+09:00'};
 const row={text:'2026年9月15日(火)の午前7:10に送信されます\n'+tweet.text,scheduledAt:tweet.scheduled_at};
 assert.equal(isTweetInQueue(tweet,[row]),true);
 assert.equal(isTweetInQueue({...tweet,scheduled_at:'2026-09-16T07:10:00+09:00'},[row]),false);
 assert.equal(isTweetInQueue({...tweet,text:''},[row]),false);
 assert.equal(isTweetInQueue(tweet,[]),false);
});
