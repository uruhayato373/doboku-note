// extractNoteRefs（check-outbound-links の送客先抽出ロジック）のテスト。
//
// 守りたい事故（2026-08-27）: 予約投稿（DN-0044）で初めて noteStatus: reserved の記事が
// 生まれたとき、check-outbound-links がその記事自身の frontmatter `noteUrl`（自己参照）を
// 「送客先」として扱い、まだ公開時刻前で not_found になることを「切れている」と誤検知し
// CI を赤くした。実測では 879 件の参照のうち 807 件がこの自己参照ノイズで、真の送客先は
// 364 件だった。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractNoteRefs } from '../scripts/lib/note-refs.mjs';

function article(noteId, body) {
  return `---\nnoteId: "${noteId}"\n---\n${body}`;
}

test('回帰: frontmatter の noteId と一致する本文中の URL は自己参照として除外する', () => {
  const src = article('n4543d343d7a0', '本文\n\nhttps://note.com/dobokunote/n/n4543d343d7a0\n');
  assert.deepEqual(extractNoteRefs(src), []);
});

test('他の記事への参照は除外しない（真の送客先）', () => {
  const src = article('nSELF00000000', 'こちらもどうぞ: https://note.com/dobokunote/n/nOTHER0000000\n');
  const refs = extractNoteRefs(src);
  assert.equal(refs.length, 1);
  assert.deepEqual(refs[0], { kind: 'n', id: 'nOTHER0000000' });
});

test('frontmatter が無いファイルでも例外を投げず本文中の参照を拾う', () => {
  const src = 'ただのテキスト https://note.com/dobokunote/n/nABC0000000\n';
  assert.deepEqual(extractNoteRefs(src), [{ kind: 'n', id: 'nABC0000000' }]);
});

test('マガジン参照（/m/）は noteId 自己参照の対象外なので常に拾う', () => {
  const src = article('nSELF00000000', 'https://note.com/dobokunote/m/mMAGAZINE001\n');
  assert.deepEqual(extractNoteRefs(src), [{ kind: 'm', id: 'mMAGAZINE001' }]);
});

test('同一記事内に自己参照と他記事参照が混在しても自己参照だけ除外する', () => {
  const src = article(
    'nSELF00000000',
    ['自分: https://note.com/dobokunote/n/nSELF00000000', '他: https://note.com/dobokunote/n/nOTHER0000000'].join('\n'),
  );
  assert.deepEqual(extractNoteRefs(src), [{ kind: 'n', id: 'nOTHER0000000' }]);
});

test('壊れた frontmatter（閉じタグ無し）でも例外にせず本文走査を続ける', () => {
  const src = '---\nnoteId: "nX"\n本文がそのまま続く https://note.com/dobokunote/n/nOTHER0000000\n';
  assert.deepEqual(extractNoteRefs(src), [{ kind: 'n', id: 'nOTHER0000000' }]);
});

test('noteId が無い frontmatter では何も除外しない', () => {
  const src = '---\ntitle: "無題"\n---\nhttps://note.com/dobokunote/n/nABC0000000\n';
  assert.deepEqual(extractNoteRefs(src), [{ kind: 'n', id: 'nABC0000000' }]);
});
