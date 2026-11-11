// DN-0235: develop の最新 CI が赤ならセッション開始時に 1 行出し、取れないときは未取得と出す
// DN-1133: 同じ判定を develop への push の直前にも使う。実行中・取り消しを飛ばして、結果の出ている最新の実行で判定する
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDevelopCi } from '../scripts/check-git-sync.mjs';
import { formatDevelopCi as fromLib, pickVerdictRun } from '../scripts/lib/develop-ci-status.mjs';

const failure = { status: 'completed', conclusion: 'failure', url: 'https://x/runs/1', createdAt: '2026-09-14T01:02:03Z', headSha: 'abcdef1234' };
const success = { status: 'completed', conclusion: 'success', url: 'https://x/runs/2' };

test('failure は赤い 1 行', () => {
  const line = formatDevelopCi({ ok: true, runs: [failure] });
  assert.match(line, /✗ develop の最新 Pre-merge check が failure/);
  assert.match(line, /https:\/\/x\/runs\/1/);
});

test('success と実行中は何も出さない', () => {
  assert.equal(formatDevelopCi({ ok: true, runs: [success] }), null);
  assert.equal(formatDevelopCi({ ok: true, runs: [{ status: 'in_progress', conclusion: '' }] }), null);
});

test('gh 失敗・0 件は未取得（緑と混同しない）', () => {
  assert.match(formatDevelopCi({ ok: false }), /未取得/);
  assert.match(formatDevelopCi({ ok: true, runs: [] }), /未取得/);
});

test('実行中・待機中・取り消しを飛ばして、結果の出ている最新の実行で判定する', () => {
  // develop は実行中の 1 本を完走させ、待ちは最新の 1 本だけ残す。置き換えられた待ちは cancelled になる（2026-11-11）
  const queued = { status: 'queued', conclusion: '' };
  const running = { status: 'in_progress', conclusion: '' };
  const cancelled = { status: 'completed', conclusion: 'cancelled' };
  assert.equal(pickVerdictRun([queued, cancelled, running, failure, success]), failure);
  assert.match(formatDevelopCi({ ok: true, runs: [queued, cancelled, running, failure, success] }), /failure/);
  assert.equal(formatDevelopCi({ ok: true, runs: [running, cancelled, success, failure] }), null, '最新の結果が緑なら、その前の赤は出さない');
  assert.equal(formatDevelopCi({ ok: true, runs: [cancelled, cancelled] }), null, '取り消しだけを赤と呼ばない');
  assert.equal(pickVerdictRun([]), null);
});

test('push の直前の表示は、接頭辞と案内を差し替えられる', () => {
  assert.equal(formatDevelopCi, fromLib, 'check-git-sync は lib の関数をそのまま公開する（判定を 2 つ持たない）');
  const line = fromLib({ ok: true, runs: [failure] }, { prefix: '[push]', advice: 'この push は赤の上に積む' });
  assert.match(line, /^\[push\] ✗ develop の最新 Pre-merge check が failure/);
  assert.match(line, /この push は赤の上に積む: https:\/\/x\/runs\/1$/);
});
