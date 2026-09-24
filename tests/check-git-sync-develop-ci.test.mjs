// DN-0235: develop の最新 CI が赤ならセッション開始時に 1 行出し、取れないときは未取得と出す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDevelopCi } from '../scripts/check-git-sync.mjs';

test('failure は赤い 1 行', () => {
  const line = formatDevelopCi({ ok: true, runs: [{ status: 'completed', conclusion: 'failure', url: 'https://x/runs/1', createdAt: '2026-09-14T01:02:03Z', headSha: 'abcdef1234' }] });
  assert.match(line, /✗ develop の最新 Pre-merge check が failure/);
  assert.match(line, /https:\/\/x\/runs\/1/);
});

test('success と実行中は何も出さない', () => {
  assert.equal(formatDevelopCi({ ok: true, runs: [{ status: 'completed', conclusion: 'success' }] }), null);
  assert.equal(formatDevelopCi({ ok: true, runs: [{ status: 'in_progress', conclusion: '' }] }), null);
});

test('gh 失敗・0 件は未取得（緑と混同しない）', () => {
  assert.match(formatDevelopCi({ ok: false }), /未取得/);
  assert.match(formatDevelopCi({ ok: true, runs: [] }), /未取得/);
});
