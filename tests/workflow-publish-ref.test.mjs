/**
 * schedule workflow の checkout ref を固定する検査（check-workflow-publish-ref）のテスト。
 *
 * 守りたい事故: 「schedule はデフォルトブランチ（main）を checkout する」ことを忘れて
 *   ref を書かず、npm ci が main のフックを入れたまま develop へ commit して drift guard に
 *   弾かれる。2026-08 に fetch-metrics / psi-audit / index-coverage の 3 本で起きた。
 *
 * 検査そのものが壊れて「違反 0」を返す偽緑も止める（対象 0 件は不成立）。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditWorkflow, auditGitPublishOrder } from '../scripts/check-workflow-publish-ref.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = join(ROOT, '.github/workflows');

const OK = `
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
        with:
          ref: develop
      - run: git push origin develop
`;

const MISSING_REF = `
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
      - run: git push origin develop
`;

const WRONG_REF = `
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
        with:
          ref: main
      - run: git push origin develop
`;

const NO_SCHEDULE = `
on:
  push:
    branches: [main]
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
      - run: git push origin develop
`;

const NO_PUBLISH = `
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  x:
    steps:
      - uses: actions/checkout@v5
      - run: npm test
`;

test('ref: develop があれば合格', () => {
  const r = auditWorkflow('ok.yml', OK);
  assert.equal(r.applicable, true);
  assert.equal(r.ref, 'develop');
  assert.equal(r.ok, true);
});

test('ref が無ければ落ちる（これが 3 回起きた形）', () => {
  const r = auditWorkflow('bad.yml', MISSING_REF);
  assert.equal(r.applicable, true);
  assert.equal(r.ref, null);
  assert.equal(r.ok, false);
});

test('ref: main を明示していても落ちる', () => {
  const r = auditWorkflow('bad2.yml', WRONG_REF);
  assert.equal(r.applicable, true);
  assert.equal(r.ref, 'main');
  assert.equal(r.ok, false);
});

test('schedule が無ければ対象外（push 起動は main を見て正しい）', () => {
  const r = auditWorkflow('push.yml', NO_SCHEDULE);
  assert.equal(r.applicable, false);
  assert.equal(r.ok, true);
});

test('develop へ push しなければ対象外', () => {
  const r = auditWorkflow('readonly.yml', NO_PUBLISH);
  assert.equal(r.applicable, false);
  assert.equal(r.ok, true);
});

test('現物の workflow が全て合格し、対象が 0 件ではない', () => {
  const files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(files.length >= 10, `workflow が ${files.length} 本しか取れていない（走査の破損を疑う）`);

  const rows = files.map((f) => auditWorkflow(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')));
  const applicable = rows.filter((r) => r.applicable);
  // 検査ゼロを PASS と呼ばない: 対象が 0 件なら「健全」ではなく検出できていない
  assert.ok(applicable.length >= 5, `develop へ書く schedule workflow が ${applicable.length} 本しか取れていない`);

  const bad = applicable.filter((r) => !r.ok);
  assert.deepEqual(
    bad.map((r) => r.name),
    [],
    `ref: develop が無い workflow: ${bad.map((r) => r.name).join(', ')}`,
  );
});

test('3 回事故を起こした 3 本が対象に入っている', () => {
  // 対象判定そのものが緩くなって「見ているつもりで見ていない」状態を防ぐ。
  for (const name of ['fetch-metrics.yml', 'psi-audit.yml', 'index-coverage.yml']) {
    const r = auditWorkflow(name, readFileSync(join(WORKFLOW_DIR, name), 'utf8'));
    assert.equal(r.applicable, true, `${name} が検査対象から外れている`);
    assert.equal(r.ok, true, `${name} の ref が develop でない`);
  }
});

// --- git 手順の順序（2026-08-27 asset-inbox.yml run 33034670182 の再発防止）-------
// `git add` の後に commit せず rebase すると
// `cannot rebase: Your index contains uncommitted changes` で必ず落ちる。
// 落ちるのが publish step だけなので、R2 upload は成功したまま台帳が残らない。

const BROKEN = [
  '      - name: Publish manifest to develop',
  '        run: |',
  '          set -eu',
  '          git add .claude/state/assets/manifest.json',
  '          git fetch origin develop',
  '          git rebase origin/develop',
  '          git commit -m "chore(assets): ingest"',
  '          git push origin HEAD:develop',
].join('\n');

const FIXED = [
  '      - name: Publish manifest to develop',
  '        run: |',
  '          set -eu',
  '          git add .claude/state/assets/manifest.json',
  '          git commit -m "chore(assets): ingest"',
  '          git fetch origin develop',
  '          git rebase origin/develop',
  '          git push origin HEAD:develop',
].join('\n');

test('回帰: staged のまま rebase する workflow を検出する', () => {
  const r = auditGitPublishOrder('asset-inbox.yml', BROKEN);
  assert.equal(r.applicable, true);
  assert.equal(r.ok, false);
  assert.match(r.blocks.join(''), /git rebase/);
});

test('commit → rebase の順なら通る', () => {
  assert.equal(auditGitPublishOrder('asset-inbox.yml', FIXED).ok, true);
});

test('develop へ push しない workflow は対象外', () => {
  const r = auditGitPublishOrder('other.yml', BROKEN.replace('HEAD:develop', 'HEAD:gh-pages'));
  assert.equal(r.applicable, false);
  assert.equal(r.ok, true);
});

test('stash で index を空にしてから rebase するのは許す', () => {
  const src = BROKEN.replace('          git fetch origin develop', '          git stash\n          git fetch origin develop');
  assert.equal(auditGitPublishOrder('x.yml', src).ok, true);
});

test('git add が無い publish は対象外（誤検知しない）', () => {
  const src = ['        run: |', '          git rebase origin/develop', '          git push origin HEAD:develop'].join('\n');
  assert.equal(auditGitPublishOrder('x.yml', src).ok, true);
});

test('実リポジトリの全 workflow が順序ルールを満たす', () => {
  const files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(files.length > 0, 'workflow が 1 本も読めない＝検査不成立');
  const rows = files.map((f) => auditGitPublishOrder(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')));
  const applicable = rows.filter((r) => r.applicable);
  assert.ok(applicable.length > 0, 'develop へ書き込む workflow が 0 本＝走査の破損');
  const bad = rows.filter((r) => !r.ok).map((r) => r.name);
  assert.deepEqual(bad, [], `staged のまま rebase: ${bad.join(' / ')}`);
});
