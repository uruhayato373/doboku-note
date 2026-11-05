import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDnIndex, dnTiming, dueJudgments, issueMapProblems, issueMapRouting, judgmentDue } from '../scripts/lib/issue-map.mjs';
import { monthlyReviewCompletion } from '../scripts/lib/monthly-review-completion.mjs';
import { weeklyReviewCompletion } from '../scripts/lib/weekly-review-completion.mjs';
import { buildReport, reviewPeriod } from '../scripts/lib/business-direction.mjs';
import { datasetPath } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const index = new Map([
  ['DN-0001', { id: 'DN-0001', title: '期日あり', when: '2026-11', due: '2026-11-11', status: 'open' }],
  ['DN-0002', { id: 'DN-0002', title: '時期あり', when: '2026-11..2027-01', due: null, status: 'open' }],
  ['DN-0003', { id: 'DN-0003', title: '閉じた', when: null, due: null, status: 'closed' }],
  ['DN-0004', { id: 'DN-0004', title: '時期なし', when: null, due: null, status: 'open' }],
]);

test('判定の時期は期日を時期より優先し、時期の終わりは月末にする', () => {
  assert.deepEqual(dnTiming(index.get('DN-0001')), { label: '2026-11-11', end: '2026-11-11' });
  assert.deepEqual(dnTiming(index.get('DN-0002')), { label: '2026-11..2027-01', end: '2027-01-31' });
  assert.deepEqual(dnTiming(index.get('DN-0004')), { label: '時期なし', end: null });
  assert.deepEqual(dnTiming(null), { label: 'カードなし', end: null });
});

test('カードが閉じた・時期を過ぎた判定だけが更新の番になる', () => {
  assert.equal(judgmentDue({ dns: ['DN-0001'] }, index, '2026-11-11'), null);
  assert.match(judgmentDue({ dns: ['DN-0001'] }, index, '2026-11-12'), /時期を過ぎた.*DN-0001/);
  assert.match(judgmentDue({ dns: ['DN-0002', 'DN-0003'] }, index, '2026-11-05'), /カードが閉じた（DN-0003）/);
  assert.equal(judgmentDue({ dns: ['DN-0004'] }, index, '2099-01-01'), null);
  assert.equal(judgmentDue({ window: '2026-11' }, index, '2026-11-30'), null);
  assert.match(judgmentDue({ window: '2026-11' }, index, '2026-12-01'), /時期を過ぎた/);
});

test('更新の番の一覧はマップとサブイシューを持つ', () => {
  const doc = { maps: [{ id: 'overall', judgments: [{ issues: ['A1'], dns: ['DN-0003'], picture: '絵' }, { issues: ['B1'], dns: ['DN-0002'], picture: '絵' }] }] };
  const rows = dueJudgments(doc, index, '2026-11-05');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].issues, ['A1']);
});

test('実際のイシューマップの参照はすべて実在する（検査対象 0 件を合格にしない）', () => {
  const { problems, checked } = issueMapProblems(ROOT);
  assert.deepEqual(problems, []);
  assert.ok(checked.leaves >= 20 && checked.metrics >= 30 && checked.dns >= 20 && checked.competitors >= 10, JSON.stringify(checked));
});

test('閉じた日より前の時点では更新の番にならない（翌週に閉じたカードで前の週が未完に戻らない）', () => {
  const idx = buildDnIndex('', [{ id: 'DN-0003', task: '閉じた', at: '2026-11-09', outcome: 'done' }]);
  assert.equal(judgmentDue({ dns: ['DN-0003'] }, idx, '2026-11-07'), null);
  assert.match(judgmentDue({ dns: ['DN-0003'] }, idx, '2026-11-09'), /カードが閉じた/);
});

const doc = { maps: [{ id: 'overall', judgments: [{ issues: ['A1', 'A2'], dns: ['DN-0003'], picture: '絵' }] }] };

test('更新の番の判定は、行き先を書けば残せ、行き先の無い放置は止まる', () => {
  const section = (line) => `# 週次レビュー\n\n## イシューマップ\n\n${line}\n\n## 学び\n`;
  assert.equal(issueMapRouting(doc, index, '2026-11-07', '# 週次レビュー\n').hasSection, false);
  assert.equal(issueMapRouting(doc, index, '2026-11-07', section('更新の番 0 件')).unrouted.length, 1);
  assert.equal(issueMapRouting(doc, index, '2026-11-07', section('- overall A1・A2: 未確認')).unrouted.length, 1);
  assert.equal(issueMapRouting(doc, index, '2026-11-07', section('- overall A1・A2: 未確認 → 振り分け: 理由だけ')).unrouted.length, 1);
  assert.equal(issueMapRouting(doc, index, '2026-11-07', section('- overall A1・A2: 実測待ち → 振り分け: DN-0002')).unrouted.length, 0);
  assert.equal(issueMapRouting(doc, index, '2026-11-07', section('- overall A1・A2: 実測待ち → 振り分け: 定常')).unrouted.length, 0);
});

/** 週次の完了契約の、イシューマップの段だけを見る最小の入力 */
function weekly(week, report, since = '2026-W46') {
  const files = new Map([
    [`docs/reviews/weekly/${week}-review.md`, report],
    ['.claude/config/review-wiring.json', JSON.stringify({ cadences: { weekly: { checks: [], procedure: [{ sections: ['イシューマップ'], since }] } } })],
    [datasetPath('config.issue-map'), JSON.stringify(doc)],
    [datasetPath('state.dispatch-log'), JSON.stringify({ entries: [{ id: 'DN-0003', task: 'x', at: '2026-11-01', outcome: 'done' }] })],
    ['.claude/todo/backlog.md', ''],
  ]);
  return weeklyReviewCompletion(week, { read: (p) => files.get(p) ?? null, list: () => [] });
}

test('週次の完了契約: since の週から、節の欠けと行き先の無い判定を未完にする', () => {
  const issues = (r) => r.missing.filter((m) => m.includes('イシューマップ'));
  assert.equal(issues(weekly('2026-W46', '# 週次レビュー 2026-W46\n')).length, 2);
  assert.equal(weekly('2026-W46', '# 週次レビュー 2026-W46\n').expected, 6);
  assert.deepEqual(issues(weekly('2026-W46', '# 週次レビュー 2026-W46\n\n## イシューマップ\n\n- overall A1・A2: 実測待ち → 振り分け: DN-0002\n')), []);
  const before = weekly('2026-W45', '# 週次レビュー 2026-W45\n');
  assert.deepEqual(issues(before), []);
  assert.equal(before.expected, 5);
});

test('月次の完了契約: since の月から節を求め、それより前のレポートを遡って未完にしない', () => {
  const run = (month, report) => {
    const files = new Map([
      ['.claude/config/review-wiring.json', JSON.stringify({ cadences: { monthly: { checks: [], procedure: [{ sections: ['イシューマップ'], since: '2026-11' }] } } })],
      [`docs/reviews/monthly/${month}-review.md`, report],
    ]);
    return monthlyReviewCompletion(month, { read: (p) => files.get(p) ?? null, list: () => [] }).missing.includes('月次レポートの必須節');
  };
  assert.equal(run('2026-10', '# 月次レビュー 2026-10\n'), false);
  assert.equal(run('2026-11', '# 月次レビュー 2026-11\n'), true);
  assert.equal(run('2026-11', '# 月次レビュー 2026-11\n\n## イシューマップ\n'), false);
});

test('ココナラの評価件数は公開プロフィールの台帳から指標へ入る（ストックなので期間外なら観測日の値）', () => {
  const facts = buildReport(ROOT, reviewPeriod('monthly')).sources.filter((f) => f.metric === 'coconalaReviews');
  assert.equal(facts.length, 1);
  assert.ok(Number.isInteger(facts[0].value));
});
