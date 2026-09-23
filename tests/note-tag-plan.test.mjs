import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTagSync, tagChipPattern, verifyTagSync } from '../scripts/lib/note-tag-plan.mjs';

const range = (p, n) => Array.from({ length: n }, (_, i) => `${p}${i}`);

test('上限99のライブに不足があっても、prune なしでは1つも足さない', () => {
  const live = range('a', 99);
  const desired = [...range('a', 88), ...range('b', 7)];
  const p = planTagSync({ live, desired });
  assert.equal(p.missing.length, 7);
  assert.equal(p.addable.length, 0);
  assert.equal(p.extra.length, 0);
  assert.equal(p.extraCount, 11);
  assert.equal(p.changed, false);
});

test('prune では余分を消した空きへ不足を足し、原稿と同じ件数になる', () => {
  const live = range('a', 99);
  const desired = [...range('a', 88), ...range('b', 7)];
  const p = planTagSync({ live, desired, prune: true });
  assert.deepEqual(p.extra, range('a', 99).slice(88));
  assert.equal(p.addable.length, 7);
  assert.equal(p.willBe, 95);
  assert.equal(p.changed, true);
});

test('prune でも上限を超える分は足さない', () => {
  const live = range('a', 10);
  const desired = [...range('a', 5), ...range('b', 120)];
  const p = planTagSync({ live, desired, prune: true });
  assert.equal(p.extra.length, 5);
  assert.equal(p.addable.length, 94);
  assert.equal(p.willBe, 99);
  assert.equal(p.overflow, 26);
});

test('一致していれば何もしない', () => {
  const live = range('a', 95);
  const p = planTagSync({ live, desired: [...live].reverse(), prune: true });
  assert.equal(p.changed, false);
});

test('prune の検証: 消すはずのタグが残っていれば失敗', () => {
  const plan = planTagSync({ live: ['x', 'y', 'z'], desired: ['x', 'w'], prune: true });
  assert.equal(verifyTagSync({ after: ['x', 'w'], plan, liveCount: 3 }).ok, true);
  const bad = verifyTagSync({ after: ['x', 'w', 'y'], plan, liveCount: 3 });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.leftover, ['y']);
});

test('prune の検証: 件数が減っても計画どおりなら成功（追加だけの件数判定を使わない）', () => {
  const plan = planTagSync({ live: range('a', 99), desired: [...range('a', 88), ...range('b', 7)], prune: true });
  const after = [...range('a', 88), ...range('b', 7)];
  assert.equal(verifyTagSync({ after, plan, liveCount: 99 }).ok, true);
});

test('追加だけの検証: 件数が増えていなければ失敗', () => {
  const plan = planTagSync({ live: range('a', 50), desired: range('a', 60) });
  assert.equal(verifyTagSync({ after: range('a', 50), plan, liveCount: 50 }).ok, false);
  assert.equal(verifyTagSync({ after: range('a', 60), plan, liveCount: 50 }).ok, true);
});

test('chip の正規表現: 後ろの改行を許し、前方一致の別タグには当たらない', () => {
  assert.equal(tagChipPattern('まとめ').test('#まとめ\n\n'), true);
  assert.equal(tagChipPattern('まとめ').test('#まとめ記事\n'), false);
  assert.equal(tagChipPattern('1級').test('#施工管理技士1級'), false);
  assert.equal(tagChipPattern('C++').test('#C++\n'), true);
});

test('大文字小文字だけの違いは一致とみなす（note はタグの大文字小文字を区別しない）', () => {
  const p = planTagSync({ live: ['gx', 'Cp', 'a'], desired: ['GX', 'CP', 'a'], prune: true });
  assert.equal(p.changed, false);
  assert.deepEqual(p.extra, []);
  assert.deepEqual(p.missing, []);
  const plan = planTagSync({ live: ['x', 'y'], desired: ['x', 'Z'], prune: true });
  assert.equal(verifyTagSync({ after: ['x', 'z'], plan, liveCount: 2 }).ok, true);
});

test('入力欄が受け付けなかったタグは失敗にせず別枠で返す', () => {
  const plan = planTagSync({ live: ['a', 'b'], desired: ['a', 'c', 'i-Construction'], prune: true });
  const v = verifyTagSync({ after: ['a', 'c'], plan, liveCount: 2, rejected: ['i-Construction'] });
  assert.equal(v.ok, true);
  assert.deepEqual(v.rejected, ['i-Construction']);
  const addOnly = planTagSync({ live: ['a'], desired: ['a', 'i-Construction'] });
  assert.equal(verifyTagSync({ after: ['a'], plan: addOnly, liveCount: 1, rejected: ['i-Construction'] }).ok, true);
  assert.equal(verifyTagSync({ after: ['a'], plan: addOnly, liveCount: 1 }).ok, false);
});
