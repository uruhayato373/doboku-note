// tests/qualification-registry.test.mjs
//
// 資格一覧（qualification-registry.json）と exam-calendar / exam-stats / product-lineup の整合検査。
// 実データが整合していることと、食い違いを検出できることの両方を固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { validateQualificationRegistry, activeIds } from '../scripts/lib/qualification-registry.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

test('実データ: registry・exam-calendar・exam-stats・product-lineup が整合している', () => {
  const errors = validateQualificationRegistry({
    registry: read('.claude/config/qualification-registry.json'),
    calendar: read('.claude/config/exam-calendar.json'),
    examStats: read('.claude/config/exam-stats.json'),
    lineupConfig: read('.claude/config/product-lineup.json'),
    refExists: (p) => existsSync(new URL(`../${p}`, import.meta.url)),
  });
  assert.deepEqual(errors, []);
});

const base = () => ({
  registry: {
    portfolioStatuses: { active: '', candidate: '', declined: '' },
    families: { f: '' },
    qualifications: [
      { id: 'a', family: 'f', portfolio: 'active' },
      { id: 'c', family: 'f', portfolio: 'candidate' },
    ],
  },
  calendar: {
    eventKinds: { application: '', exam: '', result: '' },
    exams: { a: { events: { exam: { label: '試験', date: '2026-11-22', kind: 'exam' } } }, c: { note: '未確認' } },
  },
  examStats: { exams: { a: { latest: { examinees: 10, passRate: 5 } }, c: { latest: null, note: '未確認' } } },
  lineupConfig: { qualifications: [{ id: 'a' }] },
});

test('整合したデータは違反 0', () => {
  assert.deepEqual(validateQualificationRegistry(base()), []);
  assert.deepEqual(activeIds(base().registry), ['a']);
});

test('id の食い違い・未定義の状態・declined の理由欠落を検出する', () => {
  const d = base();
  d.registry.qualifications.push({ id: 'x', family: 'nope', portfolio: 'declined' });
  d.calendar.exams.orphan = { note: 'x' };
  delete d.examStats.exams.c;
  const errors = validateQualificationRegistry(d);
  for (const needle of [
    'family nope は未定義',
    'declined は decision.ref',
    'exam-calendar に registry の x が無い',
    'exam-stats に registry の c が無い',
    'exam-calendar の orphan が registry に無い',
  ]) {
    assert.ok(errors.some((e) => e.includes(needle)), needle);
  }
});

test('日程・統計の形と、ラインナップの行と active の一致を検出する', () => {
  const d = base();
  d.calendar.exams.a.events.exam.date = '11/22';
  d.calendar.exams.a.events.result = { label: '合格発表', date: '2027-01-01' };
  d.calendar.exams.c = {};
  d.examStats.exams.c = { latest: null };
  d.examStats.exams.a.latest.examinees = '10人';
  d.lineupConfig.qualifications.push({ id: 'c' });
  const errors = validateQualificationRegistry(d);
  for (const needle of [
    'events.exam は label と YYYY-MM-DD',
    'events.result の kind',
    'exam-calendar.c: 日程が無いなら note',
    'exam-stats.c: latest が null なら note',
    'latest.examinees は数値か null',
    'product-lineup の c は registry で active ではない',
  ]) {
    assert.ok(errors.some((e) => e.includes(needle)), needle);
  }
});
