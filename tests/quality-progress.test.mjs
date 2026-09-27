/**
 * quality-progress.test.mjs — 総監キーワードの品質サイクル進捗（管理画面 /quality/progress）の組み立てを固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRows, summarize } from '../scripts/lib/quality-progress.mjs';

test('スコアの全ページを weighted 昇順に並べ、状態・リライト回数・GSC を新旧 URL 合算で付ける', () => {
  const rows = buildRows({
    scores: { pages: { a: { weighted: 2.6, weak_axes: [], scored_at: '2026-05-01T00:00:00Z' }, b: { weighted: 2.1, weak_axes: ['mobile'] } } },
    state: { pages: { b: { status: 'rewritten', history: [{ action: 'rewritten', date: '2026-05-02' }] } } },
    summaries: { keywords: { a: { title: 'A' }, b: { title: 'B' } } },
    gsc: { rows: [
      { keys: ['https://doboku-note.com/docs/pe-comprehensive-management-b'], impressions: 10, clicks: 1, position: 12 },
      { keys: ['https://doboku-note.com/exam/pe-comprehensive-management/keywords/b'], impressions: 30, clicks: 2, position: 8 },
    ] },
  });
  assert.deepEqual(rows.map((r) => r.slug), ['b', 'a']);
  assert.equal(rows[0].status, 'rewritten');
  assert.equal(rows[0].rewriteCount, 1);
  assert.equal(rows[1].status, '未着手');
  const s = summarize(rows);
  assert.equal(s.total, 2);
  assert.equal(s.lt25, 1);
  assert.deepEqual(s.byStatus, { rewritten: 1, 未着手: 1 });
});
