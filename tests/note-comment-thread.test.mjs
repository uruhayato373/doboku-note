/**
 * note-comment-reply のスレッド返信の判定（DN-1308）。
 * 2026-11-27、トップレベルの欄に入れて送った返信が投稿されず、ページ全体の本文検索で FAIL した。
 * 返信は対象コメント（通知 URL の c=）のスレッドに入れ、成否は「返信N件」の増加と本文の一致で決める。再送は件数を読み直してから。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { parseCommentId, parseReplyCount, bodyIncluded, replyVerdict, mayResend } from '../scripts/lib/note-comment-thread.mjs';

test('コメント ID は ID そのものか通知 URL の c= から読む', () => {
  assert.equal(parseCommentId('nc4cd5cc7e131c'), 'nc4cd5cc7e131c');
  assert.equal(parseCommentId('https://note.com/dobokunote/n/n4b679c8da64e?c=nc4cd5cc7e131c'), 'nc4cd5cc7e131c');
  assert.equal(parseCommentId('https://note.com/dobokunote/n/n4b679c8da64e'), null);
  assert.equal(parseCommentId('n4b679c8da64e'), null, '記事 ID をコメント ID と取り違えない');
  assert.equal(parseCommentId(undefined), null);
});

test('返信件数は「返信N件」から読み、表示が無ければ 0', () => {
  assert.equal(parseReplyCount('deans_muscle\n・\n20時間前\n本文\n@deans_muscleさんに返信\n返信1件\ndoboku-note'), 1);
  assert.equal(parseReplyCount('返信 12 件'), 12);
  assert.equal(parseReplyCount('deans_muscle\n本文だけ'), 0);
});

test('本文の一致は改行・空白・「もっとみる」を除いて全文で比べる', () => {
  const body = 'deans_muscle様\n\nご購入とご指摘をありがとうございます。\nおっしゃるとおりです。';
  assert.ok(bodyIncluded('返信1件\ndoboku-note\n・\n12時間前\ndeans_muscle様\nご購入とご指摘をありがとうございます。 おっしゃるとおりです。', body));
  assert.ok(!bodyIncluded('deans_muscle様\nご購入とご指摘をありがとうございます。…もっとみる', body), '途中で切れた表示を一致にしない');
  assert.ok(!bodyIncluded('何でも', ''), '空の本文は一致にしない');
});

test('件数が増え本文も一致したときだけ posted', () => {
  assert.equal(replyVerdict({ before: 1, after: 2, bodyFound: true }), 'posted');
  assert.equal(replyVerdict({ before: 1, after: 2, bodyFound: false }), 'count-only');
  assert.equal(replyVerdict({ before: 1, after: 1, bodyFound: true }), 'body-only');
  assert.equal(replyVerdict({ before: 0, after: 0, bodyFound: false }), 'not-posted');
});

test('再送は件数が送信前のままで not-posted のときだけ・1 回まで（二重投稿を防ぐ）', () => {
  assert.equal(mayResend({ verdict: 'not-posted', before: 1, current: 1, attempts: 1 }), true);
  assert.equal(mayResend({ verdict: 'not-posted', before: 1, current: 1, attempts: 2 }), false);
  assert.equal(mayResend({ verdict: 'count-only', before: 1, current: 2, attempts: 1 }), false);
  assert.equal(mayResend({ verdict: 'body-only', before: 1, current: 1, attempts: 1 }), false);
  assert.equal(mayResend({ verdict: 'not-posted', before: 1, current: 2, attempts: 1 }), false);
});
