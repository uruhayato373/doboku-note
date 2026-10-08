#!/usr/bin/env node
/**
 * brand-video-pack.mjs — 動画パック1本の表紙（cover-design.json）と締め画像（storyboard の cta 場面）を、
 * 採用ブランド（config/video-brand.json・bridge-notebook-a）のロゴ・背景で描き、資格とパック ID で引ける置き場へ書く。
 *
 *   表紙: .tmp/video-render/youtube-covers-{exam}/{packId}-{key}.png  → Drive「制作物/動画レンダー/採用カバー/」
 *   締め: .tmp/video-render/youtube-cta-{exam}/{packId}-longform.png  → Drive「制作物/動画レンダー/」
 *
 * cover-design.json の approvedImage と cta-design.json を書き換える。画像は git に入れず Drive vault に置く
 * （asset-storage-policy §1）。ここで書く approvedImage は採用候補で、公開の承認はパックの公開ゲートで行う。
 * 2026-09-09 の一括適用 apply-video-brand.mjs（日付フォルダ・連番名）の、パック単位の後継。
 *
 * 使い方:
 *   node scripts/brand-video-pack.mjs --pack-dir content/sns/video-packs/{exam}/{packId}            # dry-run
 *   node scripts/brand-video-pack.mjs --pack-dir content/sns/video-packs/{exam}/{packId} --commit   # 書き込み
 * 書いたあとは drive-vault-sync で Drive へ置き、表紙はクラウドからの読み戻しを登録する（check-youtube-cover-handoff）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { COVER_FORMATS, coverFonts, renderYoutubeCover, validateCoverDesign } from './lib/youtube-cover.mjs';
import { coverInputDigest } from './lib/youtube-approved-cover.mjs';
import { loadVideoBrand, brandedCoverNode, brandedCtaNode } from './lib/video-brand.mjs';
import { EXAM_TO_PALETTE } from './lib/longform-render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { 'pack-dir': { type: 'string' }, commit: { type: 'boolean' } } });
if (!args['pack-dir']) {
  console.error('Usage: node scripts/brand-video-pack.mjs --pack-dir content/sns/video-packs/{exam}/{packId} [--commit]');
  process.exit(1);
}
const packDir = resolve(ROOT, args['pack-dir']);
const packId = basename(packDir);
const exam = basename(dirname(packDir));
const manifest = JSON.parse(readFileSync(join(packDir, 'video-pack.json'), 'utf8'));
if (manifest.packId !== packId || manifest.exam !== exam) throw new Error(`パックの置き場（${exam}/${packId}）と video-pack.json が一致しない`);

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const render = async (node, layout) => {
  const svg = await satori(node, { width: layout.width, height: layout.height, fonts: coverFonts(ROOT) });
  return sharp(new Resvg(svg).render().asPng()).png({ palette: true, colours: 256, dither: 0.3 }).toBuffer();
};
const write = (rel, bytes) => {
  if (!args.commit) return;
  mkdirSync(join(ROOT, dirname(rel)), { recursive: true });
  writeFileSync(join(ROOT, rel), bytes);
};
const brand = await loadVideoBrand(ROOT);
const results = [];

// 表紙: 見出しと人物は spec から描き直し（採用済み画像は使わない）、ロゴを重ねる
const designPath = join(packDir, 'cover-design.json');
if (existsSync(designPath)) {
  const design = validateCoverDesign(JSON.parse(readFileSync(designPath, 'utf8')), { exam: EXAM_TO_PALETTE[exam] });
  for (const [key, spec] of Object.entries(design.covers ?? {})) {
    const { approvedImage: _previous, ...fresh } = spec;
    const layout = COVER_FORMATS[spec.format];
    const raw = (await renderYoutubeCover(ROOT, fresh)).buffer;
    const png = await render(brandedCoverNode(raw, layout, brand.logo), layout);
    if (png.length > 2 * 1024 * 1024) throw new Error(`${key}: 表紙が YouTube の上限 2MB を超える`);
    const rel = `.tmp/video-render/youtube-covers-${exam}/${packId}-${key}.png`;
    write(rel, png);
    spec.approvedImage = { path: rel, sha256: hash(png), specSha256: coverInputDigest(spec) };
    results.push({ kind: 'cover', key, path: rel, bytes: png.length });
  }
  if (args.commit) writeFileSync(designPath, JSON.stringify(design, null, 2) + '\n');
}

// 締め: storyboard の cta 場面の見出しと補足を、ブランドの背景・ロゴ・先生に載せる
const scene = JSON.parse(readFileSync(join(packDir, 'storyboard.json'), 'utf8')).scenes.find((s) => s.sceneId === 'cta');
if (!scene?.visual?.heading) throw new Error('storyboard に cta 場面（visual.heading）がない');
const cta = await render(brandedCtaNode(scene, brand), { width: 1920, height: 1080 });
const ctaRel = `.tmp/video-render/youtube-cta-${exam}/${packId}-longform.png`;
write(ctaRel, cta);
const ctaPath = join(packDir, 'cta-design.json');
const previous = existsSync(ctaPath) ? JSON.parse(readFileSync(ctaPath, 'utf8')) : {};
if (args.commit) {
  writeFileSync(ctaPath, JSON.stringify({ ...previous, schemaVersion: 1, design: brand.config.design,
    longform: { path: ctaRel, sha256: hash(cta) } }, null, 2) + '\n');
}
results.push({ kind: 'cta', key: 'longform', path: ctaRel, bytes: cta.length });

console.log(JSON.stringify({ mode: args.commit ? 'write' : 'dry-run', pack: `${exam}/${packId}`, results }, null, 2));
if (!args.commit) console.log('dry-run（画像と design json は書いていない）。書くときは --commit');
