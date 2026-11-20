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
} from '../scripts/ops/playwright-auth.mjs';
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
    collectors: [],
    writers: [],
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

test('parseAuthArgsはservice/timeoutを解釈し、削除したCI用コマンドのフラグは持たない', () => {
  const login = parseAuthArgs(['login', '--service', 'note', '--timeout-ms', '1000']);
  assert.equal(login.service, 'note');
  assert.equal(login.timeoutMs, 1000);
  for (const key of ['force', 'headed', 'event', 'schedule', 'mode', 'collectorExit']) assert.equal(key in login, false, key);
});

test('削除したCI用コマンド（keygen/export/ci-*）は未知のcommandとして拒否する', async () => {
  const f = makeFixture();
  try {
    for (const command of ['keygen', 'export', 'ci-plan']) {
      await assert.rejects(executeAuthCommand([command, '--service', 'note'], f), /未知のcommand/, command);
    }
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});

test('CIではpathsもprofileを返さずAUTH_CI_NO_LOGINで拒否する', async () => {
  const f = makeFixture();
  try {
    await assert.rejects(
      executeAuthCommand(['paths', '--service', 'note'], { ...f, env: { GITHUB_ACTIONS: 'true' } }),
      /AUTH_CI_NO_LOGIN/,
    );
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
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

test('moshimo: 本文のお知らせ・メディア一覧ではなく選択中メディアで判定する（2026-09-28 実測）', async () => {
  const { loadAuthAdapter } = await import('../scripts/lib/playwright-auth-adapters.mjs');
  const adapter = loadAuthAdapter('moshimo', { repoRoot: process.cwd() });
  const url = 'https://af.moshimo.com/af/shop/index?shop_site_id=672381';
  const text = 'メディアを選択 統計で見る都道府県 doboku-note … 復旧までしばらくお待ちください';
  assert.equal(classifyAuthSnapshot(adapter, { url, title: 'メディアオーナートップページ', text, accountText: 'doboku-note' }).status, 'authenticated');
  assert.equal(classifyAuthSnapshot(adapter, { url, title: 'メディアオーナートップページ', text, accountText: '統計で見る都道府県' }).status, 'unknown');
  assert.equal(classifyAuthSnapshot(adapter, { url: 'https://af.moshimo.com/af/shop/login', text: '', accountText: '' }).status, 'expired');
});

test('profile は state を足さず、profile-plus-state は足す。認証成功だけ失敗印を消す', async () => {
  const { statusAuthService } = await import('../scripts/ops/playwright-auth.mjs');
  for (const sessionMode of ['profile', 'profile-plus-state']) {
    const f = makeFixture();
    try {
      const registryPath = join(f.repoRoot, '.claude/config/playwright-auth-profiles.json');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      registry.services.note.stateFileName = 'note.json';
      registry.services.note.sessionMode = sessionMode;
      writeFileSync(registryPath, JSON.stringify(registry));
      mkdirSync(join(f.overrideRoot, 'states'), { recursive: true });
      mkdirSync(join(f.overrideRoot, 'profiles/playwright-note-profile'), { recursive: true });
      mkdirSync(join(f.overrideRoot, 'metadata'), { recursive: true });
      writeFileSync(join(f.overrideRoot, 'states/note.json'), JSON.stringify({ cookies: [{ name: 'fixture' }] }));
      const mark = join(f.overrideRoot, 'metadata/note.autologin-failed');
      const shot = `${mark}.png`;
      let statusOk = false;
      let added = 0;
      let saved = 0;
      const page = { goto: async () => {}, waitForTimeout: async () => {}, evaluate: async () => ({ url: statusOk ? 'https://note.com/settings/account' : 'https://note.com/login', text: statusOk ? 'dobokunote' : '' }) };
      const browser = { pages: () => [page], close: async () => {}, addCookies: async () => { added++; }, storageState: async () => { saved++; } };
      const ctx = { ...f, timeoutMs: 100, playwright: { chromium: { launchPersistentContext: async () => browser } } };
      writeFileSync(mark, 'date human_required'); writeFileSync(shot, 'fixture');
      assert.equal((await statusAuthService(ctx, 'note')).status, 'expired');
      assert.equal(existsSync(mark), true);
      assert.equal(added, sessionMode === 'profile' ? 0 : 1);
      statusOk = true;
      assert.equal((await loginAuthService(ctx, 'note')).status, 'authenticated');
      assert.equal(saved, 1);
      assert.equal(existsSync(mark), false); assert.equal(existsSync(shot), false);
      const last = JSON.parse(readFileSync(join(f.overrideRoot, 'metadata/note.last-status.json'), 'utf8'));
      assert.equal(last.status, 'authenticated'); assert.ok(Date.parse(last.checkedAt));
      writeFileSync(mark, 'date error'); writeFileSync(shot, 'fixture');
      assert.equal((await statusAuthService(ctx, 'note')).status, 'authenticated');
      assert.equal(existsSync(mark), false); assert.equal(existsSync(shot), false);
    } finally { rmSync(f.base, { recursive: true, force: true }); }
  }
});

test('status も新しい共用 state を読み込み、古い共用 state で上書きしない', async () => {
  const { statusAuthService } = await import('../scripts/ops/playwright-auth.mjs');
  const { utimesSync } = await import('node:fs');
  const f = makeFixture();
  try {
    // 共用取り込みは fixture の state だけで確かめる。
    const { importSharedState } = await import('../scripts/lib/auth-session-refresh.mjs');
    const shared = join(f.base, 'shared'); mkdirSync(shared);
    const options = { ...f, cwd: f.repoRoot, env: { DOBOKU_SHARED_ASP_SESSIONS: shared } };
    writeFileSync(join(shared, 'a8-state.json'), JSON.stringify({ cookies: [{ name: 'new' }] }));
    assert.equal(importSharedState('a8', options, { dryRun: true }).import, true);
    assert.equal(existsSync(join(f.overrideRoot, 'states/playwright-a8-state.json')), false);
    assert.equal(importSharedState('a8', options).import, true);
    const local = join(f.overrideRoot, 'states/playwright-a8-state.json');
    utimesSync(local, new Date('2030-01-01'), new Date('2030-01-01'));
    assert.equal(importSharedState('a8', options).reason, 'local-newer');
    // status 経路の取り込みは新しい shared が存在すれば profile を作ってブラウザへ渡す。
    // a8 adapter が読む設定だけ fixture に供給する。
    mkdirSync(join(f.repoRoot, 'config'), { recursive: true });
    const { datasetPath } = await import('../scripts/lib/datasets.mjs');
    const configPath = join(f.repoRoot, datasetPath('config.a8-report-automation'));
    writeFileSync(configPath, JSON.stringify({ a8: { baseUrl: 'https://media-console.a8.net', homePath: '/home', mediaId: 'fixture' } }));
    rmSync(f.overrideRoot, { recursive: true, force: true });
    let cookies;
    const page = { goto: async () => {}, evaluate: async () => ({ url: 'https://www.a8.net/login', text: '' }), waitForTimeout: async () => {} };
    await statusAuthService({ ...f, env: options.env, playwright: { chromium: { launchPersistentContext: async () => ({ pages: () => [page], addCookies: async (c) => { cookies = c; }, close: async () => {} }) } } }, 'a8');
    assert.deepEqual(cookies, [{ name: 'new' }]);
  } finally { rmSync(f.base, { recursive: true, force: true }); }
});
