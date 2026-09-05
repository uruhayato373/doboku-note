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
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, sep, isAbsolute, win32, posix } from 'node:path';

const REGISTRY_PATH = '.claude/config/playwright-auth-profiles.json';
const APP_DIR_NAME = 'doboku-note';
const AUTH_SUBDIR = 'playwright-auth';

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
  }
  return { version: json.version ?? null, services };
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
    const localAppData = env?.LOCALAPPDATA;
    const base = localAppData && localAppData.trim() !== '' ? localAppData : p.resolve(homeDir, 'AppData', 'Local');
    return p.resolve(base, APP_DIR_NAME, AUTH_SUBDIR);
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

  if (options.isCI && !options.allowTemporaryInCI) {
    return { ok: false, reason: 'AUTH_PROFILE_UNAVAILABLE_IN_CI' };
  }
  if (options.isCI && options.allowTemporaryInCI) {
    // テストが明示した temporary root だけを許可する。
    const allowedResolved = resolve(options.allowTemporaryInCI);
    if (normalized !== allowedResolved && !normalized.startsWith(allowedResolved + sep)) {
      return { ok: false, reason: 'AUTH_PROFILE_UNAVAILABLE_IN_CI' };
    }
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

  if (options.isCI && !options.allowTemporaryInCI) {
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
