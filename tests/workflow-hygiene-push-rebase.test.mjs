// check-workflow-hygiene ルール 9（develop へ rebase 無しで push）の回帰ゲート。
// 2026-10-11 まで scheduled-publish.yml / link-audit.yml が checkout 時点の HEAD にそのまま commit して
// `git push origin develop` していた（develop は 1 日 100 回超 push され non-fast-forward で落ちる）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPushWithoutRebase } from '../scripts/check-workflow-hygiene.mjs';

test('rebase 無しの git push origin develop を 1 件検出する', () => {
  const run = 'git commit -m "x [skip ci]"\ngit push origin develop';
  const hits = findPushWithoutRebase(run);
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /git push origin develop/);
});

test('git rebase origin/develop が同じ run にあれば検出しない', () => {
  const run = 'git commit -m "x"\ngit fetch origin develop\ngit rebase origin/develop\ngit push origin HEAD:develop';
  assert.deepEqual(findPushWithoutRebase(run), []);
});

test('git pull --rebase でも許す', () => {
  const run = 'git pull --rebase origin develop\ngit push origin develop';
  assert.deepEqual(findPushWithoutRebase(run), []);
});

test('develop 以外への push・コメント内の push は対象外', () => {
  assert.deepEqual(findPushWithoutRebase('git push origin HEAD:refs/heads/feature'), []);
  assert.deepEqual(findPushWithoutRebase('# git push origin develop は rebase の後で'), []);
});

test('空・非文字列でも落ちない', () => {
  assert.deepEqual(findPushWithoutRebase(''), []);
  assert.deepEqual(findPushWithoutRebase(undefined), []);
});
