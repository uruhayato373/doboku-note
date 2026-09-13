#!/usr/bin/env node
// 手書きSVGの図解カルーセルを再生成する。元図・元記事の変更は再確認を促して停止。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { figurePackLabels, FIGURE_PACK_CATEGORIES } from '../.claude/scripts/sns/lib/figure-pack-labels.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FIGURE_SLIDES = ['00-cover', '01-figure', '02-text', '03-cta'];
function inside(root, path) {
  const full = resolve(root, path), rel = relative(root, full);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('repo外の参照は禁止');
  return full;
}
export function validateFigurePack(pack, root = ROOT) {
  if (!/^(cem|civil-1|pe-construction|pe-first-stage)\/keyword-packs\/[a-z0-9-]+$/.test(pack)) throw new Error('packは資格/keyword-packs/slugで指定');
  const dir = join(root, 'content/sns/instagram', pack);
  const source = JSON.parse(readFileSync(join(dir, 'source.json'), 'utf8'));
  if (source.schemaVersion !== 1 || !source.needs || !source.nextStep) throw new Error('source.jsonの疑問・次の学習先が必要');
  const category = FIGURE_PACK_CATEGORIES[pack.split('/')[0]];
  const articleMatch = source.article?.path?.match(/^content\/site\/([a-z0-9-]+)\/([a-z0-9-]+)\/article\.mdx$/);
  if (!articleMatch || articleMatch[1] !== category) throw new Error('元記事とパックの資格が不一致');
  const figurePrefix = `content/site/${category}/${articleMatch[2]}/img/`;
  if (!source.figure?.path?.startsWith(figurePrefix) || !/^figure-[a-zA-Z0-9_-]+\.svg$/.test(source.figure.path.slice(figurePrefix.length))) throw new Error('元図は元記事のimg/figure-*.svgを指定');
  for (const key of ['article', 'figure']) {
    const item = source[key];
    if (!item?.path?.startsWith('content/site/') || !/^[a-f0-9]{64}$/.test(item.sha256 || '')) throw new Error(`source.${key}の参照が不正`);
    const bytes = readFileSync(inside(root, item.path));
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error(`元${key}が変更されています。差分と意味を確認しsource.jsonを更新してください`);
  }
  const labels = figurePackLabels(pack.split('/')[0]);
  const slides = FIGURE_SLIDES.map(name => {
    const file = join(dir, 'carousel/img', `${name}.svg`), svg = readFileSync(file, 'utf8');
    if (!/viewBox="0 0 400 500"/.test(svg) || /\{\{[^}]+\}\}/.test(svg)) throw new Error(`${name}: 寸法または未置換の文言`);
    if (name === '00-cover' && (!svg.includes(labels.exam) || !svg.includes(labels.badge))) throw new Error('表紙の資格が不一致');
    if (name === '03-cta' && !svg.includes(labels.destination)) throw new Error('CTAの資格が不一致');
    return { name, svg };
  });
  return { dir, source, slides };
}
export function renderFigurePack(pack, { root = ROOT, outDir } = {}) {
  const input = validateFigurePack(pack, root);
  // 全入力の検証とレンダーを終えてから書き込む。
  const images = input.slides.map(({ name, svg }) => ({ name, png: new Resvg(svg, {
    background: '#ffffff', fitTo: { mode: 'width', value: 1080 }, font: { loadSystemFonts: true },
  }).render().asPng() }));
  const output = outDir ? resolve(outDir) : join(input.dir, 'carousel/img');
  mkdirSync(output, { recursive: true });
  return images.map(({ name, png }) => { const file = join(output, `${name}.png`); writeFileSync(file, png); return file; });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { pack: { type: 'string' }, 'out-dir': { type: 'string' }, check: { type: 'boolean' } } });
    if (values.check) { validateFigurePack(values.pack); console.log(`${values.pack}: sourceと4枚SVGの検証OK`); }
    else console.log(renderFigurePack(values.pack, { outDir: values['out-dir'] }).join('\n'));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
