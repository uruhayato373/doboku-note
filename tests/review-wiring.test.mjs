/**
 * review-wiring.test.mjs — レビューの配線（スキルのコマンドと正本の一致・レビュー由来カードの数え方）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCommands, diffWiring, validateWiring, cardsFromReview, formatSections, reportSections, isoWeekOf } from '../scripts/lib/review-wiring.mjs';

test('スキル本文から npm run と node scripts のコマンドを重複なく拾う', () => {
  const text = '`npm run business-review -- report` と `node scripts/check-backlog-health.mjs` と `npm run business-review`';
  assert.deepEqual(extractCommands(text), ['business-review', 'node:check-backlog-health']);
});

test('正本に無いコマンドと、スキルが実行しない正本のコマンドを両方挙げる', () => {
  const d = diffWiring([{ command: 'a' }, { command: 'b' }], 'npm run a と npm run c');
  assert.deepEqual(d, { missing: ['c'], extra: ['b'] });
});

test('stage と role の語彙外・重複を止める', () => {
  const errs = validateWiring({ stages: ['検索'], cadences: { weekly: { inputs: [{ command: 'x', stage: '検索', role: '判断' }, { command: 'x', stage: '別', role: '見る' }] } } });
  assert.equal(errs.length, 3);
});

test('起点にそのレビューの期間を書いたカードだけを数える', () => {
  const text = '### [DN-0001] A\n**起点**: 週次レビュー（2026-09-21〜2026-09-27）で見つけた\n### [DN-0002] B\n**起点**: 週次レビュー（2026-09-14〜2026-09-20）\n### [DN-0003] C\n別件';
  assert.deepEqual(cardsFromReview(text, '週次', { startDate: '2026-09-21', endDate: '2026-09-27' }).map((c) => c.id), ['DN-0001']);
});

test('出力フォーマットのフェンス内の H2 だけをレポートの必須節として拾う', () => {
  const skill = '## 手順\n## 出力フォーマット（md 本文）\n```markdown\n## サマリー\n## 学び\n```\n## 参照外';
  assert.deepEqual(formatSections(skill), ['サマリー', '学び']);
});

test('レポートの節ごとに本文行数と欠測の記載を数える', () => {
  const r = reportSections('# 週次\n## サマリー\n売上は欠測。\n\n## 学び\n- a\n- b');
  assert.deepEqual(r, [{ title: 'サマリー', lines: 1, gaps: 1 }, { title: '学び', lines: 2, gaps: 0 }]);
});

test('ISO 週は木曜の属する年で数える', () => {
  assert.equal(isoWeekOf('2026-09-28'), '2026-W40');
  assert.equal(isoWeekOf('2026-01-01'), '2026-W01');
  assert.equal(isoWeekOf('2027-01-01'), '2026-W53');
});

test('手順の evidence は決まった語彙だけ', () => {
  const config = { stages: [], cadences: { weekly: { inputs: [], procedure: [{ label: 'x', evidence: 'magic' }, { label: 'y', evidence: 'sections' }] } } };
  assert.equal(validateWiring(config).length, 2);
});
