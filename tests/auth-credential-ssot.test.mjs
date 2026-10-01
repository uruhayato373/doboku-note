/**
 * 資格情報の正本（playwright-auth-profiles.json の services.<id>.credential）と、
 * 自動ログインの実装（auth-session-refresh の AUTO_LOGIN）・CI の Secrets 配線（login-collectors.yml）を照合する。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { AUTO_LOGIN, keychainServiceNames } from '../scripts/lib/auth-session-refresh.mjs';
import { ciEnvCredentialServices, ciEnvVarNames, cmdkeyListHas, loadCredentialRegistry, presentSecrets } from '../scripts/lib/credential-store.mjs';

const registry = loadCredentialRegistry();
const CI_SERVICES = ciEnvCredentialServices();
const config = JSON.parse(readFileSync('.claude/config/playwright-auth-profiles.json', 'utf8'));
// Windows の作業ツリーは CRLF なので改行をそろえてから読む
const workflow = readFileSync('.github/workflows/login-collectors.yml', 'utf8').replace(/\r\n/g, '\n');

test('ログインが必要な全サービスが資格情報の正本を持ち、項目名は doboku-note-auth-<id>', () => {
  assert.deepEqual(registry.map((c) => c.id).sort(), Object.keys(config.services).sort());
  for (const c of registry) {
    assert.equal(c.storeItem, `doboku-note-auth-${c.id}`, c.id);
    assert.equal(typeof c.autoLogin, 'boolean', c.id);
    assert.equal(typeof c.ciCredential, 'boolean', c.id);
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

test('ciCredential=true は自動ログイン対応の service に限り、CI の許可リストと一致する', () => {
  const ci = registry.filter((c) => c.ciCredential).map((c) => c.id);
  assert.deepEqual([...CI_SERVICES], ci);
  for (const id of ci) assert.ok(AUTO_LOGIN[id], `${id}: CI で入り直すには自動ログインのセレクタが要る`);
});

test('login-collectors は許可した service の Secrets だけを渡し、入り直しの対象も一致する', () => {
  const passed = [...workflow.matchAll(/secrets\.DOBOKU_AUTH_([A-Z0-9_]+)_PASSWORD/g)].map((m) => m[1].toLowerCase());
  assert.deepEqual([...new Set(passed)].sort(), [...CI_SERVICES].sort());
  const relogin = /- name: Re-login with Secrets[^\n]*\n\s+id: relogin\n\s+if: ([^\n]+)/.exec(workflow);
  assert.ok(relogin, 'Re-login step が無い');
  const targets = [...relogin[1].matchAll(/matrix\.service == '([a-z0-9]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(targets, [...CI_SERVICES].sort());
  for (const id of CI_SERVICES) assert.ok(workflow.includes(`secrets.${ciEnvVarNames(id).user}`), `${id}: USER の Secret が渡っていない`);
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
  assert.deepEqual(calls, [['cmdkey', '/list']]);
  assert.deepEqual(presentSecrets(['a'], { platform: 'linux' }), { a: null });
});
