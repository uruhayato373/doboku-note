// develop への push で全件の検査を飛ばす範囲。広げると赤い develop に気づけなくなるので、足すときは検査の置き場を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// Windows の作業ツリーは CRLF になる。行末を落として読む（\n 固定だと手元でだけ落ちる）
const lines = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === 'paths-ignore:');
const ignored = [];
for (const l of lines.slice(start + 1)) {
  const m = /^\s+- '(.+)'$/.exec(l);
  if (!m) break;
  ignored.push(m[1]);
}

test('飛ばすのは記憶と台帳だけで、PR は全件を回す', () => {
  assert.deepEqual(ignored, ['.claude/memory/**', '.claude/todo/**', '.claude/state/todo-claims.json']);
  assert.ok(lines.indexOf('  pull_request:') < lines.indexOf('  push:') && lines.indexOf('  push:') < start, 'paths-ignore は push の下に置く');
  assert.equal(lines.filter((l) => l.trim() === 'paths-ignore:').length, 1);
});

test('unit-tests は audit から外した分を test ジョブが回し、合否の集計と automerge が 3 ジョブを見る', () => {
  // 片方だけ消すと、unit-tests がどのジョブでも走らないまま緑になる。
  const ci = lines.join('\n');
  assert.match(ci, /run: npm run quality:audit:ci -- --except unit-tests\n/);
  assert.match(ci, /\n  test:\n[\s\S]*?run: npm run quality:audit:ci -- --only unit-tests\n/);
  assert.match(ci, /needs: \[audit, test, build\]/);
  assert.match(ci, /needs\.test\.result == 'failure'/);
  assert.match(ci, /needs\.audit\.result == 'success' && needs\.test\.result == 'success' && needs\.build\.result == 'success'/);
  assert.match(readFileSync(join(ROOT, '.github/workflows/automerge.yml'), 'utf8'), /for need in audit test build; do/);
});

test('develop の実行は途中で取り消さず、PR だけ取り消す', () => {
  assert.ok(lines.some((l) => l.trim() === "cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));
});

test('飛ばす台帳の検査が pre-commit にある', () => {
  const steps = readFileSync(join(ROOT, 'scripts/lib/pre-commit-steps.mjs'), 'utf8');
  for (const id of ['check-memory', 'check-backlog-schema', 'check-task-plan-links']) assert.ok(steps.includes(id), id);
  const gates = readFileSync(join(ROOT, 'scripts/pre-commit-ci-gates.mjs'), 'utf8');
  assert.ok(gates.includes('tests/project-task-refs.test.mjs'));
  assert.ok(gates.includes("id: 'search-improvements'"));
});
