// ci-write-gate.test.mjs — CI 書き込み操作の安全境界（カタログ・plan hash・env）の回帰テスト。
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stableStringify, planHash, verifyPlanHash, validateCatalog, operationFromCatalog, validateArgs,
  argsToFlags, buildPlanCommand, buildCommitCommand, decideExecution, gateEnvFor, PLAN_ONLY_HASH, WRITE_PLAN_HASH_ENV,
} from '../scripts/lib/ci-write-gate.mjs';

const registry = {
  services: {
    note: { ci: { mode: 'encrypted-state', operations: ['read', 'write'], readOnlyScripts: ['scripts/note-sales-fetch.mjs'], writeScripts: ['scripts/note-publish.mjs', 'scripts/note-sync-tags.mjs'] } },
    google: { ci: { mode: 'encrypted-state', operations: ['read'], readOnlyScripts: ['scripts/fetch-gsc-ui-csv.mjs'], writeScripts: [] } },
    instagram: { ci: { mode: 'none', operations: ['read'], readOnlyScripts: [], writeScripts: [] } },
  },
};
const op = (patch = {}) => ({
  service: 'note', script: 'scripts/note-publish.mjs', risk: 'high',
  argsSchema: { slug: 'string', price: 'number?', force: 'boolean?' },
  planArgs: ['--dry-run', '--json'], commitArgs: ['--commit'], verify: ['scripts/verify-note-status.mjs'], ledger: ['.claude/state/note-published.json'],
  ...patch,
});
const catalog = (ops) => ({ version: 1, operations: ops });
const allExist = () => true;

test('planHash はキー順・空白に依存せず、生テキスト差分では変わる', () => {
  const a = '{"b":1,"a":[1,2]}';
  const b = '{ "a": [1, 2], "b": 1 }';
  assert.equal(planHash(a), planHash(b));
  assert.notEqual(planHash(a), planHash('{"b":2,"a":[1,2]}'));
  assert.equal(stableStringify({ z: 1, a: { d: null, c: [true] } }), '{"a":{"c":[true],"d":null},"z":1}');
});

test('verifyPlanHash は 64 hex 以外・不一致を拒否', () => {
  const text = '{"x":1}';
  const h = planHash(text);
  assert.equal(verifyPlanHash(text, h).ok, true);
  assert.equal(verifyPlanHash(text, h.toUpperCase()).ok, true);
  assert.equal(verifyPlanHash(text, 'abc').ok, false);
  assert.equal(verifyPlanHash(text, '').ok, false);
  assert.equal(verifyPlanHash('{"x":2}', h).ok, false);
});

test('validateCatalog: 正常なカタログを通し、writeScripts 外・read-only service・mode none を拒否', () => {
  assert.equal(validateCatalog(catalog({ 'note.publish': op() }), { registry, fileExists: allExist }), true);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ script: 'scripts/note-delete-note.mjs' }) }), { registry, fileExists: allExist }), /not in note\.ci\.writeScripts/);
  assert.throws(() => validateCatalog(catalog({ 'google.request-indexing': op({ service: 'google', script: 'scripts/gsc-request-indexing.mjs' }) }), { registry, fileExists: allExist }), /lacks write/);
  assert.throws(() => validateCatalog(catalog({ 'instagram.publish': op({ service: 'instagram', script: 'scripts/x.mjs' }) }), { registry, fileExists: allExist }), /no encrypted-state/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ planArgs: ['--json'] }) }), { registry, fileExists: allExist }), /--dry-run/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ planArgs: ['--dry-run', '--commit'] }) }), { registry, fileExists: allExist }), /must not include --commit/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ commitArgs: [] }) }), { registry, fileExists: allExist }), /commitArgs must include/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ risk: 'none' }) }), { registry, fileExists: allExist }), /risk/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op({ script: '../x.mjs' }) }), { registry, fileExists: allExist }), /repo-relative/);
  assert.throws(() => validateCatalog(catalog({ 'note.publish': op() }), { registry, fileExists: () => false }), /does not exist/);
  assert.throws(() => validateCatalog(catalog({ NotePublish: op() }), { registry, fileExists: allExist }), /kebab-case/);
  // API 経路（playwright:false）は registry を要求しない
  assert.equal(validateCatalog(catalog({ 'ig.publish': op({ service: 'instagram-graph', script: 'scripts/ig-graph-publish.mjs', playwright: false }) }), { registry, fileExists: allExist }), true);
});

test('operationFromCatalog / validateArgs / argsToFlags', () => {
  const cat = catalog({ 'note.publish': op() });
  const o = operationFromCatalog(cat, 'note.publish');
  assert.equal(o.id, 'note.publish');
  assert.throws(() => operationFromCatalog(cat, 'note.delete'), /CI_WRITE_UNKNOWN_OPERATION/);
  assert.deepEqual(validateArgs(o, '{"slug":"abc","price":500,"force":true}'), { slug: 'abc', price: 500, force: true });
  assert.deepEqual(validateArgs(o, { slug: 'abc' }), { slug: 'abc' });
  assert.throws(() => validateArgs(o, {}), /"slug" is required/);
  assert.throws(() => validateArgs(o, { slug: 'a', extra: 1 }), /unknown arg/);
  assert.throws(() => validateArgs(o, { slug: 'a', price: '500' }), /must be a number/);
  assert.throws(() => validateArgs(o, { slug: 'a\nb' }), /single-line/);
  assert.throws(() => validateArgs(o, 'not json'), /not valid JSON/);
  assert.deepEqual(argsToFlags({ slug: 'abc', price: 500, force: true, quiet: false }), ['--force', '--price', '500', '--slug', 'abc']);
  assert.deepEqual(buildPlanCommand(o, { slug: 'abc' }), ['node', 'scripts/note-publish.mjs', '--dry-run', '--json', '--slug', 'abc']);
  assert.deepEqual(buildCommitCommand(o, { slug: 'abc' }), ['node', 'scripts/note-publish.mjs', '--commit', '--slug', 'abc']);
});

test('decideExecution: plan-only / hash-mismatch / execute', () => {
  const plan = '{"target":"abc","changes":1}';
  const h = planHash(plan);
  assert.deepEqual(decideExecution({ commit: false, expectedHash: h, planJsonText: plan }), { execute: false, reason: 'plan-only', hash: h });
  const mm = decideExecution({ commit: true, expectedHash: planHash('{"target":"abc","changes":2}'), planJsonText: plan });
  assert.equal(mm.execute, false); assert.equal(mm.reason, 'hash-mismatch');
  assert.equal(decideExecution({ commit: true, expectedHash: '', planJsonText: plan }).reason, 'hash-mismatch');
  assert.deepEqual(decideExecution({ commit: true, expectedHash: h, planJsonText: plan }), { execute: true, reason: 'execute', hash: h });
});

test('gateEnvFor: plan は全 0・commit は本物の hash のみ', () => {
  assert.deepEqual(gateEnvFor('plan'), { [WRITE_PLAN_HASH_ENV]: PLAN_ONLY_HASH });
  const h = 'f'.repeat(64);
  assert.deepEqual(gateEnvFor('commit', h), { [WRITE_PLAN_HASH_ENV]: h });
  assert.throws(() => gateEnvFor('commit', PLAN_ONLY_HASH), /real plan hash/);
  assert.throws(() => gateEnvFor('commit', 'abc'), /real plan hash/);
  assert.throws(() => gateEnvFor('verify'), /unknown stage/);
});
