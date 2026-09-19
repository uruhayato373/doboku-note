/**
 * verify-note-status --fix の frontmatter 置換が CRLF でも効くことを固定する。
 *
 * 背景（2026-09-19）: `setNoteStatus` の frontmatter 正規表現が LF 専用（`---\n`）で、Windows 由来の
 * CRLF 記事（pack-lineup の会員記事）は 1 バイトも書き換わらないまま「是正済み」と数えられていた
 * （学科09・W8 で実発生＝偽成功。CLAUDE.md §9「検査ゼロを PASS と呼ばない」の書き込み版）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';

import { setNoteStatus } from '../scripts/lib/note-status.mjs';

test('CRLF の frontmatter でも noteStatus 行だけを置換し、行末コードを保つ', () => {
  const raw = '---\r\nnoteStatus: reserved\r\nnoteId: "n0000000000aa"\r\n---\r\n\r\n本文\r\n';
  const out = setNoteStatus(raw, 'published');
  assert.notEqual(out, raw, '書き換えられていない');
  assert.match(out, /^noteStatus: published\r\n/m);
  assert.ok(!out.includes('\n\n本文\n'), 'LF に変換してしまった');
  assert.equal(out.split('\r\n').length, raw.split('\r\n').length, '行数が変わった');
});

test('LF の frontmatter は従来どおり置換する', () => {
  const raw = '---\nnoteStatus: draft\nnoteId: "n0000000000aa"\n---\n\n本文\n';
  assert.match(setNoteStatus(raw, 'published'), /^noteStatus: published\n/m);
});

test('frontmatter 外の noteStatus 風の行や、行が無い記事は触らない', () => {
  const noLine = '---\nnoteId: "n0000000000aa"\n---\n\nnoteStatus: draft と本文に書いてある\n';
  assert.equal(setNoteStatus(noLine, 'published'), noLine);
});
