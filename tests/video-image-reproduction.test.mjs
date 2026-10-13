import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { mediaPath } from '../scripts/lib/media-paths.mjs';
import { assertTemplateShortsAllowed, currentImageReplacement, verifyImageReproduction } from '../scripts/lib/video-image-reproduction.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'video-reproduction-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pubId = 'civil-construction-2/test/youtube.short.point-1';
  const saved = new Map();
  const asset = (role, ext, bytes) => {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const path = mediaPath({ pubId, role, ext, sha256 });
    const abs = join(root, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
    saved.set(abs, bytes);
    return { path, sha256 };
  };
  const png = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#008844' } }).png().toBuffer();
  const recipe = { schemaVersion: 1, pubId, fps: 30, totalFrames: 60,
    sourceVideo: asset('source-original', 'mp4', 'original audio bytes'),
    originalSubtitles: asset('subtitles', 'ass', 'original subtitle bytes'),
    verifiedOutput: asset('video', 'mp4', 'previously verified video bytes'),
    scenes: [{ ...asset('cover', 'png', png), startSec: 0, endSec: 1 },
      { ...asset('cta', 'png', png), startSec: 1, endSec: 2 }],
  };
  const record = { publicationId: pubId, key: 'point-1', videoImageReplacement: { outputSha256: recipe.verifiedOutput.sha256 } };
  const saveRecipe = () => { record.reproduction = asset('image-replacement-recipe', 'json', JSON.stringify(recipe)); };
  saveRecipe();
  return { root, recipe, record, saveRecipe, saved, asset };
}

test('exact restoration verifies every pinned file and refuses to silently overwrite changed bytes', async t => {
  const { root, record, recipe, saved } = await fixture(t);
  const result = await verifyImageReproduction(root, record);
  assert.equal(result.checkedScenes, 2);
  assert.equal(result.checkedFiles, 6);
  assert.equal(result.checkedFiles, result.expectedFiles);
  const missing = join(root, recipe.scenes[1].path);
  rmSync(missing);
  await assert.rejects(verifyImageReproduction(root, record), /復元が必要/);
  let restored = 0;
  await verifyImageReproduction(root, record, { restoreMissing: path => { restored++; writeFileSync(path, saved.get(path)); return true; } });
  assert.equal(restored, 1);
  writeFileSync(join(root, recipe.originalSubtitles.path), 'changed');
  await assert.rejects(verifyImageReproduction(root, record, { restoreMissing: () => assert.fail('must not overwrite') }), /SHA不一致/);
});

test('zero scenes, discontinuities, wrong size, stale video and recipe corruption cannot pass', async t => {
  const { root, recipe, record, saveRecipe, asset } = await fixture(t);
  const scenes = recipe.scenes;
  recipe.scenes = []; saveRecipe();
  await assert.rejects(verifyImageReproduction(root, record), /場面数/);
  recipe.scenes = scenes;
  scenes[1].startSec = 1.1; saveRecipe();
  await assert.rejects(verifyImageReproduction(root, record), /欠落/);
  scenes[1].startSec = 1;
  const portrait = scenes[1];
  const wide = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#008844' } }).png().toBuffer();
  scenes[1] = { ...asset('cta', 'png', wide), startSec: 1, endSec: 2 }; saveRecipe();
  await assert.rejects(verifyImageReproduction(root, record), /寸法不一致/);
  scenes[1] = portrait;
  recipe.totalFrames = 90; saveRecipe();
  await assert.rejects(verifyImageReproduction(root, record), /尺/);
  recipe.totalFrames = 60; saveRecipe();
  record.videoImageReplacement.outputSha256 = 'a'.repeat(64);
  await assert.rejects(verifyImageReproduction(root, record), /採用動画SHA/);
  writeFileSync(join(root, record.reproduction.path), '{}');
  await assert.rejects(verifyImageReproduction(root, record), /SHA不一致/);
});

test('protected authored scenes reject the template renderer; only current video recipe is selected', async t => {
  const { record } = await fixture(t);
  const pop = { revisions: { old: { publications: [{ ...record, videoImageReplacement: { outputSha256: '0'.repeat(64) } }] }, current: { publications: [record] } } };
  assert.throws(() => assertTemplateShortsAllowed(pop, ['point-1']), /旧テンプレート/);
  assert.doesNotThrow(() => assertTemplateShortsAllowed(pop, ['another']));
  assert.doesNotThrow(() => assertTemplateShortsAllowed(null, ['point-1']));
  assert.equal(currentImageReplacement(pop, { key: 'point-1', sha256: record.videoImageReplacement.outputSha256 }), record);
  assert.throws(() => currentImageReplacement(pop, { key: 'point-1', sha256: 'changed' }), /0件/);
});

test('actual template CLI stops before rendering even with force or preview-only', async t => {
  const { root, record } = await fixture(t);
  for (const [name, data] of Object.entries({
    'video-pack.json': { packId: 'test', exam: 'civil-construction-2' },
    'storyboard.json': { scenes: [] },
    'youtube.json': { shorts: [{ key: record.key }] },
    'pop-image.json': { revisions: { current: { publications: [record] } } },
  })) writeFileSync(join(root, name), JSON.stringify(data));
  for (const flag of ['--force', '--preview-only']) {
    const result = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/render-video-pack-shorts.mjs'),
      '--pack-dir', root, '--render-root', join(root, 'render'), flag], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /旧テンプレートで再生成できません/);
    assert.equal(existsSync(join(root, 'render')), false);
  }
});
