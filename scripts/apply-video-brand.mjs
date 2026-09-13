#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { loadCoverSources, specDigest } from './lib/youtube-cover-rollout.mjs';
import { readApprovedCover, coverInputDigest } from './lib/youtube-approved-cover.mjs';
import { coverFonts, COVER_FORMATS } from './lib/youtube-cover.mjs';
import { loadVideoBrand, brandedCoverNode, brandedCtaNode } from './lib/video-brand.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const commit = process.argv.includes('--commit');
const preview = process.argv.includes('--preview');
const sources = loadCoverSources(root);
const brand = await loadVideoBrand(root);
const coverDir = '.tmp/video-render/youtube-covers-a-rollout-20260909';
const ctaDir = '.tmp/video-render/youtube-cta-a-rollout-20260909';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (p, v) => writeFileSync(join(root, p), JSON.stringify(v, null, 2) + '\n');
if (preview && commit) throw new Error('Choose preview or local apply');
console.log(JSON.stringify({ mode: preview ? 'preview' : commit ? 'local-apply' : 'dry-run', covers: sources.length, youtubeWrites: 0 }));
if (!commit && !preview) process.exit(0);
for (const dir of [coverDir, ctaDir]) mkdirSync(join(root, dir), { recursive: true });
const render = async (node, layout) => {
  const svg = await satori(node, { width: layout.width, height: layout.height, fonts: coverFonts(root) });
  return sharp(new Resvg(svg).render().asPng()).png({ palette: true, colours: 256, dither: 0.3 }).toBuffer();
};
const designs = new Map(), provenance = [], approvals = [], packs = new Set();
for (const [i, source] of sources.entries()) {
  if (preview && ![0, 1, 90, 166, 167, 280, 330, 340].includes(i)) continue;
  const layout = COVER_FORMATS[source.spec.format];
  const original = await readApprovedCover(root, source.spec, layout);
  if (!original) throw new Error('Reviewed source image missing');
  const alreadyBranded = source.spec.approvedImage.path.includes('youtube-covers-logo-a-') || source.spec.approvedImage.path.includes('youtube-covers-a-rollout-');
  const png = alreadyBranded ? await sharp(original.buffer).png({ palette: true, colours: 256, dither: 0.3 }).toBuffer() : await render(brandedCoverNode(original.buffer, layout, brand.logo), layout);
  if (png.length > 2 * 1024 * 1024) throw new Error('Cover exceeds upload limit');
  const path = `${coverDir}/${String(i).padStart(3, '0')}.png`;
  writeFileSync(join(root, path), png);
  if (!designs.has(source.designPath)) designs.set(source.designPath, JSON.parse(readFileSync(join(root, source.designPath))));
  const spec = designs.get(source.designPath).covers[source.key];
  provenance.push({ sourceKey: source.sourceKey, original: source.spec.approvedImage, output: { path, sha256: hash(png) } });
  spec.approvedImage = { path, sha256: hash(png), specSha256: coverInputDigest(spec) };
  approvals.push({ sourceKey: source.sourceKey, designPath: source.designPath, key: source.key, specSha256: specDigest(spec), sha256: hash(png), width: layout.width, height: layout.height, bytes: png.length });
  if (!source.sourceKey.startsWith('legacy/')) packs.add(dirname(source.designPath));
  if (!preview && i % 25 === 0) console.log(JSON.stringify({ coversRendered: i + 1, total: sources.length }));
}
for (const p of packs) {
  if (p.endsWith('/koji-gaiyo-7items')) continue;
  const scene = JSON.parse(readFileSync(join(root, p, 'storyboard.json'))).scenes.find(s => s.sceneId === 'cta');
  if (!scene?.visual?.heading) throw new Error('CTA copy missing: ' + p);
  const png = await render(brandedCtaNode(scene, brand), { width: 1920, height: 1080 });
  const path = `${ctaDir}/${p.split('/').at(-1)}.png`;
  writeFileSync(join(root, path), png);
  if (!preview) json(`${p}/cta-design.json`, { schemaVersion: 1, design: brand.config.design,
    longform: { path, sha256: hash(png) },
    shorts: { path: brand.config.shorts.path, sha256: brand.config.shorts.sha256, narration: brand.config.shortsNarration } });
}
if (preview) { console.log(JSON.stringify({ previewCovers: approvals.length, previewCtas: packs.size })); process.exit(0); }
for (const [p, design] of designs) json(p, design);
json('.claude/state/youtube-thumbnail-designs.json', { schemaVersion: 1, approval: { date: '2026-09-09', by: 'user', design: brand.config.design, scope: 'all existing and scheduled videos; reupload and old-version deletion authorized' }, entries: approvals });
json(`${ctaDir}/cover-provenance.json`, { schemaVersion: 1, brand: brand.config, covers: provenance });
console.log(JSON.stringify({ covers: approvals.length, packs: packs.size, ctas: packs.size, youtubeWrites: 0 }));
