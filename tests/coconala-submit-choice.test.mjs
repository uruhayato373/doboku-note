/**
 * coconala-submit-choice.test.mjs — ココナラ編集の送信ボタン判定を固定する（DN-0467）
 * ---------------------------------------------------------------------------
 * 公開中サービスの編集画面には「下書きで保存」が無く「更新する」だけがある。
 * 以前は --commit なしの dry-run が「下書きで保存」だけを探して exit 2 で落ちていた。
 * ここで固定するのは:
 *   - 公開中の画面で dry-run なら更新ボタンを押さずに終える
 *   - 新規下書き（coconala-publish）は dryRun を渡さないので、下書きボタンが無ければ従来どおり失敗する
 *   - --commit の更新・公開ボタン選択は変わらない
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSubmitAction, submitForm } from '../scripts/lib/coconala-form.mjs';

test('公開中の編集画面（更新するだけ）で dry-run なら押さずに終える', () => {
  assert.deepEqual(chooseSubmitAction({ commit: false, dryRun: true, available: ['更新する'] }), { dryRun: '更新する' });
});

test('dryRun を渡さない呼び出し（新規下書き）は下書きボタンが無ければ失敗のまま', () => {
  assert.deepEqual(chooseSubmitAction({ commit: false, dryRun: false, available: ['更新する'] }), { missing: ['下書きで保存'] });
});

test('下書きボタンがある画面では dry-run 指定でも下書き保存を押す（下書きの編集は従来どおり）', () => {
  assert.deepEqual(chooseSubmitAction({ commit: false, dryRun: true, available: ['下書きで保存', '公開する'] }), { click: '下書きで保存' });
});

test('--commit は公開中なら更新する、下書きなら公開するを押す', () => {
  assert.deepEqual(chooseSubmitAction({ commit: true, dryRun: false, available: ['更新する'] }), { click: '更新する' });
  assert.deepEqual(chooseSubmitAction({ commit: true, dryRun: false, available: ['下書きで保存', '公開する'] }), { click: '公開する' });
});

test('ボタンが 1 つも無い画面は dry-run でも成功にしない', () => {
  assert.deepEqual(chooseSubmitAction({ commit: false, dryRun: true, available: [] }), { missing: ['下書きで保存'] });
});

test('submitForm の dry-run は更新ボタンをクリックしない', async () => {
  const clicked = [];
  const page = {
    getByRole: (_role, { name }) => ({
      count: async () => (name === '更新する' ? 1 : 0),
      first: () => ({ click: async () => { clicked.push(name); } }),
    }),
    evaluate: async () => [],
    url: () => 'https://coconala.com/mypage/services/1',
  };
  const r = await submitForm(page, { commit: false, dryRun: true, tag: '[test]' });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.deepEqual(clicked, []);
});
