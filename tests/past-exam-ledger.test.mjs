import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_EXAMS, evaluateLedger, locateSources, syncRows, unreadyForApp, yearOfCode } from '../scripts/lib/past-exam-ledger.mjs';

const inventoryExam = {
  years: [
    { year: 2016, files: [
      { kind: 'question', section: '学科試験 問題A', file: 'H28/H28_学科試験_問題A.pdf', acquiredAt: '2026-09-29' },
      { kind: 'question', section: '学科試験 問題B', file: 'H28/H28_学科試験_問題B.pdf', acquiredAt: '2026-09-29' },
      { kind: 'answer', section: '学科試験 正答肢', file: 'H28/H28_学科試験_正答.pdf', acquiredAt: '2026-09-29' },
    ] },
    { year: 2017, files: [] },
  ],
};
const civil1 = 'civil-construction-1';
const rowsFor = (questions, existing = []) => syncRows({ qualification: civil1, questions, inventoryExam, existing }).rows;

test('年度コードを西暦の年度にする', () => {
  assert.equal(yearOfCode('h28'), 2016);
  assert.equal(yearOfCode('r01-retry'), 2019);
  assert.equal(yearOfCode('r07'), 2025);
});

test('問題 ID から記事と原典を引く（問題A は問題A の PDF・原典が無い年度は null）', () => {
  const [row] = rowsFor([{ id: 'h28-a-05', correct: 1 }]);
  assert.equal(row.article, 'civil-construction-1/primary-h28-a');
  assert.equal(row.no, 'A-5');
  assert.deepEqual(row.source, { question: 'H28/H28_学科試験_問題A.pdf', page: null, answer: 'H28/H28_学科試験_正答.pdf' });
  const [none] = rowsFor([{ id: 'h29-b-01', correct: 1 }]);
  assert.deepEqual(none.source, { question: null, page: null, answer: null });
});

test('複数年度をまとめた正答（一括）を範囲内の年度に当てる', () => {
  const inv = { years: [
    { year: 2015, files: [{ kind: 'question', section: '基礎科目', file: 'H27/H27_基礎科目.pdf', acquiredAt: '2026-09-29' }] },
    { year: 2018, files: [{ kind: 'answer', section: '正答（H23〜H30 一括）', file: 'H30/H30_正答_H23-H30.pdf', acquiredAt: '2026-09-29' }] },
  ] };
  const loc = LEDGER_EXAMS['pe-first-stage'].locate('h27-basic-ⅰ-1-1', { articlePath: '/exam/pe-first-stage/primary/h27-basic' });
  assert.equal(loc.article, 'pe-first-stage/h27-basic');
  assert.deepEqual(locateSources(inv, loc), { question: 'H27/H27_基礎科目.pdf', answer: 'H30/H30_正答_H23-H30.pdf' });
});

test('再試験は再試験の PDF・正答に、通常回は通常回に当てる', () => {
  const inv = { years: [{ year: 2019, files: [
    { kind: 'question', section: '基礎科目（再試験）', file: 'R01/R01再_基礎科目.pdf', acquiredAt: 'x' },
    { kind: 'question', section: '基礎科目', file: 'R01/R01_基礎科目.pdf', acquiredAt: 'x' },
    { kind: 'answer', section: '正答（再試験）', file: 'R01/R01再_正答.pdf', acquiredAt: 'x' },
    { kind: 'answer', section: '正答', file: 'R01/R01_正答.pdf', acquiredAt: 'x' },
  ] }] };
  const cfg = LEDGER_EXAMS['pe-first-stage'];
  assert.deepEqual(locateSources(inv, cfg.locate('r01-retry-basic-ⅰ-1-1', {})), { question: 'R01/R01再_基礎科目.pdf', answer: 'R01/R01再_正答.pdf' });
  assert.deepEqual(locateSources(inv, cfg.locate('r01-basic-ⅰ-1-1', {})), { question: 'R01/R01_基礎科目.pdf', answer: 'R01/R01_正答.pdf' });
});

test('同期は照合・正答の記録を残し、原典が変わったときだけページを消す', () => {
  const prev = {
    ...rowsFor([{ id: 'h28-a-05', correct: 1 }])[0],
    answer: { status: 'official', official: [1], checkedAt: '2026-10-10', by: 'agent' },
    transcription: { status: 'verified', checkedAt: '2026-10-10', by: 'agent' },
  };
  prev.source.page = 3;
  const { rows, rewired } = syncRows({ qualification: civil1, questions: [{ id: 'h28-a-05', correct: 1 }], inventoryExam, existing: [prev] });
  assert.equal(rows[0].source.page, 3);
  assert.equal(rows[0].transcription.status, 'verified');
  assert.deepEqual(rewired, []);
  const moved = { ...prev, source: { ...prev.source, question: 'H28/old.pdf' } };
  const r2 = syncRows({ qualification: civil1, questions: [{ id: 'h28-a-05', correct: 1 }], inventoryExam, existing: [moved] });
  assert.equal(r2.rows[0].source.page, null);
  assert.deepEqual(r2.rewired, ['h28-a-05']);
});

test('正答が公式と違う・ID の過不足・原典の無い照合済みを FAIL にし、件数を出す', () => {
  const questions = [{ id: 'h28-a-05', correct: 4 }, { id: 'h28-a-06', correct: 2 }, { id: 'h28-a-07', correct: 3 }];
  const rows = rowsFor(questions);
  rows[0].answer = { status: 'official', official: [1], checkedAt: '2026-10-10', by: 'agent' };
  rows[1].answer = { status: 'official', official: [2], checkedAt: '2026-10-10', by: 'agent' };
  rows[1].transcription = { status: 'verified', checkedAt: '2026-10-10', by: 'agent' };
  rows[2].source.question = null;
  rows[2].transcription = { status: 'fixed', checkedAt: '2026-10-10', by: 'agent' };
  rows.push({ ...rows[1], id: 'h28-a-99' });
  const { fails, stats, mismatches } = evaluateLedger({
    qualification: civil1,
    ledger: { questions: rows },
    questions,
    inventoryExam,
    articleExists: () => true,
  });
  assert.equal(stats.checked, 4);
  assert.equal(stats.answerMismatch, 1);
  assert.deepEqual(mismatches.map((m) => m.id), ['h28-a-05']);
  assert.ok(fails.some((f) => f.startsWith('h28-a-05: 演習データの正答 4 が公式正答 1')));
  assert.ok(fails.some((f) => f.startsWith('h28-a-99: 問題台帳にあるのに演習データに無い')));
  assert.ok(fails.some((f) => f.startsWith('h28-a-07: 原典が無いのに転記を「fixed」')));
});

test('台帳が無い・記事が無い・原典が在庫台帳に無いのは FAIL', () => {
  const questions = [{ id: 'h28-a-05', correct: 1 }];
  assert.ok(evaluateLedger({ qualification: civil1, ledger: null, questions, inventoryExam }).fails[0].includes('問題台帳が無い'));
  const rows = rowsFor(questions);
  rows[0].source.answer = 'H28/無い.pdf';
  const { fails } = evaluateLedger({ qualification: civil1, ledger: { questions: rows }, questions, inventoryExam, articleExists: () => false });
  assert.ok(fails.some((f) => f.includes('記事 civil-construction-1/primary-h28-a が無い')));
  assert.ok(fails.some((f) => f.includes('原典 H28/無い.pdf が在庫台帳に無い')));
});

test('iOS の書き出しは照合済み（verified・fixed）だけを通し、公式正答との不一致を別に数える', () => {
  const questions = [{ id: 'a', correct: 1 }, { id: 'b', correct: 2 }, { id: 'c', correct: 3 }];
  const ledger = { questions: [
    { id: 'a', transcription: { status: 'verified' }, answer: { status: 'official', official: [1] } },
    { id: 'b', transcription: { status: 'fixed' }, answer: { status: 'official', official: [3] } },
    { id: 'c', transcription: { status: 'no-source' }, answer: { status: 'unchecked', official: null } },
  ] };
  assert.deepEqual(unreadyForApp(ledger, questions), { unverified: ['c'], mismatch: ['b'] });
  assert.deepEqual(unreadyForApp(null, questions).unverified, ['a', 'b', 'c']);
});
