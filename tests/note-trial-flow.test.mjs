/**
 * trialFlowAction: メンバーシップ特典マガジンに入った記事で「試し読みエリアを設定」が出たときの行き先。
 * 2026-09-23、無料の入口記事（ペルソナ選択ガイド）をラインなしで更新して全文が会員限定になった。
 * 無料記事はラインの指定が無ければ保存せず止めることを固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { trialFlowAction } from '../scripts/lib/note-live-publish.mjs';

test('無料記事でラインの指定が無ければ中断する（全文が会員限定になるのを防ぐ）', () => {
  assert.equal(trialFlowAction({}), 'abort');
  assert.equal(trialFlowAction({ trialLineBottom: false, membershipLock: false }), 'abort');
});

test('--trial-line-bottom ならラインを末尾直前に置いて進む', () => {
  assert.equal(trialFlowAction({ trialLineBottom: true }), 'line-bottom');
  assert.equal(trialFlowAction({ trialLineBottom: true, membershipLock: true }), 'line-bottom');
});

test('会員限定の記事（notePricing: membership）はラインなしのまま進む', () => {
  assert.equal(trialFlowAction({ membershipLock: true }), 'keep-locked');
});
