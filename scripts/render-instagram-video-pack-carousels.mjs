#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { EXAM_TO_PALETTE } from './lib/longform-render.mjs';
import { resolveExam } from '../.claude/scripts/sns/lib/exam-palette.mjs';
import { IG_DESIGN, instagramLogo, instagramCoverNode, instagramPointNode, instagramCtaNode, renderInstagramNode, instagramRendererDigest } from './lib/instagram-video-design.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(ROOT, 'content/sns/instagram/video-packs');
const { values: args } = parseArgs({ options: { all: { type: 'boolean' }, pack: { type: 'string' }, force: { type: 'boolean' } } });
if (!args.all && !args.pack) throw new Error('Specify --all or --pack <sourcePackId>');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const logo = await instagramLogo(ROOT);
const codeHash = instagramRendererDigest(ROOT, 'carousel');
let count = 0, images = 0;
for (const exam of readdirSync(base).sort()) for (const id of readdirSync(join(base, exam)).sort()) {
  const dir = join(base, exam, id), file = join(dir, 'slide-data.json');
  if (!existsSync(file) || (args.pack && args.pack !== id)) continue;
  const raw = readFileSync(file), data = JSON.parse(raw);
  if (data.sourcePackId !== id || data.exam !== exam || data.design !== 'bridge-notebook-a') throw new Error(`Invalid source: ${id}`);
  const slides = data.slides;
  if (slides.length < 6 || slides.length > 10 || slides[0].type !== 'cover' || slides.at(-1).type !== 'cta') throw new Error(`6〜10枚のcover/point/ctaが必要: ${id}`);
  const digest = sha(Buffer.concat([raw, logo, Buffer.from(codeHash)]));
  const recordPath = join(dir, 'carousel/render.json');
  const prior = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath)) : null;
  if (!args.force && prior?.inputDigest === digest && prior.images?.length === slides.length && prior.images.every(a => existsSync(join(ROOT, a.path)) && sha(readFileSync(join(ROOT, a.path))) === a.sha256)) {
    count++; images += slides.length; console.log(`[existing] ${exam}/${id}`); continue;
  }
  const output = join(dir, 'carousel/img'); mkdirSync(output, { recursive: true });
  const label = resolveExam(EXAM_TO_PALETTE[exam]).label;
  const rendered = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const node = slide.type === 'cover' ? await instagramCoverNode(ROOT, slide, label, logo)
      : slide.type === 'cta' ? instagramCtaNode(logo)
        : instagramPointNode(slide, label, logo, i + 1, slides.length);
    const { buffer } = await renderInstagramNode(ROOT, node, 1350);
    const path = join(output, `${String(i).padStart(2, '0')}-${slide.type}.png`);
    writeFileSync(path, buffer);
    rendered.push({ path: path.slice(ROOT.length + 1), sha256: sha(buffer), bytes: buffer.length, width: 1080, height: 1350 });
  }
  const expectedFiles = new Set(rendered.map(a => a.path.split('/').at(-1)));
  for (const name of readdirSync(output)) if (/^\d{2}-(cover|point|cta)\.png$/.test(name) && !expectedFiles.has(name)) unlinkSync(join(output, name));
  writeFileSync(recordPath, JSON.stringify({ schemaVersion: 1, design: IG_DESIGN, sourcePackId: id, inputDigest: digest,
    sourceSha256: sha(raw), rendererSha256: codeHash,
    renderedAt: new Date().toISOString(), images: rendered }, null, 2) + '\n');
  count++; images += rendered.length; console.log(`[${count}] ${exam}/${id}: ${rendered.length} images`);
}
if (!count) throw new Error('対象0件');
console.log(JSON.stringify({ carousels: count, images }));
