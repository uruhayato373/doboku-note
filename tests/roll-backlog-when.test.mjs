// tests/roll-backlog-when.test.mjs
//
// 終わらなかったカードを翌月へ回す（[時期:] の終わりを今月へ延ばす）。開始は残し、今月以降のカードと
// 時期なしのカードには触らない。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rollPastWhen } from '../scripts/roll-backlog-when.mjs';

const md = [
  '## 🔴 高 — 重要度が高い',
  '',
  '### [DN-0001] 単月で残った',
  'タグ: [収益化] [領域:商品] [時期:2026-09] [種類:改善]',
  '',
  '本文に [時期:2026-09] と書いてあっても触らない',
  '',
  '### [DN-0002] 範囲で残った',
  'タグ: [収益化] [領域:商品] [時期:2026-08..2026-09] [種類:改善]',
  '',
  '### [DN-0003] 今月を含む',
  'タグ: [収益化] [領域:商品] [時期:2026-09..2026-11] [種類:改善]',
  '',
  '## 🟢 低 — 重要度が低い（時期未定を含む）',
  '',
  '### [DN-0004] 時期なし',
  'タグ: [収益化] [領域:商品] [種類:改善]',
].join('\n');

test('終わりが今月より前のカードだけ、開始を残して終わりを今月へ延ばす', () => {
  const { text, rolled } = rollPastWhen(md, '2026-10');
  assert.deepEqual(rolled.map((r) => [r.id, r.from, r.to]), [
    ['DN-0001', '2026-09', '2026-09..2026-10'],
    ['DN-0002', '2026-08..2026-09', '2026-08..2026-10'],
  ]);
  assert.ok(text.includes('タグ: [収益化] [領域:商品] [時期:2026-09..2026-10] [種類:改善]'));
  assert.ok(text.includes('[時期:2026-08..2026-10]'));
  assert.ok(text.includes('[時期:2026-09..2026-11]'));
  // 本文の記述はタグ行ではないので書き換えない
  assert.ok(text.includes('本文に [時期:2026-09] と書いてあっても触らない'));
});

test('回すものが無ければ本文は変わらない', () => {
  const { text, rolled } = rollPastWhen(md, '2026-09');
  assert.equal(rolled.length, 0);
  assert.equal(text, md);
});
