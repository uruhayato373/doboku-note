// tests/exam-calendar-guards.test.mjs
//
// 試験日の誤記を止める禁止パターンの回帰テスト。
// 2026-09-26 に annual.md の「11/30」「9/01」が語順・スラッシュ表記の違いで素通りした実例を固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { findForbidden } from '../scripts/lib/exam-calendar-guards.mjs';

test('annual.md で素通りした実例を検出する', () => {
  const missed = [
    '| **11/30** | **コンクリート主任技士・技士** | 約1万人 |',
    '| **9/01** | **コンクリート主任技士 受験申込 締切** | — |',
    '> コンクリート主任技士は同月ではなく **11/30**（申込締切 9/01）。',
    '| ✅ | ~~コンクリート主任技士 cce-essay 公開~~ | 試験 11/30・申込締切 9/01 | 完了 |',
  ];
  for (const line of missed) assert.ok(findForbidden(line).length > 0, line);
});

test('従来のハイフン・漢数字表記も引き続き検出する', () => {
  assert.ok(findForbidden('コンクリート主任技士の試験は2026-11-30').length > 0);
  assert.ok(findForbidden('コンクリート技士 11月30日 実施').length > 0);
});

test('正しい日付と X 台帳の投稿日は誤検知しない', () => {
  const ok = [
    '| **11/29** | **コンクリート主任技士・技士** | 約1万人 |',
    'コンクリート主任技士は **11/29**（申込締切 8/25）。',
    '# 090 1級・2級土木 + コンクリート主任技士 2026-09 前半（9/1〜9/10・全30本）',
    '9/10 コンクリート主任技士 受験申込 締切',
  ];
  for (const line of ok) assert.deepEqual(findForbidden(line), [], line);
});
