/**
 * x-queue-surfacer の日付パーサと投入集計を固定する。
 *
 * 守りたい事故（2026-08-17 発覚）: 見出しの日付書式が 3 系統あるのにパーサは 1 系統しか
 * 読めておらず、**同じ根から偽赤と偽陰性の両方**が出ていた。
 *   - 偽赤: 日付が読めない pack は covered_until に寄与せず、キューが 9/30 まで埋まっているのに
 *           「残り -43 日」と永久に赤く出ていた
 *   - 偽陰性: start が null になり due 判定から静かに落ち、未投入 35 件（068 の 28 件を含む）が
 *           3 週間 surface されなかった
 *
 * したがって固定すべきは「3 書式が読めること」だけでなく、
 * **読めなかったときに dates が空で返る（＝呼び出し側が undated として扱える）こと**。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDatesFromRaw, summarizeStatus } from '../scripts/lib/x-queue-lib.mjs';

const NOW = new Date(2026, 7, 17); // 2026-08-17
const md = (...headers) => headers.map((h) => `## Tweet ${h}`).join('\n\n本文\n\n');
const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('書式1（em-dash）: 064-067 系', () => {
  const r = parseDatesFromRaw(md('01: ハウツー・無料 — 7/6 残り14日', '02: 体験 — 7/8 残り12日'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-7-6', '2026-7-8']);
});

test('書式2（全角括弧＋曜日＋時刻）: 068 / 073 系', () => {
  const r = parseDatesFromRaw(md('01: 朝共感・リフレーム（土 7/19 07:15）', '02: 構造分解 [thread]（日 7/20 08:20）'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-7-19', '2026-7-20']);
});

test('書式3（コロン直後）: 083-092 キャンペーン pack 系', () => {
  const r = parseDatesFromRaw(md('01: 9/1 07:15 civil-1 / 共感フック / linkless', '02: 9/10 19:35 civil-2 / 過去問'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-9-1', '2026-9-10']);
});

test('3書式が混在しても全部読む', () => {
  const r = parseDatesFromRaw(md('01: A — 7/6 残り14日', '02: B（土 7/19 07:15）', '03: 9/1 07:15 civil-1'), NOW);
  assert.equal(r.dates.length, 3);
});

test('日付なし見出しは count に入るが dates は空＝undated として扱える（これが偽陰性の防波堤）', () => {
  const r = parseDatesFromRaw(md('01: R8総監 択一 暫定解答速報（当日・即時）'), NOW);
  assert.equal(r.count, 1);
  assert.equal(r.dates.length, 0); // start=null → 呼び出し側が undated に分類する
});

test('見出しが1本も無ければ count 0（走査対象外と判定できる）', () => {
  assert.deepEqual(parseDatesFromRaw('# タイトル\n\n本文だけ', NOW), { count: 1 - 1, dates: [] });
  assert.deepEqual(parseDatesFromRaw('', NOW), { count: 0, dates: [] });
  assert.deepEqual(parseDatesFromRaw(null, NOW), { count: 0, dates: [] });
});

test('年跨ぎ: 半年以上過去の月日は翌年の予定とみなす', () => {
  // 2026-08-17 基準で 1/5 は 7 か月前 → 2027-1-5
  const r = parseDatesFromRaw(md('01: A — 1/5 残り3日'), NOW);
  assert.equal(ymd(r.dates[0]), '2027-1-5');
  // 直近の過去（7/6・42日前）は年を繰り上げない
  assert.equal(ymd(parseDatesFromRaw(md('01: A — 7/6'), NOW).dates[0]), '2026-7-6');
});

test('ありえない月日は捨てる（誤検出で go-live を狂わせない）', () => {
  const r = parseDatesFromRaw(md('01: 比率 — 13/45 の話'), NOW);
  assert.equal(r.count, 1);
  assert.equal(r.dates.length, 0);
});

test('summarizeStatus: queued / posted の数え分けと lastScheduled', () => {
  const r = summarizeStatus({
    tweets: {
      1: { status: 'posted', scheduled_at: '2026-09-01T07:15:00.000+09:00' },
      2: { status: 'scheduled', scheduled_at: '2026-09-10T19:35:00.000+09:00' },
      3: { status: 'draft' },
    },
  });
  assert.equal(r.posted, 1);
  assert.equal(r.queued, 1);
  assert.equal(r.lastScheduled.toISOString(), new Date('2026-09-10T19:35:00.000+09:00').toISOString());
});

test('summarizeStatus: posted も lastScheduled に算入する（充足は予約実体で測る）', () => {
  const r = summarizeStatus({ tweets: { 1: { status: 'posted', scheduled_at: '2026-09-30T12:00:00.000+09:00' } } });
  assert.equal(r.queued, 0);
  assert.equal(r.lastScheduled.toISOString(), new Date('2026-09-30T12:00:00.000+09:00').toISOString());
});

test('summarizeStatus: 壊れた入力でも落ちず 0 を返す', () => {
  assert.deepEqual(summarizeStatus(null), { queued: 0, posted: 0, lastScheduled: null });
  assert.deepEqual(summarizeStatus({}), { queued: 0, posted: 0, lastScheduled: null });
  assert.deepEqual(summarizeStatus({ tweets: { 1: null, 2: 'x' } }), { queued: 0, posted: 0, lastScheduled: null });
});

test('summarizeStatus: 不正な scheduled_at は lastScheduled を汚さない', () => {
  const r = summarizeStatus({
    tweets: { 1: { scheduled_at: 'not-a-date' }, 2: { scheduled_at: '2026-09-05T10:00:00.000+09:00' } },
  });
  assert.equal(ymd(r.lastScheduled), '2026-9-5');
});
