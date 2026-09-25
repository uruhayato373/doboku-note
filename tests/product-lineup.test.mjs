// tests/product-lineup.test.mjs
//
// 商品ラインナップ（資格 × 試験区分 × チャネル）の分類ロジックの単体テスト。
// 要点は「ルールに当たらない商品を黙って落とさず unclassified に残す」ことと、
// 実 config が自己整合している（未定義マス・不正な正規表現が無い）こと。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadLineupConfig,
  validateLineupConfig,
  classifyProduct,
  buildLineup,
  cellKeys,
  stageSchedule,
  stageStats,
} from '../scripts/lib/product-lineup.mjs';
import { readFileSync } from 'node:fs';

const CONFIG = {
  qualifications: [
    { id: 'civil-1', label: '1級', stages: [{ id: 'first', label: '一次' }, { id: 'second', label: '二次' }] },
    { id: 'pe', label: '技術士', stages: [{ id: 'written', label: '筆記' }] },
  ],
  channels: [{ id: 'note', label: 'note' }, { id: 'app', label: 'アプリ' }],
  rules: {
    note: [
      { match: '^civil-1-takuitsu', cells: ['civil-1:first'] },
      { match: '^civil-1-', cells: ['civil-1:second'] },
      { match: '^both-', cells: ['civil-1:second', 'pe:written'] },
    ],
  },
  apps: [{ id: 'ios-x', cells: ['pe:written'] }],
};

test('実 config は自己整合している（exam-calendar・exam-stats の参照を含む）', () => {
  const config = loadLineupConfig();
  const calendar = JSON.parse(readFileSync(new URL('../.claude/config/exam-calendar.json', import.meta.url), 'utf8'));
  const examStats = JSON.parse(readFileSync(new URL('../.claude/config/exam-stats.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateLineupConfig(config, calendar, examStats), []);
  assert.ok(cellKeys(config).length > 0);
});

test('最初に一致したルールを採る', () => {
  assert.deepEqual(classifyProduct(CONFIG.rules.note, 'civil-1-takuitsu-pdf'), ['civil-1:first']);
  assert.deepEqual(classifyProduct(CONFIG.rules.note, 'civil-1-anki'), ['civil-1:second']);
  assert.equal(classifyProduct(CONFIG.rules.note, 'unknown-x'), null);
  assert.equal(classifyProduct(undefined, 'civil-1-anki'), null);
});

test('buildLineup: 複数マス・明示 cells・未分類', () => {
  const { rows, unclassified } = buildLineup(CONFIG, [
    { channel: 'note', id: 'civil-1-takuitsu-pdf' },
    { channel: 'note', id: 'both-pack' },
    { channel: 'note', id: 'mystery' },
    { channel: 'app', id: 'ios-x', cells: ['pe:written'] },
    { channel: 'app', id: 'no-rule-app' },
  ]);
  const row = (k) => rows.find((r) => r.key === k);
  assert.deepEqual(row('civil-1:first').byChannel.note.map((i) => i.id), ['civil-1-takuitsu-pdf']);
  assert.deepEqual(row('civil-1:second').byChannel.note.map((i) => i.id), ['both-pack']);
  assert.deepEqual(row('pe:written').byChannel.note.map((i) => i.id), ['both-pack']);
  assert.deepEqual(row('pe:written').byChannel.app.map((i) => i.id), ['ios-x']);
  assert.deepEqual(unclassified.map((i) => i.id), ['mystery', 'no-rule-app']);
  assert.equal(row('civil-1:first').isFirstStage, true);
  assert.equal(row('civil-1:second').stageCount, 2);
});

test('validateLineupConfig: 未定義マス・不正な正規表現・未知チャネルを検出する', () => {
  const bad = {
    ...CONFIG,
    rules: { note: [{ match: '(', cells: ['civil-1:third'] }], x: [] },
    apps: [{ id: 'a', cells: [] }],
  };
  const errors = validateLineupConfig(bad);
  assert.ok(errors.some((e) => e.includes('正規表現が不正')));
  assert.ok(errors.some((e) => e.includes('未定義のマス civil-1:third')));
  assert.ok(errors.some((e) => e.includes('rules.x')));
  assert.ok(errors.some((e) => e.includes('apps.a: cells が空')));
});

test('stageSchedule: exam-calendar の日付と残り日数・未発表の期間', () => {
  const calendar = {
    exams: {
      c1: {
        events: { second: { label: '第二次検定', date: '2026-10-04' } },
        periods: { oral: { label: '口頭試験', window: '12月〜翌1月' } },
      },
    },
  };
  const q = { calendarId: 'c1' };
  assert.deepEqual(stageSchedule(calendar, q, { events: ['second'] }, '2026-09-26'), {
    events: [{ label: '第二次検定', date: '2026-10-04', daysLeft: 8 }],
    periods: [],
  });
  assert.equal(stageSchedule(calendar, q, { events: ['second'] }, '2026-10-05').events[0].daysLeft, -1);
  assert.deepEqual(stageSchedule(calendar, q, { periods: ['oral'] }, '2026-09-26'), {
    events: [],
    periods: [{ label: '口頭試験', window: '12月〜翌1月' }],
  });
  const errors = validateLineupConfig(
    { qualifications: [{ id: 'x', calendarId: 'c1', stages: [{ id: 'a', events: ['nope'] }, { id: 'b' }, { id: 'c', periods: ['gone'] }] }], channels: [], rules: {} },
    calendar,
  );
  assert.ok(errors.some((e) => e.includes('events に nope が無い')));
  assert.ok(errors.some((e) => e.includes('x:b: events も periods も無い')));
  assert.ok(errors.some((e) => e.includes('periods に gone が無い')));
});

test('stageStats: latest 本体・stages 参照・未確認（latest null）', () => {
  const examStats = {
    exams: {
      c1: { latest: { year: 'R7', stages: { first: { label: '第一次', examinees: 100, passRate: 40 } } } },
      pe: { latest: { year: 'R7', stage: 'written', examinees: 50, passRate: 10 } },
      x: { latest: null, note: '公式未確認' },
    },
  };
  assert.deepEqual(stageStats(examStats, { calendarId: 'c1' }, { label: '一次', stats: ['first'] }), [
    { label: '第一次', year: 'R7', examinees: 100, passRate: 40, unverified: false, note: null },
  ]);
  assert.equal(stageStats(examStats, { calendarId: 'pe' }, { label: '筆記', stats: ['latest'] })[0].note, '筆記段階');
  const u = stageStats(examStats, { calendarId: 'x' }, { label: '筆記', stats: ['latest'] })[0];
  assert.equal(u.unverified, true);
  assert.equal(u.examinees, null);
  assert.equal(u.note, '公式未確認');
  assert.deepEqual(stageStats(examStats, { calendarId: 'c1' }, { label: '口頭' }), []);
  const rateOnly = stageStats({ exams: { r: { latest: { year: 'R7', examinees: null, passRate: 34.4 } } } }, { calendarId: 'r' }, { label: '筆記', stats: ['latest'] })[0];
  assert.equal(rateOnly.unverified, false);
  assert.equal(rateOnly.examinees, null);
  assert.equal(rateOnly.passRate, 34.4);
  const errors = validateLineupConfig(
    { qualifications: [{ id: 'c1', calendarId: 'c1', stages: [{ id: 'a', events: ['e'], stats: ['nope'] }] }], channels: [], rules: {} },
    { exams: { c1: { events: { e: { date: '2026-01-01' } } } } },
    examStats,
  );
  assert.ok(errors.some((e) => e.includes('latest.stages に nope が無い')));
});
