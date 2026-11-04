import { strict as assert } from 'node:assert';
import test from 'node:test';
import { memberGate, planNameFromRow } from '../scripts/lib/note-membership-gate.mjs';

const PAGE = 'メンバーシップ すべて 自分 参加中 退会済み 表示を確認 メンバー 記事の 追加 田端信太郎の株道場 ¥1,980/月';

test('行の文字列からプラン名を読む', () => {
  assert.equal(planNameFromRow('添削つきプラン｜経験記述マンツーマン ¥4,980/月 公開 編集'), '添削つきプラン｜経験記述マンツーマン');
});

test('管理画面全体の文字列はプラン名として扱わない（2026-11-04 の誤判定）', () => {
  assert.equal(planNameFromRow(PAGE), '');
  assert.deepEqual(memberGate({ planName: planNameFromRow(PAGE), membersText: 'メンバーシップ 0 人' }), { status: 'inconclusive', key: '' });
});

test('在籍者の行があれば members、無ければ clear', () => {
  const planName = '添削つきプラン｜経験記述マンツーマン';
  assert.equal(memberGate({ planName, membersText: 'A さん 添削つきプラン｜経験記述…' }).status, 'members');
  assert.equal(memberGate({ planName, membersText: 'メンバーはいません' }).status, 'clear');
});

test('メンバー一覧を読めなければ検査不成立', () => {
  assert.equal(memberGate({ planName: '通年プラン', membersText: '' }).status, 'inconclusive');
});
