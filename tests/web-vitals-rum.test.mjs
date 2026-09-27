/**
 * web-vitals-rum.test.mjs — 実ユーザー計測の集計と判定（良好率 75%・不良 25% 超・件数不足）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageTemplate, judge, summarize, actionable, MIN_SAMPLES } from '../scripts/lib/web-vitals-rum.mjs';

test('パスをページの型にまとめる', () => {
  assert.equal(pageTemplate('/'), '/');
  assert.equal(pageTemplate('/search?q=a'), '/search');
  assert.equal(pageTemplate('/exam/civil-construction-1/guide/strategy/'), '/exam/civil-construction-1/guide');
  assert.equal(pageTemplate('/exam/rccm'), '/exam/rccm');
  assert.equal(pageTemplate('/standards/doboku/chapter-1'), '/standards/doboku');
});

test('良好 75% 以上は良好、不良 25% 超は不良、その間は要改善', () => {
  assert.equal(judge({ good: 75, 'needs-improvement': 20, poor: 5 }).status, 'good');
  assert.equal(judge({ good: 50, 'needs-improvement': 24, poor: 26 }).status, 'poor');
  assert.equal(judge({ good: 60, 'needs-improvement': 30, poor: 10 }).status, 'needs-improvement');
});

test('件数が足りない組は良好とも不良とも言わない', () => {
  const r = judge({ good: 0, poor: MIN_SAMPLES - 1 });
  assert.equal(r.status, 'insufficient');
  assert.equal(r.goodShare, null);
});

test('型×端末×指標で合算し、未知の指標・評価は対象外として数える', () => {
  const s = summarize([
    { path: '/exam/a/guide/x', device: 'mobile', metric: 'LCP', rating: 'poor', count: 20 },
    { path: '/exam/a/guide/y', device: 'mobile', metric: 'LCP', rating: 'good', count: 15 },
    { path: '/', device: 'mobile', metric: 'FCP', rating: 'good', count: 9 },
    { path: '/', device: 'mobile', metric: 'LCP', rating: '(not set)', count: 4 },
  ]);
  assert.equal(s.events, 35);
  assert.equal(s.dropped, 13);
  assert.equal(s.rows.length, 1);
  assert.deepEqual(s.rows[0].counts, { good: 15, 'needs-improvement': 0, poor: 20 });
  assert.equal(s.rows[0].status, 'poor');
  assert.equal(actionable(s.rows).length, 1);
});
