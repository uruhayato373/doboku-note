/**
 * workflow の full clone 禁止（check-workflow-clone-depth）のテスト。
 *
 * 守りたい事故: `fetch-depth: 0` で 11 GB のリポジトリを丸ごと clone し、
 *   ubuntu-latest の空きを超えてランナーごと落ちる。2026-08-21 に GSC auto review で発生し、
 *   **全ステップが conclusion=null・ログすら書けない**ため通常の追跡では原因に届かなかった。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALLOWLIST, auditCloneDepth } from '../scripts/check-workflow-clone-depth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = join(ROOT, '.github/workflows');

const FULL = `
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
        with:
          ref: develop
          fetch-depth: 0
`;

const SHALLOW = `
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
        with:
          ref: develop
`;

const EXPLICIT_ONE = `
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 1
`;

test('fetch-depth: 0 は落ちる', () => {
  const r = auditCloneDepth('bad.yml', FULL, {});
  assert.equal(r.fullClone, true);
  assert.equal(r.ok, false);
});

test('fetch-depth を書かなければ合格（既定=1）', () => {
  const r = auditCloneDepth('ok.yml', SHALLOW, {});
  assert.equal(r.fullClone, false);
  assert.equal(r.ok, true);
});

test('fetch-depth: 1 の明示も合格', () => {
  assert.equal(auditCloneDepth('ok2.yml', EXPLICIT_ONE, {}).ok, true);
});

test('allowlist に理由付きで登録すれば通る', () => {
  const r = auditCloneDepth('bad.yml', FULL, { 'bad.yml': 'タグ履歴が要るため' });
  assert.equal(r.fullClone, true);
  assert.equal(r.allowed, true);
  assert.equal(r.ok, true);
  assert.equal(r.reason, 'タグ履歴が要るため');
});

test('現物の workflow に許可のない full clone が無い（対象 0 件を PASS と呼ばない）', () => {
  const files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(files.length >= 10, `workflow が ${files.length} 本しか取れていない（走査の破損を疑う）`);

  const bad = files
    .map((f) => auditCloneDepth(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')))
    .filter((r) => !r.ok);
  assert.deepEqual(bad.map((r) => r.name), [], `許可のない full clone: ${bad.map((r) => r.name).join(', ')}`);
});

test('allowlist は理由の無いエントリを持たない', () => {
  for (const [name, reason] of Object.entries(ALLOWLIST)) {
    assert.ok(reason && reason.length >= 6, `${name} の allowlist 登録に理由が無い`);
  }
});
