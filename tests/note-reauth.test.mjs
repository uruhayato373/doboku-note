import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describeReauthResult, looksLikeNoteReauth, passNoteReauth } from '../scripts/lib/note-reauth.mjs';

/** 再確認画面を模したページ。accept=true なら送信後に画面が消える。 */
function fakePage({ reauth = true, accept = true } = {}) {
  const state = { reauth, filled: null, clicks: 0 };
  const page = {
    state,
    url: () => 'https://note.com/dashboard/sales',
    evaluate: async () => (state.reauth ? 'パスワードの確認\nパスワード\n必須' : '販売履歴'),
    locator: (sel) => {
      const loc = {
        count: async () => (sel === 'input[type=password]' && state.reauth ? 1 : 0),
        first: () => loc,
        filter: () => loc,
        fill: async (v) => { state.filled = v; },
        click: async () => { state.clicks++; if (accept) state.reauth = false; },
      };
      return loc;
    },
  };
  return page;
}
const noSleep = async () => {};
const cred = () => ({ user: 'u@example.jp', password: 'pw-secret', source: 'test' });

test('再確認画面の判定はログイン画面とパスワード欄なしを除く', () => {
  assert.equal(looksLikeNoteReauth({ url: 'https://note.com/dashboard/sales', text: 'パスワードの確認', hasPasswordInput: true }), true);
  assert.equal(looksLikeNoteReauth({ url: 'https://note.com/login', text: 'パスワードの確認', hasPasswordInput: true }), false);
  assert.equal(looksLikeNoteReauth({ url: 'https://note.com/dashboard/sales', text: 'パスワードの確認', hasPasswordInput: false }), false);
  assert.equal(looksLikeNoteReauth({ url: 'https://note.com/settings/account', text: 'パスワード変更', hasPasswordInput: true }), false);
});

test('再確認が無ければ資格情報を読まない', async () => {
  let read = 0;
  const r = await passNoteReauth(fakePage({ reauth: false }), { readCredential: () => { read++; return cred(); }, sleep: noSleep, isAgent: () => false });
  assert.equal(r.status, 'not_needed');
  assert.equal(read, 0);
});

test('資格情報で 1 回だけ通し、戻り値にパスワードを含めない', async () => {
  const page = fakePage();
  const r = await passNoteReauth(page, { readCredential: cred, sleep: noSleep, isAgent: () => false });
  assert.equal(r.status, 'ok');
  assert.equal(page.state.filled, 'pw-secret');
  assert.equal(page.state.clicks, 1);
  assert.ok(!JSON.stringify(r).includes('pw-secret'));
});

test('未登録は no_credential で入力しない', async () => {
  const page = fakePage();
  const r = await passNoteReauth(page, { readCredential: () => null, sleep: noSleep, isAgent: () => false });
  assert.equal(r.status, 'no_credential');
  assert.equal(page.state.filled, null);
  assert.match(describeReauthResult(r), /doboku-note-auth-note/);
});

test('通らなければ失敗印を残し、印があれば次は試さない', async () => {
  const markPath = join(mkdtempSync(join(tmpdir(), 'note-reauth-')), 'metadata', 'note.reauth-failed');
  const first = await passNoteReauth(fakePage({ accept: false }), { readCredential: cred, sleep: noSleep, isAgent: () => false, waitMs: 3000, markPath });
  assert.equal(first.status, 'failed');
  assert.ok(existsSync(markPath));
  assert.ok(!readFileSync(markPath, 'utf8').includes('pw-secret'));

  const page = fakePage();
  const second = await passNoteReauth(page, { readCredential: cred, sleep: noSleep, isAgent: () => false, markPath });
  assert.equal(second.status, 'blocked');
  assert.equal(page.state.filled, null);
});
