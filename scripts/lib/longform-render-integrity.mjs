import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { buildLongformAss } from './longform-render.mjs';
import { narrationInput, sha256 } from './video-narration-cache.mjs';

/** Capture the production inputs, not the publication schedule or remote status. */
export function longformInputHash(packDir) {
  const files = ['video-pack.json', 'storyboard.json', 'cover-design.json', 'cta-design.json']
    .filter(name => existsSync(join(packDir, name)))
    .map(name => [name, sha256(readFileSync(join(packDir, name)))]);
  if (existsSync(join(packDir, 'pop-image.json'))) {
    const pop = JSON.parse(readFileSync(join(packDir, 'pop-image.json'), 'utf8'));
    // Review notes can be appended after rendering; adoption changes require a new MP4.
    files.push(['pop-images', {
      body: pop.activeBodyRevision ?? null, cover: pop.activeCoverRevision ?? null,
      images: pop.revisions?.[pop.activeBodyRevision]?.images?.map(({ sceneId, inputSha256, output }) => ({ sceneId, inputSha256, output })) ?? [],
      coverOutput: pop.revisions?.[pop.activeCoverRevision]?.output ?? null,
    }]);
  }
  return sha256(JSON.stringify(files));
}

function artifact(dir, name) {
  if (typeof name !== 'string' || !name || basename(name) !== name) throw new Error('レンダー素材のファイル名が不正');
  return readFileSync(join(dir, name));
}

/** A complete MP4 may be adopted only with evidence for the current text, images and audio. */
export function verifyLongformRender(packDir, renderDir) {
  const manifest = JSON.parse(readFileSync(join(renderDir, 'render-manifest.json'), 'utf8'));
  const board = JSON.parse(readFileSync(join(packDir, 'storyboard.json'), 'utf8'));
  if (!manifest.mp4 || !manifest.tts || manifest.integrity?.schemaVersion !== 1) {
    throw new Error('完成動画の入力照合記録が無い。現行のrender-longformで音声付き再生成が必要です');
  }
  if (manifest.integrity.inputSha256 !== longformInputHash(packDir)) throw new Error('完成動画の台本・画像指定が古い');
  if (!board.scenes?.length || board.scenes.length !== manifest.scenes?.length) throw new Error('完成動画の場面数が現行台本と違う');
  const durations = [];
  for (const [i, scene] of board.scenes.entries()) {
    const row = manifest.scenes[i];
    if (row.sceneId !== scene.sceneId || !(row.actualSec > 0)) throw new Error(`${scene.sceneId}: 完成動画の場面・実尺が不正`);
    if (row.narrationInputSha256 !== narrationInput(scene.narration, manifest.speaker).inputSha256) throw new Error(`${scene.sceneId}: 音声入力が現行台本と違う`);
    if (sha256(artifact(join(renderDir, 'wav'), row.wav)) !== row.wavSha256) throw new Error(`${scene.sceneId}: 音声のSHA不一致`);
    if (sha256(artifact(join(renderDir, 'img'), row.png)) !== row.pngSha256) throw new Error(`${scene.sceneId}: 場面画像のSHA不一致`);
    durations.push(row.actualSec);
  }
  const subtitles = readFileSync(join(renderDir, 'subtitles.ass'));
  if (sha256(subtitles) !== manifest.integrity.subtitlesSha256 || subtitles.toString('utf8') !== buildLongformAss(board.scenes, durations)) {
    throw new Error('字幕が現行台本・音声実尺と一致しません');
  }
  if (sha256(artifact(renderDir, manifest.mp4)) !== manifest.integrity.mp4Sha256) throw new Error('完成MP4のSHA不一致');
  return { scenesChecked: board.scenes.length, inputSha256: manifest.integrity.inputSha256, storyboardSha256: sha256(readFileSync(join(packDir, 'storyboard.json'))) };
}
