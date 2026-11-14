import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildSteps, weeklyTargets, parseCompletionLine, collectRunning, stepProblems, summarizeOutput } from '../scripts/review-prepare.mjs';
import { readJson } from '../scripts/lib/json-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

// 準備の表のコマンドは実在し、配線の正本（review-wiring.json）の同じ cadence に載っている。
// スケジュール済みタスクのレビューが最初に回すので、表が壊れるとレビュー全体が材料なしで走る。
for (const cadence of ['weekly', 'monthly']) {
  test(`準備の表（${cadence}）のコマンドが package.json と配線の正本にある`, () => {
    const steps = buildSteps(cadence, cadence === 'weekly' ? '2026-W46' : '2026-10');
    assert.ok(steps.length >= 8, `手順が少なすぎる（${steps.length} 本）`);
    const problems = stepProblems(cadence, steps, { scripts: readJson(REPO_ROOT, 'package.json').scripts, wiring: readJson(REPO_ROOT, '.claude/config/review-wiring.json') });
    assert.deepEqual(problems, []);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length, '手順の id が重なっている');
    assert.ok(steps.at(-1).args.includes(cadence === 'weekly' ? '2026-W46' : '2026-10'), '点検の --run に対象の期間が入っていない');
  });
}

test('表に無いコマンド・配線に無いコマンドを違反にする', () => {
  const p = stepProblems('weekly', [{ npm: 'no-such-script' }, { npm: 'lint' }], { scripts: { lint: 'x' }, wiring: { cadences: { weekly: { inputs: [], checks: [] } } } });
  assert.equal(p.length, 2);
});

test('--check が 1 本も回さずに両方の cadence で通る', () => {
  for (const cadence of ['weekly', 'monthly']) {
    const r = spawnSync(process.execPath, ['scripts/review-prepare.mjs', '--cadence', cadence, '--check'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /違反 0 件/);
  }
});

test('週次の対象: 未完の週と未作成の週を古い順に、重ねずに返す', () => {
  assert.deepEqual(weeklyTargets({ due: null, latest: { week: '2026-W46', missing: 0 } }), []);
  assert.deepEqual(weeklyTargets({ due: '2026-W46', latest: { week: '2026-W45', missing: 4 } }), ['2026-W45', '2026-W46']);
  assert.deepEqual(weeklyTargets({ due: '2026-W46', latest: { week: '2026-W46', missing: 2 } }), ['2026-W46']);
  assert.deepEqual(parseCompletionLine('[weekly-review] 2026-W45: 対象 5・検査 5・未完 4（事業データは暫定）'), { week: '2026-W45', missing: 4 });
  assert.equal(parseCompletionLine('読めない出力'), null);
});

test('収集のロックは、持ち主のプロセスが生きているときだけ実行中（再起動で残ったロックで止まらない）', () => {
  assert.equal(collectRunning('/nonexistent/pid'), null);
  assert.equal(collectRunning(new URL(import.meta.url).pathname, () => true), null); // pid として読めない中身
  const pidFile = new URL('./fixtures/review-prepare-pid.txt', import.meta.url).pathname;
  assert.equal(collectRunning(pidFile, () => false), null);
  assert.equal(collectRunning(pidFile, () => true), 4242);
});

test('要約: JSON は上位のキーだけ、テキストは末尾の行', () => {
  assert.deepEqual(summarizeOutput('{"a":1,"b":[1,2]}'), ['JSON（上位のキー: a, b）']);
  assert.deepEqual(summarizeOutput('[1,2,3]'), ['JSON の配列（3 件）']);
  assert.deepEqual(summarizeOutput('x\ny\nz', 2), ['y', 'z']);
});
