/**
 * check-monthly-review-due（月次レビューのローカル実行の催促）の判定を固定する。
 * 毎月 3 日（JST）以降に前月の月次レビューの記録が無ければ、その前月を返す。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { dueMonth, reviewedMonths } from '../scripts/check-monthly-review-due.mjs';

// JST の日時を UTC ms で作る
const jst = (y, m, d, h = 12) => Date.UTC(y, m - 1, d, h - 9);

test('3 日より前は催促しない', () => {
  assert.equal(dueMonth(jst(2026, 10, 2), () => false), null);
});

test('3 日以降、前月の記録が無ければ前月を返し、あれば催促しない', () => {
  assert.equal(dueMonth(jst(2026, 10, 3), () => false), '2026-09');
  assert.equal(dueMonth(jst(2026, 10, 3), (m) => m === '2026-09'), null);
  // 年をまたぐ
  assert.equal(dueMonth(jst(2027, 1, 10), () => false), '2026-12');
});

test('reviewedMonths: cadence monthly の記録の開始月だけを集める', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mrd-'));
  writeFileSync(join(dir, 'review-a.json'), JSON.stringify({ cadence: 'monthly', period: { startDate: '2026-08-01' } }));
  writeFileSync(join(dir, 'review-b.json'), JSON.stringify({ cadence: 'weekly', period: { startDate: '2026-09-14' } }));
  writeFileSync(join(dir, 'review-c.json'), '{壊れた');
  writeFileSync(join(dir, 'snapshot-x.json'), JSON.stringify({ cadence: 'monthly', period: { startDate: '2026-07-01' } }));
  assert.deepEqual([...reviewedMonths(dir)], ['2026-08']);
});
