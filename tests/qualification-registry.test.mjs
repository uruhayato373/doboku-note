// tests/qualification-registry.test.mjs
//
// 資格一覧（qualification-registry.json）と exam-calendar / exam-stats / exam-formats / product-lineup の整合検査。
// 実データが整合していることと、食い違いを検出できることの両方を固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { validateQualificationRegistry, activeIds } from '../scripts/lib/qualification-registry.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

test('実データ: registry・exam-calendar・exam-stats・exam-formats・product-lineup が整合している', () => {
  const errors = validateQualificationRegistry({
    registry: read('.claude/config/qualification-registry.json'),
    calendar: read('.claude/config/exam-calendar.json'),
    examStats: read('.claude/config/exam-stats.json'),
    formats: read('.claude/config/exam-formats.json'),
    lineupConfig: read('.claude/config/product-lineup.json'),
    refExists: (p) => existsSync(new URL(`../${p}`, import.meta.url)),
  });
  assert.deepEqual(errors, []);
});

const V = (checkedBy = 'self') => ({ checkedAt: '2026-09-26', checkedBy, unresolved: [], pending: [], notPublished: [] });

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
    exams: {
      a: { events: { exam: { label: '試験', date: '2026-11-22', kind: 'exam' } }, verification: V() },
      c: { note: '未確認', verification: V('agent') },
    },
  },
  examStats: {
    exams: {
      a: { latest: { examinees: 10, passRate: 5 }, verification: V() },
      c: { latest: null, note: '未確認', verification: V('agent') },
    },
  },
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

test('照合記録: 形の欠け・展開中の資格の未照合（agent）を検出する', () => {
  const d = base();
  d.calendar.exams.a.verification = V('agent');
  d.examStats.exams.a.verification = { checkedAt: '9/26', checkedBy: 'me', unresolved: 'x' };
  delete d.examStats.exams.c.verification;
  const errors = validateQualificationRegistry(d);
  for (const needle of [
    'exam-calendar.a: 展開中の資格は主担当の原文照合',
    'exam-stats.a.verification.checkedAt',
    'exam-stats.a.verification.checkedBy',
    'exam-stats.a.verification.unresolved',
    'exam-stats.c: verification（照合記録）が必要',
  ]) {
    assert.ok(errors.some((e) => e.includes(needle)), needle);
  }
  // 候補（candidate）は agent のままでも可
  assert.ok(!errors.some((e) => e.includes('exam-calendar.c: 展開中')));
});

test('合格率: 倍率の混入と合格者÷受験者との不一致を検出する（2026-09-26 の実例）', () => {
  const d = base();
  d.examStats.exams.a.latest = { stages: { final: { examinees: 241, passers: 231, passRate: 2.5 } } };
  d.examStats.exams.c.latest = { examinees: 100, passers: 40, passRate: 140 };
  d.examStats.exams.c.note = 'x';
  const errors = validateQualificationRegistry(d);
  assert.ok(errors.some((e) => e.includes('stages.final.passRate 2.5 が合格者÷受験者 95.9')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('passRate 140 は 0〜100')));
  const ok = base();
  ok.examStats.exams.a.latest = { examinees: 14030, passers: 7274, passRate: 51.8 };
  assert.deepEqual(validateQualificationRegistry(ok), []);
});

test('部門別表の参照と日程の名前×種類の矛盾を検出する', () => {
  const d = base();
  d.examStats.divisions = { R7: { stage: 'final', divisions: { 建設: { applicants: 10, examinees: 8, passers: 2, passRate: 25 } } } };
  d.examStats.exams.a.divisionRef = 'divisions.建設';
  d.examStats.exams.a.latest = { year: 'R7', stage: 'final', applicants: 10, examinees: 8, passers: 1, passRate: 12.5 };
  d.calendar.exams.a.events.result = { label: '第二次検定 合格発表', date: '2027-01-08', kind: 'exam' };
  d.calendar.exams.a.events.open = { label: '受検申込受付 開始', date: '2026-03-23', kind: 'exam' };
  const errors = validateQualificationRegistry(d);
  assert.ok(errors.some((e) => e.includes('latest.passers 1 が部門別表 2')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('「第二次検定 合格発表」の kind は result')));
  assert.ok(errors.some((e) => e.includes('「受検申込受付 開始」の kind は application')));
});

const formats = () => ({
  formatTypes: { mcq: '', essay: '', experience: '' },
  stageKeys: { first: '', second: '', written: '' },
  pastExamLevels: { public: '', partial: '', none: '', unknown: '' },
  exams: {
    a: { stages: [{ key: 'written', label: '筆記', types: ['mcq', 'essay'] }], pastExams: { questions: 'public', answers: 'none', source: 'https://example.jp/' }, verification: V() },
    c: { stages: [{ key: 'first', label: '一次', types: ['mcq'] }], pastExams: { questions: 'unknown', answers: 'unknown' }, verification: V('agent') },
  },
});

test('出題形式: 整合したデータは違反 0（展開中は商品ラインナップの区分と一致）', () => {
  const d = { ...base(), formats: formats() };
  d.lineupConfig = { qualifications: [{ id: 'a', stages: [{ id: 'written' }] }] };
  assert.deepEqual(validateQualificationRegistry(d), []);
});

test('出題形式: 欠け・語彙外・出典なしの公開・未照合・区分の不一致を検出する', () => {
  const f = formats();
  delete f.exams.c;
  f.exams.a.stages.push({ key: 'oral', label: '', types: ['talk'] });
  f.exams.a.pastExams = { questions: 'public', answers: 'maybe' };
  f.exams.a.verification = V('agent');
  const d = { ...base(), formats: f, lineupConfig: { qualifications: [{ id: 'a', stages: [{ id: 'first' }] }] } };
  const errors = validateQualificationRegistry(d);
  for (const needle of [
    'exam-formats に registry の c が無い',
    'stages[1].key oral は stageKeys に無い',
    'stages[1].label が必要',
    'types の talk は formatTypes に無い',
    'pastExams.answers は',
    'pastExams.source（公開を確かめた公式 URL）が必要',
    'exam-formats.a: 展開中の資格は主担当の原文照合',
    'product-lineup の区分 first と一致しない',
  ]) {
    assert.ok(errors.some((e) => e.includes(needle)), `${needle}\n${errors.join('\n')}`);
  }
});
