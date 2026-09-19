/**
 * check-weekly-review-due（週次レビューのローカル実行の催促）の判定を固定する。
 * 2026-09-19 にクラウドルーティンを退役させたため、「忘れ」を機械で拾う唯一の早期経路。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { dueWeek, isoWeek } from '../scripts/check-weekly-review-due.mjs';

// JST の日時 → UTC ms
const jst = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h - 9, mi);

test('isoWeek: 2026-09-19（土）は 2026-W38、2026-09-21（月）は W39、年またぎ 2026-12-31 は W53', () => {
  assert.equal(isoWeek(new Date(Date.UTC(2026, 8, 19))), '2026-W38');
  assert.equal(isoWeek(new Date(Date.UTC(2026, 8, 21))), '2026-W39');
  assert.equal(isoWeek(new Date(Date.UTC(2026, 11, 31))), '2026-W53');
});

test('土曜 09:00 JST より前は催促しない', () => {
  assert.equal(dueWeek(jst(2026, 9, 19, 8, 59), () => false), null);
});

test('土曜 09:00 JST 以降〜日曜は今週分が無ければ DUE、あれば null', () => {
  assert.equal(dueWeek(jst(2026, 9, 19, 9, 0), () => false), '2026-W38');
  assert.equal(dueWeek(jst(2026, 9, 20, 23, 0), () => false), '2026-W38');
  assert.equal(dueWeek(jst(2026, 9, 19, 9, 0), (w) => w === '2026-W38'), null);
});

test('月〜金は先週分を見る（今週分はまだ問わない）', () => {
  assert.equal(dueWeek(jst(2026, 9, 22, 10, 0), () => false), '2026-W38');
  assert.equal(dueWeek(jst(2026, 9, 22, 10, 0), (w) => w === '2026-W38'), null);
});

test('JST 境界: 土曜 00:00 JST（金曜 15:00 UTC）は土曜として扱うが 09:00 前なので null', () => {
  assert.equal(dueWeek(Date.UTC(2026, 8, 18, 15, 0), () => false), null);
});
