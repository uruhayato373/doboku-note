import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findYearSiblings } from '../src/lib/exam-year-nav.mjs';

const slugs = ['c2-secondary-r05', 'c2-secondary-r07', 'c2-secondary-r06', 'c2-primary-r06-kouki', 'c2-primary-r07-kouki', 'c2-primary-r07-zenki', 'p-h30-basic', 'p-r01-basic', 'c2-guide-exam-overview'];

test('同じ試験の前後の年度を返す', () => {
  assert.deepEqual(findYearSiblings('c2-secondary-r06', slugs), { older: 'c2-secondary-r05', newer: 'c2-secondary-r07' });
});

test('端の年度は片方だけ返す', () => {
  assert.deepEqual(findYearSiblings('c2-secondary-r07', slugs), { older: 'c2-secondary-r06', newer: null });
});

test('平成の次は令和で、前期と後期を混ぜない', () => {
  assert.deepEqual(findYearSiblings('p-h30-basic', slugs), { older: null, newer: 'p-r01-basic' });
  assert.deepEqual(findYearSiblings('c2-primary-r07-kouki', slugs), { older: 'c2-primary-r06-kouki', newer: null });
});

test('年度の無いページは対象にしない', () => {
  assert.deepEqual(findYearSiblings('c2-guide-exam-overview', slugs), { older: null, newer: null });
});
