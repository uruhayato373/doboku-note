import { test } from 'node:test';
import assert from 'node:assert/strict';

import { monthlyReadiness } from '../scripts/lib/monthly-review-readiness.mjs';

const period = { startDate: '2026-09-01', endDate: '2026-09-30' };
const byKey = (r) => Object.fromEntries(r.steps.map((s) => [s.key, s]));

test('10/1（note 確定前）は note の売上・アクセス・受取額が待ちになり、人がやることを前倒しで求めない', () => {
  const r = byKey(monthlyReadiness({ period, today: '2026-10-01', trafficFetchedAt: '2026-10-01T00:46:00Z' }));
  assert.equal(r['note-sales'].state, 'waiting');
  assert.match(r['note-sales'].detail, /2026-10-02/);
  assert.equal(r['note-traffic'].state, 'waiting');
  assert.match(r['note-traffic'].detail, /確定前/);
  assert.equal(r.google.state, 'waiting');
  assert.match(r.google.detail, /2026-10-04/);
  assert.equal(r['net-receipts'].state, 'waiting');
});

test('確定後は取得コマンドを出し、売上が確定したら受取額は人の入力になる', () => {
  let r = byKey(monthlyReadiness({ period, today: '2026-10-02' }));
  assert.equal(r['note-sales'].state, 'todo');
  assert.equal(r['note-sales'].command, 'node scripts/note-sales-fetch.mjs --month 2026-09 --commit');
  assert.equal(r['note-traffic'].state, 'todo');
  r = byKey(monthlyReadiness({ period, today: '2026-10-02', salesMonths: { '2026-09': { finalized: true } }, trafficFetchedAt: '2026-10-02T01:00:00Z' }));
  assert.equal(r['note-sales'].state, 'done');
  assert.equal(r['note-traffic'].state, 'done');
  assert.equal(r['net-receipts'].state, 'human');
  assert.match(r['net-receipts'].command, /--coconala <円>/);
});

test('Google・KDP・受取額・実験・関門・記録の済と未', () => {
  const cells = [
    { qualification: 'all', metric: 'organicUsers', value: 3000, coverage: 'complete' },
    { qualification: 'all', metric: 'gscClicks', value: 500, coverage: 'complete' },
    { qualification: 'all', metric: 'netReceipts', value: 90000, coverage: 'complete' },
  ];
  const r = monthlyReadiness({
    period, today: '2026-10-10', salesMonths: { '2026-09': { finalized: true } }, cells,
    kdpMonth: { estimated: true }, gate: { lowWithoutWhen: [1, 2], stale: [] },
    experiments: [{ id: 'EXP-009', overdue: true }, { id: 'EXP-010', overdue: false }], due: { record: null },
  });
  const s = byKey(r);
  assert.equal(s.google.state, 'done');
  assert.equal(s.kdp.state, 'todo');
  assert.match(s.kdp.detail, /推計/);
  assert.equal(s['net-receipts'].state, 'done');
  assert.equal(s.experiments.state, 'human');
  assert.match(s.experiments.detail, /EXP-009/);
  assert.doesNotMatch(s.experiments.detail, /EXP-010/);
  assert.equal(s['backlog-gate'].state, 'human');
  assert.match(s['backlog-gate'].detail, /🟢 2 件/);
  assert.equal(s.record.state, 'todo');
  assert.equal(r.summary.total, 8);
  assert.equal(r.summary.done + r.summary.waiting + r.summary.todo + r.summary.human, 8);
});

test('欠測のセルを済と呼ばない（値 null・missing は待ち）', () => {
  const cells = [{ qualification: 'all', metric: 'organicUsers', value: null, coverage: 'missing' }, { qualification: 'all', metric: 'gscClicks', value: 10, coverage: 'complete' }];
  assert.equal(byKey(monthlyReadiness({ period, today: '2026-10-10', cells })).google.state, 'waiting');
  assert.equal(byKey(monthlyReadiness({ period, today: '2026-10-10', gate: null }))['backlog-gate'].state, 'todo');
});
