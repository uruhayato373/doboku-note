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

test('CRLF の本文でも出力フォーマットの節とレポートの節を拾う（Windows の作業ツリー）', async () => {
  const { formatSections: f, reportSections: r } = await import('../scripts/lib/review-wiring.mjs');
  const skill = '## 出力フォーマット（md 本文）\r\n\r\n```markdown\r\n## サマリー\r\n- x\r\n\r\n## 計画 vs 実績\r\n```\r\n';
  assert.deepEqual(f(skill), ['サマリー', '計画 vs 実績']);
  assert.deepEqual(r('# t\r\n## サマリー\r\n- 欠測\r\n## 次\r\n').map((s) => [s.title, s.lines, s.gaps]), [['サマリー', 1, 1], ['次', 0, 0]]);
});

test('回のキー: 週次は振り返り期間の翌日の週（レポートの週）・月次は対象月、レポート名からも同じキー', async () => {
  const { runKeyOfPeriod, runKeyOfReport } = await import('../scripts/lib/review-wiring.mjs');
  assert.equal(runKeyOfPeriod('weekly', { startDate: '2026-09-14', endDate: '2026-09-20' }), '2026-W39');
  assert.equal(runKeyOfReport('2026-W39-review.md'), '2026-W39');
  assert.equal(runKeyOfPeriod('monthly', { startDate: '2026-08-01', endDate: '2026-08-31' }), '2026-08');
  assert.equal(runKeyOfReport('2026-08-review.md'), '2026-08');
  assert.equal(runKeyOfReport('2026-W39.md'), null);
});

test('buildProcedureView は runKey の回の記録とレポートで判定し、前の回の「いまの状態」は確かめない', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { buildProcedureView } = await import('../scripts/lib/review-wiring.mjs');
  const root = mkdtempSync(join(tmpdir(), 'review-wiring-'));
  try {
    mkdirSync(join(root, '.claude/config'), { recursive: true });
    mkdirSync(join(root, 'docs/reviews/monthly'), { recursive: true });
    mkdirSync(join(root, 'skill'), { recursive: true });
    writeFileSync(join(root, 'skill/SKILL.md'), '## 出力フォーマット\n\n```markdown\n## 受取額と目標\n```\n');
    writeFileSync(join(root, '.claude/config/review-wiring.json'), JSON.stringify({ cadences: { monthly: {
      label: '月次', skill: 'skill/SKILL.md', report: { dir: 'docs/reviews/monthly', pattern: '^\\d{4}-\\d{2}-review\\.md$' },
      procedure: [{ label: '事業の判断', does: 'x', evidence: 'reviewRecord' }, { label: '保存', does: 'y', evidence: 'reportFile' }],
    } } }));
    writeFileSync(join(root, 'docs/reviews/monthly/2026-09-review.md'), '## 受取額と目標\n本文\n');
    const reviews = [
      { cadence: 'monthly', period: { startDate: '2026-08-01', endDate: '2026-08-31' }, status: 'provisional', createdAt: '2026-09-20' },
      { cadence: 'monthly', period: { startDate: '2026-09-01', endDate: '2026-09-30' }, status: 'complete', createdAt: '2026-10-05' },
    ];
    const aug = buildProcedureView(root, 'monthly', { reviews, runKey: '2026-08' });
    assert.deepEqual(aug.steps.map((s) => s.state), ['partial', 'missing']);
    assert.equal(aug.report, null);
    const sep = buildProcedureView(root, 'monthly', { reviews, runKey: '2026-09' });
    assert.deepEqual(sep.steps.map((s) => s.state), ['ok', 'ok']);
    assert.equal(sep.report.name, '2026-09-review.md');
    // runKey なしは従来どおり最新のレポートと最新の記録
    assert.deepEqual(buildProcedureView(root, 'monthly', { reviews }).steps.map((s) => s.state), ['ok', 'ok']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('点検と Issue: 失敗した点検と開いている Issue の全件に行き先があるかを数える', async () => {
  const { checksRouting } = await import('../scripts/lib/review-wiring.mjs');
  const result = {
    checks: [{ command: 'check-workflow-health', label: 'workflow', state: 'fail' }, { command: 'check-backlog-health', label: 'backlog', state: 'ok' }, { command: 'check-exam-calendar', label: 'exam', state: 'broken' }],
    issues: [{ number: 478, title: 'workflow-health' }, { number: 47, title: 'x' }],
    alerts: [{ number: 80, package: 'tmp', severity: 'high' }, { number: 79, package: 'tmp', severity: 'low' }, { number: 29, package: 'uuid', severity: 'medium' }],
  };
  const report = '## 点検と Issue\n- check-workflow-health: 4 本 → 振り分け: DN-0490\n- #478 同上 → 振り分け: DN-0490\n- #47 古い → 振り分け: 定常（復旧済みで閉じた）\n- check-exam-calendar: 打ち切り\n- dependabot:tmp high・low → 振り分け: DN-0491\n## 来月への申し送り\n- #4780 → 振り分け: DN-0001\n- dependabot:uuid → 振り分け: DN-0001\n';
  const r = checksRouting(result, report);
  assert.equal(r.pending.length, 6);
  assert.deepEqual(r.unrouted.map((u) => u.key), ['check-exam-calendar', 'dependabot:uuid']);
  assert.equal(checksRouting(result, '## 別\n').hasSection, false);
});
