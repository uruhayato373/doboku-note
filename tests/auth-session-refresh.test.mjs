import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  AUTO_LOGIN,
  classifyLoginOutcome,
  decideSharedImport,
  detectChallenge,
  keychainServiceNames,
  maskLoginText,
  parseKeychainAccount,
  sharedStatePath,
} from '../scripts/lib/auth-session-refresh.mjs';

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

test('16進で出るアカウント名（ASCII 以外・制御文字入り）を復号する', () => {
  const hex = Buffer.from('user@example.com\n', 'utf8').toString('hex').toUpperCase();
  assert.equal(parseKeychainAccount(`    "acct"<blob>=0x${hex}  "user@example.com\\012"`), 'user@example.com');
  assert.equal(parseKeychainAccount(`    "acct"<blob>=0x${Buffer.from('ユーザー', 'utf8').toString('hex')}  "\\343..."`), 'ユーザー');
});

test('不可視の reCAPTCHA（size=invisible）は人の確認に数えず、見えている問題・文言だけを数える', () => {
  // 2026-10-01 実測: ココナラのログイン画面には常にこの iframe がある（256x60 で見えている）
  const invisible = { src: 'https://www.google.com/recaptcha/api2/anchor?ar=1&k=x&hl=ja&size=invisible&anchor-ms=20000&execute', visible: true };
  assert.equal(detectChallenge({ frames: [invisible], text: 'ログイン メールアドレスでログインする' }), false);
  assert.equal(detectChallenge({ frames: [{ src: 'https://www.google.com/recaptcha/api2/anchor?ar=1&k=x&size=normal', visible: true }] }), true);
  assert.equal(detectChallenge({ frames: [{ src: 'https://www.google.com/recaptcha/api2/bframe?hl=ja&k=x', visible: true }] }), true);
  assert.equal(detectChallenge({ frames: [{ src: 'https://www.google.com/recaptcha/api2/bframe?hl=ja&k=x', visible: false }] }), false);
  assert.equal(detectChallenge({ frames: [{ src: 'https://newassets.hcaptcha.com/captcha/v1/x', visible: true }] }), true);
  assert.equal(detectChallenge({ frames: [], text: '確認コードを入力してください' }), true);
  // 送信が拒まれてログイン画面へ戻っただけなら login_failed（理由を human_required で隠さない）
  const back = { url: 'https://coconala.com/login', hasPassword: true, hasChallenge: detectChallenge({ frames: [invisible] }) };
  assert.equal(classifyLoginOutcome('coconala', back), 'login_failed');
});

test('ログイン画面の文言はメールアドレスを伏せて 200 字まで', () => {
  assert.equal(maskLoginText('  user.name+x@example.co.jp は\t登録されていません '), '<メール> は 登録されていません');
  assert.equal(maskLoginText('あ'.repeat(300)).length, 200);
  assert.equal(maskLoginText(undefined), '');
});

test('ココナラと KDP は画面ありで送る（Amazon・ココナラは headless を bot とみなす）', () => {
  assert.ok(AUTO_LOGIN.coconala.headed);
  assert.ok(AUTO_LOGIN.kdp.headed);
});
