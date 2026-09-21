// playwright-auth-state.test.mjs — encrypted-state lib（scripts/lib/playwright-auth-state.mjs）の回帰テスト。
// 実 R2 / 実ブラウザには一切触れない（s3 は fake、context は fake object）。
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterStateForService,
  validateExportedState,
  buildLocalStorageInitScript,
  objectKeys,
  nextManifest,
  decideWriteback,
  planCIServices,
  sha256Hex,
  encryptState,
  decryptState,
  getManifest,
  getState,
  putStateWithCAS,
  restoreSessionFromState,
  attachCISession,
} from '../scripts/lib/playwright-auth-state.mjs';

// ---------------------------------------------------------------------------
// filterStateForService
// ---------------------------------------------------------------------------

test('filterStateForService: サブドメイン・先頭ドットは残し、他ドメインは除外する', () => {
  const state = {
    cookies: [
      { name: 'a', domain: '.note.com', value: '1' },
      { name: 'b', domain: 'sub.note.com', value: '2' },
      { name: 'c', domain: 'evil.com', value: '3' },
    ],
    origins: [
      { origin: 'https://note.com', localStorage: [{ name: 'k', value: 'v' }] },
      { origin: 'https://evil.com', localStorage: [] },
    ],
  };
  const result = filterStateForService(state, ['note.com']);
  assert.equal(result.cookieCount, 2);
  assert.equal(result.originCount, 1);
  assert.deepEqual(result.state.cookies.map((c) => c.name), ['a', 'b']);
  assert.deepEqual(result.state.origins.map((o) => o.origin), ['https://note.com']);
  assert.deepEqual(result.domains, ['note.com', 'sub.note.com']);
});

test('filterStateForService: 空 state は 0 件を返す', () => {
  const result = filterStateForService({}, ['note.com']);
  assert.equal(result.cookieCount, 0);
  assert.equal(result.originCount, 0);
  assert.deepEqual(result.domains, []);
});

// ---------------------------------------------------------------------------
// validateExportedState
// ---------------------------------------------------------------------------

test('validateExportedState: 0 cookie は NG', () => {
  const result = validateExportedState({ cookies: [] }, { checkUrl: 'https://note.com/notes' });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('NO_COOKIES'));
});

test('validateExportedState: checkUrl のホストに一致する cookie が無ければ NG', () => {
  const result = validateExportedState(
    { cookies: [{ name: 'a', domain: 'other.com' }] },
    { checkUrl: 'https://note.com/notes' },
  );
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('CHECK_URL_HOST_NOT_COVERED'));
});

test('validateExportedState: 一致する cookie が 1 件以上あれば OK', () => {
  const result = validateExportedState(
    { cookies: [{ name: 'a', domain: '.note.com' }] },
    { checkUrl: 'https://note.com/notes' },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.reasons, []);
});

// ---------------------------------------------------------------------------
// buildLocalStorageInitScript
// ---------------------------------------------------------------------------

test('buildLocalStorageInitScript: sentinel と JSON を含み、eval を使わない', () => {
  const script = buildLocalStorageInitScript([
    { origin: 'https://note.com', localStorage: [{ name: 'token-like-key', value: 'v1' }] },
  ]);
  assert.match(script, /__doboku_state_restored/);
  assert.match(script, /note\.com/);
  assert.match(script, /token-like-key/);
  assert.doesNotMatch(script, /\beval\(/);
});

test('buildLocalStorageInitScript: origins が空でも例外にならない文字列を返す', () => {
  const script = buildLocalStorageInitScript([]);
  assert.equal(typeof script, 'string');
  assert.match(script, /__doboku_state_restored/);
});

// ---------------------------------------------------------------------------
// objectKeys
// ---------------------------------------------------------------------------

test('objectKeys: keyPrefix + serviceId から 3 種類のキーを組み立てる', () => {
  const keys = objectKeys('note', { keyPrefix: 'auth-state/' });
  assert.deepEqual(keys, {
    state: 'auth-state/note/state.age',
    prev: 'auth-state/note/state.prev.age',
    manifest: 'auth-state/note/manifest.json',
  });
});

// ---------------------------------------------------------------------------
// nextManifest
// ---------------------------------------------------------------------------

test('nextManifest: generation を +1 し operatorExportedAt を継承する', () => {
  const now = new Date('2026-09-21T00:00:00Z');
  const prev = {
    generation: 3,
    operatorExportedAt: '2026-09-01T00:00:00.000Z',
  };
  const m = nextManifest(prev, { source: 'ci', cookieCount: 2, domains: ['note.com'], ciphertextSha256: 'abc', now });
  assert.equal(m.generation, 4);
  assert.equal(m.source, 'ci');
  assert.equal(m.operatorExportedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(m.exportedAt, now.toISOString());
  assert.equal(m.cookieCount, 2);
  assert.deepEqual(m.domains, ['note.com']);
  assert.equal(m.ciphertextSha256, 'abc');
});

test('nextManifest: prev が無ければ generation は 1、operator source なら operatorExportedAt を更新する', () => {
  const now = new Date('2026-09-21T00:00:00Z');
  const m = nextManifest(null, { source: 'operator', cookieCount: 1, domains: ['note.com'], ciphertextSha256: 'x', now });
  assert.equal(m.generation, 1);
  assert.equal(m.operatorExportedAt, now.toISOString());
});

// ---------------------------------------------------------------------------
// decideWriteback
// ---------------------------------------------------------------------------

test('decideWriteback: collector 失敗は書き戻さない', () => {
  const r = decideWriteback({ restoredGeneration: 1, remoteManifest: { generation: 1 }, collectorExitCode: 1, probeStatus: 'authenticated', cookieCount: 3 });
  assert.deepEqual(r, { write: false, reason: 'collector-failed' });
});

test('decideWriteback: 未認証は書き戻さない', () => {
  const r = decideWriteback({ restoredGeneration: 1, remoteManifest: { generation: 1 }, collectorExitCode: 0, probeStatus: 'logged-out', cookieCount: 3 });
  assert.deepEqual(r, { write: false, reason: 'not-authenticated' });
});

test('decideWriteback: cookie 0 件は書き戻さない', () => {
  const r = decideWriteback({ restoredGeneration: 1, remoteManifest: { generation: 1 }, collectorExitCode: 0, probeStatus: 'authenticated', cookieCount: 0 });
  assert.deepEqual(r, { write: false, reason: 'no-cookies' });
});

test('decideWriteback: リモート generation が動いていれば書き戻さない（Mac 側が新しい export を置いた）', () => {
  const r = decideWriteback({ restoredGeneration: 1, remoteManifest: { generation: 2 }, collectorExitCode: 0, probeStatus: 'authenticated', cookieCount: 3 });
  assert.deepEqual(r, { write: false, reason: 'generation-moved' });
});

test('decideWriteback: 全条件を満たせば書き戻す', () => {
  const r = decideWriteback({ restoredGeneration: 1, remoteManifest: { generation: 1 }, collectorExitCode: 0, probeStatus: 'authenticated', cookieCount: 3 });
  assert.deepEqual(r, { write: true, reason: 'ok' });
});

test('decideWriteback: remoteManifest が null（初回）でも書き戻す', () => {
  const r = decideWriteback({ restoredGeneration: 0, remoteManifest: null, collectorExitCode: 0, probeStatus: 'authenticated', cookieCount: 3 });
  assert.deepEqual(r, { write: true, reason: 'ok' });
});

// ---------------------------------------------------------------------------
// planCIServices
// ---------------------------------------------------------------------------

const REGISTRY = {
  note: { ci: { mode: 'encrypted-state', enabled: true, canary: false, cron: '0 3 * * *' } },
  brain: { ci: { mode: 'encrypted-state', enabled: true, canary: true, cron: '0 3 * * *' } },
  a8: { ci: { mode: 'encrypted-state', enabled: false, canary: false, cron: '0 3 * * *' } },
  x: { ci: { mode: 'none', enabled: false, canary: false, cron: null } },
  coconala: { ci: { mode: 'encrypted-state', enabled: true, canary: false, cron: '0 5 * * *' } },
};

test('planCIServices: schedule で due/not-due/canary/disabled/none を仕分ける', () => {
  const result = planCIServices(REGISTRY, { event: 'schedule', schedule: '0 3 * * *' });
  assert.deepEqual(result.matrix, [{ service: 'note', mode: 'collect' }]);
  const reasonsByService = Object.fromEntries(result.skipped.map((s) => [s.service, s.reason]));
  assert.equal(reasonsByService.brain, 'canary');
  assert.equal(reasonsByService.a8, 'disabled');
  assert.equal(reasonsByService.x, 'mode-none');
  assert.equal(reasonsByService.coconala, 'not-due');
  assert.equal(result.invalid, false);
  assert.equal(result.counts.enabled, 3); // note, brain, coconala (a8 disabled, x mode-none excluded)
  assert.equal(result.counts.due, 1);
});

test('planCIServices: workflow_dispatch で inputService=all は enabled かつ canary:false を全部', () => {
  const result = planCIServices(REGISTRY, { event: 'workflow_dispatch', inputService: 'all' });
  const services = result.matrix.map((m) => m.service).sort();
  assert.deepEqual(services, ['coconala', 'note']);
});

test('planCIServices: workflow_dispatch で特定 service を指定すると canary でも実行できる', () => {
  const result = planCIServices(REGISTRY, { event: 'workflow_dispatch', inputService: 'brain', inputMode: 'writeback' });
  assert.deepEqual(result.matrix, [{ service: 'brain', mode: 'writeback' }]);
  assert.equal(result.invalid, false);
});

test('planCIServices: workflow_dispatch で disabled/none を指定すると invalid', () => {
  const disabled = planCIServices(REGISTRY, { event: 'workflow_dispatch', inputService: 'a8' });
  assert.equal(disabled.invalid, true);
  assert.deepEqual(disabled.matrix, []);

  const none = planCIServices(REGISTRY, { event: 'workflow_dispatch', inputService: 'x' });
  assert.equal(none.invalid, true);
  assert.deepEqual(none.matrix, []);
});

// ---------------------------------------------------------------------------
// encryptState / decryptState 往復
// ---------------------------------------------------------------------------

test('encryptState/decryptState: 生成した identity で往復でき、別 identity では復号できない', async () => {
  const { generateIdentity, identityToRecipient } = await import('age-encryption');
  const identity = await generateIdentity();
  const recipient = await identityToRecipient(identity);
  const otherIdentity = await generateIdentity();

  const plaintext = JSON.stringify({ cookies: [{ name: 'a', value: '1' }] });
  const ciphertext = await encryptState(plaintext, recipient);
  assert.ok(ciphertext instanceof Uint8Array);
  assert.ok(ciphertext.length > 0);

  const decrypted = await decryptState(ciphertext, identity);
  assert.equal(decrypted, plaintext);

  await assert.rejects(() => decryptState(ciphertext, otherIdentity));
});

// ---------------------------------------------------------------------------
// sha256Hex
// ---------------------------------------------------------------------------

test('sha256Hex: 既知の入力に対して既知のダイジェストを返す', () => {
  assert.equal(sha256Hex(Buffer.from('')), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

// ---------------------------------------------------------------------------
// getManifest / getState / putStateWithCAS（fake s3）
// ---------------------------------------------------------------------------

class NoSuchKeyError extends Error {
  constructor() {
    super('NoSuchKey');
    this.name = 'NoSuchKey';
  }
}

class PreconditionFailedError extends Error {
  constructor() {
    super('PreconditionFailed');
    this.name = 'PreconditionFailed';
  }
}

function bodyOf(value) {
  const bytes = Buffer.from(value);
  return {
    transformToByteArray: async () => new Uint8Array(bytes),
    transformToString: async () => bytes.toString('utf-8'),
  };
}

function makeFakeS3() {
  const store = new Map(); // key -> { body: Buffer, etag: string }
  let etagCounter = 0;
  const calls = [];

  const send = async (command) => {
    const name = command.constructor.name;
    const input = command.input;
    calls.push({ name, input });

    if (name === 'HeadObjectCommand') {
      const obj = store.get(input.Key);
      if (!obj) throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
      return { ETag: obj.etag };
    }
    if (name === 'GetObjectCommand') {
      const obj = store.get(input.Key);
      if (!obj) throw new NoSuchKeyError();
      return { Body: bodyOf(obj.body), ETag: obj.etag };
    }
    if (name === 'CopyObjectCommand') {
      const sourceKey = input.CopySource.split('/').slice(1).join('/');
      const src = store.get(sourceKey);
      if (!src) throw new NoSuchKeyError();
      etagCounter += 1;
      store.set(input.Key, { body: src.body, etag: `"etag-${etagCounter}"` });
      return {};
    }
    if (name === 'PutObjectCommand') {
      const existing = store.get(input.Key);
      if (input.IfMatch && (!existing || existing.etag !== input.IfMatch)) {
        throw new PreconditionFailedError();
      }
      if (input.IfNoneMatch === '*' && existing) {
        throw new PreconditionFailedError();
      }
      etagCounter += 1;
      const etag = `"etag-${etagCounter}"`;
      store.set(input.Key, { body: Buffer.from(input.Body), etag });
      return { ETag: etag };
    }
    throw new Error(`unhandled command in fake s3: ${name}`);
  };

  return { send, store, calls };
}

test('getManifest: 存在しなければ null を返す', async () => {
  const s3 = makeFakeS3();
  const result = await getManifest({ s3, bucket: 'b', key: 'auth-state/note/manifest.json' });
  assert.deepEqual(result, { manifest: null, etag: null });
});

test('getState: 存在すればバイト列、無ければ null', async () => {
  const s3 = makeFakeS3();
  s3.store.set('auth-state/note/state.age', { body: Buffer.from([1, 2, 3]), etag: '"e1"' });
  const found = await getState({ s3, bucket: 'b', key: 'auth-state/note/state.age' });
  assert.deepEqual(Array.from(found), [1, 2, 3]);

  const missing = await getState({ s3, bucket: 'b', key: 'auth-state/other/state.age' });
  assert.equal(missing, null);
});

test('putStateWithCAS: 初回は prev 退避なしで state + manifest を置く', async () => {
  const s3 = makeFakeS3();
  const keys = objectKeys('note', { keyPrefix: 'auth-state/' });
  const result = await putStateWithCAS({
    s3, bucket: 'b', keys,
    ciphertext: Buffer.from('cipher-1'),
    manifest: { schemaVersion: 1, generation: 1 },
  });
  assert.equal(result.ok, true);
  assert.equal(s3.store.has(keys.prev), false);
  assert.ok(s3.store.has(keys.state));
  assert.ok(s3.store.has(keys.manifest));
});

test('putStateWithCAS: 既存 state があれば prev へ退避してから上書きする', async () => {
  const s3 = makeFakeS3();
  const keys = objectKeys('note', { keyPrefix: 'auth-state/' });
  s3.store.set(keys.state, { body: Buffer.from('old-cipher'), etag: '"e-old"' });

  const result = await putStateWithCAS({
    s3, bucket: 'b', keys,
    ciphertext: Buffer.from('new-cipher'),
    manifest: { schemaVersion: 1, generation: 2 },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(s3.store.get(keys.prev).body, Buffer.from('old-cipher'));
  assert.deepEqual(s3.store.get(keys.state).body, Buffer.from('new-cipher'));
});

test('putStateWithCAS: CAS は manifest の etag に対して行い、不一致なら state を書き換えず cas-conflict', async () => {
  const s3 = makeFakeS3();
  const keys = objectKeys('note', { keyPrefix: 'auth-state/' });
  s3.store.set(keys.state, { body: Buffer.from('old-cipher'), etag: '"e-state"' });
  s3.store.set(keys.manifest, { body: Buffer.from('{"generation":1}'), etag: '"e-manifest"' });

  // 呼び出し側が持つのは manifest の etag。state.age の etag ではない（2026-09-21 canary で 412 になった原因）。
  const ok = await putStateWithCAS({ s3, bucket: 'b', keys, ciphertext: Buffer.from('new-cipher'), manifest: { generation: 2 }, ifMatchEtag: '"e-manifest"' });
  assert.equal(ok.ok, true);
  assert.deepEqual(s3.store.get(keys.state).body, Buffer.from('new-cipher'));
  assert.deepEqual(s3.store.get(keys.prev).body, Buffer.from('old-cipher'));
  const manifestPut = s3.calls.find((c) => c.name === 'PutObjectCommand' && c.input.Key === keys.manifest);
  assert.equal(manifestPut.input.IfMatch, '"e-manifest"');
  const statePut = s3.calls.find((c) => c.name === 'PutObjectCommand' && c.input.Key === keys.state);
  assert.equal(statePut.input.IfMatch, undefined, 'state.age には IfMatch を付けない');

  // 不一致（Mac 側が新しい export を置いた後の CI 書き戻し）: 事前 HEAD で止まり state は変わらない
  const conflict = await putStateWithCAS({ s3, bucket: 'b', keys, ciphertext: Buffer.from('newer'), manifest: { generation: 3 }, ifMatchEtag: '"e-manifest"' });
  assert.deepEqual(conflict, { ok: false, reason: 'cas-conflict' });
  assert.deepEqual(s3.store.get(keys.state).body, Buffer.from('new-cipher'));
});

test('putStateWithCAS: 初回（manifest 無し）は IfNoneMatch で置き、既に誰かが置いていれば cas-conflict', async () => {
  const s3 = makeFakeS3();
  const keys = objectKeys('kdp', { keyPrefix: 'auth-state/' });
  const first = await putStateWithCAS({ s3, bucket: 'b', keys, ciphertext: Buffer.from('c1'), manifest: { generation: 1 }, ifMatchEtag: null });
  assert.equal(first.ok, true);
  assert.equal(s3.calls.find((c) => c.name === 'PutObjectCommand' && c.input.Key === keys.manifest).input.IfNoneMatch, '*');
  const second = await putStateWithCAS({ s3, bucket: 'b', keys, ciphertext: Buffer.from('c2'), manifest: { generation: 1 }, ifMatchEtag: null });
  assert.deepEqual(second, { ok: false, reason: 'cas-conflict' });
  assert.deepEqual(s3.store.get(keys.state).body, Buffer.from('c1'), 'state.age は prev から戻される');
});

// ---------------------------------------------------------------------------
// restoreSessionFromState / attachCISession（fake context）
// ---------------------------------------------------------------------------

function makeFakeContext() {
  return {
    addedCookies: [],
    initScripts: [],
    savedPaths: [],
    closed: false,
    async addCookies(cookies) { this.addedCookies.push(...cookies); },
    async addInitScript(script) { this.initScripts.push(script); },
    async storageState({ path }) { this.savedPaths.push(path); },
    async close() { this.closed = true; },
  };
}

test('restoreSessionFromState: mode 未設定（ローカル）は no-op', async () => {
  const context = makeFakeContext();
  const result = await restoreSessionFromState(context, 'note', { statePath: '/does/not/matter.json', env: {} });
  assert.deepEqual(result, { restored: false, reason: 'not-ci-mode' });
  assert.equal(context.addedCookies.length, 0);
  assert.equal(context.initScripts.length, 0);
});

test('restoreSessionFromState: mode 有りだが state ファイルが無ければ state-missing', async () => {
  const context = makeFakeContext();
  const result = await restoreSessionFromState(context, 'note', {
    statePath: '/tmp/doboku-nonexistent-state-file.json',
    env: { DOBOKU_AUTH_SESSION_MODE: 'encrypted-state' },
  });
  assert.deepEqual(result, { restored: false, reason: 'state-missing' });
});

test('restoreSessionFromState: mode 有りで state ファイルがあれば addCookies / addInitScript が呼ばれる', async (t) => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'doboku-auth-state-test-'));
  const statePath = join(dir, 'state.json');
  writeFileSync(statePath, JSON.stringify({
    cookies: [{ name: 'a', domain: 'note.com', value: '1' }],
    origins: [{ origin: 'https://note.com', localStorage: [] }],
  }));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const context = makeFakeContext();
  const result = await restoreSessionFromState(context, 'note', {
    statePath,
    env: { DOBOKU_AUTH_SESSION_MODE: 'encrypted-state' },
  });
  assert.deepEqual(result, { restored: true, cookieCount: 1, originCount: 1 });
  assert.equal(context.addedCookies.length, 1);
  assert.equal(context.initScripts.length, 1);
});

test('attachCISession: mode 外は no-op（attached:false）', async () => {
  const context = makeFakeContext();
  const result = await attachCISession(context, 'note', { statePath: '/tmp/doboku-nope.json', env: {} });
  assert.equal(result.attached, false);
});

test('attachCISession: mode 有りで close 時に storageState を保存する', async (t) => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'doboku-auth-state-attach-test-'));
  const statePath = join(dir, 'state.json');
  writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const context = makeFakeContext();
  const result = await attachCISession(context, 'note', {
    statePath,
    env: { DOBOKU_AUTH_SESSION_MODE: 'encrypted-state' },
    intervalMs: 100000,
  });
  assert.equal(result.attached, true);
  await context.close();
  assert.equal(context.savedPaths.length, 1);
  assert.equal(context.savedPaths[0], statePath);
  assert.equal(context.closed, true);
});
