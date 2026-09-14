/**
 * playwright-launch.mjs — Playwright 永続コンテキストの「省メモリ・省ディスク」共通オプションと起動ガード。
 * ---------------------------------------------------------------------------
 * 背景（2026-09-14）: Windows 16GB 機で X 用プロファイルが 1.4GB に肥大していた。内訳は
 *   Service Worker CacheStorage 767MB / Code Cache 268MB / Cache 195MB で、ログインに要るのは
 *   Cookie・Local Storage の数十 MB だけ。さらに Claude Desktop・ChatGPT・Chrome と並行して
 *   Playwright を 2 本走らせると物理メモリが尽きて OS ごと固まる。
 *
 * 方針:
 *   - 「プロファイル（ログイン）は持つ、キャッシュは持たない」。起動時にディスクキャッシュを
 *     事実上無効化し、Service Worker の登録を止める（SNS/管理画面の操作には要らない）。
 *   - 起動前に 2 つのガードを通す。空きメモリ不足と、別プロファイルのブラウザが稼働中。
 *     どちらも env で外せる（人が headed で確認したいときに縛らない）。
 *
 * 使い方（全 launchPersistentContext 呼び出しで options を包む）:
 *   chromium.launchPersistentContext(PROFILE_DIR, leanContextOptions({ headless: false, channel: 'chrome', ... }))
 *
 * env:
 *   DOBOKU_PW_SKIP_GUARD=1      ガードを両方とも外す
 *   DOBOKU_PW_ALLOW_PARALLEL=1  別プロファイルの Chrome 稼働中でも起動を許す
 *   DOBOKU_PW_MIN_FREE_MB=NNNN  空きメモリ閾値（既定 2048）
 *   DOBOKU_PW_ALLOW_SW=1        Service Worker を許可（サイト側で必要になったとき）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { freemem } from 'node:os';
import { posix, win32 } from 'node:path';

import { resolveAuthRoot } from './playwright-auth-profile.mjs';
import { browsersUsingProfilesUnder, listProcesses } from './process-list.mjs';

/** ディスクキャッシュを実質無効化する Chromium 引数（値はバイト。0 は「既定」扱いなので 1）。 */
export const LEAN_CHROMIUM_ARGS = Object.freeze([
  '--disk-cache-size=1',
  '--media-cache-size=1',
  '--disable-gpu-shader-disk-cache',
]);

export const DEFAULT_MIN_FREE_BYTES = 2 * 1024 ** 3;

export class LaunchGuardError extends Error {
  constructor(message, { code, reasons = [] } = {}) {
    super(message);
    this.name = 'LaunchGuardError';
    this.code = code ?? 'LAUNCH_GUARD';
    this.reasons = reasons;
  }
}

/**
 * base の options に省メモリ設定を重ねる（pure）。呼び出し側の指定が常に勝つ:
 *   - args は和集合（重複除去・呼び出し側の順序を先頭に保つ）
 *   - serviceWorkers は base が持っていればそのまま、無ければ 'block'（allowServiceWorkers で 'allow'）
 */
export function mergeLeanOptions(base = {}, { allowServiceWorkers = false } = {}) {
  const baseArgs = Array.isArray(base.args) ? base.args : [];
  const args = [...baseArgs];
  for (const a of LEAN_CHROMIUM_ARGS) if (!args.includes(a)) args.push(a);
  return {
    ...base,
    args,
    serviceWorkers: base.serviceWorkers ?? (allowServiceWorkers ? 'allow' : 'block'),
  };
}

/**
 * ガードの判定だけ（pure）。null は「測れなかった」＝止めない。
 * @param {{ freeMemBytes: number|null, minFreeBytes: number, otherBrowsers: {pid:string,userDataDir:string}[]|null, allowParallel?: boolean }} input
 */
export function evaluateLaunchGuard({ freeMemBytes, minFreeBytes, otherBrowsers, allowParallel = false }) {
  const reasons = [];
  if (Number.isFinite(freeMemBytes) && Number.isFinite(minFreeBytes) && freeMemBytes < minFreeBytes) {
    reasons.push({
      code: 'LOW_MEMORY',
      message: `空きメモリ ${mb(freeMemBytes)}MB < 閾値 ${mb(minFreeBytes)}MB。Claude Desktop / ChatGPT / Chrome のタブを閉じてから再実行（DOBOKU_PW_MIN_FREE_MB で閾値変更、DOBOKU_PW_SKIP_GUARD=1 で無効化）`,
    });
  }
  if (!allowParallel && Array.isArray(otherBrowsers) && otherBrowsers.length > 0) {
    const list = otherBrowsers.map((b) => `pid ${b.pid}: ${b.userDataDir}`).join(' / ');
    reasons.push({
      code: 'BROWSER_ALREADY_RUNNING',
      message: `doboku-note のプロファイルを使う Chrome が既に稼働中（${list}）。ブラウザ操作は同時 1 本まで。終わるのを待つか DOBOKU_PW_ALLOW_PARALLEL=1`,
    });
  }
  return { ok: reasons.length === 0, reasons };
}

const mb = (bytes) => Math.round(bytes / 1024 / 1024);

/**
 * 利用可能メモリ（バイト）。win32/linux は os.freemem（Linux は MemAvailable 相当）。
 * darwin の os.freemem は「完全に空いているページ」だけで常に小さく出るので vm_stat から
 * free + inactive + speculative を足す。測れなければ null（ガードは止めない）。
 */
export function availableMemoryBytes({ platform = process.platform, spawn = spawnSync, osFree = freemem } = {}) {
  if (platform !== 'darwin') {
    try {
      const v = osFree();
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }
  try {
    const r = spawn('vm_stat', [], { encoding: 'utf-8', timeout: 5_000 });
    if (r.error || r.status !== 0) return null;
    return parseVmStat(r.stdout);
  } catch {
    return null;
  }
}

/** `vm_stat` 出力から利用可能バイトを出す（pure）。 */
export function parseVmStat(text) {
  const pageSize = Number((String(text).match(/page size of (\d+) bytes/) || [])[1]) || 4096;
  const pick = (label) => Number((String(text).match(new RegExp(`${label}:\\s+(\\d+)`)) || [])[1]) || 0;
  const pages = pick('Pages free') + pick('Pages inactive') + pick('Pages speculative');
  return pages > 0 ? pages * pageSize : null;
}

function safeAuthRoot() {
  try {
    return resolveAuthRoot();
  } catch {
    return null;
  }
}

/**
 * 起動前ガード（副作用: プロセス一覧の取得のみ）。通らなければ LaunchGuardError を投げる。
 * @param {{ env?: object, platform?: NodeJS.Platform, freeMemBytes?: number|null, processRows?: object[]|null, authRoot?: string|null }} [options]
 */
export function guardBrowserLaunch(options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  if (env.DOBOKU_PW_SKIP_GUARD === '1') return { ok: true, reasons: [], skipped: true };

  const minFreeMb = Number(env.DOBOKU_PW_MIN_FREE_MB);
  const minFreeBytes = Number.isFinite(minFreeMb) && minFreeMb > 0 ? minFreeMb * 1024 * 1024 : DEFAULT_MIN_FREE_BYTES;
  const freeMemBytes = options.freeMemBytes !== undefined ? options.freeMemBytes : availableMemoryBytes({ platform });

  const authRoot = options.authRoot !== undefined ? options.authRoot : safeAuthRoot();
  const rows = options.processRows !== undefined ? options.processRows : listProcesses({ platform });
  // platform を注入できるように（テストで darwin を Windows 上で再現）ネイティブ join を使わない。
  const profilesRoot = authRoot ? (platform === 'win32' ? win32 : posix).join(authRoot, 'profiles') : null;
  const otherBrowsers = profilesRoot ? browsersUsingProfilesUnder(rows, profilesRoot, { platform }) : null;

  const verdict = evaluateLaunchGuard({
    freeMemBytes,
    minFreeBytes,
    otherBrowsers,
    allowParallel: env.DOBOKU_PW_ALLOW_PARALLEL === '1',
  });
  if (!verdict.ok) {
    throw new LaunchGuardError(`[playwright-launch] 起動を見送り: ${verdict.reasons.map((r) => r.message).join(' / ')}`, {
      code: verdict.reasons[0].code,
      reasons: verdict.reasons,
    });
  }
  return { ...verdict, skipped: false };
}

/**
 * launchPersistentContext の options を包む入口。ガード → 省メモリ設定の順。
 * 呼び出し側は `chromium.launchPersistentContext(dir, leanContextOptions({...}))` と書くだけでよい。
 */
export function leanContextOptions(base = {}, options = {}) {
  const env = options.env ?? process.env;
  guardBrowserLaunch(options);
  return mergeLeanOptions(base, { allowServiceWorkers: env.DOBOKU_PW_ALLOW_SW === '1' });
}
