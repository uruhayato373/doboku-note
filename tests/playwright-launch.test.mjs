// scripts/lib/playwright-launch.mjs と scripts/lib/process-list.mjs のテスト（2026-09-14）。
// 起動ガードは pure な evaluateLaunchGuard / guardBrowserLaunch の注入経路だけを叩き、
// 実プロセス一覧や os.freemem には触れない（CI・低メモリ機で赤くならないように）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_MIN_FREE_BYTES,
  LEAN_CHROMIUM_ARGS,
  LaunchGuardError,
  evaluateLaunchGuard,
  guardBrowserLaunch,
  leanContextOptions,
  mergeLeanOptions,
  parseVmStat,
} from '../scripts/lib/playwright-launch.mjs';
import { browsersUsingProfilesUnder, parseProcessLines } from '../scripts/lib/process-list.mjs';

const MB = 1024 * 1024;

// --- mergeLeanOptions --------------------------------------------------------

test('mergeLeanOptions: 呼び出し側の args を先頭に保ち、省キャッシュ引数を重複なく足す', () => {
  const out = mergeLeanOptions({ headless: false, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled', '--disk-cache-size=1'] });
  assert.equal(out.headless, false);
  assert.equal(out.channel, 'chrome');
  assert.equal(out.args[0], '--disable-blink-features=AutomationControlled');
  assert.equal(out.args.filter((a) => a === '--disk-cache-size=1').length, 1);
  for (const a of LEAN_CHROMIUM_ARGS) assert.ok(out.args.includes(a), a);
  assert.equal(out.serviceWorkers, 'block');
});

test('mergeLeanOptions: serviceWorkers は呼び出し側が勝つ・allowServiceWorkers で allow', () => {
  assert.equal(mergeLeanOptions({ serviceWorkers: 'allow' }).serviceWorkers, 'allow');
  assert.equal(mergeLeanOptions({}, { allowServiceWorkers: true }).serviceWorkers, 'allow');
  assert.deepEqual(mergeLeanOptions().args, [...LEAN_CHROMIUM_ARGS]);
});

// --- evaluateLaunchGuard ----------------------------------------------------

test('evaluateLaunchGuard: 空きメモリ不足と別プロファイル稼働中を理由付きで止める', () => {
  const low = evaluateLaunchGuard({ freeMemBytes: 500 * MB, minFreeBytes: 2048 * MB, otherBrowsers: [] });
  assert.equal(low.ok, false);
  assert.equal(low.reasons[0].code, 'LOW_MEMORY');
  assert.match(low.reasons[0].message, /500MB < 閾値 2048MB/);

  const busy = evaluateLaunchGuard({ freeMemBytes: 8000 * MB, minFreeBytes: 2048 * MB, otherBrowsers: [{ pid: '1', userDataDir: '/p/x' }] });
  assert.equal(busy.ok, false);
  assert.equal(busy.reasons[0].code, 'BROWSER_ALREADY_RUNNING');

  const both = evaluateLaunchGuard({ freeMemBytes: 1 * MB, minFreeBytes: 2048 * MB, otherBrowsers: [{ pid: '1', userDataDir: '/p/x' }] });
  assert.equal(both.reasons.length, 2);
});

test('evaluateLaunchGuard: 測れなかった（null）は止めない・allowParallel で並列を許す', () => {
  assert.equal(evaluateLaunchGuard({ freeMemBytes: null, minFreeBytes: 2048 * MB, otherBrowsers: null }).ok, true);
  assert.equal(evaluateLaunchGuard({ freeMemBytes: 8000 * MB, minFreeBytes: 2048 * MB, otherBrowsers: [{ pid: '1', userDataDir: '/p' }], allowParallel: true }).ok, true);
  assert.equal(evaluateLaunchGuard({ freeMemBytes: 8000 * MB, minFreeBytes: 2048 * MB, otherBrowsers: [] }).ok, true);
});

// --- guardBrowserLaunch / leanContextOptions（注入経路）-----------------------

test('guardBrowserLaunch: env で閾値変更・無効化できる。既定閾値は 2GiB', () => {
  assert.equal(DEFAULT_MIN_FREE_BYTES, 2 * 1024 ** 3);
  assert.throws(
    () => guardBrowserLaunch({ env: {}, freeMemBytes: 1000 * MB, processRows: [], authRoot: '/auth' }),
    (e) => e instanceof LaunchGuardError && e.code === 'LOW_MEMORY',
  );
  assert.equal(guardBrowserLaunch({ env: { DOBOKU_PW_MIN_FREE_MB: '512' }, freeMemBytes: 1000 * MB, processRows: [], authRoot: '/auth' }).ok, true);
  assert.equal(guardBrowserLaunch({ env: { DOBOKU_PW_SKIP_GUARD: '1' }, freeMemBytes: 1, processRows: [], authRoot: '/auth' }).skipped, true);
});

test('guardBrowserLaunch: auth root 配下のプロファイルを使う Chrome が居れば止める（別 root は無視）', () => {
  const rows = [
    { pid: '10', command: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/auth/profiles/playwright-x-profile --x' },
    { pid: '11', command: 'chrome --user-data-dir=/somewhere/else' },
  ];
  assert.throws(
    () => guardBrowserLaunch({ env: {}, platform: 'darwin', freeMemBytes: 8000 * MB, processRows: rows, authRoot: '/auth' }),
    (e) => e.code === 'BROWSER_ALREADY_RUNNING' && /pid 10/.test(e.message),
  );
  assert.equal(guardBrowserLaunch({ env: { DOBOKU_PW_ALLOW_PARALLEL: '1' }, platform: 'darwin', freeMemBytes: 8000 * MB, processRows: rows, authRoot: '/auth' }).ok, true);
  assert.equal(guardBrowserLaunch({ env: {}, platform: 'darwin', freeMemBytes: 8000 * MB, processRows: [rows[1]], authRoot: '/auth' }).ok, true);
  // auth root が解決できない・プロセス一覧が取れない＝判定不能は止めない
  assert.equal(guardBrowserLaunch({ env: {}, freeMemBytes: 8000 * MB, processRows: null, authRoot: null }).ok, true);
});

test('leanContextOptions: ガードを通してから省キャッシュ設定を重ねる', () => {
  const out = leanContextOptions({ headless: true, args: ['--a'] }, { env: { DOBOKU_PW_ALLOW_SW: '1' }, freeMemBytes: 8000 * MB, processRows: [], authRoot: '/auth' });
  assert.equal(out.headless, true);
  assert.equal(out.args[0], '--a');
  assert.equal(out.serviceWorkers, 'allow');
  assert.throws(() => leanContextOptions({}, { env: {}, freeMemBytes: 1, processRows: [], authRoot: '/auth' }), LaunchGuardError);
});

test('parseVmStat: darwin の free + inactive + speculative をページサイズで掛ける', () => {
  const text = 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 1000.\nPages active: 5.\nPages inactive: 2000.\nPages speculative: 500.\n';
  assert.equal(parseVmStat(text), (1000 + 2000 + 500) * 16384);
  assert.equal(parseVmStat(''), null);
});

// --- process-list -----------------------------------------------------------

test('parseProcessLines: ps（空白区切り）と Win32_Process（タブ区切り）の両方を読む', () => {
  const ps = parseProcessLines('  123 /usr/bin/node a b\n 45 chrome --user-data-dir=/p q\nnot a pid\n', { separator: ' ' });
  assert.deepEqual(ps, [
    { pid: '123', command: '/usr/bin/node a b' },
    { pid: '45', command: 'chrome --user-data-dir=/p q' },
  ]);
  const win = parseProcessLines('4\t\r\n999\t"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir=C:\\p\\x --y\r\n', { separator: '\t' });
  assert.equal(win.length, 2);
  assert.equal(win[0].command, '');
  assert.match(win[1].command, /^"C:\\Program Files/);
});

test('browsersUsingProfilesUnder: --user-data-dir がルート配下のものだけ拾う（win32 は大小文字と区切りを無視）', () => {
  const rows = [
    { pid: '1', command: 'chrome.exe --user-data-dir=C:\\Users\\Me\\.local\\state\\doboku-note\\playwright-auth\\profiles\\playwright-x-profile --z' },
    { pid: '2', command: 'chrome.exe --user-data-dir="C:\\Users\\Me\\Other Dir\\profile"' },
    { pid: '3', command: 'chrome.exe --user-data-dir=c:/users/me/.local/state/doboku-note/playwright-auth/profiles/playwright-note-profile' },
    { pid: '4', command: 'node something' },
  ];
  const hits = browsersUsingProfilesUnder(rows, 'C:\\Users\\me\\.local\\state\\doboku-note\\playwright-auth\\profiles', { platform: 'win32' });
  assert.deepEqual(hits.map((h) => h.pid), ['1', '3']);
  assert.equal(browsersUsingProfilesUnder(null, '/x'), null, '一覧が取れなければ null＝判定不能');
  assert.deepEqual(browsersUsingProfilesUnder(rows, null), []);
  // darwin は大小文字を区別する
  const mac = [{ pid: '9', command: 'Google Chrome --user-data-dir=/Users/me/Library/Application Support/doboku-note/playwright-auth/profiles/p' }];
  assert.equal(browsersUsingProfilesUnder(mac, '/Users/me/Library/Application Support/doboku-note/playwright-auth/profiles', { platform: 'darwin' }).length, 1);
  assert.equal(browsersUsingProfilesUnder(mac, '/users/me/library/application support/doboku-note/playwright-auth/profiles', { platform: 'darwin' }).length, 0);
});
