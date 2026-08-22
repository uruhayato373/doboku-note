import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectReuse } from '../scripts/check-backlog-health.mjs';

/**
 * S10「ID の再利用」の契約。
 *
 * 完了カードはセクションごと削除する運用なので DN-#### は歯抜けになる。空き番を
 * 新しいカードが拾うと、**過去のコミットメッセージ・plan・レビューが指す ID が別物になる**
 * （2026-08-20 に DN-0096 / DN-0097 で実発生。同日に 2 件）。
 *
 * 難しいのは **tier セクション間の移動**で、これは 1 つの commit の中で削除＋追加として出る。
 * ここを再利用と数えると毎回誤検知するので、commit 単位の差集合で判定することを固定する。
 */

const log = (...commits) =>
  commits.map(([sha, ...lines]) => [`COMMIT ${sha}`, ...lines].join('\n')).join('\n');

test('削除 → あとの commit で再追加 = 再利用', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0001] 最初のタスク'],
    ['bbb', '-### [DN-0001] 最初のタスク'],
    ['ccc', '+### [DN-0001] まったく別のタスク'],
  ));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'DN-0001');
  assert.equal(r[0].removedAt, 'bbb');
  assert.equal(r[0].readdedAt, 'ccc');
});

test('同一 commit 内の削除＋追加（tier 間の移動）は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0002] タスク'],
    ['bbb', '-### [DN-0002] タスク', '+### [DN-0002] タスク'],
  ));
  assert.deepEqual(r, []);
});

test('削除しただけ（完了）は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0003] タスク'],
    ['bbb', '-### [DN-0003] タスク'],
  ));
  assert.deepEqual(r, []);
});

test('一度も消えていない ID は再利用にしない', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0004] タスク'],
    ['bbb', '+### [DN-0005] 別タスク'],
  ));
  assert.deepEqual(r, []);
});

test('複数 ID が独立に判定される', () => {
  const r = detectReuse(log(
    ['aaa', '+### [DN-0006] A', '+### [DN-0007] B'],
    ['bbb', '-### [DN-0006] A'],
    ['ccc', '+### [DN-0006] A2', '-### [DN-0007] B'],
  ));
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'DN-0006');
});

test('再利用が 2 周しても各サイクルを 1 件ずつ数える', () => {
  const r = detectReuse(log(
    ['a1', '+### [DN-0008] v1'],
    ['a2', '-### [DN-0008] v1'],
    ['a3', '+### [DN-0008] v2'],
    ['a4', '-### [DN-0008] v2'],
    ['a5', '+### [DN-0008] v3'],
  ));
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.readdedAt), ['a3', 'a5']);
});

test('カード見出し以外の +/- 行は無視する', () => {
  const r = detectReuse(log(
    ['aaa', 'diff --git a/.claude/todo/backlog.md b/.claude/todo/backlog.md', '--- a/.claude/todo/backlog.md', '+++ b/.claude/todo/backlog.md', '@@ -1,4 +1,5 @@', '+タグ: [UI・UX] [種類:改善]', '+### [DN-0009] タスク', '-## 🔴 高', ' ### [DN-0010] 変更されていない文脈行'],
    ['bbb', '-### [DN-0009] タスク'],
    ['ccc', '+本文の ### [DN-0009] という言及'],
  ));
  assert.deepEqual(r, []);
});

test('空入力で例外を投げない', () => {
  assert.deepEqual(detectReuse(''), []);
});
