import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jstDayTime } from '../scripts/lib/jst-date.mjs';
import {
  mapExamCalendar,
  mapXCampaign,
  mapXDraftStatus,
  mapIgStatus,
  mapYoutubeSchedule,
  mapBacklogDue,
  reconcileXPlan,
  buildMonthMatrix,
  groupByDay,
  summarize,
} from '../scripts/lib/schedule-events.mjs';

/**
 * schedule-events.mjs の純関数群を inline fixture で固定する。
 * 実データ突合（件数の整合）は npm run schedule-view の目視確認（Step 2 完了条件）で行う。
 */

// --- jstDayTime（jst-date.mjs） -----------------------------------------------

test('jstDayTime: UTC(Z) は前日にずれず JST の翌日へ繰り上がる', () => {
  const r = jstDayTime('2026-06-21T22:50:00.000Z');
  assert.equal(r.date, '2026-06-22');
  assert.equal(r.time, '07:50');
});

test('jstDayTime: +09:00 付きはそのまま JST として読む', () => {
  const r = jstDayTime('2026-08-26T07:15:00+09:00');
  assert.deepEqual(r, { date: '2026-08-26', time: '07:15' });
});

test('jstDayTime: 日粒度(YYYY-MM-DD)はそのまま返し time は null', () => {
  assert.deepEqual(jstDayTime('2026-08-26'), { date: '2026-08-26', time: null });
});

test('jstDayTime: パース不能は null', () => {
  assert.equal(jstDayTime('garbage'), null);
  assert.equal(jstDayTime(''), null);
  assert.equal(jstDayTime(undefined), null);
});

// --- mapExamCalendar -----------------------------------------------------------

test('mapExamCalendar: 過去の試験日でも status は planned のまま（アンカー）', () => {
  const json = {
    exams: {
      'civil-construction-1': {
        label: '1級土木施工管理技術検定',
        events: { first: { label: '第一次検定', date: '2020-01-01' } },
      },
    },
  };
  const { events, skipped } = mapExamCalendar(json, '.claude/config/exam-calendar.json');
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'planned');
  assert.equal(events[0].channel, 'exam');
  assert.equal(skipped, 0);
});

test('mapExamCalendar: 不正な日付形式の event はスキップして skipped に計上する', () => {
  const json = {
    exams: {
      x: { label: 'X', events: { bad: { label: '不明', date: '未定' }, ok: { label: 'OK', date: '2026-01-01' } } },
    },
  };
  const { events, skipped } = mapExamCalendar(json, 'p');
  assert.equal(events.length, 1);
  assert.equal(skipped, 1);
});

// --- mapXCampaign ----------------------------------------------------------------

test('mapXCampaign: posts[] を plan-slot イベントへ写像する', () => {
  const json = { posts: [{ date: '2026-09-01', time: '07:15', slot: 'A', exam: 'civil-1', type: '共感フック', funnel: 'linkless' }] };
  const [ev] = mapXCampaign(json, '.claude/config/x-campaigns/2026-09-civil.json');
  assert.equal(ev.date, '2026-09-01');
  assert.equal(ev.time, '07:15');
  assert.equal(ev.kind, 'plan-slot');
  assert.equal(ev.channel, 'x');
  assert.match(ev.label, /civil-1/);
});

// --- mapXDraftStatus -------------------------------------------------------------

test('mapXDraftStatus: posted_at(Z) を持つ tweet は posted・日付が Z 変換で正しくずれる', () => {
  const json = { tweets: { 1: { title: 'T1', posted_at: '2026-06-21T22:50:00.000Z' } } };
  const { events, dateless } = mapXDraftStatus('060-x', json, 'p', Date.parse('2026-08-26T00:00:00Z'));
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'posted');
  assert.equal(events[0].date, '2026-06-22');
  assert.equal(dateless, 0);
});

test('mapXDraftStatus: scheduled_at が未来なら reserved、過去なら overdue', () => {
  const now = Date.parse('2026-08-26T09:00:00+09:00');
  const future = { tweets: { 1: { title: 'F', scheduled_at: '2026-12-01T07:00:00+09:00' } } };
  const past = { tweets: { 1: { title: 'P', scheduled_at: '2026-01-01T07:00:00+09:00' } } };
  assert.equal(mapXDraftStatus('d', future, 'p', now).events[0].status, 'reserved');
  assert.equal(mapXDraftStatus('d', past, 'p', now).events[0].status, 'overdue');
});

test('mapXDraftStatus: posted_at も scheduled_at も無い tweet は除外し dateless に計上する', () => {
  const json = { tweets: { 1: { title: 'draft only' } } };
  const { events, dateless } = mapXDraftStatus('d', json, 'p', Date.now());
  assert.equal(events.length, 0);
  assert.equal(dateless, 1);
});

// --- mapIgStatus -------------------------------------------------------------------

test('mapIgStatus: reel（単数形）の object 値が拾われる', () => {
  const json = { reel: { scheduled_at: '2026-12-01T17:00:00.000+09:00' } };
  const now = Date.parse('2026-08-26T09:00:00+09:00');
  const { events } = mapIgStatus('cem/pack-01', json, now);
  assert.equal(events.length, 1);
  assert.equal(events[0].ref, 'cem/pack-01#reel');
  assert.equal(events[0].sourcePath, 'content/sns/instagram/cem/pack-01/status.json');
});

test('mapIgStatus: 文字列値（fail-safe 旧形式）は legacy に計上しイベントを作らない', () => {
  const json = { keyword: 'fail-safe', carousel: 'posted', reels: 'not_started', posted: true };
  const { events, legacy, dateless } = mapIgStatus('cem/keyword-packs/fail-safe', json, Date.now());
  assert.equal(events.length, 0);
  assert.equal(legacy, 2); // carousel: 'posted' と reels: 'not_started' の2キー
  assert.equal(dateless, 0);
});

test('mapIgStatus: posted_at/scheduled_at どちらも無い object は dateless', () => {
  const json = { carousel: { channel: 'business-suite', posted_at: null, scheduled_at: null } };
  const { events, dateless } = mapIgStatus('p', json, Date.now());
  assert.equal(events.length, 0);
  assert.equal(dateless, 1);
});

// --- mapYoutubeSchedule --------------------------------------------------------------

test('mapYoutubeSchedule: uploaded+未来はreserved、uploaded+過去はoverdue（postedにしない）、pending+未来はplanned', () => {
  const now = Date.parse('2026-08-26T09:00:00+09:00');
  const items = [
    { key: 'a', title: 'A', status: 'uploaded', publishAt: '2026-12-01T07:30:00+09:00' },
    { key: 'b', title: 'B', status: 'uploaded', publishAt: '2026-01-01T07:30:00+09:00' },
    { key: 'c', title: 'C', status: 'pending', publishAt: '2026-12-01T07:30:00+09:00' },
  ];
  const { events } = mapYoutubeSchedule({ items }, 'p', now);
  const byKey = Object.fromEntries(events.map((e) => [e.ref, e]));
  assert.equal(byKey.a.status, 'reserved');
  assert.equal(byKey.b.status, 'overdue');
  assert.notEqual(byKey.b.status, 'posted');
  assert.equal(byKey.c.status, 'planned');
  assert.match(byKey.b.detail, /DN-0131/);
});

// --- mapBacklogDue -----------------------------------------------------------------

test('mapBacklogDue: due=今日は planned、due=昨日は overdue', () => {
  const cards = [
    { id: 'DN-0001', title: 'today', due: '2026-08-26', line: 1 },
    { id: 'DN-0002', title: 'yesterday', due: '2026-08-25', line: 2 },
    { id: 'DN-0003', title: 'no due', due: null, line: 3 },
  ];
  const events = mapBacklogDue(cards, '2026-08-26');
  assert.equal(events.length, 2);
  const byId = Object.fromEntries(events.map((e) => [e.ref, e]));
  assert.equal(byId['DN-0001'].status, 'planned');
  assert.equal(byId['DN-0002'].status, 'overdue');
});

// --- reconcileXPlan ----------------------------------------------------------------

function planSlot(date, time) {
  return { id: `x-campaign:${date}${time}`, date, time, channel: 'x', kind: 'plan-slot', status: 'planned', label: 'L', detail: null, sourceId: 'x-campaign', sourcePath: 'p', ref: `${date}${time}` };
}
function actualPost(date, time) {
  return { id: `x-status:${date}${time}`, date, time, channel: 'x', kind: 'post', status: 'posted', label: 'A', detail: null, sourceId: 'x-status', sourcePath: 'p', ref: `${date}${time}` };
}

test('reconcileXPlan: 同日に計画3枠+実3件 → 残り0', () => {
  const plans = [planSlot('2026-09-01', '07:15'), planSlot('2026-09-01', '12:10'), planSlot('2026-09-01', '20:00')];
  const actual = [actualPost('2026-09-01', '07:50'), actualPost('2026-09-01', '12:30'), actualPost('2026-09-01', '20:10')];
  const remaining = reconcileXPlan(plans, actual, '2026-08-01');
  assert.equal(remaining.length, 0);
});

test('reconcileXPlan: 計画3枠+実1件（過去日）→ 残り2が overdue', () => {
  const plans = [planSlot('2026-01-01', '07:15'), planSlot('2026-01-01', '12:10'), planSlot('2026-01-01', '20:00')];
  const actual = [actualPost('2026-01-01', '07:50')];
  const remaining = reconcileXPlan(plans, actual, '2026-08-26');
  assert.equal(remaining.length, 2);
  assert.ok(remaining.every((e) => e.status === 'overdue'));
  // 消し込みは時刻昇順なので残るのは 12:10 と 20:00
  assert.deepEqual(remaining.map((e) => e.time).sort(), ['12:10', '20:00']);
});

// --- buildMonthMatrix ----------------------------------------------------------------

test("buildMonthMatrix('2026-09'): 2026-09-01は火曜 → 先頭パディング1個・5行・全日付が存在", () => {
  const rows = buildMonthMatrix('2026-09');
  assert.equal(rows.length, 5);
  assert.equal(rows[0][0], null);
  assert.equal(rows[0][1], '2026-09-01');
  const flat = rows.flat().filter(Boolean);
  assert.equal(flat.length, 30);
  assert.equal(flat[0], '2026-09-01');
  assert.equal(flat[flat.length - 1], '2026-09-30');
});

// --- groupByDay ----------------------------------------------------------------------

test('groupByDay: 同日内は time 昇順、null time は末尾', () => {
  const events = [
    { date: '2026-09-01', time: '20:00' },
    { date: '2026-09-01', time: null },
    { date: '2026-09-01', time: '07:15' },
  ];
  const map = groupByDay(events);
  const times = map.get('2026-09-01').map((e) => e.time);
  assert.deepEqual(times, ['07:15', '20:00', null]);
});

// --- summarize -------------------------------------------------------------------------

test('summarize: channel x status の件数集計', () => {
  const events = [
    { channel: 'x', status: 'posted' },
    { channel: 'x', status: 'posted' },
    { channel: 'x', status: 'overdue' },
    { channel: 'youtube', status: 'overdue' },
  ];
  assert.deepEqual(summarize(events), { x: { posted: 2, overdue: 1 }, youtube: { overdue: 1 } });
});
