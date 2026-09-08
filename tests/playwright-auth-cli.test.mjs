import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  executeAuthCommand,
  inspectDoctor,
  inspectPaths,
  loginAuthService,
  migrateAuthProfile,
  parseAuthArgs,
} from '../scripts/playwright-auth.mjs';
import { classifyAuthSnapshot, pollAuthStatus } from '../scripts/lib/playwright-auth-adapters.mjs';

function makeFixture() {
  const base = mkdtempSync(join(tmpdir(), 'doboku-auth-cli-'));
  const repoRoot = join(base, 'repo');
  const overrideRoot = join(base, 'auth');
  const configDir = join(repoRoot, '.claude', 'config');
  mkdirSync(configDir, { recursive: true });
  const entry = (profileDirName, stateFileName, sessionMode = 'profile') => ({
    profileDirName,
    stateFileName,
    loginUrl: 'http://127.0.0.1/login',
    checkUrl: 'http://127.0.0.1/check',
    accountConfigPath: null,
    sessionMode,
    interactiveLoginRequired: true,
    ciAllowed: false,
    notes: null,
  });
  writeFileSync(
    join(configDir, 'playwright-auth-profiles.json'),
    JSON.stringify({ services: {
      note: entry('playwright-note-profile', null),
      a8: entry('playwright-a8-profile', 'playwright-a8-state.json', 'profile-plus-state'),
      afb: entry('playwright-afb-profile', 'playwright-afb-state.json', 'same-process'),
    } }),
  );
  return {
    base,
    repoRoot,
    overrideRoot,
    homeDir: join(base, 'home'),
    env: {},
  };
}

test('parseAuthArgsは全commandのservice/json/commitを一貫して解釈する', () => {
  assert.deepEqual(
    parseAuthArgs(['migrate', '--service', 'note', '--commit', '--json']),
    {
      command: 'migrate', service: 'note', all: false, commit: true,
      json: true, help: false, timeoutMs: 600000,
    },
  );
  assert.equal(parseAuthArgs(['status', '--all']).all, true);
  assert.equal(parseAuthArgs(['paths', '--help']).help, true);
});

test('pathsは完全offline・副作用なしでprofile/state/lockを返す', async () => {
  const f = makeFixture();
  try {
    const result = await executeAuthCommand(['paths', '--service', 'a8', '--json'], f);
    assert.equal(result.ok, true);
    assert.equal(result.services.length, 1);
    assert.match(result.services[0].profilePath, /profiles[\\/]playwright-a8-profile$/);
    assert.match(result.services[0].statePath, /states[\\/]playwright-a8-state\.json$/);
    assert.equal(existsSync(f.overrideRoot), false, 'pathsはauth rootを作らない');
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('doctorはprofile存在をauthenticatedと呼ばず、legacyとdeprecated envを警告する', () => {
  const f = makeFixture();
  try {
    const legacy = join(f.repoRoot, '.local', 'playwright-note-profile');
    mkdirSync(legacy, { recursive: true });
    const result = inspectDoctor({ ...f, env: { DOBOKU_PROFILE_ROOT: f.repoRoot } }, 'note');
    assert.equal(result.services[0].profileExists, false);
    assert.equal(result.services[0].legacyExists, true);
    assert.match(result.services[0].note, /authenticatedを意味しない/);
    assert.ok(result.warnings.some((warning) => warning.includes('deprecated')));
    assert.equal(existsSync(f.overrideRoot), false, 'doctorはauth rootを作らない');
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('migrateはdry-run既定、commitでもcopyのみでsourceを削除しない', () => {
  const f = makeFixture();
  try {
    const sourceProfile = join(f.repoRoot, '.local', 'playwright-a8-profile');
    const sourceState = join(f.repoRoot, '.local', 'playwright-a8-state.json');
    mkdirSync(sourceProfile, { recursive: true });
    writeFileSync(join(sourceProfile, 'marker.txt'), 'profile fixture');
    writeFileSync(sourceState, '{}\n');

    const dry = migrateAuthProfile(f, 'a8', false);
    assert.equal(dry.status, 'ready');
    assert.equal(existsSync(dry.target.profilePath), false);

    const copied = migrateAuthProfile(f, 'a8', true);
    assert.equal(copied.status, 'copied-needs-status');
    assert.equal(readFileSync(join(copied.target.profilePath, 'marker.txt'), 'utf8'), 'profile fixture');
    assert.equal(existsSync(sourceProfile), true);
    assert.equal(existsSync(sourceState), true);
    assert.equal(copied.cleanupAvailable, false);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('migrateは非空targetを上書きしない', () => {
  const f = makeFixture();
  try {
    const source = join(f.repoRoot, '.local', 'playwright-note-profile');
    const target = join(f.overrideRoot, 'profiles', 'playwright-note-profile');
    mkdirSync(source, { recursive: true });
    mkdirSync(target, { recursive: true });
    writeFileSync(join(source, 'source.txt'), 'source');
    writeFileSync(join(target, 'target.txt'), 'keep');
    const result = migrateAuthProfile(f, 'note', true);
    assert.equal(result.status, 'target-not-empty');
    assert.equal(readFileSync(join(target, 'target.txt'), 'utf8'), 'keep');
    assert.equal(existsSync(join(target, 'source.txt')), false);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('migrateはChromiumの利用中markerを検出してcopyしない', () => {
  const f = makeFixture();
  try {
    const source = join(f.repoRoot, '.local', 'playwright-note-profile');
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, 'SingletonLock'), 'in use');
    const result = migrateAuthProfile(f, 'note', true);
    assert.equal(result.status, 'browser-in-use');
    assert.equal(existsSync(result.target.profilePath), false);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('fake adapter + local serverでもaccount markerなしをauthenticatedにしない', async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(req.url === '/ok' ? 'dobokunote' : 'generic dashboard');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const adapter = {
      supported: true,
      expectedMarkers: ['dobokunote'],
      forbiddenMarkers: [],
      expiredPattern: /\/login/,
    };
    const unknownText = await globalThis.fetch(`http://127.0.0.1:${port}/unknown`).then((response) => response.text());
    const okText = await globalThis.fetch(`http://127.0.0.1:${port}/ok`).then((response) => response.text());
    assert.equal(classifyAuthSnapshot(adapter, { url: `http://127.0.0.1:${port}/unknown`, text: unknownText }).status, 'unknown');
    assert.equal(classifyAuthSnapshot(adapter, { url: `http://127.0.0.1:${port}/ok`, text: okText }).status, 'authenticated');
    assert.equal(classifyAuthSnapshot(adapter, { url: `http://127.0.0.1:${port}/login`, text: okText }).status, 'expired');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ログアウトはURL redirect以外でも検出し、認証済みの設定画面をexpiredにしない', () => {
  const adapter = {
    supported: true,
    expectedMarkers: ['dobokunote'],
    forbiddenMarkers: [],
    expiredPattern: /\/login/,
    loggedOutMarkers: ['ログイン'],
  };

  // account marker が出ていれば、パスワード変更欄のある設定画面でも authenticated
  //（note の /settings/account がこの形。ここを取り違えると認証済みを未ログインと呼ぶ）
  assert.equal(
    classifyAuthSnapshot(adapter, { url: 'https://note.com/settings/account', text: 'dobokunote さん', hasPasswordField: true }).status,
    'authenticated',
  );

  // marker が無くパスワード欄が出ている＝ログインを求められている（x の x.com/ がこの形）
  assert.equal(
    classifyAuthSnapshot(adapter, { url: 'https://x.com/', text: '「いま」を見つけよう', hasPasswordField: true }).status,
    'expired',
  );

  // marker が無く本文がログイン CTA だけ（brain の /mypage がこの形。redirect しない）
  assert.equal(
    classifyAuthSnapshot(adapter, { url: 'https://brain-market.com/mypage', text: 'ログイン' }).status,
    'expired',
  );

  // marker も無くログインの手掛かりも無いときは unknown のまま（expired と断定しない）
  assert.equal(
    classifyAuthSnapshot(adapter, { url: 'https://example.com/mypage', text: 'generic dashboard' }).status,
    'unknown',
  );
});

test('status判定はunknownのときだけ待ち直し、決着済みの分類は即返す', async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };

  // authenticated は 1 回目で確定する（待ち直さない）
  let calls = 0;
  const ok = await pollAuthStatus(async () => { calls += 1; return { status: 'authenticated' }; }, { sleep });
  assert.equal(ok.status, 'authenticated');
  assert.equal(ok.attemptsUsed, 1);
  assert.equal(calls, 1);

  // expired（login 画面へ redirect）も決着済みなので待ち直さない
  const expired = await pollAuthStatus(async () => ({ status: 'expired' }), { sleep });
  assert.equal(expired.attemptsUsed, 1);

  // unknown は指定回数まで待ち直し、最後まで unknown なら回数付きで返す
  let unknownCalls = 0;
  const unknown = await pollAuthStatus(async () => { unknownCalls += 1; return { status: 'unknown' }; }, { attempts: 4, sleep });
  assert.equal(unknown.status, 'unknown');
  assert.equal(unknown.attemptsUsed, 4);
  assert.equal(unknownCalls, 4);

  // 途中で描画が間に合えばそこで authenticated になる（描画待ちを未認証と読み替えない）
  let n = 0;
  const late = await pollAuthStatus(async () => { n += 1; return { status: n < 3 ? 'unknown' : 'authenticated' }; }, { attempts: 6, sleep });
  assert.equal(late.status, 'authenticated');
  assert.equal(late.attemptsUsed, 3);
});

test('inspectPathsのJSON相当出力にsecret内容を含めない', () => {
  const f = makeFixture();
  try {
    const text = JSON.stringify(inspectPaths(f));
    assert.doesNotMatch(text, /password|cookie|token|2fa/i);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('対話ログインは本人確認画面を閉じず、人間の完了後にaccountを確認する', async () => {
  const f = makeFixture();
  const navigations = [];
  const events = [];
  const snapshots = [
    { url: 'https://note.com/login', text: 'CAPTCHA', title: '' },
    { url: 'https://note.com/', text: 'ログイン後', title: '' },
    { url: 'https://note.com/settings/account', text: 'dobokunote', title: '' },
  ];
  let closed = false;
  const page = {
    goto: async (url) => { navigations.push(url); events.push('goto'); },
    evaluate: async () => { events.push('snapshot'); return snapshots.shift(); },
    waitForTimeout: async () => { assert.equal(closed, false); events.push('wait'); },
  };
  const browser = { pages: () => [page], close: async () => { closed = true; } };
  try {
    const result = await loginAuthService({
      ...f,
      timeoutMs: 1000,
      playwright: { chromium: { launchPersistentContext: async () => browser } },
    }, 'note');
    assert.equal(result.status, 'authenticated');
    assert.deepEqual(events.slice(0, 4), ['goto', 'snapshot', 'wait', 'snapshot']);
    assert.deepEqual(navigations, ['http://127.0.0.1/login', 'https://note.com/settings/account']);
    assert.equal(closed, true);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('本人確認が完了しない対話ログインは期限後もblockedで終了する', async () => {
  const f = makeFixture();
  const navigations = [];
  let closed = false;
  const page = {
    goto: async (url) => { navigations.push(url); },
    evaluate: async () => ({ url: 'https://note.com/login', text: 'CAPTCHA', title: '' }),
    waitForTimeout: async () => { await new Promise((resolve) => setTimeout(resolve, 30)); },
  };
  const browser = { pages: () => [page], close: async () => { closed = true; } };
  try {
    const result = await loginAuthService({
      ...f,
      timeoutMs: 20,
      playwright: { chromium: { launchPersistentContext: async () => browser } },
    }, 'note');
    assert.equal(result.ok, false);
    assert.equal(result.status, 'blocked');
    assert.deepEqual(navigations, ['http://127.0.0.1/login']);
    assert.equal(closed, true);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});
