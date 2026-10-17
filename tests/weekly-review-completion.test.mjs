import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyReviewCompletion } from '../scripts/lib/weekly-review-completion.mjs';
import { datasetDir, datasetPath } from '../scripts/lib/datasets.mjs';

function fixture() {
  const dir = datasetDir('business.review');
  const snapshot = `${dir}/snapshot-fixture.json`;
  const files = new Map([
    ['docs/reviews/weekly/2026-W42-review.md', '# 週次レビュー 2026-W42\n\n## 点検と Issue\n'],
    ['.claude/todo/backlog.md', '## 🔴 緊急\n\n### [DN-0001] test fixture\nタグ: [インフラ・計測] [検証:test]\n'],
    ['.claude/todo/weekly.md', '# 週間計画 — 2026-W43（10/19〜10/25）'],
    ['.claude/config/review-wiring.json', { cadences: { weekly: { checks: [{ command: 'check-a' }] } } }],
    [`${dir}/review-fixture.json`, { kind: 'review', cadence: 'weekly', period: { startDate: '2026-10-05', endDate: '2026-10-11' }, createdAt: '2026-10-17T00:00:00Z', status: 'provisional', snapshot }],
    [snapshot, { kind: 'snapshot' }],
    [`${dir}/checks-weekly-2026-W42-fixture.json`, { runKey: '2026-W42', ranAt: '2026-10-17T00:00:00Z', checks: [{ command: 'check-a', state: 'ok' }], issues: [] }],
    [datasetPath('state.backlog-verify-status'), { updatedAt: '2026-10-17', coverage: { candidateCards: 1, targetedCards: 1, notDueCards: 0, targeted: 1, executed: 1 }, commands: { test: { status: 'green', outcome: 'pass' } } }],
  ]);
  const reader = { read: (p) => typeof files.get(p) === 'object' ? JSON.stringify(files.get(p)) : files.get(p) ?? null, list: (d) => [...files.keys()].filter((p) => p.startsWith(`${d}/`)) };
  return { files, reader, dir };
}

test('all five evidence sources are required; provisional data remains explicit', () => {
  const { reader } = fixture();
  assert.deepEqual(weeklyReviewCompletion('2026-W42', reader), { week: '2026-W42', complete: true, checked: 5, expected: 5, missing: [], provisional: true });
});

test('existing report alone and draft-only reports do not prove completion', () => {
  const { files, reader } = fixture();
  for (const p of files.keys()) if (!p.endsWith('-review.md')) files.delete(p);
  assert.equal(weeklyReviewCompletion('2026-W42', reader).complete, false);
  const f = fixture();
  f.files.set('docs/reviews/weekly/2026-W42-review.md', '# 週次レビュー 2026-W42\n<!-- weekly-review:draft 2026-W42 -->');
  assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
});

test('missing, duplicate, broken checks and unsurfaced failure cannot become complete', () => {
  for (const checks of [[], [{ command: 'check-a', state: 'broken' }], [{ command: 'check-a', state: 'fail' }], [{ command: 'check-a', state: 'ok' }, { command: 'check-a', state: 'ok' }]]) {
    const f = fixture();
    f.files.get(`${f.dir}/checks-weekly-2026-W42-fixture.json`).checks = checks;
    assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
  }
});

test('failed check with a disposition is complete; timeout remains inconclusive', () => {
  const f = fixture();
  f.files.get(`${f.dir}/checks-weekly-2026-W42-fixture.json`).checks[0].state = 'fail';
  f.files.set('docs/reviews/weekly/2026-W42-review.md', '# 週次レビュー 2026-W42\n\n## 点検と Issue\n- check-a: 修正する → 振り分け: 定常\n');
  assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, true);
  f.files.get(datasetPath('state.backlog-verify-status')).commands.test = { status: 'error', outcome: 'timeout' };
  assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
});

test('stale plan, business period, or verification does not satisfy this week', () => {
  for (const target of ['plan', 'review', 'verify']) {
    const f = fixture();
    if (target === 'plan') f.files.set('.claude/todo/weekly.md', '# 週間計画 — 2026-W42（10/12〜10/18）');
    if (target === 'review') f.files.get(`${f.dir}/review-fixture.json`).period.startDate = '2026-09-28';
    if (target === 'verify') f.files.get(datasetPath('state.backlog-verify-status')).updatedAt = '2026-10-10';
    assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
  }
});


test('partial backlog verification cannot satisfy the complete weekly contract', () => {
  for (const target of ['coverage', 'newCommand']) {
    const f = fixture();
    if (target === 'coverage') f.files.get(datasetPath('state.backlog-verify-status')).coverage.executed = 0;
    else f.files.set('.claude/todo/backlog.md', `${f.files.get('.claude/todo/backlog.md')}\n### [DN-0002] other gate\nタグ: [インフラ・計測] [検証:check-other]\n`);
    assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
  }
});

test('not-due work is excluded only with an explicit recorded disposition', () => {
  const f = fixture();
  f.files.set('.claude/todo/backlog.md', `${f.files.get('.claude/todo/backlog.md')}\n### [DN-0186] Windows future verification\nタグ: [インフラ・計測] [時期:2026-12] [検証:resources:cloud]\n`);
  assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, false);
  const verification = f.files.get(datasetPath('state.backlog-verify-status'));
  verification.notDue = [{ id: 'DN-0186', command: 'resources:cloud', reason: '開始予定2026-12' }];
  verification.coverage.candidateCards = 2;
  verification.coverage.notDueCards = 1;
  assert.equal(weeklyReviewCompletion('2026-W42', f.reader).complete, true);
});
