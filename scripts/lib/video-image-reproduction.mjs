import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { parseMediaPath, sha8Matches } from './media-paths.mjs';
import { parseJson } from './json-io.mjs';

export function imageReplacementRecords(pop) {
  return Object.values(pop?.revisions ?? {}).flatMap(revision =>
    (revision.publications ?? []).filter(item => item.reproduction && item.videoImageReplacement));
}

/** The template renderer cannot reproduce authored body/CTA images or preserve AAC packets. */
export function assertTemplateShortsAllowed(pop, keys) {
  const protectedKeys = [...new Set(imageReplacementRecords(pop)
    .filter(item => keys.includes(item.key)).map(item => item.key))];
  if (protectedKeys.length) throw new Error(`全場面の採用画像を持つShortsは旧テンプレートで再生成できません: ${protectedKeys.join(', ')}。youtube-shorts:restore と VIDEO-RENDER.md を使用してください`);
}

export function currentImageReplacement(pop, item) {
  const matches = imageReplacementRecords(pop).filter(record =>
    record.key === item.key && record.videoImageReplacement.outputSha256 === item.sha256);
  if (matches.length !== 1) throw new Error(`${item.key}: 現在の動画SHAに一致する再現レシピが1件必要です（${matches.length}件）`);
  return matches[0];
}

/** Restore only missing files; mismatched existing files are never silently replaced. */
export async function verifyImageReproduction(root, record, { restoreMissing } = {}) {
  let checkedFiles = 0;
  const readAsset = async ref => {
    const parsed = parseMediaPath(ref?.path);
    if (!parsed || parsed.pubId !== record.publicationId ||
      !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || !sha8Matches(ref.path, ref.sha256)) {
      throw new Error('再現素材のパス・SHA・投稿IDが不一致です');
    }
    const file = join(root, ref.path);
    if (!existsSync(file) && !(restoreMissing && await restoreMissing(file))) {
      throw new Error(`復元が必要です: ${ref.path}`);
    }
    const bytes = readFileSync(file);
    if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new Error(`SHA不一致: ${ref.path}`);
    checkedFiles++;
    return bytes;
  };
  const recipe = parseJson((await readAsset(record.reproduction)).toString('utf8'), record.reproduction.path);
  const scenes = recipe.scenes;
  if (recipe.schemaVersion !== 1 || recipe.pubId !== record.publicationId ||
    !Number.isInteger(recipe.totalFrames) || recipe.totalFrames <= 0 ||
    !Number.isFinite(recipe.fps) || recipe.fps <= 0 || !Array.isArray(scenes) || !scenes.length) {
    throw new Error('再現レシピの版・投稿ID・フレーム数・場面数が不正です');
  }
  if (recipe.verifiedOutput?.sha256 !== record.videoImageReplacement.outputSha256) throw new Error('レシピと採用動画SHAが不一致です');
  let end = 0;
  for (const scene of scenes) {
    if (!Number.isFinite(scene.startSec) || !Number.isFinite(scene.endSec) ||
      Math.abs(scene.startSec - end) > 1e-6 || scene.endSec <= scene.startSec) throw new Error('場面の欠落・重複・順序不正です');
    const image = await sharp(await readAsset(scene)).metadata();
    if (image.format !== 'png' || image.width !== 1080 || image.height !== 1920) throw new Error(`Shorts画像の寸法不一致: ${scene.path}`);
    end = scene.endSec;
  }
  if (Math.abs(end - recipe.totalFrames / recipe.fps) > 1e-6) throw new Error('全場面の尺が動画フレーム数と不一致です');
  await readAsset(recipe.sourceVideo);
  await readAsset(recipe.originalSubtitles);
  if (recipe.subtitles) await readAsset(recipe.subtitles);
  await readAsset(recipe.verifiedOutput);
  return { publicationId: record.publicationId, checkedFiles, expectedFiles: scenes.length + 4 + (recipe.subtitles ? 1 : 0),
    checkedScenes: scenes.length, output: recipe.verifiedOutput, mode: 'exact-file-restoration' };
}
