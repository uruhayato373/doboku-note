// CDN 確定待ちのタイムアウトを「blob のまま」と「エディタに無い」に分けることを固定する（DN-0273）。
//
// 経緯（2026-09-23）: note-update-body の全文更新で 3 本が確定待ちを 480〜720 秒に伸ばしても
// 毎回「確定=2/3」「1/2」で中断した。タイムアウト時のエディタには 3 枚挿入したはずの img が
// 1 枚しか無かった（blob のまま待っていたのではない）。待てば通る失敗と同じ文言・同じ中断理由で
// 出していたため、待ちの延長を繰り返す無駄が出た。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEditorImages, settleAbortReason } from '../scripts/lib/note-images.mjs';

const CDN = 'https://assets.st-note.com/img/1.png';

test('blob のまま残った画像は blob に数え、中断理由は img-settle（待てば通る）', () => {
  const c = classifyEditorImages([CDN, 'blob:https://editor.note.com/abc', 'blob:https://editor.note.com/def'], 3);
  assert.deepEqual(c, { settled: 1, blob: 2, missing: 0 });
  assert.equal(settleAbortReason(c), 'img-settle');
});

test('エディタから消えた画像は missing に数え、中断理由は img-lost（待っても直らない）', () => {
  // 2026-09-23 の実例: 3 枚挿入したのにエディタに 1 枚（確定済み）しか無い
  const c = classifyEditorImages([CDN], 3);
  assert.deepEqual(c, { settled: 1, blob: 0, missing: 2 });
  assert.equal(settleAbortReason(c), 'img-lost');
});

test('blob と消失が混ざれば img-lost を優先する（待ちでは消えた分が戻らない）', () => {
  const c = classifyEditorImages(['blob:x'], 3);
  assert.deepEqual(c, { settled: 0, blob: 1, missing: 2 });
  assert.equal(settleAbortReason(c), 'img-lost');
});

test('全枚数が確定していれば blob も missing も 0（挿入前から有る img も target に含む）', () => {
  assert.deepEqual(classifyEditorImages([CDN, CDN, CDN], 3), { settled: 3, blob: 0, missing: 0 });
  // target より多い img（既存画像）は missing を負にしない
  assert.deepEqual(classifyEditorImages([CDN, CDN, CDN, CDN], 3), { settled: 4, blob: 0, missing: 0 });
});

test('src 属性の無い img は従来の img:not([src^="blob:"]) と同じく確定側に数える', () => {
  assert.deepEqual(classifyEditorImages([null, CDN], 2), { settled: 2, blob: 0, missing: 0 });
});

test('settleAbortReason は内訳が無い（旧形の戻り値）ときも img-settle を返す', () => {
  assert.equal(settleAbortReason(undefined), 'img-settle');
  assert.equal(settleAbortReason({ ok: false, confirmed: 1 }), 'img-settle');
});
