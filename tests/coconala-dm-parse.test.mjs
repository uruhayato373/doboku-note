import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDmThread } from '../scripts/lib/coconala-dm-parse.mjs';

// DM 画面の innerText の形（メニュー → メッセージ列 → 入力欄）を縮めた再現。個人名は架空。
const SCREEN = [
  'dobokunote',
  '出品サービス管理',
  'メッセージ',
  '過去のメッセージを読み込む （2件）',
  '',
  '購入者A',
  '2026-09-27 22:22:19',
  '',
  'ありがとうございます',
  '施工計画の200vは全線で使えました。',
  '',
  '購入者A',
  '2026-09-27 23:15:44',
  '',
  '工事概要は',
  '　モルタル吹付工、グリッド設置工、導水工',
  '',
  '開封済み 13時間前',
  'dobokunote',
  '2026-09-28 11:43:02',
  '',
  '購入者A様',
  '',
  '施工量は工種ごとに1行ずつ書きます。',
  '',
  '経験記述_まとめ.docx',
  '',
  '0/2000',
  '',
  ' 定型文の挿入',
  'メッセージを送信する',
].join('\n');

test('送信者名＋日時の 2 行でメッセージを分け、メニューと入力欄を落とす', () => {
  const { messages, composerFound } = parseDmThread(SCREEN);
  assert.equal(composerFound, true);
  assert.equal(messages.length, 3);
  assert.deepEqual(messages.map((m) => [m.from, m.at, m.mine]), [
    ['購入者A', '2026-09-27T22:22:19+09:00', false],
    ['購入者A', '2026-09-27T23:15:44+09:00', false],
    ['dobokunote', '2026-09-28T11:43:02+09:00', true],
  ]);
  assert.equal(messages[0].body, 'ありがとうございます\n施工計画の200vは全線で使えました。');
});

test('既読表示は本文に含めず、本文中の全角空白の字下げは保つ', () => {
  const { messages } = parseDmThread(SCREEN);
  assert.equal(messages[1].body, '工事概要は\n　モルタル吹付工、グリッド設置工、導水工');
  assert.ok(!messages.some((m) => /開封済み/.test(m.body)));
});

test('最後のメッセージは入力欄（0/2000）の手前で終わり、添付ファイル名は本文に残る', () => {
  const { messages } = parseDmThread(SCREEN);
  assert.equal(messages[2].body, '購入者A様\n\n施工量は工種ごとに1行ずつ書きます。\n\n経験記述_まとめ.docx');
});

test('メッセージが無い画面は 0 件で、入力欄が無ければ composerFound=false', () => {
  assert.deepEqual(parseDmThread('ログイン\nメールアドレス'), { messages: [], composerFound: false });
});

test('CRLF の入力も同じに分ける', () => {
  assert.equal(parseDmThread(SCREEN.replace(/\n/g, '\r\n')).messages.length, 3);
});
