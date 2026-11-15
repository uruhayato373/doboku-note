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

test('回遊候補は前後の年度→同じ年度の別区分→残りの年度を近い順に並べ、自分を含めない', async () => {
  const { findYearRelatives } = await import('../src/lib/exam-year-nav.mjs');
  const list = ['c2-secondary-r04', 'c2-secondary-r05', 'c2-secondary-r06', 'c2-secondary-r07', 'c2-primary-r06-kouki', 'c2-primary-r06-zenki', 'c2-guide-exam-overview'];
  assert.deepEqual(findYearRelatives('c2-secondary-r06', list), ['c2-secondary-r05', 'c2-secondary-r07', 'c2-primary-r06-kouki', 'c2-primary-r06-zenki', 'c2-secondary-r04']);
  assert.deepEqual(findYearRelatives('c2-guide-exam-overview', list), []);
});
