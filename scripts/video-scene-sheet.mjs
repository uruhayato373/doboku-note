#!/usr/bin/env node
/** One frame per rendered scene, including a short opening cover. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { REPO_ROOT } from './lib/repository-paths.mjs';

export async function createSceneSheet(root, packId) {
  if (!packId || !/^[a-z0-9-]+$/.test(packId)) throw new Error('Usage: node scripts/video-scene-sheet.mjs <packId>');
  const renderDir = resolve(root, '.tmp/video-render', packId);
  const manifestPath = join(renderDir, 'render-manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`render-manifest.json が無い: ${packId}`);
  const manifestBytes = readFileSync(manifestPath);
  const scenes = JSON.parse(manifestBytes).scenes;
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('確認対象の場面が 0 件');

  const cols = 3;
  const tileWidth = 640;
  const imageHeight = 360;
  const labelHeight = 38;
  const rows = Math.ceil(scenes.length / cols);
  const layers = [];
  for (const [index, scene] of scenes.entries()) {
    if (!scene.sceneId || !/^[\w.-]+\.png$/.test(scene.png)) throw new Error(`場面 ${index + 1} の ID または PNG 名が不正`);
    const source = join(renderDir, 'img', scene.png);
    if (!existsSync(source)) throw new Error(`場面 PNG が無い: ${scene.sceneId}`);
    const actual = createHash('sha256').update(readFileSync(source)).digest('hex');
    if (actual !== scene.pngSha256) throw new Error(`場面 PNG が描画記録と異なる: ${scene.sceneId}`);
    const left = (index % cols) * tileWidth;
    const top = Math.floor(index / cols) * (imageHeight + labelHeight);
    layers.push({ input: await sharp(source).resize(tileWidth, imageHeight).png().toBuffer(), left, top });
    const label = `${index + 1}/${scenes.length}  ${scene.sceneId}`;
    const svg = `<svg width="${tileWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#1d2939"/><text x="12" y="27" fill="white" font-size="22" font-family="Arial, sans-serif">${label}</text></svg>`;
    layers.push({ input: Buffer.from(svg), left, top: top + imageHeight });
  }

  const outputDir = join(renderDir, 'preview');
  mkdirSync(outputDir, { recursive: true });
  const revision = createHash('sha256').update(manifestBytes).digest('hex').slice(0, 8);
  const output = join(outputDir, `scene-sheet-${revision}.jpg`);
  await sharp({ create: { width: cols * tileWidth, height: rows * (imageHeight + labelHeight), channels: 3, background: '#f4f6f8' } })
    .composite(layers).jpeg({ quality: 90 }).toFile(output);
  for (const name of readdirSync(outputDir)) {
    if (name !== basename(output) && /^scene-sheet-(?:[a-f0-9]{8}|\d+)(?:-[a-f0-9]{8})?\.jpg$/.test(name)) unlinkSync(join(outputDir, name));
  }
  return { file: basename(output), output, sceneCount: scenes.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createSceneSheet(REPO_ROOT, process.argv[2]).then(({ output, sceneCount }) => {
    console.log(`場面 ${sceneCount}/${sceneCount} 件を記録順に確認シートへ出力: ${output}`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
