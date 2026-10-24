// ヘッドレスの Claude が .tmp/claude-out/ に書いたファイルの写し（DN-0829）: 許可したものだけ .claude/ へ写す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../scripts/apply-claude-out.mjs';

test('週間計画と校正の学びだけを写し、それ以外の .claude/ のファイルは拒む', () => {
  const { allowed, rejected } = classify([
    '.claude/todo/weekly.md',
    '.claude/state/proofread-learnings/2026-10-31.md',
    '.claude/todo/backlog.md',
    '.claude/settings.json',
    '.claude/state/proofread-learnings/../../settings.json',
    'scripts/x.mjs',
  ]);
  assert.deepEqual(allowed, ['.claude/todo/weekly.md', '.claude/state/proofread-learnings/2026-10-31.md']);
  assert.equal(rejected.length, 4);
});
