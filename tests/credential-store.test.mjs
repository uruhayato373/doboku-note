import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  ciEnvVarNames,
  credentialStoreSupported,
  hasSecret,
  parseWindowsCredOutput,
  readFirstCredential,
  readSecret,
  readServiceCredential,
  agentSession,
} from '../scripts/lib/credential-store.mjs';
import { AUTO_LOGIN, classifyLoginOutcome } from '../scripts/lib/auth-session-refresh.mjs';

const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');

test('Windows の出力（base64 JSON）を復号し、欠けていれば null', () => {
  assert.deepEqual(parseWindowsCredOutput(b64({ user: 'u@example.jp', password: 'p w' })), { user: 'u@example.jp', password: 'p w' });
  assert.equal(parseWindowsCredOutput(b64({ user: 'u', password: '' })), null);
  assert.equal(parseWindowsCredOutput('not-base64-json'), null);
});

test('Windows は対象名を引数でなく環境変数で渡し、パスワードを引数に出さない', () => {
  const calls = [];
  const exec = (cmd, args, opts) => { calls.push({ cmd, args, opts }); return b64({ user: 'u', password: 'secret' }); };
  const cred = readSecret('doboku-note-auth-note', { platform: 'win32', exec, env: {} });
  assert.deepEqual(cred, { user: 'u', password: 'secret' });
  assert.equal(calls[0].cmd, 'powershell.exe');
  assert.equal(calls[0].opts.env.DOBOKU_CRED_TARGET, 'doboku-note-auth-note');
  assert.ok(!calls[0].args.join(' ').includes('doboku-note-auth-note'));
});

test('存在確認はパスワードを取り出さない（probe）', () => {
  const exec = (_c, _a, opts) => (opts.env.DOBOKU_CRED_PROBE === '1' ? 'present' : b64({ user: 'u', password: 'x' }));
  assert.equal(hasSecret('n', { platform: 'win32', exec }), true);
  assert.equal(hasSecret('n', { platform: 'win32', exec: () => { throw new Error('exit 3'); } }), false);
});

test('Mac はキーチェーンを読む・CI など他 OS は常に null', () => {
  const exec = (_c, args) => (args.includes('-w') ? 'pw\n' : '"acct"<blob>="me@example.jp"');
  assert.deepEqual(readSecret('x', { platform: 'darwin', exec, env: {} }), { user: 'me@example.jp', password: 'pw' });
  assert.equal(readSecret('x', { platform: 'linux', exec, env: {} }), null);
  assert.equal(credentialStoreSupported('linux'), false);
  assert.equal(credentialStoreSupported('win32'), true);
});

test('候補を優先順に読み、最初に取れた項目名を source に入れる', () => {
  const exec = (_c, _a, opts) => {
    if (opts.env.DOBOKU_CRED_TARGET === 'second') return b64({ user: 'u', password: 'p' });
    throw new Error('exit 3');
  };
  assert.equal(readFirstCredential(['first', 'second'], { platform: 'win32', exec, env: {} }).source, 'second');
  assert.equal(readFirstCredential(['first'], { platform: 'win32', exec, env: {} }), null);
});

test('readServiceCredential: CI は許可 service だけ環境変数、手元は doboku-note-auth-<service>', () => {
  const env = { GITHUB_ACTIONS: 'true', DOBOKU_AUTH_NOTE_USER: 'u', DOBOKU_AUTH_NOTE_PASSWORD: 'p', DOBOKU_AUTH_COCONALA_USER: 'u', DOBOKU_AUTH_COCONALA_PASSWORD: 'p', DOBOKU_AUTH_X_USER: 'u', DOBOKU_AUTH_X_PASSWORD: 'p' };
  assert.deepEqual(readServiceCredential('note', { env }), { user: 'u', password: 'p', source: 'env:DOBOKU_AUTH_NOTE_PASSWORD' });
  assert.deepEqual(readServiceCredential('coconala', { env }), { user: 'u', password: 'p', source: 'env:DOBOKU_AUTH_COCONALA_PASSWORD' });
  // 許可していない service は Secrets があっても読まない
  assert.equal(readServiceCredential('x', { env }), null);
  assert.equal(readServiceCredential('note', { env: { GITHUB_ACTIONS: 'true', DOBOKU_AUTH_NOTE_USER: 'u' } }), null);
  assert.deepEqual(ciEnvVarNames('note'), { user: 'DOBOKU_AUTH_NOTE_USER', password: 'DOBOKU_AUTH_NOTE_PASSWORD' });

  const exec = (_c, _a, opts) => {
    if (opts.env.DOBOKU_CRED_TARGET === 'doboku-note-auth-note') return b64({ user: 'local', password: 'x' });
    throw new Error('exit 3');
  };
  // 手元では環境変数があっても読まない（資格情報ストアだけ）
  assert.equal(readServiceCredential('note', { env: { DOBOKU_AUTH_NOTE_USER: 'u', DOBOKU_AUTH_NOTE_PASSWORD: 'p' }, platform: 'win32', exec }).user, 'local');
});

test('note・ココナラのログイン後判定', () => {
  assert.ok(AUTO_LOGIN.note && AUTO_LOGIN.coconala);
  assert.equal(classifyLoginOutcome('note', { url: 'https://note.com/', hasPassword: false, hasChallenge: false }), 'ok');
  assert.equal(classifyLoginOutcome('note', { url: 'https://note.com/login', hasPassword: true, hasChallenge: false }), 'login_failed');
  assert.equal(classifyLoginOutcome('note', { url: 'https://note.com/login', hasPassword: true, hasChallenge: true }), 'human_required');
  assert.equal(classifyLoginOutcome('coconala', { url: 'https://coconala.com/mypage', hasPassword: false, hasChallenge: false }), 'ok');
  assert.equal(classifyLoginOutcome('coconala', { url: 'https://coconala.com/login', hasPassword: true, hasChallenge: false }), 'login_failed');
});

test('エージェント（CLAUDECODE=1）からの実行では資格情報ストアを呼ばずに null（2026-10-01 の誤実行の再発防止）', () => {
  let called = 0;
  const exec = () => { called++; return b64({ user: 'u', password: 'secret' }); };
  const agent = { CLAUDECODE: '1' };
  assert.equal(agentSession(agent), true);
  assert.equal(agentSession({}), false);
  assert.equal(readSecret('doboku-note-auth-coconala', { platform: 'win32', exec, env: agent }), null);
  assert.equal(readFirstCredential(['a', 'b'], { platform: 'win32', exec, env: agent }), null);
  assert.equal(readServiceCredential('coconala', { platform: 'win32', exec, env: agent }), null);
  assert.equal(called, 0);
  // CI（GitHub Actions）は Secrets の環境変数から読み、エージェント判定の対象外
  const ci = { GITHUB_ACTIONS: 'true', DOBOKU_AUTH_NOTE_USER: 'u', DOBOKU_AUTH_NOTE_PASSWORD: 'p' };
  assert.equal(readServiceCredential('note', { env: ci }).user, 'u');
});
