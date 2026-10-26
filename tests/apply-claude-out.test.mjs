// ヘッドレスの Claude が .tmp/claude-out/ に書いたファイルの写し（DN-0829）: 許可したものだけ .claude/ へ写す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, destOf } from '../scripts/apply-claude-out.mjs';

test('週間計画・backlog・校正の学びだけを写し、それ以外の .claude/ のファイルは拒む', () => {
  const { allowed, rejected } = classify([
    '.claude/todo/weekly.md',
    '.claude/state/proofread-learnings/2026-10-31.md',
    '.claude/todo/backlog.md',
    '.claude/todo/monthly.md',
    '.claude/settings.json',
    '.claude/state/proofread-learnings/../../settings.json',
    'scripts/x.mjs',
  ]);
  assert.deepEqual(allowed, ['.claude/todo/weekly.md', '.claude/state/proofread-learnings/2026-10-31.md', '.claude/todo/backlog.md']);
  assert.equal(rejected.length, 4);
});

test('写し先は .claude/ を付けた所。Claude が書けるのは .claude を含まないパス（.tmp/claude-out/todo/weekly.md）で、旧い書き方も受ける', () => {
  assert.equal(destOf('todo/weekly.md'), '.claude/todo/weekly.md');
  assert.equal(destOf('state/proofread-learnings/2026-10-31.md'), '.claude/state/proofread-learnings/2026-10-31.md');
  assert.equal(destOf('.claude/todo/weekly.md'), '.claude/todo/weekly.md');
  const { allowed, rejected } = classify(['todo/weekly.md', 'todo/backlog.md', 'state/proofread-learnings/2026-10-31.md', 'todo/monthly.md', 'settings.json', 'gsc/weekly-entry.md']);
  assert.deepEqual(allowed, ['todo/weekly.md', 'todo/backlog.md', 'state/proofread-learnings/2026-10-31.md']);
  assert.deepEqual(rejected, ['todo/monthly.md', 'settings.json', 'gsc/weekly-entry.md']);
});
