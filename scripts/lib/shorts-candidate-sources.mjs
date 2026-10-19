import { createHash } from 'node:crypto';
import { readJson } from './json-io.mjs';
import { verifyImageReproduction } from './video-image-reproduction.mjs';

/** A local revision is separate from the currently uploaded Shorts artwork. */
export async function shortsCandidateSources(root, work, pub) {
  const pop = readJson(root, `${work.definition}/pop-image.json`);
  const revision = pop.revisions?.[pop.candidateShortsRevision];
  const records = revision?.publications?.filter(r => r.publicationId === pub.id) ?? [];
  if (records.length !== 1) throw new Error('Shortsの改訂候補・再現記録が1件必要です');
  const record = records[0];
  await verifyImageReproduction(root, record);
  const recipe = readJson(root, record.reproduction.path);
  const sources = recipe.scenes.map(scene => {
    const image = record.images.find(i => i.role === scene.role && i.output.sha256 === scene.sha256);
    if (!image?.generation?.prompt || image.generation.tool !== 'image_gen') throw new Error('Shortsの場面とCodex生成記録が一致しません');
    return { role: `${record.key}-${/^scene-/.test(scene.role) ? 'body' : scene.role}`, from: scene.path, expectSha: scene.sha256,
      provenance: { kind: 'ai-generated', tool: 'codex', prompt: image.generation.prompt, promptSha256: createHash('sha256').update(image.generation.prompt).digest('hex'), generatedAt: image.generation.generatedAt } };
  });
  sources.push({role:`${record.key}-video`,from:recipe.verifiedOutput.path,expectSha:recipe.verifiedOutput.sha256,durationSec:recipe.totalFrames/recipe.fps,
    provenance:{kind:'render',by:'shorts-image-replacement',spec:`${work.definition}/pop-image.json#${pop.candidateShortsRevision}`}});
  const subtitles = recipe.subtitles ?? recipe.originalSubtitles;
  sources.push({role:`${record.key}-subtitles`,from:subtitles.path,expectSha:subtitles.sha256,provenance:{kind:'render',by:'shorts-image-replacement'}});
  sources.push({role:`${record.key}-recipe`,from:record.reproduction.path,expectSha:record.reproduction.sha256,provenance:{kind:'render',by:'shorts-image-replacement'}});
  return sources;
}
