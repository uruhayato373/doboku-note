import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCoverageSection, renderSnsInflowSection, renderYoutubeWeekSection } from '../scripts/lib/weekly-draft-sections.mjs';

// DN-1285: 3 つの節は記録が無いとき「未取得」と書く（0 にしない）。2026-11-21 は下書きに無く毎回未取得で終わった
const text = (lines) => lines.join('\n');

test('SNS 流入: 記録が無ければ未取得、あれば source 別の表と合計', () => {
  assert.match(text(renderSnsInflowSection(null, { windowWeek: '2026-W46', file: 'data/business/weekly/2026-W46.json' })), /未取得（data\/business\/weekly\/2026-W46.json が無い/);
  const doc = { sns: { sources: [{ source: 'x', thisUsers: 6, prevUsers: 10, userDeltaPct: -40, thisSessions: 12 }], total: { thisUsers: 6, prevUsers: 10, userDeltaPct: -40, thisSessions: 12 } } };
  const out = text(renderSnsInflowSection(doc, { windowWeek: '2026-W46', file: 'f.json' }));
  assert.match(out, /\| x \| 6 \| 10 \| -40\.0% \| 12 \|/);
  assert.match(out, /\| 合計 \| 6 \| 10 \| -40\.0% \| 12 \|/);
});

test('YouTube: 公開はその週の publishAt（JST）、予約は times.scheduled で数える', () => {
  const period = { startDate: '2026-11-16', endDate: '2026-11-22' };
  const pubs = [
    { channel: 'youtube', exam: 'a', format: 'longform', status: 'published', publishAt: '2026-11-21T11:30:00Z' },
    // JST では 11/16 の 00:30 → 週の内側
    { channel: 'youtube', exam: 'a', format: 'longform', status: 'published', publishAt: '2026-11-15T15:30:00Z' },
    // JST では 11/23 → 週の外
    { channel: 'youtube', exam: 'b', format: 'longform', status: 'scheduled', publishAt: '2026-11-22T15:30:00Z', times: { scheduled: '2026-11-18T01:00:00Z' } },
    { channel: 'x', exam: 'a', format: 'post', status: 'published', publishAt: '2026-11-18T01:00:00Z' },
  ];
  const out = text(renderYoutubeWeekSection(pubs, period));
  assert.match(out, /公開になった本数: 2（a・longform 2）/);
  assert.match(out, /新しく予約した本数: 1（b・longform 1）/);
  assert.match(out, /先の予約の残り: 1/);
  assert.match(out, /台帳の全件: 3/);
  assert.match(text(renderYoutubeWeekSection([], period)), /未取得/);
});

test('収益カバレッジ: 要約と上位のギャップだけを載せ、残りは件数と節の名前', () => {
  const report = [
    '## 収益カバレッジ ダッシュボード', '', '- 流入のあるページ: **3**', '',
    '### 要対応ギャップ（高流入 × 無導線）', '', '| ページ | users | category | group |', '|---|--:|---|---|',
    '| `p1` | 30 | c | guide |', '| `p2` | 20 | c | guide |', '| `p3` | 16 | c | guide |', '',
    '### 上位 25 ページ × 収益カバレッジ', '', '| x |', '|---|', '| y |',
  ].join('\n');
  const out = text(renderCoverageSection(report, { file: 'coverage-latest.md', trafficEnd: '2026-11-19', windowEnd: '2026-11-15', maxRows: 2 }));
  assert.match(out, /`p2`/);
  assert.doesNotMatch(out, /`p3`/);
  assert.match(out, /\| ほか 1 件 \|/);
  assert.doesNotMatch(out, /\| y \|/);
  assert.match(out, /ほかの節: 上位 25 ページ × 収益カバレッジ/);
  assert.doesNotMatch(out, /\[!warning\]/);
  assert.match(text(renderCoverageSection(report, { file: 'f', trafficEnd: '2026-11-10', windowEnd: '2026-11-15' })), /\[!warning\] 流入の窓の終わり 2026-11-10/);
  assert.match(text(renderCoverageSection(null, { file: 'f', windowEnd: '2026-11-15' })), /未取得/);
});
