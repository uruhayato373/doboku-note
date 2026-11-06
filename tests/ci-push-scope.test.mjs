// develop への push で全件の検査を飛ばす範囲。広げると赤い develop に気づけなくなるので、足すときは検査の置き場を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const lines = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8').split('\n');
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

test('飛ばす台帳の検査が pre-commit にある', () => {
  const steps = readFileSync(join(ROOT, 'scripts/lib/pre-commit-steps.mjs'), 'utf8');
  for (const id of ['check-memory', 'check-backlog-schema', 'check-task-plan-links']) assert.ok(steps.includes(id), id);
  const gates = readFileSync(join(ROOT, 'scripts/pre-commit-ci-gates.mjs'), 'utf8');
  assert.ok(gates.includes('tests/project-task-refs.test.mjs'));
  assert.ok(gates.includes("id: 'search-improvements'"));
});
