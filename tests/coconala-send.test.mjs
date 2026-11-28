import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachmentShown, countFingerprint, messageFingerprint } from '../scripts/lib/coconala-send.mjs';
import { diffServiceFields } from '../scripts/lib/coconala-form.mjs';

test('本文の指紋は空白を除いた先頭30字で、画面の出現数を数える（二重送信の防止）', () => {
  const fp = messageFingerprint('gucchis1989様\n\n2本目のご依頼をありがとうございます。明日の本番に間に合うよう');
  assert.equal(fp.length, 30);
  assert.equal(countFingerprint('自分\ngucchis1989様\n2本目のご依頼をありがとうございます。明日の本番に間に合うよう、先に', fp), 1);
  assert.equal(countFingerprint('別のメッセージ', fp), 0);
});

test('添付の表示名が2つの要素に分かれていても、表示ありと判定する', () => {
  assert.equal(attachmentShown(['小論文診断結果_R7テー', 'マⅠ.pdf'], '小論文診断結果_R7テーマⅠ.pdf'), true);
  assert.equal(attachmentShown(['261128_小論文添削依頼(R7-', 'Ⅰ).pdf'], '小論文診断結果_R7テーマⅠ.pdf'), false);
});

test('保存後に読み直した FAQ が正本と違えば、その欄を返す（送信成功の偽表示を止める）', () => {
  const fields = { body: '本文', faq: [{ q: '質問', a: '直したい箇所ワースト3' }] };
  assert.deepEqual(diffServiceFields(fields, { body: '本文', faq: [{ q: '質問', a: '直したい箇所ワースト3' }] }), []);
  const d = diffServiceFields(fields, { body: '本文', faq: [{ q: '質問', a: '減点ワースト3' }] });
  assert.equal(d.length, 1);
  assert.equal(d[0].field, 'faq[0].a');
});

test('空白と改行の違いは食い違いにしない', () => {
  assert.deepEqual(diffServiceFields({ body: 'あ\nい' }, { body: 'あ\r\n い ' }), []);
});
