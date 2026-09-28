// tests/note-pdf-promise.test.mjs
//
// 回帰テスト目的（DN-0147）:
// scripts/lib/note-frontmatter.mjs の pdfPromise 判定が `/PDF/ && /(ダウンロード|添付|配布)/`
// という狭い正規表現で、「印刷用PDFにまとめました」のような言い回しを拾えなかった。
// その結果、本文の再公開で PDF 実在の記事を PDF なし前提の一括バッチに誤って混ぜていた（実測4件・2026-08-27）。
// 今は scripts/lib/note-sync-plan.mjs が pdfPromise で「配布 PDF の取り寄せが要るか」を決める（tests/note-sync-plan.test.mjs）。
//
// ここで固定する契約:
//   1. PDF_PROMISE_RE が check-note-attachments.mjs 側の広い signature を吸収していること
//   2. parseNoteArticle が PDF_PROMISE_RE を実際に使っていること（本文「印刷用PDF」で pdfPromise=true）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PDF_PROMISE_RE, parseNoteArticle } from '../scripts/lib/note-frontmatter.mjs';

// --- 1. PDF_PROMISE_RE 単体 -------------------------------------------------

test('PDF_PROMISE_RE: 「印刷用PDFにまとめました」（見出し＋本文）を検知する（DN-0147 の真因）', () => {
  assert.equal(
    PDF_PROMISE_RE.test('## 印刷用PDF｜本記事の模範解答\n\n本記事の模範解答を、そのまま印刷できるPDFにまとめました。'),
    true,
  );
});

test('PDF_PROMISE_RE: 全角スペース入り「印刷用 PDF」も検知する', () => {
  assert.equal(PDF_PROMISE_RE.test('印刷用 PDF｜本記事の模範論文'), true);
});

test('PDF_PROMISE_RE: 「ダウンロード」と共起する PDF 言及を検知する', () => {
  assert.equal(PDF_PROMISE_RE.test('この記事末尾のPDFをダウンロードできます。'), true);
});

test('PDF_PROMISE_RE: 「配布」単独の言及も検知する', () => {
  assert.equal(PDF_PROMISE_RE.test('記事末尾に添付しています。'), true);
});

test('PDF_PROMISE_RE: 「PDF」単独（配布約束なし）では検知しない', () => {
  assert.equal(PDF_PROMISE_RE.test('この試験ではPDF形式の問題冊子が配られる。'), false);
});

test('PDF_PROMISE_RE: 「PDF」を含まない文では検知しない', () => {
  assert.equal(PDF_PROMISE_RE.test('本記事の模範解答をまとめました。'), false);
});

// --- 2. parseNoteArticle が PDF_PROMISE_RE を使っていること -----------------

function makeArticle(body) {
  const dir = mkdtempSync(join(tmpdir(), 'note-pdf-promise-'));
  const path = join(dir, 'article.md');
  writeFileSync(
    path,
    `---\ntitle: "テスト記事"\nnoteId: "ntest0000001"\n---\n\n${body}\n`,
    'utf-8',
  );
  return { dir, path };
}

test('parseNoteArticle: 「印刷用PDF」表記の本文で pdfPromise=true になる（旧実装は false だった）', () => {
  const { dir, path } = makeArticle(
    '## 印刷用PDF｜本記事の模範解答\n\n本記事の試験問題と全選択肢のフル模範解答を、そのまま印刷できるPDFにまとめました。',
  );
  try {
    const a = parseNoteArticle(path);
    assert.equal(a.pdfPromise, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseNoteArticle: PDF に触れない本文では pdfPromise=false のまま', () => {
  const { dir, path } = makeArticle('本記事は模範解答のみを掲載しています。');
  try {
    const a = parseNoteArticle(path);
    assert.equal(a.pdfPromise, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
