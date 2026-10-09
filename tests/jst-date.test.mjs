/**
 * scripts/lib/jst-date.mjs — 日本時間の日付・月・壁時計を出す唯一の実装。
 * 34 ファイルが `+ 9 * 3600 * 1000` を、31 ファイルが Asia/Tokyo の Intl を個別に書いていたものを、この関数へ寄せた。
 * 寄せる前の 2 通りの計算と、全期間で同じ値になることを固定する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as jstDate from '../scripts/lib/jst-date.mjs';
import { jstClock, jstDayOf, jstDayTime, jstMonth, jstYmd, todayJst } from '../scripts/lib/jst-date.mjs';

/** 2026-10-01T15:00:00Z ＝ 日本時間の 2026-10-02 00:00（金曜） */
const MIDNIGHT_JST = Date.UTC(2026, 9, 1, 15, 0, 0);

test('todayJst・jstDayOf: UTC の 15:00 以降は日本時間では翌日（UTC の日付を切ると前日にずれる）', () => {
  assert.equal(jstDayOf(MIDNIGHT_JST - 1), '2026-10-01');
  assert.equal(jstDayOf(MIDNIGHT_JST), '2026-10-02');
  assert.equal(todayJst(MIDNIGHT_JST), '2026-10-02');
  assert.equal(new Date(MIDNIGHT_JST).toISOString().slice(0, 10), '2026-10-01', '生の toISOString().slice(0, 10) は UTC の日付＝この関数が要る理由');
});

test('jstDayOf: epoch ms・Date・ISO 文字列（Z・+09:00・日付だけ）を受け、読めない値は RangeError', () => {
  assert.equal(jstDayOf(new Date(MIDNIGHT_JST)), '2026-10-02');
  assert.equal(jstDayOf('2026-10-01T15:00:00Z'), '2026-10-02');
  assert.equal(jstDayOf('2026-10-01T15:00:00.000Z'), '2026-10-02');
  assert.equal(jstDayOf('2026-10-02T00:00:00+09:00'), '2026-10-02');
  assert.equal(jstDayOf('2026-10-01T23:59:59+09:00'), '2026-10-01');
  assert.equal(jstDayOf('2026-10-02'), '2026-10-02', '日付だけの文字列は UTC の 0 時として読むので同じ日');
  for (const bad of ['garbage', '', NaN, new Date(NaN), null]) assert.throws(() => jstDayOf(bad), RangeError, `${String(bad)} は投げる`);
});

test('jstMonth・jstYmd: 月の境目は日本時間で決まる', () => {
  const lastMomentOfSeptember = Date.UTC(2026, 8, 30, 14, 59, 59);
  assert.equal(jstMonth(lastMomentOfSeptember), '2026-09');
  assert.equal(jstMonth(lastMomentOfSeptember + 1000), '2026-10');
  assert.deepEqual(jstYmd(MIDNIGHT_JST), { year: 2026, month: 10, day: 2 });
  assert.deepEqual(jstYmd('2026-12-31T15:00:00Z'), { year: 2027, month: 1, day: 1 }, '年の境目');
});

test('jstClock: getUTC* が日本時間の壁時計（曜日・時・日）を返す', () => {
  const c = jstClock(MIDNIGHT_JST);
  assert.equal(c.getUTCFullYear(), 2026);
  assert.equal(c.getUTCMonth(), 9);
  assert.equal(c.getUTCDate(), 2);
  assert.equal(c.getUTCDay(), 5, '2026-10-02 は金曜');
  assert.equal(c.getUTCHours(), 0);
  assert.equal(jstClock(MIDNIGHT_JST - 1).getUTCHours(), 23);
  assert.equal(jstClock(MIDNIGHT_JST - 1).getUTCDay(), 4, '1 ミリ秒前は木曜の 23 時');
  assert.throws(() => jstClock('garbage'), RangeError);
});

test('寄せる前の 2 通りの計算（+9 時間・Intl の Asia/Tokyo）と、4 年分を 1 時間刻みで同じ値になる', () => {
  const intl = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' });
  const start = Date.UTC(2024, 0, 1);
  const end = Date.UTC(2028, 0, 1);
  let checked = 0;
  for (let t = start; t < end; t += 3_600_000 + 17_000) {
    const plus9 = new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
    assert.equal(jstDayOf(t), plus9, `+9h: ${new Date(t).toISOString()}`);
    assert.equal(jstDayOf(t), intl.format(new Date(t)), `Intl: ${new Date(t).toISOString()}`);
    assert.equal(jstMonth(t), plus9.slice(0, 7));
    checked++;
  }
  assert.ok(checked > 30000, `検査した時刻 ${checked} 件`);
});

test('nowJstIso は廃止した（記録の日時は UTC の ISO 8601 末尾 Z・日付だけが JST）', () => {
  assert.equal('nowJstIso' in jstDate, false);
});

test('jstDayTime: 従来どおり（日付だけはそのまま・時刻つきは JST の日付と時刻・読めなければ null）', () => {
  assert.deepEqual(jstDayTime('2026-10-02'), { date: '2026-10-02', time: null });
  assert.deepEqual(jstDayTime('2026-10-01T15:30:00Z'), { date: '2026-10-02', time: '00:30' });
  assert.deepEqual(jstDayTime('2026-10-02T08:05:00+09:00'), { date: '2026-10-02', time: '08:05' });
  assert.equal(jstDayTime('garbage'), null);
  assert.equal(jstDayTime(''), null);
});

test('jstLabel: UTC の ISO を JST の「YYYY-MM-DD HH:MM」にし、日付だけ・空・読めない値は壊さない', async () => {
  const { jstLabel } = await import('../scripts/lib/jst-date.mjs');
  assert.equal(jstLabel('2026-10-08T20:30:00Z'), '2026-10-09 05:30');
  assert.equal(jstLabel('2026-10-09T05:30:00+09:00'), '2026-10-09 05:30');
  assert.equal(jstLabel('2026-10-09'), '2026-10-09');
  assert.equal(jstLabel(''), '');
  assert.equal(jstLabel(null), '');
  assert.equal(jstLabel('not-a-date'), 'not-a-date');
});
