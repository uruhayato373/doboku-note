/**
 * playwright-auth-state.mjs — CI encrypted-state（暗号化 storageState）の純関数 + 薄い I/O
 * ---------------------------------------------------------------------------
 * 背景: playwright-auth-profiles.json version 2 の ci.mode='encrypted-state' は、
 * Mac 側で操作者が export した Playwright storageState を age で暗号化して private R2 へ
 * 置き、CI 側は allowlist された script だけがそれを一時 root へ復元して使う設計
 * （registry・CI 側の allowlist・root 判定は scripts/lib/playwright-auth-profile.mjs）。
 * 本モジュールはその中身——
 *   (1) storageState をサービスの stateDomains でフィルタし検証する純関数
 *   (2) age 暗号化・復号
 *   (3) private R2 への CAS（If-Match）付き put/get と manifest 世代管理
 *   (4) Playwright context への実際の復元・書き戻し（薄い I/O、s3/fs は呼び出し側が注入）
 * を提供する。password / cookie の値そのものをログへ出す処理はここには置かない
 * （出力は呼び出し側で redactAuthDiagnostic を通す）。
 *
 * 純関数と I/O を分けている理由: テストで fake s3 / fake context を注入できるようにするため。
 * 実 R2 / 実ブラウザに触れる経路はテストで一切呼ばない。
 * ---------------------------------------------------------------------------
 */
import { createHash } from 'node:crypto';
import { readFileSync, chmodSync } from 'node:fs';

/** サービス側の CI mode を示す値（呼び出し側は playwright-auth-profile.mjs の同名 export を使う）。 */
const RESTORE_SENTINEL_KEY = '__doboku_state_restored';

// ---------------------------------------------------------------------------
// 純関数
// ---------------------------------------------------------------------------

/**
 * cookie.domain の先頭 '.' を除いた値が stateDomains のいずれかと等しいか、その末尾一致か。
 * @param {string} domain
 * @param {string[]} stateDomains
 */
function domainMatches(domain, stateDomains) {
  const bare = String(domain ?? '').replace(/^\./, '');
  return stateDomains.some((d) => bare === d || bare.endsWith(`.${d}`));
}

/**
 * storageState をサービスの stateDomains でフィルタする（純関数）。
 * @param {{ cookies?: Array<object>, origins?: Array<object> }} state
 * @param {string[]} stateDomains
 * @returns {{ state: { cookies: Array<object>, origins: Array<object> }, cookieCount: number, originCount: number, domains: string[] }}
 */
export function filterStateForService(state, stateDomains) {
  const cookies = Array.isArray(state?.cookies) ? state.cookies : [];
  const origins = Array.isArray(state?.origins) ? state.origins : [];

  const filteredCookies = cookies.filter((c) => domainMatches(c?.domain, stateDomains));
  const filteredOrigins = origins.filter((o) => {
    let host;
    try {
      host = new URL(o?.origin).hostname;
    } catch {
      return false;
    }
    return domainMatches(host, stateDomains);
  });

  const domains = [...new Set(filteredCookies.map((c) => String(c.domain ?? '').replace(/^\./, '')))].sort();

  return {
    state: { cookies: filteredCookies, origins: filteredOrigins },
    cookieCount: filteredCookies.length,
    originCount: filteredOrigins.length,
    domains,
  };
}

/**
 * フィルタ済み state が「使える」かを検証する（純関数）。
 * @param {{ cookies: Array<object> }} filtered
 * @param {{ checkUrl: string }} options
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateExportedState(filtered, { checkUrl }) {
  const reasons = [];
  const cookies = Array.isArray(filtered?.cookies) ? filtered.cookies : [];
  if (cookies.length < 1) reasons.push('NO_COOKIES');

  let host = null;
  try {
    host = new URL(checkUrl).hostname;
  } catch {
    reasons.push('CHECK_URL_INVALID');
  }
  if (host) {
    const hasMatch = cookies.some((c) => domainMatches(c?.domain, [host]) || domainMatches(host, [String(c?.domain ?? '').replace(/^\./, '')]));
    if (!hasMatch) reasons.push('CHECK_URL_HOST_NOT_COVERED');
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * localStorage 復元用の addInitScript 文字列を組み立てる（純関数・XSS 的な文字列連結をしない）。
 * sentinel key が既に無いときだけ、location.origin が一致する origin の localStorage を書く。
 * @param {Array<{ origin: string, localStorage?: Array<{ name: string, value: string }> }>} origins
 * @returns {string}
 */
export function buildLocalStorageInitScript(origins) {
  const safeOrigins = Array.isArray(origins) ? origins : [];
  const payload = safeOrigins
    .filter((o) => o && typeof o.origin === 'string')
    .map((o) => ({ origin: o.origin, items: Array.isArray(o.localStorage) ? o.localStorage : [] }));
  const payloadJson = JSON.stringify(payload);
  const sentinelJson = JSON.stringify(RESTORE_SENTINEL_KEY);

  return `(() => {
  const sentinelKey = ${sentinelJson};
  try {
    if (window.localStorage.getItem(sentinelKey)) return;
  } catch (e) { return; }
  const entries = ${payloadJson};
  const here = window.location.origin;
  for (const entry of entries) {
    if (entry.origin !== here) continue;
    for (const item of entry.items) {
      try { window.localStorage.setItem(item.name, item.value); } catch (e) { /* ignore */ }
    }
  }
  try { window.localStorage.setItem(sentinelKey, '1'); } catch (e) { /* ignore */ }
})();`;
}

/**
 * private R2 上の object key を組み立てる（純関数）。
 * @param {string} serviceId
 * @param {{ keyPrefix: string }} cfg getCIAuthStateConfig の戻り値
 */
export function objectKeys(serviceId, cfg) {
  const base = `${cfg.keyPrefix}${serviceId}`;
  return {
    state: `${base}/state.age`,
    prev: `${base}/state.prev.age`,
    manifest: `${base}/manifest.json`,
  };
}

/**
 * 次の manifest を組み立てる（純関数・secret を含めない）。
 * @param {object|null} prev
 * @param {{ source: 'operator'|'ci', cookieCount: number, domains: string[], ciphertextSha256: string, now: Date }} params
 */
export function nextManifest(prev, { source, cookieCount, domains, ciphertextSha256, now }) {
  const nowIso = now.toISOString();
  return {
    schemaVersion: 1,
    service: prev?.service ?? undefined,
    generation: (prev?.generation ?? 0) + 1,
    source,
    exportedAt: nowIso,
    operatorExportedAt: source === 'operator' ? nowIso : (prev?.operatorExportedAt ?? null),
    cookieCount,
    domains,
    ciphertextSha256,
  };
}

/**
 * 書き戻しをすべきかどうかを判定する（純関数）。
 * @param {{ restoredGeneration: number, remoteManifest: { generation: number }|null,
 *           collectorExitCode: number, probeStatus: 'authenticated'|string, cookieCount: number }} params
 * @returns {{ write: boolean, reason: string }}
 */
export function decideWriteback({ restoredGeneration, remoteManifest, collectorExitCode, probeStatus, cookieCount }) {
  if (collectorExitCode !== 0) return { write: false, reason: 'collector-failed' };
  if (probeStatus !== 'authenticated') return { write: false, reason: 'not-authenticated' };
  if (!(cookieCount >= 1)) return { write: false, reason: 'no-cookies' };
  if (remoteManifest && remoteManifest.generation !== restoredGeneration) {
    return { write: false, reason: 'generation-moved' };
  }
  return { write: true, reason: 'ok' };
}

const VALID_CI_MODES = new Set(['collect', undefined, null]);

/**
 * CI で実行するサービス×mode の行列を組み立てる（純関数）。
 * @param {Record<string, object>} registry loadAuthRegistry().services
 * @param {{ event: 'schedule'|'workflow_dispatch', schedule?: string, inputService?: string, inputMode?: string }} params
 * @returns {{ matrix: Array<{ service: string, mode: string }>, skipped: Array<{ service: string, reason: string }>, invalid: boolean, counts: { enabled: number, due: number, skipped: number } }}
 */
export function planCIServices(registry, { event, schedule, inputService, inputMode }) {
  const services = registry ?? {};
  const mode = inputMode ?? 'collect';
  const matrix = [];
  const skipped = [];
  let enabledCount = 0;
  let invalid = false;

  const entries = Object.entries(services);

  if (event === 'workflow_dispatch') {
    if (inputService && inputService !== 'all') {
      const entry = services[inputService];
      if (!entry || entry.ci?.mode === 'none' || entry.ci?.enabled === false) {
        return { matrix: [], skipped: [], invalid: true, counts: { enabled: 0, due: 0, skipped: 0 } };
      }
      enabledCount = 1;
      matrix.push({ service: inputService, mode });
      return { matrix, skipped, invalid: false, counts: { enabled: 1, due: 1, skipped: 0 } };
    }
    for (const [service, entry] of entries) {
      const ci = entry?.ci;
      if (!ci || ci.mode === 'none') { skipped.push({ service, reason: 'mode-none' }); continue; }
      if (ci.enabled === false) { skipped.push({ service, reason: 'disabled' }); continue; }
      enabledCount += 1;
      if (ci.canary) { skipped.push({ service, reason: 'canary' }); continue; }
      matrix.push({ service, mode });
    }
    return { matrix, skipped, invalid, counts: { enabled: enabledCount, due: matrix.length, skipped: skipped.length } };
  }

  // event === 'schedule'
  for (const [service, entry] of entries) {
    const ci = entry?.ci;
    if (!ci || ci.mode === 'none') { skipped.push({ service, reason: 'mode-none' }); continue; }
    if (ci.enabled === false) { skipped.push({ service, reason: 'disabled' }); continue; }
    enabledCount += 1;
    if (ci.canary) { skipped.push({ service, reason: 'canary' }); continue; }
    if (ci.cron !== schedule) { skipped.push({ service, reason: 'not-due' }); continue; }
    matrix.push({ service, mode });
  }

  return { matrix, skipped, invalid, counts: { enabled: enabledCount, due: matrix.length, skipped: skipped.length } };
}

/** sha256 hex digest。 */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * state を age recipient で暗号化する。
 * @param {string|Uint8Array} plaintext
 * @param {string} recipient age1... の公開鍵
 * @returns {Promise<Uint8Array>}
 */
export async function encryptState(plaintext, recipient) {
  const { Encrypter } = await import('age-encryption');
  const e = new Encrypter();
  e.addRecipient(recipient);
  return e.encrypt(plaintext);
}

/**
 * age 暗号を identity で復号し、UTF-8 文字列として返す。
 * @param {Uint8Array} ciphertext
 * @param {string} identity AGE-SECRET-KEY-1... （呼び出し側が env から読んで渡す）
 * @returns {Promise<string>}
 */
export async function decryptState(ciphertext, identity) {
  const { Decrypter } = await import('age-encryption');
  const d = new Decrypter();
  d.addIdentity(identity);
  return d.decrypt(ciphertext, 'text');
}

// ---------------------------------------------------------------------------
// I/O（s3 クライアント注入可）
// ---------------------------------------------------------------------------

/**
 * manifest.json を取得する。存在しなければ { manifest: null, etag: null }。
 * @param {{ s3: object, bucket: string, key: string }} params
 */
export async function getManifest({ s3, bucket, key }) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await streamToString(res.Body);
    return { manifest: JSON.parse(body), etag: res.ETag ?? null };
  } catch (e) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
      return { manifest: null, etag: null };
    }
    throw e;
  }
}

/**
 * state.age（暗号済み storageState）を取得する。存在しなければ null。
 * @param {{ s3: object, bucket: string, key: string }} params
 * @returns {Promise<Uint8Array|null>}
 */
export async function getState({ s3, bucket, key }) {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return await streamToBytes(res.Body);
  } catch (e) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/**
 * 暗号化 state を CAS（If-Match）付きで置く。
 * 手順: 既存 state.age があれば prev へ CopyObject 退避 → PutObject state.age → PutObject manifest.json。
 * @param {{ s3: object, bucket: string, keys: { state: string, prev: string, manifest: string },
 *           ciphertext: Uint8Array, manifest: object, ifMatchEtag?: string|null }} params
 * @returns {Promise<{ ok: true, etag: string|undefined } | { ok: false, reason: 'cas-conflict' }>}
 */
export async function putStateWithCAS({ s3, bucket, keys, ciphertext, manifest, ifMatchEtag }) {
  const { PutObjectCommand, CopyObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');

  // 既存 state があれば prev へ退避する。
  let existing = true;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: keys.state }));
  } catch (e) {
    if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) existing = false;
    else throw e;
  }
  if (existing) {
    await s3.send(new CopyObjectCommand({
      Bucket: bucket,
      Key: keys.prev,
      CopySource: `${bucket}/${keys.state}`,
    }));
  }

  try {
    const putParams = { Bucket: bucket, Key: keys.state, Body: ciphertext };
    if (ifMatchEtag) putParams.IfMatch = ifMatchEtag;
    const putRes = await s3.send(new PutObjectCommand(putParams));

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: keys.manifest,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
    }));

    return { ok: true, etag: putRes.ETag };
  } catch (e) {
    if (e?.name === 'PreconditionFailed' || e?.$metadata?.httpStatusCode === 412) {
      return { ok: false, reason: 'cas-conflict' };
    }
    throw e;
  }
}

async function streamToBytes(body) {
  if (body?.transformToByteArray) return body.transformToByteArray();
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function streamToString(body) {
  if (body?.transformToString) return body.transformToString('utf-8');
  const bytes = await streamToBytes(body);
  return Buffer.from(bytes).toString('utf-8');
}

// ---------------------------------------------------------------------------
// Playwright context への復元 / 書き戻し
// ---------------------------------------------------------------------------

/**
 * ローカルの statePath (JSON storageState) から Playwright context へ復元する。
 * CI encrypted-state mode 以外では no-op（ローカル挙動不変）。
 * @param {object} context Playwright BrowserContext（addCookies / addInitScript を持つ）
 * @param {string} serviceId
 * @param {{ statePath: string, env?: object }} params
 * @returns {Promise<{ restored: true, cookieCount: number, originCount: number } | { restored: false, reason: string }>}
 */
export async function restoreSessionFromState(context, serviceId, { statePath, env = process.env }) {
  const CI_SESSION_MODE_ENV = 'DOBOKU_AUTH_SESSION_MODE';
  const CI_SESSION_MODE_VALUE = 'encrypted-state';
  if (env?.[CI_SESSION_MODE_ENV] !== CI_SESSION_MODE_VALUE) {
    return { restored: false, reason: 'not-ci-mode' };
  }

  let raw;
  try {
    raw = readFileSync(statePath, 'utf-8');
  } catch {
    return { restored: false, reason: 'state-missing' };
  }

  const state = JSON.parse(raw);
  const cookies = Array.isArray(state.cookies) ? state.cookies : [];
  const origins = Array.isArray(state.origins) ? state.origins : [];

  if (cookies.length > 0) await context.addCookies(cookies);
  await context.addInitScript(buildLocalStorageInitScript(origins));

  return { restored: true, cookieCount: cookies.length, originCount: origins.length };
}

/**
 * CI encrypted-state mode のとき、context に対して復元 + close 時 / 定期的な storageState 保存を仕込む。
 * mode 外では no-op（{ attached: false }）。
 * @param {object} context Playwright BrowserContext
 * @param {string} serviceId
 * @param {{ statePath: string, env?: object, intervalMs?: number }} params
 */
export async function attachCISession(context, serviceId, { statePath, env = process.env, intervalMs = 20000 }) {
  const restored = await restoreSessionFromState(context, serviceId, { statePath, env });
  if (!restored.restored && restored.reason === 'not-ci-mode') {
    return { attached: false, restored };
  }

  const save = async () => {
    try {
      await context.storageState({ path: statePath });
      try { chmodSync(statePath, 0o600); } catch { /* best-effort */ }
    } catch { /* best-effort: close 中の失敗で握りつぶさない理由が無ければ黙って続行 */ }
  };

  const timer = setInterval(save, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();

  const originalClose = context.close.bind(context);
  context.close = async (...args) => {
    clearInterval(timer);
    await save();
    return originalClose(...args);
  };

  return { attached: true, restored };
}
