import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReviewSchedule } from '../scripts/lib/x-review-schedule.mjs';

const plans = [
  {draft:'one',tweet:1,date:'2026-10-10',time:'07:20'},
  {draft:'one',tweet:2,date:'2026-10-10',time:'12:30'},
  {draft:'one',tweet:3,date:'2026-10-10',time:'20:10'},
  {draft:'two',tweet:1,date:'2026-10-11',time:'20:25'},
];
const fixture = () => ({from:'2026-10-10',to:'2026-10-11',rows:plans.map(p=>({...p,id:`${p.draft}:${p.tweet}`,funnel:'linkless'}))});
test('3件の日と1件の日を含む計画を欠落なく照合する',()=>assert.deepEqual(validateReviewSchedule(fixture(),plans),[]));
test('日数・本数が同じでも原稿の取り違えと日時のズレを止める',()=>{
  const data=fixture();data.rows[0].id='wrong:1';data.rows[1].time='13:30';
  const errors=validateReviewSchedule(data,plans);
  assert.ok(errors.some(e=>e.includes('計画にない')));
  assert.ok(errors.some(e=>e.includes('欠落')));
  assert.ok(errors.some(e=>e.includes('日時が不一致')));
});
test('複数計画を合わせた販売過多と間隔不足を止める',()=>{
  const data=fixture();data.rows[1].time='07:45';data.rows[0].funnel=data.rows[1].funnel='note';
  const errors=validateReviewSchedule(data,plans);
  assert.ok(errors.some(e=>e.includes('間隔不足')));
  assert.ok(errors.some(e=>e.includes('販売投稿')));
});
test('計画の重複と空白日を止める',()=>{
  const data=fixture();data.rows.pop();
  const errors=validateReviewSchedule(data,[...plans,plans[0]]);
  assert.ok(errors.some(e=>e.includes('計画が重複')));
  assert.ok(errors.some(e=>e.includes('投稿予定がありません')));
});
