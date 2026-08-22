/**
 * coconala-analytics のパーサ境界を固定するテスト。
 *
 * 守りたい事故は2つ:
 *   1. マスク値 `0000`（セラーサクセス未加入の表示数）を 0 として記録すること
 *      → 「表示ゼロ」という実在しない実績が台帳に残る
 *   2. 対象期間の累計を週次の増分と取り違えること
 *      → period/windowDays を落とすと後段で引き算されうる
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMetricValue,
  parsePeriod,
  parseBlogDate,
  cardsToMetrics,
  weekStart,
} from '../scripts/coconala-analytics.mjs';

test('parseMetricValue: 通常値は数値化する', () => {
  assert.deepEqual(parseMetricValue('270 回', false), { value: 270, masked: false });
  assert.deepEqual(parseMetricValue('10,000 円', false), { value: 10000, masked: false });
  assert.deepEqual(parseMetricValue('2 件', false), { value: 2, masked: false });
});

test('parseMetricValue: 0000 マスクは 0 でなく null', () => {
  assert.deepEqual(parseMetricValue('0000 回', false), { value: null, masked: true });
  // 鍵アイコンがあれば表示文字列に関わらずマスク扱い
  assert.deepEqual(parseMetricValue('123 回', true), { value: null, masked: true });
});

test('parseMetricValue: 本物の 0 は 0 のまま（マスクと混同しない）', () => {
  assert.deepEqual(parseMetricValue('0 回', false), { value: 0, masked: false });
  assert.deepEqual(parseMetricValue('00 回', false), { value: 0, masked: false });
});

test('parseMetricValue: 読み取れない値は null（推測で埋めない）', () => {
  assert.deepEqual(parseMetricValue('', false), { value: null, masked: false });
  assert.deepEqual(parseMetricValue('— 回', false), { value: null, masked: false });
});

test('parsePeriod: 対象期間と窓幅を採る', () => {
  const p = parsePeriod('対象期間：2026/07/18 - 2026/08/16 過去30日間');
  assert.equal(p.from, '2026-07-18');
  assert.equal(p.to, '2026-08-16');
  assert.equal(p.windowDays, 30);
});

test('parsePeriod: 期間が読めなくても label は落とさない', () => {
  const p = parsePeriod('過去30日間');
  assert.equal(p.from, null);
  assert.equal(p.windowDays, 30);
});

test('cardsToMetrics: ラベル写像とマスクの記録', () => {
  const m = cardsToMetrics([
    { label: 'セラーサクセス 表示数', perf: '0000 回', locked: true },
    { label: '閲覧数', perf: '53 回', locked: false },
    { label: '販売数', perf: '1 件', locked: false },
    { label: 'お気に入り数', perf: '1 回', locked: false },
  ]);
  assert.equal(m.impressions, null);
  assert.deepEqual(m.masked, ['impressions']);
  assert.equal(m.views, 53);
  assert.equal(m.orders, 1);
  assert.equal(m.favorites, 1);
  assert.equal(m.matchedCards, 4);
});

test('cardsToMetrics: カード 0 枚は「全部 0」ではなく matchedCards 0（欠測の判定に使う）', () => {
  const m = cardsToMetrics([]);
  assert.equal(m.matchedCards, 0);
  assert.equal(m.views, null);
  assert.equal(m.orders, null);
});

test('weekStart: ISO 週初（月曜）を返す', () => {
  assert.equal(weekStart('2026-08-16'), '2026-08-10'); // 日曜 → 前週月曜
  assert.equal(weekStart('2026-08-17'), '2026-08-17'); // 月曜 → 当日
  assert.equal(weekStart('2026-08-13'), '2026-08-10'); // 木曜
});

test('parseBlogDate: 投稿日時を ISO 化', () => {
  assert.equal(parseBlogDate('投稿日時：2026/08/17'), '2026-08-17');
  assert.equal(parseBlogDate(''), null);
});
