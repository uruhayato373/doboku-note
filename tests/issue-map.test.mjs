import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dnTiming, dueJudgments, issueMapProblems, judgmentDue } from '../scripts/lib/issue-map.mjs';
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
