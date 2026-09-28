import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  AUTO_LOGIN,
  classifyLoginOutcome,
  cronFiresWithin,
  decideSharedImport,
  keychainServiceNames,
  parseKeychainAccount,
  sharedStatePath,
} from '../scripts/lib/auth-session-refresh.mjs';
import { planCIServices } from '../scripts/lib/playwright-auth-state.mjs';
import { validateCIBlock } from '../scripts/lib/playwright-auth-profile.mjs';

test('共用口座だけ stats47 のキーチェーン項目を代わりに使う（KDP は doboku-note 専用のみ）', () => {
  assert.deepEqual(keychainServiceNames('a8'), ['doboku-note-auth-a8', 'stats47-measurement-a8']);
  assert.deepEqual(keychainServiceNames('moshimo'), ['doboku-note-auth-moshimo', 'stats47-measurement-moshimo']);
  assert.deepEqual(keychainServiceNames('kdp'), ['doboku-note-auth-kdp']);
  assert.deepEqual(keychainServiceNames('note'), ['doboku-note-auth-note']);
  assert.deepEqual(keychainServiceNames('coconala'), ['doboku-note-auth-coconala']);
  assert.deepEqual(keychainServiceNames('x'), []);
});

test('共用 state の置き場は asp-sessions（env で差し替え可）・共用でない service は null', () => {
  assert.equal(sharedStatePath('a8', {}, '/Users/u'), join('/Users/u', '.local', 'share', 'asp-sessions', 'a8-state.json'));
  assert.equal(sharedStatePath('moshimo', { DOBOKU_SHARED_ASP_SESSIONS: '/tmp/s' }, '/Users/u'), join('/tmp/s', 'moshimo-state.json'));
  assert.equal(sharedStatePath('kdp', {}, '/Users/u'), null);
});

test('共用 state は新しいときだけ取り込み、空・欠落・ローカルの方が新しいときは触らない', () => {
  assert.deepEqual(decideSharedImport({ sharedMtimeMs: 200, localMtimeMs: 100, sharedCookieCount: 5 }), { import: true, reason: 'shared-newer' });
  assert.deepEqual(decideSharedImport({ sharedMtimeMs: 200, localMtimeMs: NaN, sharedCookieCount: 5 }), { import: true, reason: 'shared-newer' });
  assert.equal(decideSharedImport({ sharedMtimeMs: 100, localMtimeMs: 200, sharedCookieCount: 5 }).reason, 'local-newer');
  assert.equal(decideSharedImport({ sharedMtimeMs: 100, localMtimeMs: 100, sharedCookieCount: 5 }).reason, 'local-newer');
  assert.equal(decideSharedImport({ sharedMtimeMs: 200, localMtimeMs: 100, sharedCookieCount: 0 }).reason, 'shared-empty');
  assert.equal(decideSharedImport({ sharedMtimeMs: NaN, localMtimeMs: 100, sharedCookieCount: 5 }).reason, 'shared-missing');
});

test('キーチェーン属性からアカウント名だけを取り出す', () => {
  assert.equal(parseKeychainAccount('keychain: "x"\n    "acct"<blob>="user@example.com"\n    "svce"<blob>="s"'), 'user@example.com');
  assert.equal(parseKeychainAccount('no account'), null);
  assert.equal(parseKeychainAccount(undefined), null);
});

test('ログイン後の画面を ok / human_required / login_failed に分ける', () => {
  assert.equal(classifyLoginOutcome('a8', { url: 'https://media-console.a8.net/home', hasPassword: false, hasChallenge: false }), 'ok');
  assert.equal(classifyLoginOutcome('a8', { url: 'https://www.a8.net/', hasPassword: true, hasChallenge: false }), 'login_failed');
  assert.equal(classifyLoginOutcome('a8', { url: 'https://www.a8.net/', hasPassword: true, hasChallenge: true }), 'human_required');
  assert.equal(classifyLoginOutcome('kdp', { url: 'https://www.amazon.co.jp/ap/mfa?x', hasPassword: false, hasChallenge: false }), 'human_required');
  assert.equal(classifyLoginOutcome('kdp', { url: 'https://kdpreports.amazon.co.jp/dashboard', hasPassword: false, hasChallenge: false }), 'ok');
  assert.equal(classifyLoginOutcome('moshimo', { url: 'https://af.moshimo.com/af/shop/login', hasPassword: true, hasChallenge: false }), 'login_failed');
  assert.ok(AUTO_LOGIN.kdp.headed);
});

test('cron が 24 時間以内に来るか（A8: 月 21:20 UTC）', () => {
  // 月曜 17:45 JST = 月曜 08:45 UTC → 12 時間半後に発火
  assert.equal(cronFiresWithin('20 21 * * 1', new Date('2026-09-28T08:45:00Z'), 24), true);
  // 火曜 17:45 JST → 次は 6 日後
  assert.equal(cronFiresWithin('20 21 * * 1', new Date('2026-09-29T08:45:00Z'), 24), false);
  // 日付指定（KDP: 15,27 日）
  assert.equal(cronFiresWithin('40 21 15,27 * *', new Date('2026-09-27T08:45:00Z'), 24), true);
  // 解釈できない書式は前倒ししない
  assert.equal(cronFiresWithin('*/5 * * * *', new Date('2026-09-28T08:45:00Z'), 24), false);
  assert.equal(cronFiresWithin(null, new Date('2026-09-28T08:45:00Z'), 24), false);
});

test('定期実行は収集マーカーが新しい service を fresh で skip する（dispatch は skip しない）', () => {
  const registry = { a8: { ci: { mode: 'encrypted-state', enabled: true, canary: false, cron: '20 21 * * 1' } } };
  const fresh = { a8: { ageHours: 14.2, maxHours: 30 } };
  const scheduled = planCIServices(registry, { event: 'schedule', schedule: '20 21 * * 1', freshness: fresh });
  assert.deepEqual(scheduled.matrix, []);
  assert.deepEqual(scheduled.skipped, [{ service: 'a8', reason: 'fresh', ageHours: 14.2 }]);
  const stale = planCIServices(registry, { event: 'schedule', schedule: '20 21 * * 1', freshness: { a8: { ageHours: 40, maxHours: 30 } } });
  assert.deepEqual(stale.matrix, [{ service: 'a8', mode: 'collect' }]);
  const noMarker = planCIServices(registry, { event: 'schedule', schedule: '20 21 * * 1' });
  assert.deepEqual(noMarker.matrix, [{ service: 'a8', mode: 'collect' }]);
  const dispatched = planCIServices(registry, { event: 'workflow_dispatch', inputService: 'a8', freshness: fresh });
  assert.deepEqual(dispatched.matrix, [{ service: 'a8', mode: 'collect' }]);
});

test('ci.skipScheduleIfFresh の書式を検査する', () => {
  const base = { stateFileName: 's.json', ci: { mode: 'encrypted-state', enabled: true, canary: false, operations: ['read'], cron: '20 21 * * 1', readOnlyScripts: [], writeScripts: [], stateDomains: ['a8.net'] } };
  assert.equal(validateCIBlock('a8', { ...base, ci: { ...base.ci, skipScheduleIfFresh: { marker: '.claude/state/x.json', hours: 30 } } }), true);
  assert.throws(() => validateCIBlock('a8', { ...base, ci: { ...base.ci, skipScheduleIfFresh: { marker: '/abs.json', hours: 30 } } }), /marker/);
  assert.throws(() => validateCIBlock('a8', { ...base, ci: { ...base.ci, skipScheduleIfFresh: { marker: 'a.json', hours: 0 } } }), /hours/);
  assert.throws(() => validateCIBlock('a8', { ...base, ci: { ...base.ci, skipScheduleIfFresh: { marker: 'a.json', hours: 100 } } }), /hours/);
});

test('16進で出るアカウント名（ASCII 以外・制御文字入り）を復号する', () => {
  const hex = Buffer.from('user@example.com\n', 'utf8').toString('hex').toUpperCase();
  assert.equal(parseKeychainAccount(`    "acct"<blob>=0x${hex}  "user@example.com\\012"`), 'user@example.com');
  assert.equal(parseKeychainAccount(`    "acct"<blob>=0x${Buffer.from('ユーザー', 'utf8').toString('hex')}  "\\343..."`), 'ユーザー');
});
