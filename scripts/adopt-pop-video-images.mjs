import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readJson, writeJson } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { popSceneHash } from './lib/longform-pop-images.mjs';
import { coverInputDigest } from './lib/youtube-approved-cover.mjs';
import { normalizeLearningFrame } from './lib/learning-frame.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pack = process.argv[2];
const assetFile = process.argv[3];
if (!pack || !assetFile) throw new Error('usage: node scripts/adopt-pop-video-images.mjs <exam/pack> <asset-map.json>');
const packDir = `content/sns/video-packs/${pack}`;
const storyboard = readJson(REPO_ROOT, `${packDir}/storyboard.json`);
const videoPack = readJson(REPO_ROOT, `${packDir}/video-pack.json`);
const map = readJson(REPO_ROOT, assetFile);
if (!Array.isArray(map) || map.length !== storyboard.scenes.length) throw new Error('scene count mismatch');
const ids = new Set(map.map(x => x.id));
if (ids.size !== map.length || storyboard.scenes.some(x => !ids.has(x.sceneId))) throw new Error('scene ids mismatch');
const exam = videoPack.exam;
const style = exam === 'pe-first-stage'
  ? '.tmp/media/pe-first-stage/pe1-zentaizou/youtube.longform/cover.abe1a7b7.png'
  : '.tmp/media/concrete-chief-engineer/shunin-rekka-taio/work/cover-pop.82b2413f.png';
const bodyStyle = exam === 'pe-first-stage'
  ? '.tmp/media/pe-first-stage/pe1-kiso-newton-hou/work/answer-diagram.2d6c31ce.png'
  : style;
const ref = path => ({ path, sha256: hash(readFileSync(resolve(REPO_ROOT, path))) });
const now = new Date().toISOString();
const work = `.tmp/media/${pack}/work`;
mkdirSync(resolve(REPO_ROOT, work), { recursive: true });
const normalize = async (asset, label) => {
  const source = readFileSync(asset.path);
  const sourceSha = hash(source);
  const rawPath = `${work}/raw-${label}.${sourceSha.slice(0, 8)}.png`;
  writeFileSync(resolve(REPO_ROOT, rawPath), source);
  const output = label === 'cover-pop'
    ? await sharp(source).resize(1920, 1080, { fit: 'fill' })
      .png({ palette: true, quality: 92, effort: 9 }).toBuffer()
    : await normalizeLearningFrame(source);
  if (label === 'cover-pop' && output.length > 2 * 1024 * 1024) throw new Error('cover exceeds 2 MiB');
  const outputSha = hash(output);
  const finalPath = `${work}/${label}.${outputSha.slice(0, 8)}.png`;
  writeFileSync(resolve(REPO_ROOT, finalPath), output);
  return { source: { path: rawPath, sha256: sourceSha }, final: { path: finalPath, sha256: outputSha, width: 1920, height: 1080 } };
};
const imageDesign = { mode: 'codex-pop', scope: 'all-body', revision: 'body-diagram-20261028',
  coverRevision: 'cover-pop-20261028', layout: 'diagram-led' };
const coverAsset = map.find(x => x.id === 'cover');
const cover = await normalize(coverAsset, 'cover-pop');
const scenes = [];
for (const scene of storyboard.scenes.slice(1)) {
  const asset = map.find(x => x.id === scene.sceneId);
  const normalized = await normalize(asset, `${scene.sceneId}-diagram`);
  const prompt = asset.prompt || [
    'Create a new 16:9 full-frame Japanese educational diagram, clean and simple, not a poster.',
    'No person. Leave the lower 18 percent clear for subtitles.',
    `Exact heading: ${scene.visual?.heading ?? scene.sceneId}.`,
    scene.graphicPrompt || scene.visual?.diagram || (scene.visual?.items ?? []).join(' / '),
  ].join(' ');
  scenes.push({
    sceneId: scene.sceneId, inputSha256: popSceneHash(scene),
    generation: { tool: 'image_gen', prompt, references: [ref(bodyStyle)],
      output: normalized.source, generatedAt: now },
    output: normalized.final,
    normalization: { mode: 'full-frame-v1', sourceSha256: normalized.source.sha256 },
    review: { status: 'ai-reviewed', userReview: 'pending', checkedAt: now, by: 'Codex',
      views: ['original'], checks: ['図解と原稿の意味', '文字・数値の判読', '人物なし'],
      continuousListening: 'not-performed' },
  });
}
const coverPrompt = coverAsset.prompt || `New 16:9 POP poster for ${exam}: ${storyboard.scenes[0].visual.heading}`;
const headline = coverAsset.headline ?? [storyboard.scenes[0].visual.heading];
const coverDesign = { schemaVersion: 1, covers: { longform: {
  format: 'longform', exam: exam === 'concrete-chief-engineer' ? 'concrete-chief' : exam,
  headline, accentLine: 0,
  subtitle: exam === 'pe-first-stage' ? '基礎科目' : '品質管理',
  character: { pose: 'pop-red-pen', frame: 'waist' },
  design: 'pop-poster-v3', pop: { variant: 'question', authority: '総監が制作' },
} } };
coverDesign.covers.longform.approvedImage = {
  path: cover.final.path, sha256: cover.final.sha256,
  specSha256: coverInputDigest(coverDesign.covers.longform),
};
const pop = {
  policy: '.claude/knowledge/reference/pop-image-policy.md', designVersion: 'pop-20260927',
  channel: 'youtube', source: packDir,
  outputs: { longform: {
    publicationId: `${pack}/youtube.longform`,
    copy: { exam, headline, benefit: coverDesign.covers.longform.subtitle,
      authority: '総監が制作' },
    evidence: [`${packDir}/cover-design.json#covers/longform`, `${packDir}/storyboard.json`],
    references: [ref(style)], prompt: coverPrompt, format: { width: 1920, height: 1080 },
    render: { template: 'codex-image-gen', variant: 'question', pose: 'pop-red-pen' },
    output: { path: cover.final.path, sha256: cover.final.sha256 },
    review: { status: 'agent-reviewed', by: 'Codex', checkedAt: now, viewportWidth: 360,
      checks: ['見出しと資格名', '文字・人物の切れ', '図と主張の整合'], userImageReview: 'pending' },
    storage: { group: 'content-media', key: cover.final.path }, publication: 'ローカル差し替え・外部未反映',
  } },
  activeBodyRevision: imageDesign.revision, activeCoverRevision: imageDesign.coverRevision,
  revisions: {
    [imageDesign.revision]: { layout: { mode: 'diagram-led' }, images: scenes },
    [imageDesign.coverRevision]: {
      version: 'pop-poster-v3',
      generation: { tool: 'image_gen', prompt: coverPrompt, references: [ref(style)],
        output: cover.source, generatedAt: now },
      copy: { exam, headline, authority: '総監が制作' },
      output: cover.final,
      normalization: { mode: 'full-frame-v1', sourceSha256: cover.source.sha256 },
      review: { status: 'ai-reviewed', userImageReview: 'pending', checkedAt: now,
        by: 'Codex', views: ['original'], checks: ['文言・資格名', '顔と安全域'] },
      storage: { group: 'content-media', sync: 'local' },
    },
  },
};
storyboard.imageDesign = imageDesign;
writeJson(REPO_ROOT, `${packDir}/storyboard.json`, storyboard);
writeJson(REPO_ROOT, `${packDir}/cover-design.json`, coverDesign);
writeJson(REPO_ROOT, `${packDir}/pop-image.json`, pop);
console.log(JSON.stringify({ pack, scenes: scenes.length, cover: cover.final.path }));
