import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { findFigures, loadBooks, queryKey, run } from '../scripts/find-book-figure.mjs';
import { parseOcrFigureEntries } from '../scripts/lib/figure-references.mjs';

const OCR_A = `<!-- p0121 印字:113 -->
#### (1) サンドマット工法

（図: 図2.38 サンドマット工法（敷砂工法）。盛土の下にサンドマットを敷く断面図。）

<!-- p0122 印字:114 -->
#### (3) 押え盛土工法

（図: 図2.41 押え盛土工法。押え盛土と本体盛土を示す断面図。）
`;
const OCR_B = `<!-- p0005 -->
（図: 図2.41 載荷重工法。別の書籍の同じ番号の図。）
`;

/** 仮の vault: 書籍 A（1 ファイル）・書籍 B（2 ファイル） */
function makeVault() {
  const root = mkdtempSync(join(tmpdir(), 'vault-'));
  const put = (rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  const a = '原資料PDF/書籍/book-a__土工の本';
  const b = '原資料PDF/書籍/book-b__別の本';
  put(`${a}/ocr/part-01.md`, OCR_A);
  put(`${a}/book-manifest.json`, JSON.stringify({ sourceFiles: [{ path: 'source/001.pdf' }] }));
  put(`${b}/ocr/part-01.md`, OCR_B);
  put(`${b}/book-manifest.json`, JSON.stringify({ sourceFiles: [{ path: 'source/001.pdf' }, { path: 'source/002.pdf' }] }));
  put('原資料PDF/書籍/book-c__OCRなし/book-manifest.json', '{}');
  return root;
}

test('図番号のクエリ: 「図2.41」「2.41」「図 2．41」はどれも 2.41', () => {
  for (const q of ['図2.41', '2.41', '図 2．41']) assert.equal(queryKey(q), '2.41');
  assert.equal(queryKey('図の番号なし'), null);
});

test('OCR の図行は直前のページ印（PDF ページと印字ページ）と行番号つきで引ける', () => {
  const e = parseOcrFigureEntries(OCR_A);
  assert.deepEqual(e.map((x) => [x.key, x.page, x.printed, x.name]), [['2.38', 121, '113', 'サンドマット工法（敷砂工法）'], ['2.41', 122, '114', '押え盛土工法']]);
  assert.equal(e[1].line, 9);
  assert.equal(parseOcrFigureEntries(OCR_B)[0].printed, null, '印字ページの無いページ印');
});

test('found / multiple / not-found を区別し、1 ファイルの書籍は pdf、複数ファイルの書籍は pdfCandidates を返す', () => {
  const books = loadBooks(makeVault());
  assert.deepEqual(books.map((b) => b.id), ['book-a', 'book-b'], 'OCR の無い書籍は検索対象に入れない');
  const [one, multi, none] = findFigures(['図2.38', '図2.41', '図9.99'], books);
  assert.equal(one.status, 'found');
  assert.equal(one.matches[0].page, 121);
  assert.equal(one.matches[0].pdf, 'vault:原資料PDF/書籍/book-a__土工の本/source/001.pdf');
  assert.equal(multi.status, 'multiple');
  assert.deepEqual(multi.matches.map((m) => m.book), ['book-a', 'book-b']);
  assert.equal(multi.matches[1].pdf, undefined);
  assert.equal(multi.matches[1].pdfCandidates.length, 2);
  assert.equal(none.status, 'not-found');
  assert.deepEqual(none.matches, []);
});

test('--book で書籍を絞ると、複数一致が 1 件に決まる', () => {
  const root = makeVault();
  const [r] = findFigures(['図2.41'], loadBooks(root, { book: 'book-b' }));
  assert.equal(r.status, 'found');
  assert.equal(r.matches[0].book, 'book-b');
});

test('CLI: 見つからないクエリがあれば exit 1、OCR を 1 冊も読めなければ exit 2、vault が無ければ exit 2', async () => {
  const root = makeVault();
  const mute = async (fn) => {
    const o = console.log; const e = console.error; let out = '';
    console.log = (s) => { out += s; }; console.error = () => {};
    try { return { code: await fn(), out }; } finally { console.log = o; console.error = e; }
  };
  const ok = await mute(() => run(['図2.38', '--book', 'book-a'], { vaultRoot: root }));
  assert.equal(ok.code, 0);
  assert.equal(JSON.parse(ok.out).results[0].matches[0].printedPage, '113');
  assert.equal((await mute(() => run(['図9.99'], { vaultRoot: root }))).code, 1);
  assert.equal((await mute(() => run(['図2.38', '--book', 'book-c'], { vaultRoot: root }))).code, 2);
  assert.equal((await mute(() => run(['図2.38'], { vaultRoot: mkdtempSync(join(tmpdir(), 'empty-')) }))).code, 2);
  assert.equal((await mute(() => run(['図なし'], { vaultRoot: root }))).code, 1);
});
