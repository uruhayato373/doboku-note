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
  migrateAuthProfile,
  parseAuthArgs,
} from '../scripts/playwright-auth.mjs';
import { classifyAuthSnapshot } from '../scripts/lib/playwright-auth-adapters.mjs';

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

test('inspectPathsのJSON相当出力にsecret内容を含めない', () => {
  const f = makeFixture();
  try {
    const text = JSON.stringify(inspectPaths(f));
    assert.doesNotMatch(text, /password|cookie|token|2fa/i);
  } finally {
    rmSync(f.base, { recursive: true, force: true });
  }
});
