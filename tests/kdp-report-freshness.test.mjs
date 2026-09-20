import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessKdpReport } from '../scripts/check-kdp-report-freshness.mjs';

const book = (id = 'A-01') => ({ bookId: id, title: id, royalty: 100 });
const entry = (month, { estimated = false, books = [book()], bookCount = books.length } = {}) => ({
  fetchedAt: `${month}-28T00:00:00.000Z`,
  range: { start: `${month}-01`, end: `${month}-30` },
  estimated,
  total: { bookCount, royalty: 100 },
  books,
});

test('16日以降は前月の確定値を要求する', () => {
  const ok = assessKdpReport({ updatedAt: '2026-09-16', months: { '2026-08': entry('2026-08') } }, new Date('2026-09-20T00:00:00Z'), ['A-01']);
  assert.equal(ok.status, 'OK');
  const missing = assessKdpReport({ updatedAt: '2026-07-30', months: { '2026-07': entry('2026-07', { estimated: true }) } }, new Date('2026-09-20T00:00:00Z'), ['A-01']);
  assert.equal(missing.status, 'FAIL');
  assert.match(missing.reason, /2026-08 の記録が無い/);
});

test('月初は前々月の確定値を要求する', () => {
  const r = assessKdpReport({ months: { '2026-07': entry('2026-07') } }, new Date('2026-09-10T00:00:00Z'), ['A-01']);
  assert.equal(r.status, 'OK');
  assert.deepEqual(r.due, [{ month: '2026-07', kind: 'final' }]);
});

test('28日以降は当月推計も要求する', () => {
  const state = { months: { '2026-08': entry('2026-08') } };
  const r = assessKdpReport(state, new Date('2026-09-28T00:00:00Z'), ['A-01']);
  assert.equal(r.status, 'FAIL');
  assert.match(r.reason, /2026-09 の記録が無い/);
});

test('共有口座の外部書籍は許容し、doboku-note書籍の不足を失敗にする', () => {
  const bad = entry('2026-08', { books: [{ bookId: null, title: 'external', royalty: 10 }, book('A-01')], bookCount: 3 });
  const r = assessKdpReport({ months: { '2026-08': bad } }, new Date('2026-09-20T00:00:00Z'), ['A-01', 'f-01']);
  assert.equal(r.status, 'FAIL');
  assert.match(r.reason, /1\/2 冊/);
  assert.match(r.reason, /f-01/);
});

test('対象0件や壊れたスキーマを成功扱いしない', () => {
  assert.equal(assessKdpReport(null, new Date('2026-09-20T00:00:00Z'), ['A-01']).status, 'FAIL');
  assert.equal(assessKdpReport({ months: {} }, new Date('2026-09-20T00:00:00Z'), ['A-01']).status, 'FAIL');
});
