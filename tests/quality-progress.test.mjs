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

test('GSC はページ単位（gsc.page）だけを読み、より新しい検索語×ページ（gsc.page-query）を拾わない', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { loadQualityProgress } = await import('../scripts/lib/quality-progress.mjs');
  const { writeReport } = await import('../scripts/lib/metric-reports.mjs');
  const root = mkdtempSync(join(tmpdir(), 'qp-'));
  const st = join(root, '.claude/state');
  mkdirSync(st, { recursive: true });
  writeFileSync(join(st, 'quality-scores.json'), JSON.stringify({ pages: { a: { weighted: 2.2 } } }));
  writeFileSync(join(st, 'quality-cycle-state.json'), JSON.stringify({ pages: {} }));
  writeReport(root, 'gsc.page', { rows: [] }, { stamp: '2026-09-01T00-00-00' });
  writeReport(root, 'gsc.page-query', { rows: [] }, { stamp: '2026-09-20T00-00-00' });
  assert.equal(loadQualityProgress(root).gscFile, 'data/gsc/reports/2026-09-01.json#page');
});
