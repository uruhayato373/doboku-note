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

test('10/27: 2 級の文脈がある行だけ止め、当日の記録の日付は通す', () => {
  assert.deepEqual(findForbidden('2級の第二次検定は2026-10-27に実施'), ['2級後期・第二次は2026-10-25']);
  assert.deepEqual(findForbidden('2級後期は10月27日'), ['2級後期・第二次は10月25日']);
  assert.deepEqual(findForbidden('タグ: [種類:改善] [起票:2026-10-27]'), []);
  assert.deepEqual(findForbidden('3面アフィリ方針（2026-10-27 採用）'), []);
  assert.deepEqual(findForbidden('予約 2026-10-27T21:05'), []);
});

test('10/27: 「土木施工管理」だけでは 2 級の文脈とみなさない', () => {
  assert.deepEqual(findForbidden('2026-10-27 に、資格別の商品分け（土木施工管理＝建設特化）を設計した'), []);
  assert.deepEqual(findForbidden('2級土木の後期は 2026-10-27'), ['2級後期・第二次は2026-10-25']);
});
