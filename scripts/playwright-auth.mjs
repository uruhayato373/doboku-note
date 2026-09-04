#!/usr/bin/env node
/** Windows・Mac共通のPlaywright認証profile診断・login・status・安全移行CLI。 */
import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statfsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  ensureAuthDirectories,
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
import { captureAuthSnapshot, classifyAuthSnapshot, loadAuthAdapter } from './lib/playwright-auth-adapters.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `Playwright auth CLI

Usage:
  npm run auth:paths -- [--service <id>] [--json]
  npm run auth:doctor -- [--service <id>] [--json]
  npm run auth:login -- --service <id> [--json] [--timeout-ms <ms>]
  npm run auth:status -- (--service <id>|--all) [--json]
  npm run auth:migrate -- --service <id> [--commit] [--json]

Rules:
  login は headed・人間入力のみ。status はread-only。migrateは既定dry-runでsourceを削除しない。
  password/Cookie/token/2FAを引数・出力・Gitへ保存しない。afbの別process statusはunsupported。`;

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

export function parseAuthArgs(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'help';
  const rest = argv.slice(command === 'help' ? 0 : 1);
  const positional = rest.filter((arg, index) => !arg.startsWith('-') && rest[index - 1] !== '--service' && rest[index - 1] !== '--timeout-ms');
  return {
    command,
    service: valueAfter(rest, '--service') ?? positional[0] ?? null,
    all: rest.includes('--all'),
    commit: rest.includes('--commit'),
    json: rest.includes('--json'),
    help: rest.includes('--help') || rest.includes('-h') || command === 'help',
    timeoutMs: Number(valueAfter(rest, '--timeout-ms') ?? 600000),
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
    profilePath: join(legacyRoot, entry.profileDirName),
    statePath: entry.stateFileName ? join(legacyRoot, entry.stateFileName) : null,
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
    const legacy = legacyPaths(context.repoRoot ?? REPO_ROOT, entry);
    const legacyExists = existsSync(legacy.profilePath) || Boolean(legacy.statePath && existsSync(legacy.statePath));
    const targetExists = existsSync(item.profilePath) || Boolean(item.statePath && existsSync(item.statePath));
    return {
      service: item.service,
      profileExists: existsSync(item.profilePath),
      stateExists: Boolean(item.statePath && existsSync(item.statePath)),
      legacyExists,
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
  if (services.some((item) => item.legacyExists)) warnings.push('legacy profile/stateあり。auth:migrateをdry-runで確認する');
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
  const source = legacyPaths(repoRoot, entry);
  const target = {
    profilePath: resolveProfileDir(service, options),
    statePath: resolveStatePath(service, options),
  };
  const lock = readAuthLock(service, { authOptions: options });
  const sourceExists = existsSync(source.profilePath) || Boolean(source.statePath && existsSync(source.statePath));
  const targetBlocked = isNonEmpty(target.profilePath) || Boolean(target.statePath && existsSync(target.statePath));
  const browserInUse = hasBrowserLock(source.profilePath) || hasBrowserLock(target.profilePath);
  return {
    service,
    source,
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
      cpSync(plan.source.profilePath, plan.target.profilePath, { recursive: true, errorOnExist: true, force: false });
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
  const browser = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: !headed,
    proxy: proxy ? { server: proxy } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
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
      await opened.page.waitForTimeout(1500);
      const result = classifyAuthSnapshot(adapter, await captureAuthSnapshot(service, opened.page));
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
        if (result.status === 'blocked') break;
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
  throw new Error(`未知のcommand: ${args.command}`);
}

function printHuman(result) {
  if (result.command === 'help') return result.help;
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
    process.exitCode = result.ok ? 0 : 2;
  } catch (error) {
    const result = redactAuthDiagnostic({ ok: false, error: error.code ?? 'AUTH_CLI_ERROR', message: error.message });
    console.error(parsed.json ? JSON.stringify(result, null, 2) : `ERROR: ${result.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
