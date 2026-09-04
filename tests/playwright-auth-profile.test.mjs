// scripts/lib/playwright-auth-profile.mjs のテスト（DN-0108 Phase 01）。
//
// 実 HOME・実 profile・外部ネットワークは使わない。すべて temporary directory と
// options で渡す cwd/homeDir/env で完結させる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  resolveDefaultAuthRoot,
  resolveAuthRoot,
  resolveProfileDir,
  resolveStatePath,
  resolveLockPath,
  validateAuthRoot,
  loadAuthRegistry,
  getServiceEntry,
  ensureAuthDirectories,
  authRootExists,
  redactAuthDiagnostic,
  looksLikeSecretKey,
} from '../scripts/lib/playwright-auth-profile.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

function makeTmpDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

// テスト用の最小 registry を temporary directory に書き出し、そのディレクトリを cwd として使う。
function writeFixtureRegistry(dir, servicesOverride) {
  const services = servicesOverride ?? {
    note: { profileDirName: 'playwright-note-profile', stateFileName: null, loginUrl: 'https://example.com/login', checkUrl: 'https://example.com', accountConfigPath: null, sessionMode: 'profile', interactiveLoginRequired: true, ciAllowed: false, notes: null },
    a8: { profileDirName: 'playwright-a8-profile', stateFileName: 'playwright-a8-state.json', loginUrl: 'https://example.com/login', checkUrl: 'https://example.com', accountConfigPath: null, sessionMode: 'profile-plus-state', interactiveLoginRequired: true, ciAllowed: false, notes: null },
  };
  const configDir = join(dir, '.claude', 'config');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, 'playwright-auth-profiles.json'), JSON.stringify({ version: 1, services }, null, 2), 'utf8');
}

// --- resolveDefaultAuthRoot ------------------------------------------------

test('Windows: LOCALAPPDATA があればそれを使う', () => {
  const root = resolveDefaultAuthRoot({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' }, homeDir: 'C:\\Users\\tester' });
  assert.match(root, /AppData[\\/]Local[\\/]doboku-note[\\/]playwright-auth$/);
});

test('Windows: LOCALAPPDATA が無ければ homeDir/AppData/Local へフォールバック', () => {
  const root = resolveDefaultAuthRoot({ platform: 'win32', env: {}, homeDir: 'C:\\Users\\tester' });
  assert.match(root, /AppData[\\/]Local[\\/]doboku-note[\\/]playwright-auth$/);
  assert.match(root, /tester/);
});

test('macOS: space を含む Application Support パスを組み立てる', () => {
  const root = resolveDefaultAuthRoot({ platform: 'darwin', env: {}, homeDir: '/Users/test user' });
  assert.equal(root, '/Users/test user/Library/Application Support/doboku-note/playwright-auth');
});

test('Linux: XDG_STATE_HOME があればそれを使う', () => {
  const root = resolveDefaultAuthRoot({ platform: 'linux', env: { XDG_STATE_HOME: '/custom/state' }, homeDir: '/home/tester' });
  assert.equal(root, '/custom/state/doboku-note/playwright-auth');
});

test('Linux: XDG_STATE_HOME が無ければ homeDir/.local/state へフォールバック', () => {
  const root = resolveDefaultAuthRoot({ platform: 'linux', env: {}, homeDir: '/home/tester' });
  assert.equal(root, '/home/tester/.local/state/doboku-note/playwright-auth');
});

test('homeDir が空なら例外', () => {
  assert.throws(() => resolveDefaultAuthRoot({ platform: 'linux', env: {}, homeDir: '' }), /AUTH_ROOT_HOME_DIR_REQUIRED/);
});

// --- validateAuthRoot -------------------------------------------------------

test('相対パスは拒否', () => {
  const r = validateAuthRoot('relative/path');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_NOT_ABSOLUTE');
});

test('空文字は拒否', () => {
  const r = validateAuthRoot('');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_EMPTY');
});

test('repo root 直下は拒否', () => {
  const repoRoot = process.platform === 'win32' ? 'C:\\repo\\doboku-note' : '/repo/doboku-note';
  const r = validateAuthRoot(repoRoot, { repoRoot });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_INSIDE_REPO');
});

test('repo 配下（worktree の .local 含む）は拒否', () => {
  const repoRoot = process.platform === 'win32' ? 'C:\\repo\\doboku-note' : '/repo/doboku-note';
  const inside = join(repoRoot, '.local', 'playwright-note-profile');
  const r = validateAuthRoot(inside, { repoRoot });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_INSIDE_REPO');
});

test('.git ディレクトリ配下は拒否（repo 配下判定でカバー）', () => {
  const repoRoot = process.platform === 'win32' ? 'C:\\repo\\doboku-note' : '/repo/doboku-note';
  const inside = join(repoRoot, '.git', 'auth');
  const r = validateAuthRoot(inside, { repoRoot });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_INSIDE_REPO');
});

test('home root そのものは拒否', () => {
  const homeDir = process.platform === 'win32' ? 'C:\\Users\\tester' : '/home/tester';
  const r = validateAuthRoot(homeDir, { homeDir });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_IS_HOME_ROOT');
});

test('filesystem root（ドライブ直下・POSIX root）は拒否', () => {
  const root = process.platform === 'win32' ? 'C:\\' : '/';
  const r = validateAuthRoot(root);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_ROOT_IS_FILESYSTEM_ROOT');
});

test('安全な絶対パスは許可', () => {
  const safe = process.platform === 'win32' ? 'C:\\Users\\tester\\AppData\\Local\\doboku-note\\playwright-auth' : '/home/tester/.local/state/doboku-note/playwright-auth';
  const r = validateAuthRoot(safe, { homeDir: process.platform === 'win32' ? 'C:\\Users\\tester' : '/home/tester' });
  assert.equal(r.ok, true);
});

test('CI では明示 temporary root 以外を拒否', () => {
  const somewhere = process.platform === 'win32' ? 'C:\\ci\\auth' : '/ci/auth';
  const r = validateAuthRoot(somewhere, { isCI: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'AUTH_PROFILE_UNAVAILABLE_IN_CI');
});

test('CI でも明示された temporary root 配下は許可', () => {
  const allowed = process.platform === 'win32' ? 'C:\\ci\\allowed' : '/ci/allowed';
  const inside = join(allowed, 'sub');
  const r = validateAuthRoot(inside, { isCI: true, allowTemporaryInCI: allowed });
  assert.equal(r.ok, true);
});

// --- resolveAuthRoot（override 経路） ---------------------------------------

test('DOBOKU_AUTH_ROOT override（絶対パス）が優先される', () => {
  const dir = makeTmpDir('doboku-auth-override-');
  try {
    const root = resolveAuthRoot({ overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' });
    assert.equal(root, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('相対 override は例外', () => {
  assert.throws(
    () => resolveAuthRoot({ overrideRoot: 'relative/dir', platform: 'linux', env: {}, homeDir: '/home/tester' }),
    /AUTH_ROOT_INVALID_OVERRIDE/,
  );
});

test('override 無しかつ CI なら例外', () => {
  assert.throws(
    () => resolveAuthRoot({ platform: 'linux', env: {}, homeDir: '/home/tester', isCI: true }),
    /AUTH_PROFILE_UNAVAILABLE_IN_CI/,
  );
});

// --- loadAuthRegistry / getServiceEntry -------------------------------------

test('registry を正しく読み込める', () => {
  const dir = makeTmpDir('doboku-auth-registry-');
  try {
    writeFixtureRegistry(dir);
    const registry = loadAuthRegistry({ cwd: dir });
    assert.ok(registry.services.note);
    assert.ok(registry.services.a8);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('未知の service ID は拒否', () => {
  const dir = makeTmpDir('doboku-auth-registry-');
  try {
    writeFixtureRegistry(dir);
    const registry = loadAuthRegistry({ cwd: dir });
    assert.throws(() => getServiceEntry('not-a-real-service', { registry }), /AUTH_UNKNOWN_SERVICE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('secret らしいキー（password）を含む registry は拒否', () => {
  const dir = makeTmpDir('doboku-auth-registry-secret-');
  try {
    writeFixtureRegistry(dir, {
      note: { profileDirName: 'playwright-note-profile', stateFileName: null, loginUrl: 'https://example.com', checkUrl: 'https://example.com', accountConfigPath: null, sessionMode: 'profile', interactiveLoginRequired: true, ciAllowed: false, notes: null, password: 'hunter2' },
    });
    assert.throws(() => loadAuthRegistry({ cwd: dir }), /AUTH_REGISTRY_SECRET_LIKE_KEY/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('looksLikeSecretKey: password/token/cookie/secret/recoveryCode を検出（大小文字・区切りゆれ吸収）', () => {
  assert.equal(looksLikeSecretKey('password'), true);
  assert.equal(looksLikeSecretKey('apiToken'), true);
  assert.equal(looksLikeSecretKey('SESSION_COOKIE'), true);
  assert.equal(looksLikeSecretKey('client-secret'), true);
  assert.equal(looksLikeSecretKey('recoveryCode'), true);
  assert.equal(looksLikeSecretKey('recovery_code'), true);
  assert.equal(looksLikeSecretKey('profileDirName'), false);
  assert.equal(looksLikeSecretKey('loginUrl'), false);
});

// --- resolveProfileDir / resolveStatePath / resolveLockPath ----------------

test('resolveProfileDir: service の profileDirName を auth root 配下へ解決', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    const options = { cwd: dir, overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' };
    const profileDir = resolveProfileDir('note', options);
    assert.equal(profileDir, join(dir, 'profiles', 'playwright-note-profile'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Phase 02の4サービスは同じ一時auth rootから別profileへ解決する', () => {
  const dir = makeTmpDir('doboku-auth-phase02-');
  try {
    for (const [service, profileName] of [
      ['note', 'playwright-note-profile'],
      ['brain', 'playwright-brain-profile'],
      ['coconala', 'playwright-coconala-profile'],
      ['kdp', 'playwright-kdp-profile'],
    ]) {
      const actual = resolveProfileDir(service, {
        cwd: REPO_ROOT,
        repoRoot: REPO_ROOT,
        overrideRoot: dir,
        homeDir: '/home/tester',
      });
      assert.equal(actual, join(dir, 'profiles', profileName));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Phase 02 runtimeはrepo相対profileを持たず共通resolverを参照する', () => {
  const files = [
    'scripts/lib/note-browser.mjs',
    'scripts/lib/brain-session.mjs',
    'scripts/lib/coconala-session.mjs',
    'scripts/kdp-batch.mjs',
    'scripts/kdp-publish.mjs',
    'scripts/kdp-report.mjs',
    'scripts/check-note-membership.mjs',
    'scripts/coconala-rate-buyer.mjs',
    'scripts/coconala-research.mjs',
    'scripts/scout-coconala-blogs.mjs',
    'scripts/scout-coconala-competitors.mjs',
    ...[
      'account-name', 'append-cta', 'append-list-links', 'article-price-sweep',
      'attach-file', 'comment-reply', 'delete-note', 'edit-magazine', 'edit-session',
      'magazine-add-articles', 'magazine-cover', 'magazine-create',
      'membership-plan-create', 'membership-plan-edit', 'membership-plan-status',
      'publish-discover', 'publish', 'sales-fetch', 'sync-tags', 'update-body', 'update-cover',
    ].map((name) => `scripts/note-${name}.mjs`),
  ];
  for (const file of files) {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');
    assert.doesNotMatch(source, /\.local\/playwright-(?:note|brain|coconala|kdp)-profile/, file);
    assert.match(source, /playwright-auth-profile\.mjs/, file);
  }
});

test('Phase 03の6サービスはprofile/state制約を同じauth rootで区別する', () => {
  const dir = makeTmpDir('doboku-auth-phase03-');
  try {
    const options = {
      cwd: REPO_ROOT,
      repoRoot: REPO_ROOT,
      overrideRoot: dir,
      homeDir: '/home/tester',
    };
    for (const service of ['x', 'instagram', 'google', 'a8', 'moshimo', 'afb']) {
      assert.equal(resolveProfileDir(service, options), join(dir, 'profiles', `playwright-${service === 'instagram' ? 'ig-bs' : service}-profile`));
    }
    assert.equal(resolveStatePath('x', options), null);
    assert.equal(resolveStatePath('instagram', options), null);
    assert.equal(resolveStatePath('google', options), null);
    assert.equal(resolveStatePath('a8', options), join(dir, 'states', 'playwright-a8-state.json'));
    assert.equal(resolveStatePath('moshimo', options), join(dir, 'states', 'playwright-moshimo-state.json'));
    assert.equal(resolveStatePath('afb', options), join(dir, 'states', 'playwright-afb-state.json'));

    const registry = loadAuthRegistry({ cwd: REPO_ROOT });
    assert.equal(registry.services.a8.sessionMode, 'profile-plus-state');
    assert.equal(registry.services.afb.sessionMode, 'same-process');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Phase 03 runtimeは共通resolverを使い、account configはlogical service IDだけを持つ', () => {
  const files = [
    'scripts/lib/google-console-browser.mjs',
    'scripts/verify-ig-status.mjs',
    'scripts/x-article-publish.mjs',
    'scripts/x-schedule-guard.mjs',
    'scripts/x-sync-status.mjs',
    'scripts/x-thread-replies.mjs',
    '.claude/skills/ads/scout-asp/scripts/a8-browser.ts',
    '.claude/skills/ads/scout-asp/scripts/login.mjs',
    '.claude/skills/social/publish-ig-bs/publish-ig-bs.ts',
    '.claude/skills/social/publish-x/publish-x.ts',
    '.claude/skills/social/x-repost/x-repost-discover.ts',
    '.claude/skills/social/x-repost/x-repost-exec.ts',
  ];
  for (const file of files) {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');
    assert.match(source, /playwright-auth-profile\.mjs/, file);
    assert.doesNotMatch(source, /\.local\/playwright-[A-Za-z0-9_-]+-profile/, file);
  }

  for (const [file, expected] of [
    ['.claude/config/x-account.json', 'x'],
    ['.claude/config/ig-account.json', 'instagram'],
  ]) {
    const account = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf8'));
    assert.equal(account.authService, expected);
    assert.equal('playwrightProfile' in account, false);
  }
});

test('resolveStatePath: stateFileName を持たない service は null', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    const options = { cwd: dir, overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' };
    assert.equal(resolveStatePath('note', options), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveStatePath: stateFileName を持つ service はパスを返す', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    const options = { cwd: dir, overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' };
    const statePath = resolveStatePath('a8', options);
    assert.equal(statePath, join(dir, 'states', 'playwright-a8-state.json'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveLockPath: 未知 service は拒否', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    const options = { cwd: dir, overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' };
    assert.throws(() => resolveLockPath('not-real', options), /AUTH_UNKNOWN_SERVICE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ensureAuthDirectories / authRootExists（filesystem 書き込みの境界） ----

test('path 照会だけでは filesystem を作らない（resolveProfileDir はディレクトリを作らない）', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    const options = { cwd: dir, overrideRoot: dir, platform: 'linux', env: {}, homeDir: '/home/tester' };
    const profileDir = resolveProfileDir('note', options);
    assert.equal(existsSync(profileDir), false, 'resolveProfileDir はディレクトリを作成してはいけない');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ensureAuthDirectories は明示的に呼んだときだけディレクトリを作る', () => {
  const dir = makeTmpDir('doboku-auth-root-');
  try {
    writeFixtureRegistry(dir);
    // overrideRoot は tmp dir 自体ではなく配下の未作成パスにする（mkdtempSync が作る
    // tmp dir そのものを root にすると authRootExists が最初から true になってしまう）。
    const authRoot = join(dir, 'auth-root');
    const options = { cwd: dir, overrideRoot: authRoot, platform: 'linux', env: {}, homeDir: '/home/tester' };
    assert.equal(authRootExists(options), false);
    const paths = ensureAuthDirectories('note', options);
    assert.equal(existsSync(paths.profileDir), true);
    assert.equal(existsSync(paths.lockPath.replace(/[^/\\]+$/, '')), true, 'locks ディレクトリが存在すること');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- redactAuthDiagnostic ---------------------------------------------------

test('redactAuthDiagnostic: secret らしいキーの値は伏せる', () => {
  const out = redactAuthDiagnostic({ password: 'hunter2', loginUrl: 'https://example.com' });
  assert.equal(out.password, '[REDACTED]');
  assert.equal(out.loginUrl, 'https://example.com');
});

test('redactAuthDiagnostic: 長い token らしい文字列は伏せる', () => {
  const tokenLike = 'a'.repeat(50);
  assert.equal(redactAuthDiagnostic(tokenLike), '[REDACTED]');
});

test('redactAuthDiagnostic: 通常の日本語説明文は素通し', () => {
  const text = 'これはユーザーが読む説明文で、40文字を超えても伏せられるべきではない普通の文章です。';
  assert.equal(redactAuthDiagnostic(text), text);
});
