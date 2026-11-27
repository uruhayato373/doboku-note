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

// 2026-11-27 DN-1309: memberTrial: bottom の無料記事を --article で更新したとき、試し読みの画面を検出できないまま
// 「更新する」を押し、note 側で確定しなかった。--article でも frontmatter を読み、宣言した記事で画面が無ければ止める。
import { resolveMemberTrial } from '../scripts/lib/note-live-publish.mjs';

test('frontmatter の memberTrial を読む（bottom＝ラインを末尾直前・lock＝全文会員限定）', () => {
  assert.deepEqual(resolveMemberTrial({ memberTrial: 'bottom' }), { trialLineBottom: true, memberLock: false, expectTrial: true });
  assert.deepEqual(resolveMemberTrial({ memberTrial: 'lock' }), { trialLineBottom: false, memberLock: true, expectTrial: true });
  assert.deepEqual(resolveMemberTrial({ memberTrial: '' }), { trialLineBottom: false, memberLock: false, expectTrial: false });
});

test('フラグは frontmatter より優先し、フラグだけでは「画面が出るはず」としない（バッチ全体に掛かるため）', () => {
  assert.deepEqual(resolveMemberTrial({ memberTrial: 'lock', trialLineBottomFlag: true }), { trialLineBottom: true, memberLock: false, expectTrial: true });
  assert.deepEqual(resolveMemberTrial({ memberTrial: 'bottom', keepMemberLockFlag: true }), { trialLineBottom: false, memberLock: true, expectTrial: true });
  assert.deepEqual(resolveMemberTrial({ trialLineBottomFlag: true }), { trialLineBottom: true, memberLock: false, expectTrial: false });
});

test('memberTrial の値の誤り・フラグの同時指定は保存前に止める', () => {
  assert.ok(resolveMemberTrial({ memberTrial: 'Bottom' }).error);
  assert.ok(resolveMemberTrial({ memberTrial: 'yes' }).error);
  assert.ok(resolveMemberTrial({ trialLineBottomFlag: true, keepMemberLockFlag: true }).error);
});

test('memberTrial を宣言した記事で試し読みの画面が見つからなければ、更新せず止める', () => {
  const { trialLineBottom, memberLock, expectTrial } = resolveMemberTrial({ memberTrial: 'bottom' });
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 0, trialLineBottom, membershipLock: memberLock, expectTrial }), 'abort-missing');
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 52, trialLineBottom, membershipLock: memberLock, expectTrial }), 'line-bottom');
});

test('指定の無い無料記事で試し読みの画面が出たら中断する（「更新する」を押さない）', () => {
  const { trialLineBottom, memberLock, expectTrial } = resolveMemberTrial({ memberTrial: '' });
  assert.equal(trialSettingsAction({ hasTrialButton: false, trialLineButtons: 52, trialLineBottom, membershipLock: memberLock, expectTrial }), 'abort');
  assert.equal(trialSettingsAction({ hasTrialButton: true, trialLineBottom, membershipLock: memberLock, expectTrial }), 'abort');
});
