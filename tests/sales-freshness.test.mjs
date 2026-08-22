/**
 * sales-log の鮮度判定を固定する。
 *
 * 守りたい事故（2026-08-17 発覚）:
 *   sales-log が 2026-07-14 で止まり、2026-07 は実績 145 件に対し 23 件しか入っていなかった。
 *   sales-summary は「入っている分」を正しく足すので緑のままで、誰も落ちなかった。
 *
 * 特に固定したい2点:
 *   1. **その事故の状態（34 日停止）が FAIL として鳴ること**。閾値を 35 日にすると鳴らない
 *   2. **判定軸が updatedAt であること**。最終売上日で測ると「売れていない月」が
 *      構造的な赤になる（原則9 の偽赤）ため、閑散期は OK でなければならない
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessSalesLog, ageInDays } from '../scripts/check-sales-freshness.mjs';

const at = (y, m, d) => Date.UTC(y, m - 1, d);
const NOW = at(2026, 8, 17);

const log = (updatedAt, dates) => ({ updatedAt, sales: dates.map((date) => ({ date, price: 980 })) });

test('ageInDays: YYYY-MM-DD を日数化し、読めなければ null', () => {
  assert.equal(ageInDays('2026-08-17', NOW), 0);
  assert.equal(ageInDays('2026-07-14', NOW), 34);
  assert.equal(ageInDays('2026/07/14', NOW), null);
  assert.equal(ageInDays('', NOW), null);
  assert.equal(ageInDays(undefined, NOW), null);
});

test('事故当時の状態（2026-07-14 で停止・34日）は FAIL', () => {
  const r = assessSalesLog(log('2026-07-14', ['2026-07-10', '2026-07-14']), NOW);
  assert.equal(r.status, 'FAIL');
  assert.equal(r.updatedAge, 34);
  assert.match(r.reason, /動いていない/);
});

test('閑散期（転記は最近・売上だけ古い）は OK＝偽赤を出さない', () => {
  // 取得を走らせたが新規 0 件だった月。updatedAt は今日、最終売上は 60 日前。
  const r = assessSalesLog(log('2026-08-17', ['2026-06-18']), NOW);
  assert.equal(r.status, 'OK');
  assert.equal(r.latestAge, 60); // 売上が古いこと自体は記録するが赤にはしない
});

test('WARN と OK の境界（10日）', () => {
  assert.equal(assessSalesLog(log('2026-08-07', ['2026-08-07']), NOW).status, 'OK'); // 10日ちょうど
  assert.equal(assessSalesLog(log('2026-08-06', ['2026-08-06']), NOW).status, 'WARN'); // 11日
});

test('WARN と FAIL の境界（21日）', () => {
  assert.equal(assessSalesLog(log('2026-07-27', ['2026-07-27']), NOW).status, 'WARN'); // 21日ちょうど
  assert.equal(assessSalesLog(log('2026-07-26', ['2026-07-26']), NOW).status, 'FAIL'); // 22日
});

test('sales が 0 件は OK ではなく FAIL（検査ゼロを PASS と呼ばない）', () => {
  const r = assessSalesLog({ updatedAt: '2026-08-17', sales: [] }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.equal(r.count, 0);
  assert.match(r.reason, /0 件/);
});

test('スキーマ破損・日付なしは FAIL', () => {
  assert.equal(assessSalesLog({ updatedAt: '2026-08-17' }, NOW).status, 'FAIL'); // sales が無い
  assert.equal(assessSalesLog(null, NOW).status, 'FAIL');
  const noDate = assessSalesLog({ updatedAt: '2026-08-17', sales: [{ price: 980 }] }, NOW);
  assert.equal(noDate.status, 'FAIL');
  assert.match(noDate.reason, /日付を持つエントリ/);
});

test('updatedAt が読めなければ FAIL（欠測を緑にしない）', () => {
  const r = assessSalesLog({ updatedAt: '2026/08/17', sales: [{ date: '2026-08-17', price: 1 }] }, NOW);
  assert.equal(r.status, 'FAIL');
  assert.match(r.reason, /updatedAt/);
});

test('実データ相当（今日転記・280件）は OK', () => {
  const r = assessSalesLog(log('2026-08-17', ['2026-05-11', '2026-08-17']), NOW);
  assert.equal(r.status, 'OK');
  assert.equal(r.count, 2);
  assert.equal(r.latest, '2026-08-17');
});
