/**
 * 資格情報の正本（playwright-auth-profiles.json の services.<id>.credential）と、
 * 自動ログインの実装（auth-session-refresh の AUTO_LOGIN）を照合する。CI はログインしないので Secrets の配線は無い（DN-0817）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { AUTO_LOGIN, keychainServiceNames } from '../scripts/lib/auth-session-refresh.mjs';
import { cmdkeyListHas, cmdkeyListUser, loadCredentialRegistry, presentSecrets, storedAccounts } from '../scripts/lib/credential-store.mjs';

const registry = loadCredentialRegistry();
const config = JSON.parse(readFileSync('.claude/config/playwright-auth-profiles.json', 'utf8'));

test('ログインが必要な全サービスが資格情報の正本を持ち、項目名は doboku-note-auth-<id>', () => {
  assert.deepEqual(registry.map((c) => c.id).sort(), Object.keys(config.services).sort());
  for (const c of registry) {
    assert.equal(c.storeItem, `doboku-note-auth-${c.id}`, c.id);
    assert.equal(typeof c.autoLogin, 'boolean', c.id);
    assert.equal('ciCredential' in c, false, `${c.id}: CI で読む資格情報は持たない`);
    assert.equal('ciStored' in c, false, `${c.id}: GitHub Secrets に保管しない`);
    assert.ok(c.policyNote && c.policyNote.length >= 10, `${c.id}: policyNote が必要`);
    assert.deepEqual([...c.machines].sort(), ['mac', 'windows'], c.id);
  }
});

test('autoLogin=true の service だけが自動ログインのセレクタを持ち、読む項目名が正本と一致する', () => {
  assert.deepEqual(registry.filter((c) => c.autoLogin).map((c) => c.id).sort(), Object.keys(AUTO_LOGIN).sort());
  for (const c of registry.filter((x) => x.autoLogin)) {
    assert.deepEqual(keychainServiceNames(c.id), [c.storeItem, ...(c.sharedStoreItem ? [c.sharedStoreItem] : [])], c.id);
  }
});

test('CI はログインしない: .github の yml は資格情報の Secrets（DOBOKU_AUTH_）を渡さない', async () => {
  const { listFiles } = await import('../scripts/lib/fs-walk.mjs');
  const files = listFiles('.github', { match: (_p, name) => /\.ya?ml$/.test(name) });
  assert.ok(files.length >= 10, `検査した yml が少なすぎる（${files.length} 本）`);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /DOBOKU_AUTH_[A-Z0-9_]+_(USER|PASSWORD)/, f);
});

test('cmdkey /list の出力から項目の有無だけを読む（表示言語に依らない）', () => {
  const ja = 'ターゲット: LegacyGeneric:target=doboku-note-auth-note\n種類: 汎用\nユーザー: u@example.jp\n';
  const en = '    Target: LegacyGeneric:target=doboku-note-auth-coconala\r\n    Type: Generic\r\n';
  assert.equal(cmdkeyListHas(ja, 'doboku-note-auth-note'), true);
  assert.equal(cmdkeyListHas(en, 'doboku-note-auth-coconala'), true);
  // 前方一致で別の項目を拾わない
  assert.equal(cmdkeyListHas('target=doboku-note-auth-note-old\n', 'doboku-note-auth-note'), false);
  const calls = [];
  const r = presentSecrets(['doboku-note-auth-note', 'doboku-note-auth-x'], { platform: 'win32', exec: (cmd, args) => { calls.push([cmd, ...args]); return ja; } });
  assert.deepEqual(r, { 'doboku-note-auth-note': true, 'doboku-note-auth-x': false });
  assert.equal(calls.length, 1, 'cmdkey /list は 1 回だけ');
  assert.match(calls[0].join(' '), /chcp 65001 >nul & cmdkey \/list/);
  assert.deepEqual(presentSecrets(['a'], { platform: 'linux' }), { a: null });
});

test('ログイン ID は資格情報ストアから読み、パスワードは取り出さない', () => {
  const en = '    Target: LegacyGeneric:target=doboku-note-auth-coconala\n    Type: Generic \n    User: c@example.jp\n    \n    Target: LegacyGeneric:target=doboku-note-auth-note\n    Type: Generic \n    User: n@example.jp\n';
  const ja = 'ターゲット: LegacyGeneric:target=doboku-note-auth-x\n種類: 汎用\nユーザー: @dobokunote\n';
  assert.equal(cmdkeyListUser(en, 'doboku-note-auth-note'), 'n@example.jp');
  assert.equal(cmdkeyListUser(en, 'doboku-note-auth-coconala'), 'c@example.jp');
  assert.equal(cmdkeyListUser(ja, 'doboku-note-auth-x'), '@dobokunote');
  assert.equal(cmdkeyListUser(en, 'doboku-note-auth-kdp'), null);
  assert.deepEqual(storedAccounts(['doboku-note-auth-note', 'doboku-note-auth-kdp'], { platform: 'win32', exec: () => en }), {
    'doboku-note-auth-note': { present: true, user: 'n@example.jp' },
    'doboku-note-auth-kdp': { present: false, user: null },
  });
  const macCalls = [];
  const mac = storedAccounts(['a', 'b'], { platform: 'darwin', exec: (cmd, args) => { macCalls.push(args); if (args[2] === 'a') return '"acct"<blob>="me@example.jp"'; throw new Error('44'); } });
  assert.deepEqual(mac, { a: { present: true, user: 'me@example.jp' }, b: { present: false, user: null } });
  assert.ok(macCalls.every((a) => !a.includes('-w')), 'Mac でもパスワード（-w）を取り出さない');
});

test('ASP の取得スクリプトのログインは、stats47 と共用の項目も読む（keychainServiceNames 経由）', () => {
  // 2026-10-30: asp-browser が doboku-note-auth-<id> だけを読み、キーチェーンにある stats47-measurement-<id> で入れなかった
  const src = readFileSync('scripts/lib/asp-browser.mjs', 'utf8');
  assert.match(src, /readFirstCredential\(keychainServiceNames\(service\)\)/);
  assert.doesNotMatch(src, /readServiceCredential\(/);
});
