// quality-audit の「壁時計だけが伸びた run を timeout/fail と呼ばない」判定の回帰ゲート（DN-0693・2026-10-11）。
// 2026-10-10 のフル実行で TIMEOUT 7 件・合計 1,804 秒だった検査群は、単独で再実行すると 154.6 秒（11.7 倍）だった。
// 並列 4 の競合では説明できず（asset-reentry は 34.8 秒 → 0.1 秒）、Mac のスリープ中に壁時計だけが進んでいた。
// Date.now（壁時計）と process.hrtime（単調時計・スリープ中は進まない）の差で「寝ていた時間」を測り、
// その分だけ超過した timeout/fail は inconclusive（検査不成立・exit 2）にする。timeout の延長はしない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { classifyRun } from '../scripts/quality-audit.mjs';

test('寝ていない timeout は timeout、寝ていない fail は fail、pass は pass', () => {
  assert.equal(classifyRun({ timedOut: true, exitStatus: null, wallMs: 180_000, monoMs: 179_900 }).status, 'timeout');
  assert.equal(classifyRun({ timedOut: false, exitStatus: 1, wallMs: 3_000, monoMs: 2_990 }).status, 'fail');
  assert.equal(classifyRun({ timedOut: false, exitStatus: 0, wallMs: 3_000, monoMs: 2_990 }).status, 'pass');
});

test('模擬スリープ（壁時計が単調時計より 5 秒超進んだ）の timeout / fail は inconclusive', () => {
  const slept = classifyRun({ timedOut: true, exitStatus: null, wallMs: 180_000, monoMs: 20_000 });
  assert.equal(slept.status, 'inconclusive');
  assert.equal(slept.sleptMs, 160_000);
  assert.equal(classifyRun({ timedOut: false, exitStatus: 1, wallMs: 60_000, monoMs: 10_000 }).status, 'inconclusive');
});

test('寝ていても pass は pass（緑を疑わない）、許容 5 秒以内のずれは実差として扱う', () => {
  assert.equal(classifyRun({ timedOut: false, exitStatus: 0, wallMs: 600_000, monoMs: 5_000 }).status, 'pass');
  assert.equal(classifyRun({ timedOut: true, exitStatus: null, wallMs: 180_000, monoMs: 176_000 }).status, 'timeout');
});

test('inconclusive は failed に数えず、1 件でもあれば exit 2 にする（ソースの契約）', () => {
  const src = readFileSync(join(REPO_ROOT, 'scripts/quality-audit.mjs'), 'utf8');
  assert.match(src, /r\.status === 'fail' \|\| r\.status === 'timeout'/, 'failed の定義が fail/timeout のまま（inconclusive を混ぜない）');
  assert.match(src, /status === 'inconclusive'\)[\s\S]{0,400}process\.exitCode = 2/, 'inconclusive があるとき exit 2 にする分岐が無い');
  assert.match(src, /process\.hrtime\.bigint\(\)/, '単調時計（hrtime）を測っていない');
});
