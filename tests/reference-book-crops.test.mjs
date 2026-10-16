import { strict as assert } from 'node:assert';
import test from 'node:test';
import { applyCropBatch, cropFileName, validateCropBatch } from '../scripts/lib/reference-book-crops.mjs';

const manifest = {
  sourceId: 'book-a',
  pages: [
    { id: 'p0001', image: 'pages/p0001.jpg', width: 1000, height: 1400, cropStatus: 'pending' },
    { id: 'p0002', image: 'pages/p0002.jpg', width: 1000, height: 1400, cropStatus: 'pending' },
  ],
  crops: [],
};
const crop = { figureId: 'fig-flow', caption: '流れ図', bbox: { x: 10, y: 20, w: 300, h: 200 }, audit: [3, 3, 2, 3] };

test('crops: 図なしと切り出しの頁が通る', () => {
  const batch = { sourceId: 'book-a', pages: [{ page: 'p0001', notNeeded: true, reason: '本文だけ' }, { page: 'p0002', crops: [crop] }] };
  assert.deepEqual(validateCropBatch(batch, manifest), []);
});

test('crops: 頁からはみ出す bbox・監査点の欠け・理由の無い図なしを止める', () => {
  const batch = {
    sourceId: 'book-a',
    pages: [
      { page: 'p0001', notNeeded: true },
      { page: 'p0002', crops: [{ ...crop, bbox: { x: 900, y: 0, w: 200, h: 10 }, audit: [3, 3, 1, 3] }] },
    ],
  };
  const errors = validateCropBatch(batch, manifest);
  assert.ok(errors.some((e) => e.includes('reason')));
  assert.ok(errors.some((e) => e.includes('越える')));
  assert.ok(errors.some((e) => e.includes('audit')));
});

test('crops: 下見では監査点を求めない', () => {
  const batch = { sourceId: 'book-a', pages: [{ page: 'p0002', crops: [{ ...crop, audit: undefined }] }] };
  assert.deepEqual(validateCropBatch(batch, manifest, { requireAudit: false }), []);
  assert.ok(validateCropBatch(batch, manifest).length > 0);
});

test('crops: 反映で図なしは not-needed、切り出しは complete と crops の行になる', () => {
  const batch = { sourceId: 'book-a', pages: [{ page: 'p0001', notNeeded: true, reason: '本文だけ' }, { page: 'p0002', crops: [crop] }] };
  const results = new Map([[cropFileName('p0002', 'fig-flow'), { sha256: 'a', md5: 'b', bytes: 10, width: 300, height: 200 }]]);
  const next = applyCropBatch(manifest, batch, { results, bookRoot: 'content/sources/books/a', timestamp: '2026-10-16T00:00:00.000Z' });
  assert.equal(next.pages[0].cropStatus, 'not-needed');
  assert.equal(next.pages[1].cropStatus, 'complete');
  assert.equal(next.crops.length, 1);
  assert.equal(next.crops[0].repoPath, 'content/sources/books/a/crops/p0002_fig-flow.png');
  assert.equal(next.crops[0].audit.scores.correctFigure, 2);
  assert.equal(manifest.pages[0].cropStatus, 'pending'); // 元は変えない
});
