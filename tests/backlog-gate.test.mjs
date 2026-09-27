/**
 * backlog-gate.test.mjs — 週次・月次のバックログの関門（判断待ち・期日切れ・時期なし・長期滞留）の抽出を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGate } from '../scripts/lib/backlog-gate.mjs';

const md = `# backlog
## 🔴 高 — 重要度が高い
### [DN-0001] 期日切れ
タグ: [インフラ・計測] [時期:2026-09] [期日:2026-09-20] [起票:2026-09-01]
## 🟡 中 — 重要度が中くらい
### [DN-0002] 今月
タグ: [インフラ・計測] [時期:2026-09..2026-10] [起票:2026-09-25]
## 🟢 低 — 重要度が低い（時期未定を含む）
### [DN-0003] 時期なしで古い
タグ: [インフラ・計測] [起票:2026-05-01]
### [DN-0004] 時期あり
タグ: [インフラ・計測] [時期:2026-12] [起票:2026-09-01]
## 🟣 判断待ち — ユーザーの意思決定が必要
### [DN-0005] 新しい判断
タグ: [収益化] [起票:2026-09-26]
### [DN-0006] 古い判断
タグ: [収益化] [起票:2026-08-01]
### [DN-0007] 12 月に判断
タグ: [収益化] [時期:2026-12] [起票:2026-09-01]
`;

test('週次は判断待ちを全件（古い順）・期日切れ・直近 7 日の起票を出す', () => {
  const g = buildGate(md, '2026-09-27');
  assert.deepEqual(g.weekly.decisions.map((c) => c.id), ['DN-0006', 'DN-0005']);
  assert.deepEqual(g.weekly.decisionsLater.map((c) => c.id), ['DN-0007']);
  assert.deepEqual(g.weekly.overdue.map((c) => c.id), ['DN-0001']);
  assert.deepEqual(g.weekly.filedThisWeek.map((c) => c.id).sort(), ['DN-0002', 'DN-0005']);
});

test('月次は時期の無い 🟢・90 日超・今月の 🔴🟡 件数を出す', () => {
  const g = buildGate(md, '2026-09-27');
  assert.deepEqual(g.monthly.lowWithoutWhen.map((c) => c.id), ['DN-0003']);
  assert.deepEqual(g.monthly.stale.map((c) => c.id), ['DN-0003']);
  assert.equal(g.monthly.thisMonth, 2);
});
