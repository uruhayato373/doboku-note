// check-workflow-hygiene ルール 6（行継続の潰れ）の回帰ゲート。
// 2026-09-01 まで uptime-ping.yml / weekly-review-guard.yml の report-automation-failure 呼び出しが
// リテラル \n に潰れていた（bash では引数 "n" になる）。再導入で赤くなることを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findCollapsedContinuations } from '../scripts/check-workflow-hygiene.mjs';

test('潰れた行継続（リテラル \\n + 空白 + --flag）を 1 件検出する', () => {
  const run = 'node scripts/report-automation-failure.mjs \\n            --channel uptime \\n            --title "x"';
  const hits = findCollapsedContinuations(run);
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /report-automation-failure/);
});

test('正しい行継続（バックスラッシュ + 実改行）は検出しない', () => {
  const run = 'node scripts/report-automation-failure.mjs \\\n  --channel uptime \\\n  --title "x"';
  assert.deepEqual(findCollapsedContinuations(run), []);
});

test("printf '%s\\n' --x のようにクォート直後は検出しない", () => {
  const run = "printf '%s\\n' --x\necho \"a\\n\" --b";
  assert.deepEqual(findCollapsedContinuations(run), []);
});

test('空・非文字列でも落ちない', () => {
  assert.deepEqual(findCollapsedContinuations(''), []);
  assert.deepEqual(findCollapsedContinuations(undefined), []);
});
