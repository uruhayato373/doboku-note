// ig-writers-ledger.test.mjs — Instagram の書き手が台帳（正本）を読んで判断するときの純関数（DN-0611）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSchedulableLedgerRow, LEDGER_FORMAT, recordMarkToLedger } from '../scripts/ig-status.mjs';

test('isSchedulableLedgerRow: 遷移表で scheduled へ行ける状態だけ予約してよい', () => {
  for (const status of ['draft', 'rendered', 'approved']) assert.equal(isSchedulableLedgerRow({ status }), true, status);
  for (const status of ['scheduled', 'published', 'stopped']) assert.equal(isSchedulableLedgerRow({ status }), false, status);
  assert.equal(isSchedulableLedgerRow(null), false);
  assert.equal(isSchedulableLedgerRow(undefined), false);
});

test('LEDGER_FORMAT: posted.json の format を台帳の format に写す', () => {
  assert.deepEqual(LEDGER_FORMAT, { carousel: 'carousel', reels: 'reel', stories: 'story' });
});

test('recordMarkToLedger: 台帳の対象外フォルダは書かずに理由を返す', async () => {
  const r = await recordMarkToLedger(process.cwd(), 'content/sns/instagram/__no_such__/x', 'carousel', { url: 'https://www.instagram.com/p/AAA/' });
  assert.equal(r.recorded, false);
  assert.match(r.reason, /台帳に行が無い/);
});

test('isSchedulableLedgerRow: 渡した遷移表に従う（approved→scheduled を外せば不可）', () => {
  const cfg = { status: { transitions: { rendered: ['scheduled'] }, transitionsByChannel: { instagram: { approved: ['scheduled'] } } } };
  assert.equal(isSchedulableLedgerRow({ status: 'approved' }, cfg), true);
  assert.equal(isSchedulableLedgerRow({ status: 'qa_passed' }, cfg), false);
  const cfg2 = { status: { transitions: {}, transitionsByChannel: {} } };
  assert.equal(isSchedulableLedgerRow({ status: 'approved' }, cfg2), false);
});
