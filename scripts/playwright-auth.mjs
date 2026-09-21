#!/usr/bin/env node
/** Windows・Mac共通のPlaywright認証profile診断・login・status・安全移行CLI。 */
import {
  accessSync,
  chmodSync,
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  PROFILE_CACHE_SUBDIRS,
  detectCI,
  ensureAuthDirectories,
  getCIAuthStateConfig,
  legacyWindowsAuthRoots,
  loadAuthRegistry,
  redactAuthDiagnostic,
  resolveAuthRoot,
  resolveLockPath,
  resolveMetadataPath,
  resolveProfileDir,
  resolveStatePath,
  validateAuthRoot,
} from './lib/playwright-auth-profile.mjs';
import { acquireAuthLock, readAuthLock, withAuthLock } from './lib/playwright-auth-lock.mjs';
import { captureAuthSnapshot, classifyAuthSnapshot, loadAuthAdapter, pollAuthStatus } from './lib/playwright-auth-adapters.mjs';
import { mergeLeanOptions } from './lib/playwright-launch.mjs';
import {
  attachCISession,
  decideWriteback,
  decryptState,
  encryptState,
  filterStateForService,
  getManifest,
  getState,
  nextManifest,
  objectKeys,
  planCIServices,
  putStateWithCAS,
  sha256Hex,
  validateExportedState,
} from './lib/playwright-auth-state.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `Playwright auth CLI

Usage:
  npm run auth:paths -- [--service <id>] [--json]
  npm run auth:doctor -- [--service <id>] [--json]
  npm run auth:login -- --service <id> [--json] [--timeout-ms <ms>]
  npm run auth:status -- (--service <id>|--all) [--json]
  npm run auth:migrate -- --service <id> [--commit] [--json]
  npm run auth:keygen -- [--force] [--json]
  npm run auth:export -- --service <id> [--json] [--timeout-ms <ms>]
  npm run auth:ci-restore -- --service <id> [--json]
  npm run auth:ci-writeback -- --service <id> --collector-exit <n> [--json]
  npm run auth:ci-plan -- --event <schedule|workflow_dispatch> [--schedule <cron>] [--service <id|all>] [--mode collect|probe-only] --json

Rules:
  login は headed・人間入力のみ。status はread-only。migrateは既定dry-runでsourceを削除しない。
  password/Cookie/token/2FAを引数・出力・Gitへ保存しない。afbの別process statusはunsupported。
  keygen/export はMac専用。ci-restore/ci-writebackはCI専用（AUTH_CI_ONLY）。`;

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

const VALUE_FLAGS = ['--service', '--timeout-ms', '--event', '--schedule', '--mode', '--collector-exit'];

export function parseAuthArgs(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'help';
  const rest = argv.slice(command === 'help' ? 0 : 1);
  const positional = rest.filter((arg, index) => !arg.startsWith('-') && !VALUE_FLAGS.includes(rest[index - 1]));
  return {
    command,
    service: valueAfter(rest, '--service') ?? positional[0] ?? null,
    all: rest.includes('--all'),
    commit: rest.includes('--commit'),
    json: rest.includes('--json'),
    help: rest.includes('--help') || rest.includes('-h') || command === 'help',
    timeoutMs: Number(valueAfter(rest, '--timeout-ms') ?? 600000),
    force: rest.includes('--force'),
    headed: rest.includes('--headed'),
    event: valueAfter(rest, '--event'),
    schedule: valueAfter(rest, '--schedule'),
    mode: valueAfter(rest, '--mode'),
    collectorExit: valueAfter(rest, '--collector-exit'),
  };
}

function authOptions(context = {}) {
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  return {
    cwd: repoRoot,
    repoRoot,
    env: context.env ?? process.env,
    homeDir: context.homeDir,
    overrideRoot: context.overrideRoot,
    isCI: context.isCI ?? false,
    allowTemporaryInCI: context.allowTemporaryInCI,
  };
}

function serviceIds(context = {}, selected = null) {
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const ids = Object.keys(loadAuthRegistry({ cwd: repoRoot }).services);
  if (!selected) return ids;
  if (!ids.includes(selected)) throw new Error(`未知のservice: ${selected}`);
  return [selected];
}

export function inspectPaths(context = {}, selected = null) {
  const options = authOptions(context);
  const root = resolveAuthRoot(options);
  const validation = validateAuthRoot(root, options);
  const services = serviceIds(context, selected).map((service) => ({
    service,
    profilePath: resolveProfileDir(service, options),
    statePath: resolveStatePath(service, options),
    lockPath: resolveLockPath(service, options),
    metadataPath: resolveMetadataPath(service, options),
  }));
  return { ok: validation.ok, command: 'paths', authRoot: root, validation, services };
}

function existingAncestor(path) {
  let cursor = path;
  while (!existsSync(cursor) && dirname(cursor) !== cursor) cursor = dirname(cursor);
  return cursor;
}

function pathSize(path) {
  if (!existsSync(path)) return 0;
  const stat = lstatSync(path);
  if (!stat.isDirectory()) return stat.size;
  return readdirSync(path).reduce((sum, entry) => sum + pathSize(join(path, entry)), 0);
}

function isNonEmpty(path) {
  if (!existsSync(path)) return false;
  return lstatSync(path).isDirectory() ? readdirSync(path).length > 0 : true;
}

function hasBrowserLock(profilePath) {
  return ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].some((name) => {
    try { lstatSync(join(profilePath, name)); return true; } catch { return false; }
  });
}

function legacyPaths(repoRoot, entry) {
  const legacyRoot = join(repoRoot, '.local');
  return {
    label: 'repo .local',
    profilePath: join(legacyRoot, entry.profileDirName),
    statePath: entry.stateFileName ? join(legacyRoot, entry.stateFileName) : null,
  };
}

/** パス中の `*` セグメントを実在ディレクトリで展開する（無ければ空）。 */
function expandStar(path) {
  if (!path.includes('*')) return existsSync(path) ? [path] : [];
  const parts = path.split(/[\\/]/);
  const i = parts.findIndex((p) => p.includes('*'));
  const parent = parts.slice(0, i).join(sep);
  const escaped = parts[i].split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('^' + escaped.join('.*') + '$', 'i');
  let names = [];
  try {
    names = readdirSync(parent, { withFileTypes: true }).filter((e) => e.isDirectory() && re.test(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
  const rest = parts.slice(i + 1).join(sep);
  return names.flatMap((n) => expandStar(rest ? join(parent, n, rest) : join(parent, n)));
}

/**
 * 移行元の候補を順に返す。repo `.local`（全 OS）→ Windows は旧既定 %LOCALAPPDATA% と
 * Codex（MSIX）の仮想化先。現在の auth root と同じ場所は候補から外す。
 */
function legacyCandidates(context, entry) {
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const options = authOptions(context);
  const out = [legacyPaths(repoRoot, entry)];
  const platform = context.platform ?? process.platform;
  if (platform === 'win32') {
    const currentRoot = resolveAuthRoot(options).toLowerCase();
    const homeDir = options.homeDir ?? process.env.USERPROFILE ?? process.env.HOME;
    for (const pattern of legacyWindowsAuthRoots({ env: options.env, homeDir })) {
      for (const root of expandStar(pattern)) {
        if (root.toLowerCase() === currentRoot) continue;
        out.push({
          label: /[\\/]Packages[\\/]/i.test(root) ? 'Codex (MSIX) sandbox' : 'legacy %LOCALAPPDATA%',
          profilePath: join(root, 'profiles', entry.profileDirName),
          statePath: entry.stateFileName ? join(root, 'states', entry.stateFileName) : null,
        });
      }
    }
  }
  return out;
}

const sourceHasData = (c) => existsSync(c.profilePath) || Boolean(c.statePath && existsSync(c.statePath));

/** ログイン実体の新しさ（Cookie DB の mtime。無ければ profile ディレクトリ）。候補が複数あるとき最新を運ぶ。 */
function loginMtimeMs(c) {
  for (const rel of ['Default/Network/Cookies', 'Default/Cookies', '']) {
    try {
      return lstatSync(rel ? join(c.profilePath, ...rel.split('/')) : c.profilePath).mtimeMs;
    } catch {}
  }
  return c.statePath && existsSync(c.statePath) ? lstatSync(c.statePath).mtimeMs : 0;
}

function pickNewestSource(candidates) {
  return candidates
    .filter(sourceHasData)
    .map((c) => ({ ...c, loginMtimeMs: loginMtimeMs(c) }))
    .sort((a, b) => b.loginMtimeMs - a.loginMtimeMs)[0] ?? null;
}

/** cpSync の filter: プロファイルのキャッシュ（再生成可）は移さない。ログイン実体だけ運ぶ。 */
function profileCopyFilter(sourceRoot) {
  const skip = PROFILE_CACHE_SUBDIRS.map((p) => p.split('/').join(sep).toLowerCase());
  return (src) => {
    const rel = relative(sourceRoot, src).toLowerCase();
    if (!rel) return true;
    return !skip.some((s) => rel === s || rel.startsWith(s + sep));
  };
}

function inspectLock(service, options) {
  const lock = readAuthLock(service, { authOptions: options });
  if (!lock.exists) return { exists: false, state: 'none', metadata: null };
  if (!lock.metadata) return { exists: true, state: 'unreadable', metadata: null };
  let state = 'foreign-host';
  if (lock.metadata.hostname === hostname()) {
    try {
      process.kill(lock.metadata.pid, 0);
      state = 'active';
    } catch {
      state = 'stale-candidate';
    }
  }
  return { exists: true, state, metadata: lock.metadata };
}

export function inspectDoctor(context = {}, selected = null) {
  const options = authOptions(context);
  const paths = inspectPaths(context, selected);
  const registry = loadAuthRegistry({ cwd: context.repoRoot ?? REPO_ROOT });
  const ancestor = existingAncestor(paths.authRoot);
  let readable = false;
  let writable = false;
  try { accessSync(ancestor, constants.R_OK); readable = true; } catch {}
  try { accessSync(ancestor, constants.W_OK); writable = true; } catch {}
  let freeBytes = null;
  try { const stat = statfsSync(ancestor); freeBytes = stat.bavail * stat.bsize; } catch {}

  const services = paths.services.map((item) => {
    const entry = registry.services[item.service];
    const legacySources = legacyCandidates(context, entry).filter(sourceHasData);
    const legacyExists = legacySources.length > 0;
    const targetExists = existsSync(item.profilePath) || Boolean(item.statePath && existsSync(item.statePath));
    return {
      service: item.service,
      profileExists: existsSync(item.profilePath),
      stateExists: Boolean(item.statePath && existsSync(item.statePath)),
      legacyExists,
      legacySources: legacySources.map((c) => ({ label: c.label, profilePath: c.profilePath })),
      duplicateProfileLocations: legacyExists && targetExists,
      lock: inspectLock(item.service, options),
      note: 'profileExistsはauthenticatedを意味しない',
    };
  });
  const warnings = [];
  if ((context.env ?? process.env).DOBOKU_PROFILE_ROOT) {
    warnings.push('DOBOKU_PROFILE_ROOTはdeprecated。DOBOKU_AUTH_ROOTへ新しいOS外部auth rootを設定する');
  }
  if (!writable) warnings.push(`auth rootを作成できる権限がない: ${ancestor}`);
  for (const item of services) {
    for (const src of item.legacySources) {
      warnings.push(`${item.service}: ${src.label} に profile あり（${src.profilePath}）。auth:migrate を dry-run で確認する`);
    }
  }
  if (services.some((item) => item.lock.exists)) warnings.push('service lockあり。自動削除せずPID/hostnameを確認する');
  return {
    ok: paths.ok && readable && writable,
    command: 'doctor',
    authRoot: paths.authRoot,
    authRootExists: existsSync(paths.authRoot),
    checkedAncestor: ancestor,
    readable,
    writable,
    freeBytes,
    warnings,
    services,
  };
}

function migrationPlan(context, service) {
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const options = authOptions(context);
  const entry = loadAuthRegistry({ cwd: repoRoot }).services[service];
  if (!entry) throw new Error(`未知のservice: ${service}`);
  const candidates = legacyCandidates(context, entry);
  const source = pickNewestSource(candidates) ?? legacyPaths(repoRoot, entry);
  const skippedSources = candidates
    .filter((c) => sourceHasData(c) && c.profilePath !== source.profilePath)
    .map((c) => ({ label: c.label, profilePath: c.profilePath, loginMtimeMs: loginMtimeMs(c) }));
  const target = {
    profilePath: resolveProfileDir(service, options),
    statePath: resolveStatePath(service, options),
  };
  const lock = readAuthLock(service, { authOptions: options });
  const sourceExists = sourceHasData(source);
  const targetBlocked = isNonEmpty(target.profilePath) || Boolean(target.statePath && existsSync(target.statePath));
  const browserInUse = hasBrowserLock(source.profilePath) || hasBrowserLock(target.profilePath);
  return {
    service,
    source,
    skippedSources,
    target,
    sourceExists,
    targetBlocked,
    browserInUse,
    lockExists: lock.exists,
    estimatedBytes: pathSize(source.profilePath) + (source.statePath ? pathSize(source.statePath) : 0),
  };
}

export function migrateAuthProfile(context = {}, service, commit = false) {
  if (!service || service === 'all') throw new Error('migrateは単一の--serviceが必須');
  const plan = migrationPlan(context, service);
  if (!plan.sourceExists) return { ok: false, command: 'migrate', dryRun: !commit, status: 'source-missing', ...plan };
  if (plan.lockExists) return { ok: false, command: 'migrate', dryRun: !commit, status: 'locked', ...plan };
  if (plan.browserInUse) return { ok: false, command: 'migrate', dryRun: !commit, status: 'browser-in-use', ...plan };
  if (plan.targetBlocked) return { ok: false, command: 'migrate', dryRun: !commit, status: 'target-not-empty', ...plan };
  if (!commit) return { ok: true, command: 'migrate', dryRun: true, status: 'ready', sourceRetained: true, ...plan };

  const options = authOptions(context);
  const lock = acquireAuthLock(service, { command: 'migrate', authOptions: options });
  try {
    if (existsSync(plan.source.profilePath)) {
      mkdirSync(dirname(plan.target.profilePath), { recursive: true });
      // キャッシュ（Cache / Code Cache / Service Worker …）は運ばない。Windows 実測で 1.4GB のうち
      // ログインに要るのは 56MB だった。除外一覧は PROFILE_CACHE_SUBDIRS（disk-hygiene と共通）。
      cpSync(plan.source.profilePath, plan.target.profilePath, {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: profileCopyFilter(plan.source.profilePath),
      });
    }
    if (plan.source.statePath && existsSync(plan.source.statePath)) {
      mkdirSync(dirname(plan.target.statePath), { recursive: true });
      cpSync(plan.source.statePath, plan.target.statePath, { errorOnExist: true, force: false });
    }
    return {
      ok: true,
      command: 'migrate',
      dryRun: false,
      status: 'copied-needs-status',
      sourceRetained: true,
      cleanupAvailable: false,
      ...plan,
    };
  } finally {
    lock.release();
  }
}

async function openAuthContext(service, context, headed) {
  const options = authOptions(context);
  const profilePath = resolveProfileDir(service, options);
  const { chromium } = context.playwright ?? (await import('playwright'));
  const proxy = (context.env ?? process.env).HTTPS_PROXY || (context.env ?? process.env).HTTP_PROXY;
  // 認証 CLI は人が操作する短命プロセスで service lock も持つので起動ガードは掛けず、
  // 省キャッシュ設定（Service Worker 遮断・ディスクキャッシュ最小化）だけ重ねる。
  const browser = await chromium.launchPersistentContext(profilePath, mergeLeanOptions({
    channel: 'chrome',
    headless: !headed,
    proxy: proxy ? { server: proxy } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  }, { allowServiceWorkers: (context.env ?? process.env).DOBOKU_PW_ALLOW_SW === '1' }));
  const statePath = resolveStatePath(service, options);
  if (statePath && existsSync(statePath)) {
    try {
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) await browser.addCookies(state.cookies);
    } catch {}
  }
  return { browser, page: browser.pages()[0] ?? (await browser.newPage()), statePath };
}

export async function statusAuthService(context = {}, service) {
  if (!service) throw new Error('statusは--serviceまたは--allが必須');
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const adapter = loadAuthAdapter(service, { repoRoot });
  if (!adapter.supported) return { ok: false, service, ...classifyAuthSnapshot(adapter, {}) };
  const profilePath = resolveProfileDir(service, authOptions(context));
  if (!existsSync(profilePath)) return { ok: false, service, status: 'expired', reason: 'profile未作成' };

  return withAuthLock(service, { command: 'status', authOptions: authOptions(context) }, async () => {
    let opened;
    try {
      opened = await openAuthContext(service, context, false);
      await opened.page.goto(adapter.checkUrl, { waitUntil: 'domcontentloaded', timeout: context.timeoutMs ?? 60000 });
      const result = await pollAuthStatus(
        async () => classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, opened.page)),
        { attempts: context.statusAttempts ?? 6, sleep: (ms) => opened.page.waitForTimeout(ms) },
      );
      return { ok: result.status === 'authenticated', service, ...result };
    } catch (error) {
      return { ok: false, service, status: 'blocked', reason: String(error.message).slice(0, 200) };
    } finally {
      if (opened) await opened.browser.close().catch(() => {});
    }
  });
}

export async function loginAuthService(context = {}, service) {
  if (!service || service === 'all') throw new Error('loginは単一の--serviceが必須（all不可）');
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const adapter = loadAuthAdapter(service, { repoRoot });
  if (!adapter.supported) return { ok: false, service, status: 'unsupported', reason: adapter.unsupportedReason };
  const options = authOptions(context);

  return withAuthLock(service, { command: 'login', authOptions: options }, async () => {
    let opened;
    try {
      ensureAuthDirectories(service, options);
      opened = await openAuthContext(service, context, true);
      await opened.page.goto(adapter.loginUrl, { waitUntil: 'domcontentloaded', timeout: context.timeoutMs ?? 60000 });
      const deadline = Date.now() + (context.timeoutMs ?? 600000);
      let result = { status: 'unknown', reason: 'account assert未確認' };
      while (Date.now() < deadline) {
        const current = await captureAuthSnapshot(service, opened.page).catch(() => ({ url: opened.page.url() }));
        result = classifyAuthSnapshot(adapter, current);
        // 対話ログインでは本人確認を人間が完了できるよう、その画面を保持する。
        // 自動操作・再遷移はせず待つ。status の blocked 判定や成功条件は変えない。
        if (result.status === 'blocked') {
          await opened.page.waitForTimeout(2500);
          continue;
        }
        if (!adapter.expiredPattern.test(current.url ?? '')) {
          await opened.page.goto(adapter.checkUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
          await opened.page.waitForTimeout(1000);
          result = classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, opened.page));
          if (result.status === 'authenticated') break;
        }
        await opened.page.waitForTimeout(2500);
      }
      if (result.status === 'authenticated' && opened.statePath) {
        await opened.browser.storageState({ path: opened.statePath });
      }
      return { ok: result.status === 'authenticated', service, ...result };
    } catch (error) {
      return { ok: false, service, status: 'blocked', reason: String(error.message).slice(0, 200) };
    } finally {
      if (opened) await opened.browser.close().catch(() => {});
    }
  });
}

// ---------------------------------------------------------------------------
// CI encrypted-state コマンド（keygen / export / ci-restore / ci-writeback / ci-plan）
// ---------------------------------------------------------------------------

/** asset-storage.mjs の bucket 名解決（実 R2 には触れない・呼び出し側が context.s3 を注入すればそちらを使う）。 */
async function resolveBucketName(bucketKey) {
  const { loadConfig } = await import('./lib/asset-storage.mjs');
  const cfg = loadConfig();
  const bucket = cfg.buckets?.[bucketKey];
  if (!bucket?.name) throw new Error(`AUTH_CI_STATE_BUCKET_UNKNOWN: asset-storage.json に buckets.${bucketKey} が無い`);
  return bucket.name;
}

/**
 * private R2 のクライアントを用意する。優先順位:
 *   1. context.s3（テスト注入）
 *   2. env の R2 key（CI・Secrets）→ 本物の S3 クライアント（CAS 対応）
 *   3. Mac の rclone remote `doboku-r2`（この PC に key を置かない方針のための代替経路・CAS 非対応）
 */
async function resolveS3Client(context) {
  if (context.s3) return context.s3;
  const { loadEnvLocal, makeS3, hasR2Credentials, loadConfig } = await import('./lib/asset-storage.mjs');
  loadEnvLocal();
  if (hasR2Credentials()) return makeS3();
  const { rcloneRemoteAvailable, makeRcloneS3 } = await import('./lib/rclone-s3-adapter.mjs');
  const remote = loadConfig().buckets?.private?.rcloneRemote ?? 'doboku-r2';
  if (await rcloneRemoteAvailable(remote)) return makeRcloneS3({ remote });
  throw new Error(`AUTH_CI_STATE_NO_TRANSPORT: R2 key（env）も rclone remote "${remote}:" も無い。CI は Secrets、Mac は rclone config を確認`);
}

function writeMetadataFile(service, options, data) {
  const metadataPath = resolveMetadataPath(service, options);
  mkdirSync(dirname(metadataPath), { recursive: true });
  writeFileSync(metadataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function readMetadataFile(service, options) {
  const metadataPath = resolveMetadataPath(service, options);
  try {
    return JSON.parse(readFileSync(metadataPath, 'utf8'));
  } catch {
    return null;
  }
}

/** login と同じ「本人確認画面を閉じずに待つ」対話ループ。authenticated になるまで、または timeout まで回す。 */
async function waitForAuthenticated(adapter, page, service, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let result = { status: 'unknown', reason: 'account assert未確認' };
  while (Date.now() < deadline) {
    const current = await captureAuthSnapshot(service, page).catch(() => ({ url: page.url() }));
    result = classifyAuthSnapshot(adapter, current);
    if (result.status === 'blocked') {
      await page.waitForTimeout(2500);
      continue;
    }
    if (!adapter.expiredPattern.test(current.url ?? '')) {
      await page.goto(adapter.checkUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1000);
      result = classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, page));
      if (result.status === 'authenticated') break;
    }
    await page.waitForTimeout(2500);
  }
  return result;
}

/** Mac 専用: age identity を新規発行する。identity は auth root 配下に 0600 で保存し、stdout には recipient だけ出す。 */
export async function keygenAuth(context = {}) {
  const options = authOptions(context);
  const root = resolveAuthRoot(options);
  const ageDir = join(root, 'age');
  const identityPath = join(ageDir, 'identity.txt');
  if (existsSync(identityPath) && !context.force) {
    throw new Error(`AUTH_KEYGEN_EXISTS: ${identityPath} は既に存在します（上書きするには --force）`);
  }
  const { generateIdentity, identityToRecipient } = context.age ?? (await import('age-encryption'));
  const identity = await generateIdentity();
  const recipient = await identityToRecipient(identity);
  mkdirSync(ageDir, { recursive: true });
  writeFileSync(identityPath, `${identity}\n`, { mode: 0o600 });
  try { chmodSync(identityPath, 0o600); } catch { /* best-effort（Windows には 0600 が無い） */ }
  const human = [
    `recipient: ${recipient}`,
    'この recipient を .claude/config/playwright-auth-profiles.json の ciAuthState.ageRecipient に貼る',
    `identity は gh secret set DOBOKU_AUTH_AGE_IDENTITY < ${identityPath} で登録する`,
  ].join('\n');
  return { ok: true, command: 'keygen', identityPath, recipient, human };
}

/** Mac 専用: headed ログインで取得した storageState を stateDomains でフィルタし age 暗号化して private R2 へ置く。 */
export async function exportAuthState(context = {}, service) {
  if (!service || service === 'all') throw new Error('exportは単一の--serviceが必須');
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const registry = loadAuthRegistry({ cwd: repoRoot });
  const entry = registry.services[service];
  if (!entry) throw new Error(`AUTH_UNKNOWN_SERVICE: "${service}" is not registered`);
  const cfg = getCIAuthStateConfig(registry);
  if (!cfg.ageRecipient) {
    throw new Error('AUTH_CI_STATE_RECIPIENT_MISSING: ciAuthState.ageRecipient が未設定です（先に auth:keygen で recipient を発行し registry へ貼る）');
  }
  if (!entry.ci || !Array.isArray(entry.ci.stateDomains) || entry.ci.stateDomains.length === 0) {
    throw new Error(`AUTH_CI_STATE_DOMAINS_MISSING: service "${service}" に ci.stateDomains が無い`);
  }
  const adapter = loadAuthAdapter(service, { repoRoot });
  const options = authOptions(context);

  return withAuthLock(service, { command: 'export', authOptions: options }, async () => {
    let opened;
    try {
      ensureAuthDirectories(service, options);
      const sameProcess = entry.sessionMode === 'same-process';
      opened = await openAuthContext(service, context, sameProcess);
      let probeStatus;
      if (sameProcess) {
        // afb: login 直後の同一プロセスでしか state が取れないため、export 自体が headed ログインを兼ねる。
        await opened.page.goto(adapter.loginUrl, { waitUntil: 'domcontentloaded', timeout: context.timeoutMs ?? 60000 });
        probeStatus = await waitForAuthenticated(adapter, opened.page, service, context.timeoutMs ?? 600000);
      } else {
        await opened.page.goto(adapter.checkUrl, { waitUntil: 'domcontentloaded', timeout: context.timeoutMs ?? 60000 });
        probeStatus = await pollAuthStatus(
          async () => classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, opened.page)),
          { attempts: context.statusAttempts ?? 6, sleep: (ms) => opened.page.waitForTimeout(ms) },
        );
      }
      if (probeStatus.status !== 'authenticated') {
        return { ok: false, service, status: probeStatus.status, reason: probeStatus.reason };
      }

      const rawState = await opened.browser.storageState();
      const filtered = filterStateForService(rawState, entry.ci.stateDomains);
      const validation = validateExportedState(filtered.state, { checkUrl: adapter.checkUrl });
      if (!validation.ok) return { ok: false, service, status: 'invalid-state', reasons: validation.reasons };

      const bucket = await resolveBucketName(cfg.bucket);
      const keys = objectKeys(service, cfg);
      const s3 = await resolveS3Client(context);

      const plaintext = JSON.stringify(filtered.state);
      const ciphertext = await encryptState(plaintext, cfg.ageRecipient);
      const ciphertextSha256 = sha256Hex(ciphertext);

      // cas-conflict は 1 回だけ manifest を取り直して再試行する。
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { manifest: prevManifest, etag } = await getManifest({ s3, bucket, key: keys.manifest });
        const manifest = nextManifest(prevManifest, {
          source: 'operator',
          cookieCount: filtered.cookieCount,
          domains: filtered.domains,
          ciphertextSha256,
          now: context.now ?? new Date(),
        });
        const putResult = await putStateWithCAS({ s3, bucket, keys, ciphertext, manifest, ifMatchEtag: etag });
        if (putResult.ok) {
          writeMetadataFile(service, options, { generation: manifest.generation, cookieCount: filtered.cookieCount, exportedAt: manifest.exportedAt });
          return {
            ok: true,
            service,
            generation: manifest.generation,
            cookieCount: filtered.cookieCount,
            originCount: filtered.originCount,
            bytes: ciphertext.length,
          };
        }
      }
      return { ok: false, service, status: 'cas-conflict', reason: '2回リトライしても manifest の競合が解消しなかった' };
    } finally {
      if (opened) await opened.browser.close().catch(() => {});
    }
  });
}

/** CI 専用: R2 上の暗号化 state を復号して一時 auth root へ復元し、authenticated を probe する。 */
export async function ciRestoreAuthState(context = {}, service) {
  const env = context.env ?? process.env;
  const isCI = context.isCI ?? detectCI(env);
  if (!isCI) throw new Error('AUTH_CI_ONLY: ci-restore はCIでのみ実行できます');
  if (!service || service === 'all') throw new Error('ci-restoreは単一の--serviceが必須');
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const registry = loadAuthRegistry({ cwd: repoRoot });
  const entry = registry.services[service];
  if (!entry) throw new Error(`AUTH_UNKNOWN_SERVICE: "${service}" is not registered`);
  const cfg = getCIAuthStateConfig(registry);
  const options = authOptions(context);
  ensureAuthDirectories(service, options);

  const identity = env[cfg.identityEnv];
  if (!identity) return { ok: false, service, status: 'identity-missing', reason: `${cfg.identityEnv} が未設定`, exitCode: 1 };

  let bucket;
  let s3;
  let manifest;
  let ciphertext;
  try {
    bucket = await resolveBucketName(cfg.bucket);
    s3 = await resolveS3Client(context);
    const keys = objectKeys(service, cfg);
    ({ manifest } = await getManifest({ s3, bucket, key: keys.manifest }));
    ciphertext = await getState({ s3, bucket, key: keys.state });
  } catch (error) {
    return { ok: false, service, status: 'error', reason: String(error.message).slice(0, 200), exitCode: 1 };
  }
  if (!ciphertext || !manifest) return { ok: false, service, status: 'state-missing', reason: 'R2 に暗号化 state が無い' };

  let plaintext;
  try {
    plaintext = await decryptState(ciphertext, identity);
  } catch (error) {
    return { ok: false, service, status: 'error', reason: String(error.message).slice(0, 200), exitCode: 1 };
  }

  const statePath = resolveStatePath(service, options);
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, plaintext, { mode: 0o600 });
  try { chmodSync(statePath, 0o600); } catch { /* best-effort */ }

  const adapter = loadAuthAdapter(service, { repoRoot });
  let opened;
  let attach;
  let probe;
  try {
    opened = await openAuthContext(service, context, false);
    attach = await attachCISession(opened.browser, service, { statePath, env });
    await opened.page.goto(adapter.checkUrl, { waitUntil: 'domcontentloaded', timeout: context.timeoutMs ?? 60000 });
    probe = await pollAuthStatus(
      async () => classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, opened.page)),
      { attempts: context.statusAttempts ?? 6, sleep: (ms) => opened.page.waitForTimeout(ms) },
    );
    // authenticated 以外は「何が見えていたか」を残す（URL・タイトル・本文先頭・スクリーンショット）。
    // CI では画面を見られないので、これが無いと unknown の原因（bot 挑戦・別ページ・描画待ち）を切り分けられない。
    if (probe.status !== 'authenticated') {
      const snap = await captureAuthSnapshot(service, opened.page).catch(() => ({}));
      probe.diag = { url: snap.url ?? null, title: snap.title ?? null, textHead: String(snap.text ?? '').replace(/\s+/g, ' ').slice(0, 240), hasPasswordField: !!snap.hasPasswordField };
      const diagDir = env.DOBOKU_AUTH_DIAG_DIR;
      if (diagDir) {
        const { mkdirSync: mk } = await import('node:fs');
        mk(diagDir, { recursive: true });
        const shot = join(diagDir, `auth-diag-${service}.png`);
        await opened.page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        probe.diag.screenshotPath = shot;
      }
    }
  } catch (error) {
    return { ok: false, service, status: 'error', reason: String(error.message).slice(0, 200), exitCode: 1 };
  } finally {
    if (opened) await opened.browser.close().catch(() => {});
  }

  const cookies = attach?.restored?.cookieCount ?? 0;
  if (probe.status === 'authenticated') {
    writeMetadataFile(service, options, {
      restoredGeneration: manifest.generation,
      status: probe.status,
      statePath,
      restoredAt: (context.now ?? new Date()).toISOString(),
    });
  }
  return { ok: probe.status === 'authenticated', service, status: probe.status, reason: probe.reason, generation: manifest.generation, cookies, ...(probe.diag ? { diag: probe.diag } : {}) };
}

/** CI 専用: collector 実行後、書き戻すべきか decideWriteback で判定し、必要なら暗号化して R2 へ書き戻す。 */
export async function ciWritebackAuthState(context = {}, service, collectorExitCode) {
  if (!service || service === 'all') throw new Error('ci-writebackは単一の--serviceが必須');
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const registry = loadAuthRegistry({ cwd: repoRoot });
  const entry = registry.services[service];
  if (!entry) throw new Error(`AUTH_UNKNOWN_SERVICE: "${service}" is not registered`);
  const cfg = getCIAuthStateConfig(registry);
  const options = authOptions(context);

  const metadata = readMetadataFile(service, options);
  if (!metadata || !metadata.statePath) return { ok: true, command: 'ci-writeback', service, write: false, reason: 'metadata-missing' };

  let stateRaw;
  try {
    stateRaw = JSON.parse(readFileSync(metadata.statePath, 'utf8'));
  } catch {
    return { ok: true, command: 'ci-writeback', service, write: false, reason: 'state-missing' };
  }

  const filtered = filterStateForService(stateRaw, entry.ci?.stateDomains ?? []);

  let bucket;
  let s3;
  let remoteManifest;
  let etag;
  try {
    bucket = await resolveBucketName(cfg.bucket);
    s3 = await resolveS3Client(context);
    ({ manifest: remoteManifest, etag } = await getManifest({ s3, bucket, key: objectKeys(service, cfg).manifest }));
  } catch (error) {
    return { ok: false, command: 'ci-writeback', service, exitCode: 1, reason: String(error.message).slice(0, 200) };
  }

  const decision = decideWriteback({
    restoredGeneration: metadata.restoredGeneration,
    remoteManifest,
    collectorExitCode: Number(collectorExitCode),
    probeStatus: metadata.status,
    cookieCount: filtered.cookieCount,
  });
  if (!decision.write) return { ok: true, command: 'ci-writeback', service, write: false, reason: decision.reason };

  if (!cfg.ageRecipient) {
    return { ok: false, command: 'ci-writeback', service, exitCode: 1, reason: 'AUTH_CI_STATE_RECIPIENT_MISSING' };
  }

  try {
    const keys = objectKeys(service, cfg);
    const plaintext = JSON.stringify(filtered.state);
    const ciphertext = await encryptState(plaintext, cfg.ageRecipient);
    const ciphertextSha256 = sha256Hex(ciphertext);
    const manifest = nextManifest(remoteManifest, {
      source: 'ci',
      cookieCount: filtered.cookieCount,
      domains: filtered.domains,
      ciphertextSha256,
      now: context.now ?? new Date(),
    });
    const putResult = await putStateWithCAS({ s3, bucket, keys, ciphertext, manifest, ifMatchEtag: etag });
    // cas-conflict は「その間に別の書き手（Mac の export 等）が置いた」＝古い方を潰さなかったという正常な skip。
    // R2 障害（例外）だけを exit 1 にする。
    if (!putResult.ok) return { ok: true, command: 'ci-writeback', service, write: false, reason: putResult.reason, generation: remoteManifest?.generation ?? null };
    return { ok: true, command: 'ci-writeback', service, write: true, reason: 'ok', generation: manifest.generation };
  } catch (error) {
    return { ok: false, command: 'ci-writeback', service, exitCode: 1, reason: String(error.message).slice(0, 200) };
  }
}

/** GitHub Actions の schedule / workflow_dispatch を service×mode の matrix に変換する（純関数呼び出しの薄いラッパ）。 */
export function ciPlanAuthState(context = {}, { event, schedule, inputService, inputMode } = {}) {
  const repoRoot = context.repoRoot ?? REPO_ROOT;
  const registry = loadAuthRegistry({ cwd: repoRoot });
  const plan = planCIServices(registry.services, { event, schedule, inputService, inputMode });
  return { ok: !plan.invalid, command: 'ci-plan', ...plan };
}

export async function executeAuthCommand(argv, context = {}) {
  const args = parseAuthArgs(argv);
  if (args.help) return { ok: true, command: 'help', help: HELP };
  if (args.command === 'paths') return inspectPaths(context, args.service);
  if (args.command === 'doctor') return inspectDoctor(context, args.service);
  if (args.command === 'migrate') return migrateAuthProfile(context, args.service, args.commit);
  if (args.command === 'login') return loginAuthService({ ...context, timeoutMs: args.timeoutMs }, args.service);
  if (args.command === 'status') {
    const ids = args.all ? serviceIds(context) : serviceIds(context, args.service);
    const results = [];
    for (const service of ids) results.push(await statusAuthService(context, service));
    return { ok: results.every((item) => item.ok), command: 'status', results };
  }
  if (args.command === 'keygen') return keygenAuth({ ...context, force: args.force });
  if (args.command === 'export') return { command: 'export', ...(await exportAuthState({ ...context, timeoutMs: args.timeoutMs }, args.service)) };
  if (args.command === 'ci-restore') return { command: 'ci-restore', ...(await ciRestoreAuthState({ ...context, timeoutMs: args.timeoutMs }, args.service)) };
  if (args.command === 'ci-writeback') return ciWritebackAuthState(context, args.service, args.collectorExit);
  if (args.command === 'ci-plan') {
    return ciPlanAuthState(context, {
      event: args.event,
      schedule: args.schedule,
      inputService: args.service,
      inputMode: args.mode,
    });
  }
  throw new Error(`未知のcommand: ${args.command}`);
}

function printHuman(result) {
  if (result.command === 'help') return result.help;
  if (result.command === 'keygen') return result.human ?? JSON.stringify(result, null, 2);
  if (result.command === 'paths') {
    return [`auth root: ${result.authRoot}`, ...result.services.map((item) => `${item.service}: profile=${item.profilePath} state=${item.statePath ?? '-'} lock=${item.lockPath}`)].join('\n');
  }
  if (result.command === 'doctor') {
    return [`doctor: ${result.ok ? 'OK' : 'FAIL'}`, `auth root: ${result.authRoot}`, ...result.warnings.map((item) => `WARN: ${item}`), ...result.services.map((item) => `${item.service}: profile=${item.profileExists ? 'exists' : 'missing'} state=${item.stateExists ? 'exists' : 'n/a'} lock=${item.lock.state}`)].join('\n');
  }
  return JSON.stringify(result, null, 2);
}

async function main() {
  const parsed = parseAuthArgs(process.argv.slice(2));
  try {
    const result = redactAuthDiagnostic(await executeAuthCommand(process.argv.slice(2)));
    console.log(parsed.json ? JSON.stringify(result, null, 2) : printHuman(result));
    if (result.command === 'ci-plan') {
      console.error(`enabled ${result.counts?.enabled ?? 0} / due ${result.counts?.due ?? 0} / skipped ${result.counts?.skipped ?? 0}`);
    }
    process.exitCode = typeof result.exitCode === 'number' ? result.exitCode : (result.ok ? 0 : 2);
  } catch (error) {
    const result = redactAuthDiagnostic({ ok: false, error: error.code ?? 'AUTH_CLI_ERROR', message: error.message });
    console.error(parsed.json ? JSON.stringify(result, null, 2) : `ERROR: ${result.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
