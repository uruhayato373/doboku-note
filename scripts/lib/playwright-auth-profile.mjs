/**
 * playwright-auth-profile.mjs — Playwright 認証プロファイルの保存先を OS 非依存で解決する
 * ---------------------------------------------------------------------------
 * 背景（DN-0108・00-master.md）: プロファイル保存先が3系統に分裂している——
 *   (1) repo 配下 `.local/playwright-*-profile`（note/brain/coconala/kdp/x/instagram）
 *   (2) Mac ユーザー名の絶対パス直書き（一部 X/Instagram/A8 スキル）
 *   (3) `DOBOKU_PROFILE_ROOT`（Google・a8/moshimo/afb が asp-browser.mjs 経由で再利用）
 *   worktree で作業すると `.local` は Git 管理外なので空プロファイルが作られ、再ログインの
 *   原因になる。本モジュールは全サービス共通の `DOBOKU_AUTH_ROOT`（OS 標準ローカル領域）へ
 *   統一するための **副作用のない解決関数**を提供する。ディレクトリを実際に作るのは
 *   `ensureAuthDirectories` だけ（path を照会しただけでは filesystem を書き換えない）。
 *
 * このモジュールは password / Cookie / token / 2FA を一切扱わない。保存先パスの計算だけ。
 * Phase 01 時点では既存サービススクリプトはまだこちらへ移行しない（00-master.md 実行順）。
 *
 * CI（2026-09-21・registry version 2）: GitHub Actions では raw profile を使わない。使うのは
 * Mac で `auth:export` した storageState を age 暗号化して private R2 に置いたもので、
 * `auth:ci-restore` が RUNNER_TEMP 配下の一時 root へ復元する。resolver は次の 3 点を**自動で**
 * 強制する（呼び出し側が isCI を渡し忘れても素通りしない）:
 *   1. CI 判定は GITHUB_ACTIONS / CI 環境変数から自動検出
 *   2. CI では DOBOKU_AUTH_SESSION_MODE=encrypted-state かつ root が RUNNER_TEMP / os.tmpdir() 配下
 *      のときだけ許可（テストが明示する allowTemporaryInCI も従来どおり有効）
 *   3. 起動 script（process.argv[1]）が registry の ci.readOnlyScripts に無ければ拒否。
 *      ci.writeScripts は DOBOKU_CI_WRITE_PLAN_SHA256（ops-write の plan hash）があるときだけ許可
 *      → publish 系 script は CI で profile dir を得られない（資格情報でなく allowlist が read-only を担保）
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep, isAbsolute, win32, posix, relative } from 'node:path';

const REGISTRY_PATH = '.claude/config/playwright-auth-profiles.json';
const APP_DIR_NAME = 'doboku-note';
const AUTH_SUBDIR = 'playwright-auth';

/** CI で常に profile を得てよい script（認証 CLI 自身だけ。restore / writeback / status probe を行う）。 */
export const CI_ALWAYS_ALLOWED_SCRIPTS = Object.freeze(['scripts/playwright-auth.mjs']);
export const CI_SESSION_MODE_ENV = 'DOBOKU_AUTH_SESSION_MODE';
export const CI_SESSION_MODE_VALUE = 'encrypted-state';
export const CI_WRITE_PLAN_HASH_ENV = 'DOBOKU_CI_WRITE_PLAN_SHA256';
const CI_MODES = Object.freeze(['encrypted-state', 'none']);
const CI_OPERATIONS = Object.freeze(['read', 'write']);

/** GitHub Actions / 汎用 CI の自動検出（pure）。 */
export function detectCI(env = process.env) {
  return env?.GITHUB_ACTIONS === 'true' || env?.CI === 'true';
}

// registry の value として許可しないキー名（secret らしいものを schema gate で拒否する）。
// 大文字小文字・区切り文字ゆれを吸収するため小文字化・記号除去して比較する。
const FORBIDDEN_KEY_PATTERNS = ['password', 'token', 'cookie', 'secret', 'recoverycode'];

function normalizeKeyForSecretCheck(key) {
  return String(key).toLowerCase().replace(/[_-]/g, '');
}

/** キー名が secret らしいかを判定する（registry schema gate が使う）。 */
export function looksLikeSecretKey(key) {
  const norm = normalizeKeyForSecretCheck(key);
  return FORBIDDEN_KEY_PATTERNS.some((p) => norm.includes(p));
}

/**
 * registry の value を再帰走査し、secret らしいキーを持つエントリを collect する。
 * 純粋関数（読み込みのみ）。呼び出し側が結果を元に throw するかを決める。
 */
function collectSecretLikeKeys(obj, path = []) {
  const found = [];
  if (obj === null || typeof obj !== 'object') return found;
  for (const [key, value] of Object.entries(obj)) {
    const nextPath = [...path, key];
    if (looksLikeSecretKey(key)) {
      found.push(nextPath.join('.'));
    }
    if (value !== null && typeof value === 'object') {
      found.push(...collectSecretLikeKeys(value, nextPath));
    }
  }
  return found;
}

/**
 * registry（.claude/config/playwright-auth-profiles.json）を読み込む。
 * secret らしいキーが1つでも見つかれば例外で拒否する（schema gate）。
 * @param {{ registryPath?: string, cwd?: string }} [options]
 */
export function loadAuthRegistry(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const path = resolve(cwd, options.registryPath ?? REGISTRY_PATH);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new Error(`AUTH_REGISTRY_NOT_FOUND: ${path} (${e.message})`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`AUTH_REGISTRY_INVALID_JSON: ${path} (${e.message})`);
  }
  const secretHits = collectSecretLikeKeys(json.services ?? {});
  if (secretHits.length > 0) {
    throw new Error(
      `AUTH_REGISTRY_SECRET_LIKE_KEY: registry に secret らしいキーがある（${secretHits.join(', ')}）。password/token/cookie/secret/recoveryCode は registry へ書かない。`,
    );
  }
  const services = json.services ?? {};
  for (const [id, entry] of Object.entries(services)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`AUTH_REGISTRY_INVALID_ENTRY: service "${id}" is not an object`);
    }
    if (entry.ci !== undefined) validateCIBlock(id, entry);
    else if ((json.version ?? 1) >= 2) {
      throw new Error(`AUTH_REGISTRY_CI_BLOCK_REQUIRED: service "${id}" has no ci block (registry version ${json.version})`);
    }
  }
  return { version: json.version ?? null, services, ciAuthState: json.ciAuthState ?? null };
}

/**
 * registry の ci ブロック（version 2）を検証する（pure・throw で拒否）。
 *   mode: 'encrypted-state' | 'none'
 *   enabled / canary: boolean
 *   operations: ['read'] または ['read','write']（'read' 必須）
 *   cron: enabled のとき 5 フィールドの文字列必須
 *   readOnlyScripts / writeScripts: repo 相対 posix パスの配列（'write' を含まないなら writeScripts は空）
 *   stateDomains: encrypted-state のとき 1 件以上（書き戻し前の cookie フィルタに使う）
 */
export function validateCIBlock(id, entry) {
  const ci = entry.ci;
  const fail = (msg) => { throw new Error(`AUTH_REGISTRY_INVALID_CI: service "${id}": ${msg}`); };
  if (!ci || typeof ci !== 'object' || Array.isArray(ci)) fail('ci is not an object');
  if (!CI_MODES.includes(ci.mode)) fail(`ci.mode must be one of ${CI_MODES.join('|')}`);
  if (typeof ci.enabled !== 'boolean') fail('ci.enabled must be boolean');
  if (typeof ci.canary !== 'boolean') fail('ci.canary must be boolean');
  if (!Array.isArray(ci.operations) || !ci.operations.includes('read') || ci.operations.some((o) => !CI_OPERATIONS.includes(o))) {
    fail(`ci.operations must include 'read' and only ${CI_OPERATIONS.join('|')}`);
  }
  for (const key of ['readOnlyScripts', 'writeScripts', 'stateDomains']) {
    if (!Array.isArray(ci[key]) || ci[key].some((s) => typeof s !== 'string' || s.trim() === '')) fail(`ci.${key} must be an array of non-empty strings`);
  }
  if (ci.readOnlyScripts.some((s) => s.includes('\\') || isAbsolute(s))) fail('ci.readOnlyScripts must be repo-relative posix paths');
  if (ci.writeScripts.some((s) => s.includes('\\') || isAbsolute(s))) fail('ci.writeScripts must be repo-relative posix paths');
  if (!ci.operations.includes('write') && ci.writeScripts.length > 0) fail('ci.writeScripts must be empty unless operations includes write');
  if (ci.mode === 'encrypted-state') {
    if (ci.stateDomains.length === 0) fail('ci.stateDomains required for encrypted-state');
    if (!entry.stateFileName) fail('stateFileName required for encrypted-state');
  }
  if (ci.enabled) {
    if (ci.mode !== 'encrypted-state') fail('ci.enabled requires mode encrypted-state');
    if (typeof ci.cron !== 'string' || ci.cron.trim().split(/\s+/).length !== 5) fail('ci.cron (5 fields) required when enabled');
  }
  if (ci.cron !== null && ci.cron !== undefined && typeof ci.cron !== 'string') fail('ci.cron must be string or null');
  return true;
}

/** 暗号化 state の置き場設定（registry.ciAuthState）を既定値込みで返す。recipient 未設定は null のまま返す。 */
export function getCIAuthStateConfig(registry) {
  const raw = registry?.ciAuthState ?? {};
  const cfg = {
    ageRecipient: raw.ageRecipient ?? null,
    bucket: raw.bucket ?? 'private',
    keyPrefix: raw.keyPrefix ?? 'auth-state/',
    identityEnv: raw.identityEnv ?? 'DOBOKU_AUTH_AGE_IDENTITY',
  };
  if (cfg.ageRecipient !== null && !/^age1[0-9a-z]{20,}$/.test(cfg.ageRecipient)) {
    throw new Error('AUTH_CI_STATE_INVALID_RECIPIENT: ciAuthState.ageRecipient must be an age public key (age1...)');
  }
  if (!cfg.keyPrefix.endsWith('/')) throw new Error('AUTH_CI_STATE_INVALID_PREFIX: keyPrefix must end with /');
  return cfg;
}

/**
 * CI で起動 script がこのサービスの allowlist に入っているかを検査する（CI 以外では常に ok）。
 * @param {string} serviceId
 * @param {object} entry registry のサービスエントリ
 * @param {{ env?: object, invokedScript?: string, repoRoot?: string, cwd?: string, isCI?: boolean }} [options]
 * @returns {{ ok: true, reason: string, invokedScript: string|null, kind: 'not-ci'|'always'|'read'|'write' }}
 */
export function assertCIScriptAllowed(serviceId, entry, options = {}) {
  const env = options.env ?? process.env;
  const isCI = options.isCI ?? detectCI(env);
  if (!isCI) return { ok: true, reason: 'not-ci', invokedScript: null, kind: 'not-ci' };
  const ci = entry?.ci;
  if (!ci || ci.mode !== 'encrypted-state') {
    throw new Error(`AUTH_CI_MODE_NONE: service "${serviceId}" is not enabled for CI (ci.mode=${ci?.mode ?? 'undefined'})`);
  }
  const invokedScript = options.invokedScript ?? invokedScriptRelative(options.repoRoot ?? options.cwd ?? process.cwd());
  if (!invokedScript) throw new Error(`AUTH_CI_SCRIPT_NOT_ALLOWLISTED: service "${serviceId}": invoked script could not be determined`);
  if (CI_ALWAYS_ALLOWED_SCRIPTS.includes(invokedScript)) return { ok: true, reason: 'auth-cli', invokedScript, kind: 'always' };
  if (ci.readOnlyScripts.includes(invokedScript)) return { ok: true, reason: 'read-only allowlist', invokedScript, kind: 'read' };
  if (ci.writeScripts.includes(invokedScript)) {
    const hash = env?.[CI_WRITE_PLAN_HASH_ENV];
    if (typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash)) return { ok: true, reason: 'write allowlist + plan hash', invokedScript, kind: 'write' };
    throw new Error(`AUTH_CI_WRITE_REQUIRES_PLAN_HASH: service "${serviceId}": ${invokedScript} is a write script; set ${CI_WRITE_PLAN_HASH_ENV} via ops-write`);
  }
  throw new Error(`AUTH_CI_SCRIPT_NOT_ALLOWLISTED: service "${serviceId}": ${invokedScript} is not in ci.readOnlyScripts/writeScripts`);
}

/** process.argv[1] を repoRoot 相対の posix パスにする（repo 外・未定義なら null）。 */
export function invokedScriptRelative(repoRoot, argv1 = process.argv[1]) {
  if (!argv1) return null;
  const rel = relative(resolve(repoRoot), resolve(argv1));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/** service ID が registry に存在するかを検証し、そのエントリを返す。無ければ例外。 */
export function getServiceEntry(serviceId, options = {}) {
  const registry = options.registry ?? loadAuthRegistry(options);
  const entry = registry.services[serviceId];
  if (!entry) {
    throw new Error(`AUTH_UNKNOWN_SERVICE: "${serviceId}" is not registered in playwright-auth-profiles.json`);
  }
  return entry;
}

/**
 * OS 標準ローカル領域から auth root の既定値を解決する（副作用なし）。
 * @param {{ platform: NodeJS.Platform, env: Record<string,string|undefined>, homeDir: string }} params
 * @returns {string}
 */
export function resolveDefaultAuthRoot({ platform, env, homeDir }) {
  if (!homeDir || typeof homeDir !== 'string' || homeDir.trim() === '') {
    throw new Error('AUTH_ROOT_HOME_DIR_REQUIRED: homeDir is empty');
  }
  // 他 OS をシミュレートするテスト（Windows 実行環境で macOS/Linux 用パスを組み立てる等）を
  // 成立させるため、ネイティブの path.resolve（実行 OS 依存）ではなく platform 別の
  // path.win32 / path.posix を明示的に使う。実際の fs 操作に使う resolveAuthRoot 以降は
  // ネイティブ path のままでよい（そちらは常に「今動いている OS」のパスを扱う前提）。
  const p = platform === 'win32' ? win32 : posix;
  if (platform === 'win32') {
    // 2026-09-14: 旧既定の %LOCALAPPDATA% は、MSIX アプリ（ChatGPT/Codex）から書くと
    // %LOCALAPPDATA%\Packages\<PFN>\LocalCache\Local へ仮想化（リダイレクト）され、
    // Claude Code / ターミナルからは見えない＝ログインとプロファイルが二重になる。
    // AppData の外（Linux の XDG state 相当）を既定にする。旧置き場は legacyWindowsAuthRoots が
    // auth:doctor / auth:migrate の移行元として拾う。
    return p.resolve(homeDir, '.local', 'state', APP_DIR_NAME, AUTH_SUBDIR);
  }
  if (platform === 'darwin') {
    return p.resolve(homeDir, 'Library', 'Application Support', APP_DIR_NAME, AUTH_SUBDIR);
  }
  // Linux その他: XDG_STATE_HOME を優先。
  const xdgStateHome = env?.XDG_STATE_HOME;
  const base = xdgStateHome && xdgStateHome.trim() !== '' ? xdgStateHome : p.resolve(homeDir, '.local', 'state');
  return p.resolve(base, APP_DIR_NAME, AUTH_SUBDIR);
}

/**
 * Windows で「以前の既定」または「MSIX 仮想化で迷い込んだ」auth root の候補（pure・存在確認しない）。
 * `*` を含むものは呼び出し側が実在ディレクトリで展開する。
 *   1. %LOCALAPPDATA%\doboku-note\playwright-auth（2026-09-14 までの既定）
 *   2. %LOCALAPPDATA%\Packages\OpenAI.Codex_*\LocalCache\Local\doboku-note\playwright-auth（Codex から 1 に書いた実体）
 */
export function legacyWindowsAuthRoots({ env, homeDir } = {}) {
  const localAppData = env?.LOCALAPPDATA && env.LOCALAPPDATA.trim() !== '' ? env.LOCALAPPDATA : win32.resolve(homeDir ?? '', 'AppData', 'Local');
  return [
    win32.resolve(localAppData, APP_DIR_NAME, AUTH_SUBDIR),
    win32.resolve(localAppData, 'Packages', 'OpenAI.Codex_*', 'LocalCache', 'Local', APP_DIR_NAME, AUTH_SUBDIR),
  ];
}

/**
 * プロファイル内で「ログインに不要・再生成できる」ディレクトリ（プロファイル相対）。
 * migrate のコピー除外と disk-hygiene の掃除対象で同じ一覧を使う。
 */
export const PROFILE_CACHE_SUBDIRS = Object.freeze([
  'Default/Cache',
  'Default/Code Cache',
  'Default/GPUCache',
  'Default/DawnWebGPUCache',
  'Default/DawnGraphiteCache',
  'Default/Service Worker/CacheStorage',
  'Default/Service Worker/ScriptCache',
  'GraphiteDawnCache',
  'ShaderCache',
  'GrShaderCache',
]);

/**
 * 危険な auth root（repo root / .git / worktree root / repo 配下 .local / filesystem root /
 * home root 直下 / 空文字 / 相対パス）を拒否する。pure function（filesystem へは触れない）。
 * @param {string} candidatePath
 * @param {{ repoRoot?: string, homeDir?: string, isCI?: boolean, allowTemporaryInCI?: string }} [options]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateAuthRoot(candidatePath, options = {}) {
  if (candidatePath === null || candidatePath === undefined || String(candidatePath).trim() === '') {
    return { ok: false, reason: 'AUTH_ROOT_EMPTY' };
  }
  const p = String(candidatePath);
  if (!isAbsolute(p)) {
    return { ok: false, reason: 'AUTH_ROOT_NOT_ABSOLUTE' };
  }
  const normalized = resolve(p);

  // filesystem root（Windows のドライブ直下 "C:\" や POSIX の "/"）を拒否。
  // resolve した結果が自分自身の親と一致する = root。
  const parentOfNormalized = resolve(normalized, '..');
  if (parentOfNormalized === normalized) {
    return { ok: false, reason: 'AUTH_ROOT_IS_FILESYSTEM_ROOT' };
  }

  if (options.homeDir) {
    const homeResolved = resolve(options.homeDir);
    if (normalized === homeResolved) {
      return { ok: false, reason: 'AUTH_ROOT_IS_HOME_ROOT' };
    }
  }

  if (options.repoRoot) {
    const repoResolved = resolve(options.repoRoot);
    // repo root そのもの、または repo 配下（.git・worktree の .local 含む）を拒否。
    // .git は常に repoRoot 配下にあるので、専用の分岐は作らずこの1判定でカバーする。
    if (normalized === repoResolved || normalized.startsWith(repoResolved + sep)) {
      return { ok: false, reason: 'AUTH_ROOT_INSIDE_REPO' };
    }
  }

  const env = options.env ?? process.env;
  const isCI = options.isCI ?? detectCI(env);
  if (isCI) {
    // CI で許可する root は 2 種類だけ:
    //   (a) テストが明示した temporary root（allowTemporaryInCI）配下
    //   (b) DOBOKU_AUTH_SESSION_MODE=encrypted-state のとき RUNNER_TEMP / os.tmpdir() 配下
    //       （auth:ci-restore が暗号化 state を復元する一時 root。job 終了時に rm -rf される）
    const allowedRoots = [];
    if (options.allowTemporaryInCI) allowedRoots.push(resolve(options.allowTemporaryInCI));
    if (env?.[CI_SESSION_MODE_ENV] === CI_SESSION_MODE_VALUE) {
      if (env.RUNNER_TEMP && String(env.RUNNER_TEMP).trim() !== '') allowedRoots.push(resolve(env.RUNNER_TEMP));
      allowedRoots.push(resolve(options.tmpDir ?? tmpdir()));
    }
    const under = allowedRoots.some((a) => normalized === a || normalized.startsWith(a + sep));
    if (!under) return { ok: false, reason: 'AUTH_PROFILE_UNAVAILABLE_IN_CI' };
  }

  return { ok: true };
}

/**
 * auth root を解決する。優先順位: 明示 override（DOBOKU_AUTH_ROOT 相当）→ OS 標準既定値。
 * override は絶対パスのみ許可し、危険な場所は拒否する。
 * @param {{ overrideRoot?: string, platform?: NodeJS.Platform, env?: object, homeDir?: string,
 *           repoRoot?: string, isCI?: boolean, allowTemporaryInCI?: string }} [options]
 * @returns {string}
 */
export function resolveAuthRoot(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? process.env.HOME ?? process.env.USERPROFILE;
  const overrideRoot = options.overrideRoot ?? env.DOBOKU_AUTH_ROOT;

  if (overrideRoot) {
    const check = validateAuthRoot(overrideRoot, options);
    if (!check.ok) {
      throw new Error(`AUTH_ROOT_INVALID_OVERRIDE: ${check.reason} (${overrideRoot})`);
    }
    return resolve(overrideRoot);
  }

  // CI では OS 既定の root（＝実 profile の置き場）を決して使わない。override（一時 root）が必須。
  if (options.isCI ?? detectCI(env)) {
    throw new Error('AUTH_PROFILE_UNAVAILABLE_IN_CI: no explicit temporary root provided for CI');
  }

  const defaultRoot = resolveDefaultAuthRoot({ platform, env, homeDir });
  const check = validateAuthRoot(defaultRoot, options);
  if (!check.ok) {
    throw new Error(`AUTH_ROOT_INVALID_DEFAULT: ${check.reason} (${defaultRoot})`);
  }
  return defaultRoot;
}

/**
 * サービスの Chromium userDataDir（プロファイルディレクトリ）を解決する。
 * ディレクトリは作成しない（path 照会のみ）。
 */
export function resolveProfileDir(serviceId, options = {}) {
  const entry = getServiceEntry(serviceId, options);
  assertCIScriptAllowed(serviceId, entry, options);
  const root = resolveAuthRoot(options);
  return resolve(root, 'profiles', entry.profileDirName ?? serviceId);
}

/**
 * サービスの state ファイルパスを解決する。stateFileName を持たないサービスは null を返す
 * （state 不要サービスへの path 要求を拒否するのではなく、明示的に「無い」ことを返す）。
 */
export function resolveStatePath(serviceId, options = {}) {
  const entry = getServiceEntry(serviceId, options);
  if (!entry.stateFileName) return null;
  assertCIScriptAllowed(serviceId, entry, options);
  const root = resolveAuthRoot(options);
  return resolve(root, 'states', entry.stateFileName);
}

/** サービスの lock ファイルパスを解決する。 */
export function resolveLockPath(serviceId, options = {}) {
  getServiceEntry(serviceId, options); // 存在確認（未知 service は拒否）
  const root = resolveAuthRoot(options);
  return resolve(root, 'locks', `${serviceId}.lock`);
}

/** サービスの metadata ファイルパスを解決する（secret を含まない最終確認結果）。 */
export function resolveMetadataPath(serviceId, options = {}) {
  getServiceEntry(serviceId, options);
  const root = resolveAuthRoot(options);
  return resolve(root, 'metadata', `${serviceId}.json`);
}

/**
 * サービスに必要なディレクトリ（profiles/<service>, states/, locks/, metadata/）を実際に作る。
 * このモジュールで filesystem に書き込む唯一の関数。
 */
export function ensureAuthDirectories(serviceId, options = {}) {
  const entry = getServiceEntry(serviceId, options);
  assertCIScriptAllowed(serviceId, entry, options);
  const root = resolveAuthRoot(options);
  const profileDir = resolve(root, 'profiles', entry.profileDirName ?? serviceId);
  const locksDir = resolve(root, 'locks');
  const metadataDir = resolve(root, 'metadata');
  mkdirSync(profileDir, { recursive: true });
  mkdirSync(locksDir, { recursive: true });
  mkdirSync(metadataDir, { recursive: true });
  if (entry.stateFileName) {
    mkdirSync(resolve(root, 'states'), { recursive: true });
  }
  return {
    profileDir,
    statePath: entry.stateFileName ? resolve(root, 'states', entry.stateFileName) : null,
    lockPath: resolve(locksDir, `${serviceId}.lock`),
    metadataPath: resolve(metadataDir, `${serviceId}.json`),
  };
}

/** auth root が既に filesystem 上に存在するかどうかだけを確認する（作成しない）。 */
export function authRootExists(options = {}) {
  const root = resolveAuthRoot(options);
  return existsSync(root);
}

/**
 * 診断出力から secret らしい値を伏せる。value が長い英数記号混在文字列（token/cookie らしい）
 * なら丸ごと `[REDACTED]` にする。オブジェクトは再帰的に処理し、キー名が secret らしければ
 * 値を問わず伏せる。
 */
export function redactAuthDiagnostic(value, keyHint) {
  if (keyHint && looksLikeSecretKey(keyHint)) return '[REDACTED]';
  // profile/state/lockの**パス**と公開URLはCLIの診断対象そのもの。長いASCII文字列でも
  // secretではないため、keyが明示する診断フィールドではtoken風ヒューリスティックを適用しない。
  if (keyHint && /(?:path|url)$/i.test(keyHint)) return value;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redactAuthDiagnostic(v));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactAuthDiagnostic(v, k);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 40 && /^[A-Za-z0-9+/_=.\-]+$/.test(value)) {
    // token/cookie/hash らしい長い1トークン文字列は伏せる（英単語混じりの通常文はこの正規表現に
    // ほぼマッチしない＝スペース・句読点・日本語を含む説明文は素通しする）。
    return '[REDACTED]';
  }
  return value;
}
