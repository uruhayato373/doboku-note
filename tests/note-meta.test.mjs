import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNoteText, generateNoteText, checkLimits, LIMITS } from '../scripts/lib/note-meta.mjs';

/**
 * note掲載文.txt の共有パーサ／ジェネレータの契約（DN-0054）。
 *
 * `note掲載文.txt` は note マガジン設定の単一 SoT で、`note-meta-lint` /
 * `note-meta-to-txt` / `note-edit-magazine` の 3 つが同じ関数を通す。
 * ここが静かに壊れると **note 側の保存が文字数超過で無効化される**（更新ボタンが押せない）か、
 * 逆に価格が空のまま同期される。lint は「違反 0 件」を出すが、それは**パーサが値を
 * 拾えていない場合も同じ緑**になる（CLAUDE.md §9）。だから抽出そのものを固定する。
 */

const BAR = '━'.repeat(28);

function build({ subtitle = '総監 記述式', title = 'タイトル', price = 'セット ¥9,800 ／ 単品 ¥1,800', description = '説明', appeal = 'アピール', machine = 'セット価格: 9800\n単品価格: 1800' } = {}) {
  return [
    BAR,
    'note マガジン掲載文（コピペ用）',
    subtitle,
    BAR,
    '',
    '■ マガジンタイトル（30字以内）',
    '',
    title,
    '',
    '■ 価格',
    '',
    price,
    '',
    '■ 説明（400字以内）',
    '',
    description,
    '',
    '■ アピールポイント（250字以内）',
    '',
    appeal,
    '',
    '■ 機械用（編集しない・自動同期）',
    '',
    machine,
    '',
  ].join('\n');
}

test('parseNoteText: 4 項目とサブタイトルを取り出す', () => {
  const m = parseNoteText(build());
  assert.equal(m.subtitle, '総監 記述式');
  assert.equal(m.title, 'タイトル');
  assert.equal(m.description, '説明');
  assert.equal(m.appealPoint, 'アピール');
});

test('parseNoteText: 機械ブロックの数値が散文より優先される', () => {
  const m = parseNoteText(build({ price: 'セット ¥1 ／ 単品 ¥2', machine: 'セット価格: 9800\n単品価格: 1800' }));
  assert.equal(m.setPrice, '9800');
  assert.equal(m.articlePrice, '1800');
});

test('parseNoteText: 機械ブロックが無い旧 txt は価格散文から推定しカンマを外す', () => {
  const txt = build({ price: 'セット ¥12,800 ／ 単品 ¥1,800', machine: '' });
  const m = parseNoteText(txt);
  assert.equal(m.setPrice, '12800');
  assert.equal(m.articlePrice, '1800');
});

test('parseNoteText: CRLF でも同じ結果になる', () => {
  const lf = parseNoteText(build());
  const crlf = parseNoteText(build().replace(/\n/g, '\r\n'));
  assert.deepEqual(crlf, lf);
});

test('parseNoteText: タイトルは複数行あっても 1 行目だけを採る', () => {
  const m = parseNoteText(build({ title: '本タイトル\n（補足はタイトルではない）' }));
  assert.equal(m.title, '本タイトル');
});

test('parseNoteText: 空入力でも例外を投げず空の構造を返す', () => {
  for (const empty of ['', null, undefined]) {
    const m = parseNoteText(empty);
    assert.equal(m.title, '');
    assert.equal(m.setPrice, null);
  }
});

test('checkLimits: 上限ちょうどは違反にしない（境界）', () => {
  const m = { title: 'あ'.repeat(LIMITS.title), description: 'あ'.repeat(LIMITS.description), appealPoint: 'あ'.repeat(LIMITS.appealPoint) };
  assert.deepEqual(checkLimits(m), []);
});

test('checkLimits: 3 項目それぞれ 1 字超過で 1 件ずつ検出する', () => {
  assert.equal(checkLimits({ title: 'あ'.repeat(LIMITS.title + 1) }).length, 1);
  assert.equal(checkLimits({ description: 'あ'.repeat(LIMITS.description + 1) }).length, 1);
  assert.equal(checkLimits({ appealPoint: 'あ'.repeat(LIMITS.appealPoint + 1) }).length, 1);
  const all = checkLimits({
    title: 'あ'.repeat(LIMITS.title + 1),
    description: 'あ'.repeat(LIMITS.description + 1),
    appealPoint: 'あ'.repeat(LIMITS.appealPoint + 1),
  });
  assert.equal(all.length, 3);
});

test('checkLimits: 未定義フィールドを違反にしない（lint が空データで赤くならない）', () => {
  assert.deepEqual(checkLimits({}), []);
});

test('generateNoteText → parseNoteText で値が往復する', () => {
  const src = {
    subtitle: '1級土木 二次',
    title: '直前暗記ノート',
    price: 'セット ¥4,800 ／ 単品 ¥980',
    description: '説明本文',
    appealPoint: 'アピール本文',
    setPrice: '4800',
    articlePrice: '980',
  };
  const round = parseNoteText(generateNoteText(src));
  assert.equal(round.subtitle, src.subtitle);
  assert.equal(round.title, src.title);
  assert.equal(round.description, src.description);
  assert.equal(round.appealPoint, src.appealPoint);
  assert.equal(round.setPrice, src.setPrice);
  assert.equal(round.articlePrice, src.articlePrice);
});

test('generateNoteText: 単品なしのマガジンは「なし」と書き、数値として拾わない', () => {
  const txt = generateNoteText({ title: 'x', setPrice: '9800', articlePrice: 'なし' });
  assert.match(txt, /単品価格: なし/);
  assert.equal(parseNoteText(txt).articlePrice, null);
});
