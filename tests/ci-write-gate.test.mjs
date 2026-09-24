// ci-write-gate.test.mjs — CI 書き込み操作の安全境界（カタログ・repo 由来の plan hash・env）の回帰テスト。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  stableStringify, validateCatalog, operationFromCatalog, validateArgs, argsToFlags, resolveInputs, hashInputs,
  buildPlan, buildCommitCommand, decideExecution, gateEnvFor, WRITE_PLAN_HASH_ENV, scheduledArgsFor, assertRunnerAllowed,
} from '../scripts/lib/ci-write-gate.mjs';

const registry = {
  services: {
    note: { ci: { mode: 'encrypted-state', operations: ['read', 'write'], readOnlyScripts: ['scripts/note-sales-fetch.mjs'], writeScripts: ['scripts/note-publish.mjs', 'scripts/note-sync-tags.mjs'] } },
    google: { ci: { mode: 'encrypted-state', operations: ['read'], readOnlyScripts: ['scripts/fetch-gsc-ui-csv.mjs'], writeScripts: [] } },
    instagram: { ci: { mode: 'none', operations: ['read'], readOnlyScripts: [], writeScripts: [] } },
  },
};
const op = (patch = {}) => ({
  id: 'note.publish', service: 'note', script: 'scripts/note-publish.mjs', risk: 'high',
  argsSchema: { article: 'string', schedule: 'string?', force: 'boolean?' },
  inputs: ['{article}'], commitArgs: ['--commit'], verify: ['scripts/verify-note-status.mjs'], ledger: ['.claude/state/note-published.json'],
  ...patch,
});
const catalog = (ops) => ({ version: 1, operations: ops });
const allExist = () => true;

test('validateCatalog: 正常なカタログを通し、writeScripts 外・read-only service・mode none・不正 inputs を拒否', () => {
  assert.equal(validateCatalog(catalog({ 'note.publish': op() }), { registry, fileExists: allExist }), true);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ script: 'scripts/note-delete-note.mjs' }) }), { registry, fileExists: allExist }), /not in note\.ci\.writeScripts/);
  assert.throws(() => validateCatalog(catalog({ 'google.request-indexing': op({ service: 'google', script: 'scripts/gsc-request-indexing.mjs' }) }), { registry, fileExists: allExist }), /lacks write/);
  assert.throws(() => validateCatalog(catalog({ 'instagram.publish': op({ service: 'instagram', script: 'scripts/x.mjs' }) }), { registry, fileExists: allExist }), /no encrypted-state/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ commitArgs: [] }) }), { registry, fileExists: allExist }), /commitArgs must not be empty/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ risk: 'none' }) }), { registry, fileExists: allExist }), /risk/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ script: '../x.mjs' }) }), { registry, fileExists: allExist }), /repo-relative/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ inputs: ['../etc'] }) }), { registry, fileExists: allExist }), /inputs must be repo-relative/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ inputs: ['{schedule}'] }) }), { registry, fileExists: allExist }), /required string arg/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op() }), { registry, fileExists: () => false }), /does not exist/);
  assert.throws(() => validateCatalog(catalog({ NotePublish: op() }), { registry, fileExists: allExist }), /kebab-case/);
  // API 経路（playwright:false）は registry を要求しない
  assert.equal(validateCatalog(catalog({ 'ig.publish': op({ service: 'instagram-graph', script: 'scripts/ig-graph-publish.mjs', playwright: false, inputs: [] }) }), { registry, fileExists: allExist }), true);
});

test('operationFromCatalog / validateArgs / argsToFlags', () => {
  const cat = catalog({ 'note.publish': op() });
  const o = operationFromCatalog(cat, 'note.publish');
  assert.equal(o.id, 'note.publish');
  assert.throws(() => operationFromCatalog(cat, 'note.delete'), /CI_WRITE_UNKNOWN_OPERATION/);
  assert.deepEqual(validateArgs(o, '{"article":"content/note/a/article.md","force":true}'), { article: 'content/note/a/article.md', force: true });
  assert.throws(() => validateArgs(o, {}), /"article" is required/);
  assert.throws(() => validateArgs(o, { article: 'a', extra: 1 }), /unknown arg/);
  assert.throws(() => validateArgs(o, { article: '../../etc/passwd' }), /no \.\./);
  assert.throws(() => validateArgs(o, { article: '/abs' }), /leading/);
  assert.throws(() => validateArgs(o, { article: '--commit' }), /leading/);
  assert.throws(() => validateArgs(o, { article: 'a\nb' }), /single-line/);
  assert.throws(() => validateArgs(o, 'not json'), /not valid JSON/);
  assert.deepEqual(argsToFlags({ article: 'x.md', force: true, quiet: false }), ['--article', 'x.md', '--force']);
  assert.deepEqual(buildCommitCommand(o, { article: 'x.md' }), ['node', 'scripts/note-publish.mjs', '--commit', '--article', 'x.md']);
});

test('buildPlan: repo の inputs ハッシュから決まり、内容が変わると hash が変わる', () => {
  const root = mkdtempSync(join(tmpdir(), 'ci-write-gate-'));
  try {
    mkdirSync(join(root, 'content/note/a'), { recursive: true });
    writeFileSync(join(root, 'content/note/a/article.md'), '# v1\n');
    writeFileSync(join(root, 'content/note/a/cover.png'), 'img');
    const o = op({ inputs: ['content/note/{slug}'], argsSchema: { slug: 'string' } });
    const p1 = buildPlan(root, o, { slug: 'a' });
    assert.deepEqual(Object.keys(p1.plan.inputs).sort(), ['content/note/a/article.md', 'content/note/a/cover.png']);
    assert.match(p1.hash, /^[0-9a-f]{64}$/);
    // 同じ tree・同じ args → 同じ hash（キー順に依存しない）
    assert.equal(buildPlan(root, o, { slug: 'a' }).hash, p1.hash);
    assert.equal(stableStringify({ b: 1, a: [1] }), '{"a":[1],"b":1}');
    // 記事を変えると hash が変わる（人が確認した内容と実行内容の同一性）
    writeFileSync(join(root, 'content/note/a/article.md'), '# v2\n');
    assert.notEqual(buildPlan(root, o, { slug: 'a' }).hash, p1.hash);
    // 存在しない input は拒否
    assert.throws(() => buildPlan(root, o, { slug: 'zzz' }), /CI_WRITE_INPUT_MISSING/);
    assert.deepEqual(resolveInputs(o, { slug: 'a' }), ['content/note/a']);
    assert.throws(() => hashInputs(root, ['nope']), /INPUT_MISSING/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('decideExecution: plan-only / hash-mismatch / execute、gateEnvFor は本物の hash のみ', () => {
  const h = 'f'.repeat(64);
  assert.deepEqual(decideExecution({ commit: false, expectedHash: h, actualHash: h }), { execute: false, reason: 'plan-only', hash: h });
  assert.equal(decideExecution({ commit: true, expectedHash: 'a'.repeat(64), actualHash: h }).reason, 'hash-mismatch');
  assert.equal(decideExecution({ commit: true, expectedHash: '', actualHash: h }).reason, 'hash-mismatch');
  assert.deepEqual(decideExecution({ commit: true, expectedHash: h.toUpperCase(), actualHash: h }), { execute: true, reason: 'execute', hash: h });
  assert.deepEqual(gateEnvFor(h), { [WRITE_PLAN_HASH_ENV]: h });
  assert.throws(() => gateEnvFor('abc'), /real plan hash/);
});

test('scheduled: risk=low かつ scheduled.args が argsSchema に合うときだけ通し、scheduledArgsFor は固定引数を返す', () => {
  const sched = op({
    id: 'note.sync-tags', script: 'scripts/note-sync-tags.mjs', risk: 'low',
    argsSchema: { article: 'string', limit: 'number?' }, inputs: ['{article}'],
    scheduled: { args: { article: 'content/note/a/article.md', limit: 10 } },
  });
  const ok = (o) => validateCatalog(catalog({ 'note.sync-tags': o }), { registry, fileExists: allExist });
  assert.equal(ok(sched), true);
  assert.deepEqual(scheduledArgsFor(sched), { article: 'content/note/a/article.md', limit: 10 });
  // 人の確認が要る risk の操作を定期実行の経路に載せない
  assert.throws(() => ok({ ...sched, risk: 'medium' }), /only for risk=low/);
  // 固定引数も通常と同じ検証（トラバーサル・必須欠落・未知キー）を通る
  assert.throws(() => ok({ ...sched, scheduled: { args: { article: '../etc/passwd' } } }), /scheduled\.args invalid/);
  assert.throws(() => ok({ ...sched, scheduled: { args: {} } }), /scheduled\.args invalid/);
  assert.throws(() => ok({ ...sched, scheduled: { args: { article: 'a.md', extra: 'x' } } }), /scheduled\.args invalid/);
  assert.throws(() => ok({ ...sched, scheduled: [] }), /scheduled must be an object/);
  // scheduled を持たない操作は定期実行できない
  assert.throws(() => scheduledArgsFor(op()), /CI_WRITE_NOT_SCHEDULABLE/);
});

test('assertRunnerAllowed: self-hosted 限定の操作は RUNNER_ENVIRONMENT=self-hosted 以外（未設定含む）で拒否', () => {
  const gated = op({ requiresSelfHostedRunner: true });
  assert.equal(assertRunnerAllowed(gated, { RUNNER_ENVIRONMENT: 'self-hosted' }), true);
  assert.throws(() => assertRunnerAllowed(gated, { RUNNER_ENVIRONMENT: 'github-hosted' }), /HOSTED_RUNNER_FORBIDDEN/);
  assert.throws(() => assertRunnerAllowed(gated, {}), /HOSTED_RUNNER_FORBIDDEN/);
  assert.equal(assertRunnerAllowed(op(), { RUNNER_ENVIRONMENT: 'github-hosted' }), true);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ requiresSelfHostedRunner: 'yes' }) }), { registry, fileExists: allExist }), /must be boolean/);
});

test('selfHostedRunsOn: null か "self-hosted" を含むラベル配列だけ通す（hosted のラベルを誤って書かせない）', () => {
  const v = (patch) => validateCatalog(catalog({ 'note.publish': op({ requiresSelfHostedRunner: true, ...patch }) }), { registry, fileExists: allExist });
  assert.equal(v({ selfHostedRunsOn: null }), true);
  assert.equal(v({ selfHostedRunsOn: ['self-hosted', 'macOS', 'doboku-mac'] }), true);
  assert.throws(() => v({ selfHostedRunsOn: ['ubuntu-latest'] }), /must include "self-hosted"/);
  assert.throws(() => v({ selfHostedRunsOn: [] }), /non-empty label array/);
  assert.throws(() => v({ selfHostedRunsOn: ['self-hosted', 'a b'] }), /non-empty label array/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ selfHostedRunsOn: ['self-hosted'] }) }), { registry, fileExists: allExist }), /requires requiresSelfHostedRunner/);
});
