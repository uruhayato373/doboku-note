/**
 * check-exam-day-pages.test.mjs — 近づいた試験日・合格発表日の当日ページの点検（対象の日付の選び方と状態の決め方）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeEvents, upcomingEvents } from '../scripts/check-exam-day-pages.mjs';
import { ConfigExamDayPages } from '../scripts/lib/dataset-schemas.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const calendar = {
  exams: {
    a: { events: { exam: { label: '試験', date: '2026-11-22', kind: 'exam' }, apply: { label: '申込', date: '2026-11-20', kind: 'application' }, result: { label: '合格発表', date: '2027-01-15', kind: 'result' } } },
    b: { events: { exam: { label: '試験', date: '2026-11-10', kind: 'exam' }, result: { label: '合格発表', date: '2026-12-02', kind: 'result' } } },
    c: { events: { exam: { label: '試験', date: '2026-11-15', kind: 'exam' } } },
  },
};

test('upcomingEvents: 窓の中の試験日・合格発表日だけを、サイトに資格のページがあるものに限って日付順に返す', () => {
  const got = upcomingEvents(calendar, { today: '2026-11-11', windowDays: 21, covered: (q) => q !== 'c' });
  assert.deepEqual(got.map((e) => `${e.qualification}/${e.event}`), ['a/exam', 'b/result']);
  assert.equal(got[0].daysLeft, 11);
  assert.equal(got[1].daysLeft, 21, '窓の最終日は含める');
});

test('judgeEvents: page・card・skip と記事の状態から、準備済み・未作成・未判断を決める', () => {
  const events = ['a/exam', 'a/result', 'b/exam', 'b/result', 'c/exam'].map((k) => ({ qualification: k.split('/')[0], event: k.split('/')[1] }));
  const entries = [
    { qualification: 'a', event: 'exam', page: 'a/guide-r08-answers' },
    { qualification: 'a', event: 'result', page: 'a/guide-gone', card: 'DN-0001' },
    { qualification: 'b', event: 'exam', card: 'DN-0002' },
    { qualification: 'b', event: 'result', skip: '一次の後期は二次の既存ページで受ける' },
  ];
  const state = (p) => (p === 'a/guide-r08-answers' ? 'published' : 'absent');
  assert.deepEqual(judgeEvents(events, entries, state).map((r) => r.status), ['ready', 'missing', 'planned', 'skipped', 'undecided']);
});

test('設定: 型を通り、page・card・skip の書き方の誤りを止める', () => {
  const config = readDataset(REPO_ROOT, 'config.exam-day-pages');
  assert.equal(ConfigExamDayPages.safeParse(config).success, true);
  const bad = (entry) => ConfigExamDayPages.safeParse({ ...config, entries: [entry] }).success;
  assert.equal(bad({ qualification: 'a', event: 'exam' }), false, 'どれも無い');
  assert.equal(bad({ qualification: 'a', event: 'exam', page: 'a/x', skip: '理由' }), false, 'skip と page の同時');
  assert.equal(bad({ qualification: 'a', event: 'exam', card: 'DN-12' }), false, 'カード番号の形');
  assert.equal(ConfigExamDayPages.safeParse({ ...config, entries: [config.entries[0], config.entries[0]] }).success, false, '同じ資格×日付の重複');
});
