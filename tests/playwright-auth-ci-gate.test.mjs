// playwright-auth-ci-gate.test.mjs — CI で resolver が「実 profile を使わない・allowlist 外 script を拒否する」
// ことを固定する回帰テスト（registry version 2・2026-09-21）。
//
// なぜ: 以前は呼び出し側が isCI を渡さない限り CI 判定が素通りしていた（DOBOKU_AUTH_ROOT=/tmp/x で
// 何でも動く）。暗号化 state を CI へ持ち込む以上、「read-only は資格情報でなく allowlist が担保する」
// をコードで固定しないと publish 系が同じ復元 state で動いてしまう。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectCI,
  validateAuthRoot,
  resolveAuthRoot,
  resolveProfileDir,
  resolveStatePath,
  ensureAuthDirectories,
  assertCIScriptAllowed,
  invokedScriptRelative,
  validateCIBlock,
  getCIAuthStateConfig,
  loadAuthRegistry,
  CI_SESSION_MODE_ENV,
  CI_WRITE_PLAN_HASH_ENV,
} from '../scripts/lib/playwright-auth-profile.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CI_ENV = { GITHUB_ACTIONS: 'true' };
const HASH = 'a'.repeat(64);

function tmp(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }

test('detectCI: GITHUB_ACTIONS / CI のどちらかが true で CI', () => {
  assert.equal(detectCI({}), false);
  assert.equal(detectCI({ GITHUB_ACTIONS: 'true' }), true);
  assert.equal(detectCI({ CI: 'true' }), true);
  assert.equal(detectCI({ CI: 'false' }), false);
});

test('CI は自動検出され、mode env が無ければ一時 root でも拒否する', () => {
  const dir = tmp('doboku-ci-gate-');
  try {
    assert.throws(
      () => resolveAuthRoot({ overrideRoot: dir, env: CI_ENV, homeDir: '/home/tester', platform: 'linux' }),
      /AUTH_PROFILE_UNAVAILABLE_IN_CI/,
    );
    // OS 既定 root（実 profile の置き場）は CI で決して返さない
    assert.throws(
      () => resolveAuthRoot({ env: CI_ENV, homeDir: '/home/tester', platform: 'linux' }),
      /AUTH_PROFILE_UNAVAILABLE_IN_CI/,
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CI + encrypted-state: RUNNER_TEMP 配下の root だけ許可、外は拒否', () => {
  const runnerTemp = tmp('doboku-runner-temp-');
  const elsewhere = tmp('doboku-elsewhere-');
  try {
    const env = { ...CI_ENV, [CI_SESSION_MODE_ENV]: 'encrypted-state', RUNNER_TEMP: runnerTemp };
    const inside = join(runnerTemp, 'doboku-auth');
    assert.equal(validateAuthRoot(inside, { env, tmpDir: '/nonexistent-tmp' }).ok, true);
    assert.equal(resolveAuthRoot({ overrideRoot: inside, env, homeDir: '/home/tester', platform: 'linux', tmpDir: '/nonexistent-tmp' }), inside);
    // RUNNER_TEMP 外・tmpdir 外（tmpDir を実在しない場所に差し替えて判定を固定）
    const r = validateAuthRoot(join(elsewhere, 'x'), { env, tmpDir: '/nonexistent-tmp' });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'AUTH_PROFILE_UNAVAILABLE_IN_CI');
    // mode の値が違えば拒否
    assert.equal(validateAuthRoot(inside, { env: { ...env, [CI_SESSION_MODE_ENV]: 'profile' }, tmpDir: '/nonexistent-tmp' }).ok, false);
  } finally {
    rmSync(runnerTemp, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test('CI + encrypted-state: os.tmpdir() 配下も許可（RUNNER_TEMP 未設定の CI 互換）', () => {
  const base = tmp('doboku-tmp-base-');
  try {
    const env = { ...CI_ENV, [CI_SESSION_MODE_ENV]: 'encrypted-state' };
    assert.equal(validateAuthRoot(join(base, 'auth'), { env, tmpDir: base }).ok, true);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('allowlist: read-only script は許可・未登録 script は拒否・write は plan hash が要る・mode none は拒否', () => {
  const runnerTemp = tmp('doboku-runner-temp-');
  try {
    const env = { ...CI_ENV, [CI_SESSION_MODE_ENV]: 'encrypted-state', RUNNER_TEMP: runnerTemp };
    const base = { cwd: REPO_ROOT, repoRoot: REPO_ROOT, overrideRoot: join(runnerTemp, 'doboku-auth'), env, homeDir: '/home/tester', platform: 'linux', tmpDir: '/nonexistent-tmp' };

    const ok = resolveProfileDir('note', { ...base, invokedScript: 'scripts/note-sales-fetch.mjs' });
    assert.equal(ok, join(runnerTemp, 'doboku-auth', 'profiles', 'playwright-note-profile'));
    assert.equal(resolveStatePath('note', { ...base, invokedScript: 'scripts/note-sales-fetch.mjs' }), join(runnerTemp, 'doboku-auth', 'states', 'playwright-note-state.json'));

    assert.throws(() => resolveProfileDir('note', { ...base, invokedScript: 'scripts/note-delete-note.mjs' }), /AUTH_CI_SCRIPT_NOT_ALLOWLISTED/);
    assert.throws(() => resolveProfileDir('note', { ...base, invokedScript: 'scripts/note-publish.mjs' }), /AUTH_CI_WRITE_REQUIRES_PLAN_HASH/);
    assert.throws(() => resolveProfileDir('note', { ...base, env: { ...env, [CI_WRITE_PLAN_HASH_ENV]: 'not-a-hash' }, invokedScript: 'scripts/note-publish.mjs' }), /AUTH_CI_WRITE_REQUIRES_PLAN_HASH/);
    assert.equal(
      resolveProfileDir('note', { ...base, env: { ...env, [CI_WRITE_PLAN_HASH_ENV]: HASH }, invokedScript: 'scripts/note-publish.mjs' }),
      join(runnerTemp, 'doboku-auth', 'profiles', 'playwright-note-profile'),
    );
    // 認証 CLI 自身は常に許可
    assert.equal(typeof resolveProfileDir('kdp', { ...base, invokedScript: 'scripts/playwright-auth.mjs' }), 'string');
    // mode:none のサービス（moshimo）は CI で一切許可しない
    assert.throws(() => resolveProfileDir('moshimo', { ...base, invokedScript: 'scripts/affiliate-status.mjs' }), /AUTH_CI_MODE_NONE/);
    // instagram は 2026-09-21 から encrypted-state（Meta 利用制限で Graph API 不可）。照合は read、予約投稿は write
    assert.equal(typeof resolveProfileDir('instagram', { ...base, invokedScript: 'scripts/verify-ig-status.mjs' }), 'string');
    assert.throws(() => resolveProfileDir('instagram', { ...base, invokedScript: '.claude/skills/social/publish-ig-bs/publish-ig-bs.ts' }), /AUTH_CI_WRITE_REQUIRES_PLAN_HASH/);
    // ensureAuthDirectories も同じゲートを通る（書き込み側の入口）
    assert.throws(() => ensureAuthDirectories('coconala', { ...base, invokedScript: 'scripts/coconala-publish.mjs' }), /AUTH_CI_WRITE_REQUIRES_PLAN_HASH/);
    assert.equal(existsSync(join(runnerTemp, 'doboku-auth', 'profiles', 'playwright-coconala-profile')), false, '拒否時はディレクトリを作らない');
  } finally { rmSync(runnerTemp, { recursive: true, force: true }); }
});

test('CI 以外では allowlist を見ない（ローカル挙動は不変）', () => {
  const dir = tmp('doboku-local-');
  try {
    const options = { cwd: REPO_ROOT, repoRoot: REPO_ROOT, overrideRoot: dir, env: {}, homeDir: '/home/tester', platform: 'linux', invokedScript: 'scripts/note-publish.mjs' };
    assert.equal(resolveProfileDir('note', options), join(dir, 'profiles', 'playwright-note-profile'));
    assert.equal(assertCIScriptAllowed('note', { ci: { mode: 'none' } }, { env: {} }).kind, 'not-ci');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('invokedScriptRelative: repo 相対 posix・repo 外は null', () => {
  assert.equal(invokedScriptRelative('/repo', '/repo/scripts/x.mjs'), 'scripts/x.mjs');
  assert.equal(invokedScriptRelative('/repo', '/repo/.claude/skills/social/publish-x/publish-x.ts'), '.claude/skills/social/publish-x/publish-x.ts');
  assert.equal(invokedScriptRelative('/repo', '/elsewhere/scripts/x.mjs'), null);
  assert.equal(invokedScriptRelative('/repo', undefined), null);
});

test('validateCIBlock: 不正な ci ブロックを拒否する', () => {
  const good = { stateFileName: 's.json', ci: { mode: 'encrypted-state', enabled: true, canary: false, operations: ['read'], cron: '0 0 * * 1', readOnlyScripts: ['scripts/a.mjs'], writeScripts: [], stateDomains: ['example.com'] } };
  assert.equal(validateCIBlock('svc', good), true);
  const bad = (patch, re) => assert.throws(() => validateCIBlock('svc', { ...good, ci: { ...good.ci, ...patch } }), re);
  bad({ mode: 'profile' }, /ci\.mode/);
  bad({ cron: null }, /ci\.cron/);
  bad({ cron: '0 0 * *' }, /ci\.cron/);
  bad({ stateDomains: [] }, /stateDomains/);
  bad({ writeScripts: ['scripts/w.mjs'] }, /writeScripts must be empty/);
  bad({ operations: ['write'] }, /operations/);
  bad({ readOnlyScripts: ['/abs/path.mjs'] }, /repo-relative/);
  assert.throws(() => validateCIBlock('svc', { stateFileName: null, ci: good.ci }), /stateFileName required/);
  assert.equal(validateCIBlock('svc', { stateFileName: null, ci: { mode: 'none', enabled: false, canary: false, operations: ['read'], cron: null, readOnlyScripts: [], writeScripts: [], stateDomains: [] } }), true);
});

test('loadAuthRegistry: version 2 は全サービスに ci ブロック必須', () => {
  const dir = tmp('doboku-registry-v2-');
  try {
    const path = join(dir, 'registry.json');
    writeFileSync(path, JSON.stringify({ version: 2, services: { note: { profileDirName: 'p', stateFileName: null, sessionMode: 'profile' } } }));
    assert.throws(() => loadAuthRegistry({ cwd: dir, registryPath: path }), /AUTH_REGISTRY_CI_BLOCK_REQUIRED/);
    writeFileSync(path, JSON.stringify({ version: 1, services: { note: { profileDirName: 'p', stateFileName: null, sessionMode: 'profile' } } }));
    assert.equal(loadAuthRegistry({ cwd: dir, registryPath: path }).services.note.profileDirName, 'p');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('redactAuthDiagnostic: 公開 recipient は伏せず、秘密 identity は伏せる', async () => {
  const { redactAuthDiagnostic } = await import('../scripts/lib/playwright-auth-profile.mjs');
  const rec = 'age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs3290gq';
  const out = redactAuthDiagnostic({ recipient: rec, identity: 'AGE-SECRET-KEY-1QYQSZQGPQYQSZQGPQYQSZQGPQYQSZQGPQYQSZQGPQYQSZQGPQYQS3290GQ', other: rec });
  assert.equal(out.recipient, rec);
  assert.equal(out.identity, '[REDACTED]');
  assert.equal(out.other, '[REDACTED]');
});

test('getCIAuthStateConfig: recipient は age 公開鍵形式のみ', () => {
  assert.equal(getCIAuthStateConfig({ ciAuthState: null }).ageRecipient, null);
  assert.equal(getCIAuthStateConfig({ ciAuthState: { ageRecipient: 'age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs3290gq' } }).bucket, 'private');
  assert.throws(() => getCIAuthStateConfig({ ciAuthState: { ageRecipient: 'AGE-SECRET-KEY-1XXXX' } }), /INVALID_RECIPIENT/);
  assert.throws(() => getCIAuthStateConfig({ ciAuthState: { keyPrefix: 'auth-state' } }), /INVALID_PREFIX/);
});

test('実 registry: version 2・allowlist の script は全て実在・write 系 basename は readOnlyScripts に無い', () => {
  const registry = loadAuthRegistry({ cwd: REPO_ROOT });
  assert.equal(registry.version, 2);
  const writeLike = /(^|[-_])(publish|delete|update|edit|price|pause|rate|upload|post|apply|create|attach|append|insert|add|reply|replies|swap|convert|reanchor|sync-tags|thumb|profile)([-_.]|$)/;
  for (const [id, entry] of Object.entries(registry.services)) {
    for (const s of [...entry.ci.readOnlyScripts, ...entry.ci.writeScripts]) {
      assert.equal(existsSync(join(REPO_ROOT, s)), true, `${id}: ${s} が存在しない`);
    }
    for (const s of entry.ci.readOnlyScripts) {
      const base = s.split('/').at(-1);
      assert.equal(writeLike.test(base), false, `${id}: ${s} は write 系の名前なのに readOnlyScripts にある`);
    }
    if (entry.ci.mode === 'encrypted-state') assert.ok(entry.stateFileName, `${id}: stateFileName`);
  }
  getCIAuthStateConfig(registry);
});

test('共有セッション lib は CI 環境でも import だけでは resolver を呼ばない（オフライン検査を巻き込まない）', async () => {
  // 2026-09-21 PR #549: coconala-session.mjs が import 時に resolveProfileDir を呼び、ブラウザを開かない
  // check-coconala-blog（ci:true）まで AUTH_PROFILE_UNAVAILABLE_IN_CI で落ちた。profile は launch の瞬間に解決する。
  const { spawnSync } = await import('node:child_process');
  for (const lib of ['scripts/lib/note-browser.mjs', 'scripts/lib/coconala-session.mjs', 'scripts/lib/brain-session.mjs', 'scripts/lib/google-console-browser.mjs', 'scripts/lib/asp-browser.mjs']) {
    const r = spawnSync(process.execPath, ['-e', `import(${JSON.stringify('./' + lib)}).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); })`], {
      cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', CI: 'true', DOBOKU_AUTH_SESSION_MODE: '', DOBOKU_AUTH_ROOT: '' },
    });
    assert.equal(r.status, 0, `${lib}: import が CI 環境で失敗した\n${r.stderr}`);
  }
});
