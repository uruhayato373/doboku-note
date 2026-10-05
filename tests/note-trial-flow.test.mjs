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

// 2026-10-05 DN-0542: 「試し読みエリアを設定」ボタンが出ず、試し読みラインの画面が直接開く場合がある。
// 境界の無い無料記事と扱ってラインを引かずに更新すると、note 側で確定せず旧版のまま「完了」と出ていた。
import { trialSettingsAction } from '../scripts/lib/note-live-publish.mjs';

test('試し読みの画面が直接開いたら、ボタンが出た場合と同じく指定に従う（無指定なら中断）', () => {
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 52 }), 'abort');
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 52, trialLineBottom: true }), 'line-bottom');
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 52, membershipLock: true }), 'keep-locked');
});

test('試し読みの設定が無い記事（ボタンもライン候補も無い）は境界処理をしない', () => {
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 0 }), 'none');
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 1, trialLineBottom: true }), 'none');
});

test('「試し読みエリアを設定」ボタンが出たときは従来どおり', () => {
  assert.equal(trialSettingsAction({ hasTrialButton: true }), 'abort');
  assert.equal(trialSettingsAction({ hasTrialButton: true, trialLineBottom: true }), 'line-bottom');
});
