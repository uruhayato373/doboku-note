// 減ったときに赤にせず、基準値を締める（DN-0802）。以前は写しを減らすと「基準値は今の数のまま」が赤になり、
// 直した人が基準値の書き換えまで背負っていた（2026-10-20 の #1161）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tightenCounts } from '../scripts/lib/code-ratchets.mjs';

test('減った項目だけ下げ、増えた項目は上げない（赤のまま残す）', () => {
  const { next, lowered } = tightenCounts({ root: 24, walk: 27, mdxWalk: 37 }, { root: 22, walk: 28, mdxWalk: 37 });
  assert.deepEqual(next, { root: 22, walk: 27, mdxWalk: 37 });
  assert.deepEqual(lowered, ['root 24 → 22']);
});

test('pre-commit に組み込まれ、コードが staged のときだけ回る', () => {
  const steps = readFileSync('scripts/lib/pre-commit-steps.mjs', 'utf8');
  assert.match(steps, /tighten-ratchets/);
  const src = readFileSync('scripts/tighten-ratchets.mjs', 'utf8');
  assert.match(src, /--staged/);
  assert.match(src, /git\(\['add', '--'/);
});

test('check-datasets は .claude/state の直書きが減っても止めない', () => {
  const src = readFileSync('scripts/check-datasets.mjs', 'utf8');
  assert.doesNotMatch(src, /errors\.push\([^\n]*件に減った/);
});
