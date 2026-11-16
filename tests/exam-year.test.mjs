// 過去問の年度コードの表示と並べ順（src/lib/exam-year.mjs）。資格トップの表がゼロ埋めのまま「令和07年度」と出ていた（2026-11-17）。
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examYearLabel, examYearRank, compareExamYearDesc, examYearIn, parseExamYear } from '../src/lib/exam-year.mjs';

test('表示: ゼロ埋めを外し、令和 1 年は元年', () => {
  assert.equal(examYearLabel('r07'), '令和7年度');
  assert.equal(examYearLabel('r01'), '令和元年度');
  assert.equal(examYearLabel('h30'), '平成30年度');
  assert.equal(examYearLabel('h09'), '平成9年度');
  assert.equal(examYearLabel('retry'), 'retry');
});

test('並べ順: 令和は平成より新しく、年度コードでないものは後ろ', () => {
  assert.deepEqual(['h30', 'r07', 'x', 'r01', 'h29'].sort(compareExamYearDesc), ['r07', 'r01', 'h30', 'h29', 'x']);
  assert.ok(examYearRank('r01') > examYearRank('h31'));
  assert.equal(parseExamYear('r7x'), null);
});

test('slug の中の年度コード', () => {
  assert.equal(examYearIn('civil-construction-1-primary-r07-a'), 'r07');
  assert.equal(examYearIn('pe-first-stage-h30'), 'h30');
  assert.equal(examYearIn('civil-construction-1-textbook-ch03'), null);
});
