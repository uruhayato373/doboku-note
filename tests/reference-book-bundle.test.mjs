import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  bookRepoRoot,
  buildBookPagePlan,
  expectedBookVaultDir,
  resolvedPdfPageTransform,
  sourceRepoPath,
  validateBookBundleSource,
  validateBookManifestShape,
} from '../scripts/lib/reference-book-bundle.mjs';
import { loadReferenceSources } from '../scripts/lib/reference-sources.mjs';

const cfg = loadReferenceSources();
const source = cfg.sources.find((item) => item.id === 'safety-management-all-7th');
const cloneSource = () => JSON.parse(JSON.stringify(source));
const manifest = JSON.parse(readFileSync(
  new URL('../content/sources/books/safety-management-all-7th__新しい時代の安全管理のすべて_第7版/book-manifest.json', import.meta.url),
  'utf8',
));

test('safety book: 参考文献 ID・Drive・repo の1冊ディレクトリが一致する', () => {
  assert.doesNotThrow(() => validateBookBundleSource(source));
  assert.equal(bookRepoRoot(source), 'content/sources/books/safety-management-all-7th__新しい時代の安全管理のすべて_第7版');
  assert.equal(expectedBookVaultDir(source), source.origin.vaultDir);
  assert.equal(sourceRepoPath(source, 1), `${bookRepoRoot(source)}/source/001.pdf`);
});

test('safety book: 84見開きを左→右で168ページへ連番化する', () => {
  const pages = buildBookPagePlan(source);
  assert.equal(pages.length, 168);
  assert.deepEqual(
    pages.slice(0, 4).map((page) => [page.id, page.sourceFile, page.sourcePdfPage, page.side, page.printedPage]),
    [
      ['p0001', 's001', 1, 'left', 106],
      ['p0002', 's001', 1, 'right', 107],
      ['p0003', 's001', 2, 'left', 108],
      ['p0004', 's001', 2, 'right', 109],
    ],
  );
  assert.deepEqual(
    pages.slice(38, 42).map((page) => [page.id, page.sourceFile, page.sourcePdfPage, page.side, page.printedPage]),
    [
      ['p0039', 's001', 20, 'left', 144],
      ['p0040', 's001', 20, 'right', 145],
      ['p0041', 's002', 1, 'left', 146],
      ['p0042', 's002', 1, 'right', 147],
    ],
  );
  assert.deepEqual(
    pages.slice(-2).map((page) => [page.id, page.sourceFile, page.sourcePdfPage, page.side, page.printedPage]),
    [
      ['p0167', 's005', 7, 'left', 272],
      ['p0168', 's005', 7, 'right', 273],
    ],
  );
});

test('book bundle: 分冊順・版面範囲・directory 命名の崩れを拒否する', () => {
  const clone = cloneSource();
  clone.bookBundle.sourceFiles[1].order = 9;
  assert.throws(() => validateBookBundleSource(clone), /order/);

  const range = cloneSource();
  range.bookBundle.sourceFiles[0].printedPages.end = 144;
  assert.throws(() => validateBookBundleSource(range), /版面/);

  const directory = cloneSource();
  directory.bookBundle.directory = '日本語書名だけ';
  directory.origin.vaultDir = '原資料PDF/書籍/日本語書名だけ';
  assert.throws(() => validateBookBundleSource(directory), /directory/);

  const transcriptDir = cloneSource();
  transcriptDir.bookBundle.transcriptDir = 'content/sources/textbook/別名';
  assert.throws(() => validateBookBundleSource(transcriptDir), /transcriptDir/);
});

test('book bundle: マイドライブ内の旧原本を安全な相対パスで取り込める', () => {
  const clone = cloneSource();
  delete clone.bookBundle.sourceFiles[0].legacyRepoPath;
  clone.bookBundle.sourceFiles[0].legacyMyDrivePath = '個人管理/資格試験/1級土木施工管理技士/第１章_土工.pdf';
  assert.doesNotThrow(() => validateBookBundleSource(clone));

  clone.bookBundle.sourceFiles[0].legacyMyDrivePath = '../doboku-note/原資料PDF/秘密.pdf';
  assert.throws(() => validateBookBundleSource(clone), /安全な PDF パス/);

  clone.bookBundle.sourceFiles[0].legacyRepoPath = 'content/sources/textbook/重複.pdf';
  assert.throws(() => validateBookBundleSource(clone), /どれか1つ/);
});

test('book bundle: 単ページと見開きが混在しても通し番号が安定する', () => {
  const clone = cloneSource();
  clone.bookBundle.renderProfile.mode = 'pdfimages-auto-spread';
  clone.bookBundle.renderProfile.singlePageAspectThreshold = 1.15;
  clone.bookBundle.sourceFiles = [{
    order: 1,
    legacyRepoPath: clone.bookBundle.sourceFiles[0].legacyRepoPath,
    originalName: 'mixed.pdf',
    expectedPdfPages: 3,
    singlePdfPages: [1],
    printedPages: null,
    section: 'mixed',
  }];
  assert.doesNotThrow(() => validateBookBundleSource(clone));
  assert.deepEqual(
    buildBookPagePlan(clone).map((page) => [page.sourcePdfPage, page.side, page.printedPage]),
    [[1, null, null], [2, 'left', null], [2, 'right', null], [3, 'left', null], [3, 'right', null]],
  );
});

test('book bundle: PDFページ除外・ページ別回転・見開き・UI crop を決定的に展開する', () => {
  const clone = cloneSource();
  clone.bookBundle.renderProfile.mode = 'pdfimages-auto-spread';
  clone.bookBundle.renderProfile.singlePageAspectThreshold = 1.15;
  clone.bookBundle.renderProfile.contentCrop = { top: 80, right: 0, bottom: 0, left: 0 };
  clone.bookBundle.sourceFiles = [{
    order: 1,
    legacyRepoPath: clone.bookBundle.sourceFiles[0].legacyRepoPath,
    originalName: 'mixed.pdf',
    expectedPdfPages: 5,
    singlePdfPages: [1, 4, 5],
    excludedPdfPageRanges: [{ start: 5, end: 5, reason: '非本文' }],
    pageTransforms: [
      { start: 1, end: 1, rotation: 270, layout: 'spread' },
      { start: 2, end: 3, rotation: 180, layout: 'spread' },
      { start: 4, end: 4, rotation: 0, layout: 'single', contentCrop: { top: 10, right: 0, bottom: 20, left: 0 } },
    ],
    printedPages: null,
    section: 'mixed',
  }];
  assert.doesNotThrow(() => validateBookBundleSource(clone));
  assert.deepEqual(resolvedPdfPageTransform(clone, clone.bookBundle.sourceFiles[0], 4), {
    excluded: false,
    rotation: 0,
    layout: 'single',
    contentCrop: { top: 10, right: 0, bottom: 20, left: 0 },
  });
  const pages = buildBookPagePlan(clone);
  assert.equal(pages.length, 7);
  assert.deepEqual(
    pages.map((page) => [page.sourcePdfPage, page.side, page.rotation, page.contentCrop?.top]),
    [
      [1, 'left', 270, 80], [1, 'right', 270, 80],
      [2, 'left', 180, 80], [2, 'right', 180, 80],
      [3, 'left', 180, 80], [3, 'right', 180, 80],
      [4, null, 0, 10],
    ],
  );
});

test('book manifest: OCR と監査済み crop の来歴・partial 状態を保持できる', () => {
  const candidate = JSON.parse(JSON.stringify(manifest));
  for (const page of candidate.pages) {
    page.ocrStatus = 'pending';
    page.cropStatus = 'pending';
  }
  candidate.pages[4].ocrStatus = 'complete';
  candidate.pages[135].cropStatus = 'partial';
  candidate.ocrArtifacts = [{
    id: 'ocr-pilot',
    repoPath: `${source.bookBundle.transcriptDir}/pages/ocr-pilot.md`,
    pageIds: ['p0005'],
    sha256: 'a'.repeat(64),
    md5: 'b'.repeat(32),
    bytes: 100,
  }];
  candidate.crops = [{
    id: 'fig3-1-3',
    pageId: 'p0136',
    repoPath: `${bookRepoRoot(source)}/crops/p0136_fig3-1-3.png`,
    bbox: { x: 190, y: 650, w: 720, h: 390 },
    sha256: 'c'.repeat(64),
    md5: 'd'.repeat(32),
    bytes: 100,
    width: 720,
    height: 390,
    audit: { status: 'pass' },
  }];
  assert.deepEqual(validateBookManifestShape(source, candidate), []);

  delete candidate.ocrArtifacts;
  assert.ok(validateBookManifestShape(source, candidate).some((message) => message.includes('ocrStatus=complete')));
});
