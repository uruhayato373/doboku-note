import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyReviewCompletion, monthlyReviewDue } from '../scripts/lib/monthly-review-completion.mjs';
import { datasetDir } from '../scripts/lib/datasets.mjs';

function fixture() {
  const dir = datasetDir('business.review');
  const checksDir = datasetDir('business.checks-monthly');
  const entries = {
    '.claude/config/review-wiring.json': { cadences: { monthly: { procedure: [{ sections: ['実験の判定'] }], checks: [{ command: 'check-example' }] } } },
    'docs/reviews/monthly/2026-09-review.md': '# 月次レビュー 2026-09\n\n## 実験の判定\n\n## 点検と Issue\n\n## 来月への申し送り\n\n- 継続観察 → 振り分け: 定常\n',
    [`${dir}/review-example.json`]: { kind: 'review', qualification: 'all', cadence: 'monthly', period: { startDate: '2026-09-01', endDate: '2026-09-30' }, createdAt: '2026-10-17T00:00:00Z', status: 'provisional', snapshot: `${dir}/snapshot-example.json`, nextReviewDate: '2026-11-03' },
    [`${dir}/snapshot-example.json`]: { period: { startDate: '2026-09-01', endDate: '2026-09-30' } },
    [`${checksDir}/checks-monthly-2026-09-example.json`]: { cadence: 'monthly', runKey: '2026-09', ranAt: '2026-10-17T00:00:00Z', checks: [{ command: 'check-example', state: 'ok' }], issues: [], alerts: [] },
  };
  const reader = { read: (p) => entries[p] == null ? null : typeof entries[p] === 'string' ? entries[p] : JSON.stringify(entries[p]), list: (dir) => Object.keys(entries).filter((p) => p.startsWith(`${dir}/`)) };
  return { entries, reader, dir, checksDir };
}
test('provisional monthly data can complete the procedure when all evidence exists', () => {
  const { reader } = fixture();
  assert.deepEqual(monthlyReviewCompletion('2026-09', reader), { month: '2026-09', complete: true, checked: 4, expected: 4, missing: [], provisional: true, nextReviewDate: '2026-11-03' });
});
test('a report alone, wrong-month snapshot, missing checks and unrouted issues cannot complete monthly review', () => {
  for (const change of [
    (f) => { delete f.entries[`${f.dir}/review-example.json`]; },
    (f) => { f.entries[`${f.dir}/snapshot-example.json`].period.endDate = '2026-08-31'; },
    (f) => { f.entries[`${f.checksDir}/checks-monthly-2026-09-example.json`].checks = []; },
    (f) => { f.entries[`${f.checksDir}/checks-monthly-2026-09-example.json`].checks[0].state = 'broken'; },
    (f) => { f.entries[`${f.checksDir}/checks-monthly-2026-09-example.json`].issues = [{ number: 123, title: 'repair' }]; },
  ]) {
    const f = fixture(); change(f);
    assert.equal(monthlyReviewCompletion('2026-09', f.reader).complete, false);
  }
});

test('monthly scheduler runs missing evidence or a due date, not an already completed future check', () => {
  assert.equal(monthlyReviewDue(null, '2026-10-17'), false);
  assert.equal(monthlyReviewDue({ complete: false, nextReviewDate: '2026-11-03' }, '2026-10-17'), true);
  assert.equal(monthlyReviewDue({ complete: true, nextReviewDate: '2026-10-17' }, '2026-10-17'), true);
  assert.equal(monthlyReviewDue({ complete: true, nextReviewDate: '2026-11-03' }, '2026-10-17'), false);
});
