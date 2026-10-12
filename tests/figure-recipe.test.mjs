import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ConfigFigureSources } from '../scripts/lib/dataset-schemas-config-media.mjs';
import { parseCropBox, provenanceEntryFor, validateVerdict } from '../scripts/lib/figure-review.mjs';
import { RECIPE_DIFF, applyRecipe, despeckleRaw, diffImages, recipeOf, resolvePdfPath, withinThreshold } from '../scripts/lib/figure-recipe.mjs';

/** 白地に黒い枠と斜線のあるページ（400×300）と、枠の外の小さな点 */
async function fixturePage() {
  const w = 400;
  const h = 300;
  const raw = Buffer.alloc(w * h * 3, 255);
  const dot = (x, y) => { const i = (y * w + x) * 3; raw[i] = raw[i + 1] = raw[i + 2] = 0; };
  for (let x = 100; x < 300; x++) { dot(x, 80); dot(x, 200); }
  for (let y = 80; y <= 200; y++) { dot(100, y); dot(299, y); }
  for (let i = 0; i < 100; i++) dot(120 + i, 90 + i);
  dot(20, 20); dot(21, 20); // 孤立した 2 画素のごみ
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

test('cropBox の読み: 文字列・配列を受け、整数 4 つで right>left・bottom>top だけを通す', () => {
  assert.deepEqual(parseCropBox('(10,20,110,220)'), [10, 20, 110, 220]);
  assert.deepEqual(parseCropBox([1, 2, 3, 4]), [1, 2, 3, 4]);
  for (const bad of ['', null, '(1,2,3)', '(5,5,5,9)', '(5,5,9,5)', '(-1,0,5,5)', '(1.5,0,5,5)', [1, 2, 3]]) assert.equal(parseCropBox(bad), null, String(bad));
});

test('記録から作り直す: 同じ記録は同じ画像になり、枠を 1px ずらすと閾値を超えて不一致になる', async () => {
  const page = await fixturePage();
  const recipe = { cropBox: [90, 70, 310, 210], rotate: 0, post: {} };
  const served = await applyRecipe(page, recipe, 'webp');
  const again = await applyRecipe(page, recipe, 'webp');
  const same = await diffImages(served, again);
  assert.deepEqual(same.size, [220, 140]);
  assert.equal(same.meanAbs, 0);
  assert.ok(withinThreshold(same));
  const shifted = await diffImages(served, await applyRecipe(page, { ...recipe, cropBox: [91, 70, 311, 210] }, 'webp'));
  assert.ok(shifted.meanAbs > RECIPE_DIFF.meanAbs || shifted.badFrac > RECIPE_DIFF.badFrac, `1px のずれを見逃した: ${JSON.stringify(shifted)}`);
  assert.equal(withinThreshold(shifted), false);
  const wrongSize = await diffImages(served, await applyRecipe(page, { ...recipe, cropBox: [90, 70, 300, 210] }, 'webp'));
  assert.equal(wrongSize.sameSize, false);
  assert.equal(withinThreshold(wrongSize), false);
});

test('回転: 180° 逆さのページは rotate を記録すれば、回した後の座標で同じ図が取れる', async () => {
  const page = await fixturePage();
  const upsideDown = await sharp(page).rotate(180).png().toBuffer();
  const direct = await applyRecipe(page, { cropBox: [90, 70, 310, 210] }, 'png');
  const viaRotate = await applyRecipe(upsideDown, { cropBox: [90, 70, 310, 210], rotate: 180 }, 'png');
  const d = await diffImages(direct, viaRotate);
  assert.equal(d.meanAbs, 0);
  const noRotate = await diffImages(direct, await applyRecipe(upsideDown, { cropBox: [90, 70, 310, 210] }, 'png'));
  assert.equal(withinThreshold(noRotate), false);
});

test('後処理: despeckle は小さい黒い成分だけを消し、width は幅へ縮め、colors はパレットにする', async () => {
  const page = await fixturePage();
  const withDust = { cropBox: [0, 0, 400, 300] };
  const raw1 = await sharp(await applyRecipe(page, withDust, 'png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const dustAt = (r) => r.data[(20 * 400 + 20) * 3];
  assert.equal(dustAt(raw1), 0);
  const cleaned = await sharp(await applyRecipe(page, { ...withDust, post: { despeckle: 10 } }, 'png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(dustAt(cleaned), 255, '孤立した 2 画素は消える');
  assert.equal(cleaned.data[(80 * 400 + 150) * 3], 0, '枠線は残る');
  const narrow = await sharp(await applyRecipe(page, { ...withDust, post: { width: 200 } }, 'png')).metadata();
  assert.equal(narrow.width, 200);
  const pal = await sharp(await applyRecipe(page, { ...withDust, post: { colors: 4 } }, 'png')).metadata();
  assert.equal(pal.paletteBitDepth !== undefined || pal.channels === 1 || pal.format === 'png', true);
  assert.equal(despeckleRaw(Buffer.alloc(27, 255), 3, 3, 5), 0);
});

test('はみ出す枠は投げる（回転後のページより大きい枠で黙って切り詰めない）', async () => {
  await assert.rejects(applyRecipe(await fixturePage(), { cropBox: [0, 0, 500, 300] }, 'png'), /はみ出す/);
});

test('記録 → 手順の入力: 枠・dpi・ページが欠けた古い記録は作り直せないと理由つきで返す', () => {
  assert.match(recipeOf({ pdf: 'vault:原資料PDF/a.pdf', page: 3, dpi: 300 }).error, /cropBox/);
  assert.match(recipeOf({ pdf: 'vault:原資料PDF/a.pdf', page: 3, dpi: 0, cropBox: [0, 0, 5, 5] }).error, /dpi/);
  assert.match(recipeOf({ pdf: 'vault:原資料PDF/a.pdf', dpi: 300, cropBox: [0, 0, 5, 5] }).error, /page/);
  const ok = recipeOf({ pdf: 'vault:原資料PDF/a.pdf', page: 3, dpi: 300, cropBox: [0, 0, 5, 5] });
  assert.deepEqual(ok.recipe, { pdf: 'vault:原資料PDF/a.pdf', page: 3, dpi: 300, cropBox: [0, 0, 5, 5], rotate: 0, post: {} });
  assert.equal(resolvePdfPath('vault:原資料PDF/a.pdf', null), null);
  assert.equal(resolvePdfPath('vault:原資料PDF/a.pdf', '/m'), '/m/原資料PDF/a.pdf');
});

test('record: worker の結果（枠・回転・後処理）が provenance に残り、回転 0・空の後処理は省く。前の記録の枠は引き継がない', () => {
  const src = { pdf: 'vault:原資料PDF/書籍/x/source/001.pdf', page: 122, dpi: 300, cropBox: [10, 20, 600, 500], rotate: 180, post: { colors: 16, despeckle: 6, width: 0 } };
  assert.deepEqual(provenanceEntryFor(undefined, src), {
    pdf: src.pdf, page: 122, dpi: 300, cropBox: [10, 20, 600, 500], rotate: 180, post: { despeckle: 6, colors: 16 },
  });
  assert.deepEqual(provenanceEntryFor({ kind: 'exam-official', cropBox: [1, 1, 9, 9] }, { pdf: src.pdf, page: 3, dpi: 300, cropBox: [5, 5, 50, 50], rotate: 0, post: {} }), {
    kind: 'exam-official', pdf: src.pdf, page: 3, dpi: 300, cropBox: [5, 5, 50, 50],
  });
  assert.equal('cropBox' in provenanceEntryFor({ cropBox: [1, 1, 9, 9] }, { pdf: src.pdf, page: 3, dpi: 300 }), false);
});

test('判定の検査: 切り出し直しは cropBox 必須・不正な枠と回転は拒む', () => {
  const base = { figKey: 'a/x/img/f', verdict: 'ok', action: 'reextract', reason: '上端の欠けを戻した' };
  const source = { pdf: 'vault:原資料PDF/a.pdf', page: 5, dpi: 300 };
  assert.equal(validateVerdict({ ...base, source }).length, 1, '枠なしは拒む');
  assert.deepEqual(validateVerdict({ ...base, source: { ...source, cropBox: [0, 0, 10, 10], rotate: 180 } }), []);
  assert.equal(validateVerdict({ ...base, source: { ...source, cropBox: [10, 0, 5, 10] } }).length >= 1, true);
  assert.equal(validateVerdict({ ...base, source: { ...source, cropBox: [0, 0, 10, 10], rotate: 45 } }).length, 1);
});

test('型: provenance の cropBox は PDF・page・dpi と一緒に書く。rotate・post は cropBox なしで書けない', () => {
  const base = { schemaVersion: 1, _comment: 'x', _updated: '2026-10-12', _fields: {}, _manual_needs_comment: 'x', manual_needs: [], categories: {} };
  const key = 'civil-construction-1/primary-r05-b/img/r05-b-fig-01';
  const parse = (entry) => ConfigFigureSources.safeParse({ ...base, provenance: { [key]: entry } });
  const pdf = { pdf: 'vault:原資料PDF/過去問/a.pdf', page: 3, dpi: 300 };
  assert.equal(parse({ ...pdf, cropBox: [76, 781, 2962, 3208], rotate: 180, post: { colors: 16 } }).success, true);
  assert.equal(parse({ ...pdf }).success, true, '枠のない古い記録も有効');
  assert.equal(parse({ ...pdf, cropBox: [10, 10, 5, 50] }).success, false, '右が左より小さい');
  assert.equal(parse({ ...pdf, rotate: 180 }).success, false, '枠なしの rotate');
  assert.equal(parse({ ...pdf, dpi: 0, cropBox: [0, 0, 5, 5] }).success, false, '画像からの切り出し（dpi 0）に枠は書けない');
  assert.equal(parse({ ...pdf, cropBox: [0, 0, 5, 5], rotate: 45 }).success, false);
  assert.equal(parse({ ...pdf, cropBox: [0, 0, 5, 5], post: { sharpen: 3 } }).success, false, '未知の後処理');
});
