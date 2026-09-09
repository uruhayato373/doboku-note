import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readVerifiedVideoPng } from './youtube-approved-cover.mjs';

const img = (buffer, style) => ({ type: 'img', props: { src: `data:image/png;base64,${buffer.toString('base64')}`, style } });
const box = (children, style) => ({ type: 'div', props: { style: { display: 'flex', position: 'absolute', ...style }, children } });
const text = (children, style) => box(children, { fontFamily: 'NotoSansJP', fontWeight: 900, color: '#0F2742', ...style });

export async function loadVideoBrand(root) {
  const config = JSON.parse(readFileSync(join(root, '.claude/config/video-brand.json')));
  if (config.schemaVersion !== 1 || config.design !== 'bridge-notebook-a') throw new Error('Unknown video brand');
  return { config, logo: await readVerifiedVideoPng(root, config.logo, config.logo),
    background: await readVerifiedVideoPng(root, config.longformBackground, config.longformBackground) };
}

/** Native video layout: preserve the reviewed background and add the reusable logo component. */
export function brandedCoverNode(buffer, { width, height }, logo) {
  const portrait = height > width;
  const badge = portrait ? { left: 52, top: 1692, width: 450, height: 140 } : { left: 1490, top: 66, width: 386, height: 122 };
  return box([img(buffer, { position: 'absolute', width, height }),
    box(img(logo, { width: badge.width - 28, height: (badge.width - 28) / 3 }),
      { ...badge, borderRadius: 22, background: '#fff', alignItems: 'center', justifyContent: 'center' }),
  ], { position: 'relative', width, height });
}

export function brandedCtaNode(scene, brand) {
  const heading = scene.visual.heading;
  const preferred = ['をもっと', 'で確認', 'を確認', 'で仕上げ', 'で覚え', 'をまとめて', 'で練習', 'を練習', 'から', 'で基準', 'で対策', 'で備え', 'を型に', 'を具体的に', 'を過去問で'];
  const candidates = preferred.map(word => heading.indexOf(word)).filter(i => i >= 4 && i <= 11 && heading.length - i <= 11);
  const split = candidates[0] ?? Math.ceil([...heading].length / 2);
  const lines = [...heading].length > 9 ? [[...heading].slice(0, split).join(''), [...heading].slice(split).join('')] : [heading];
  const fontSize = Math.min(102, Math.floor(890 / Math.max(...lines.map(line => [...line].length))));
  const subtitle = (scene.visual.items ?? []).join('／').replace(/[（(]概要欄リンク[）)]/g, '').trim();
  return box([
    img(brand.background, { position: 'absolute', width: 1920, height: 1080 }),
    img(brand.logo, { position: 'absolute', left: 66, top: 12, width: 1010, height: 337 }),
    box(lines.map((line, i) => text(line, { position: 'relative', fontSize, lineHeight: 1.35,
      color: i === 0 ? '#1858B5' : '#0F2742', whiteSpace: 'nowrap' })),
      { left: 76, top: 340, width: 920, flexDirection: 'column' }),
    text(subtitle, { left: 80, top: 665, width: 875, fontSize: subtitle.length > 21 ? 38 : 44, lineHeight: 1.35 }),
    box(text('概要欄のリンクへ ↓', { position: 'relative', fontSize: 70, whiteSpace: 'nowrap' }),
      { left: 70, top: 795, width: 956, height: 120, background: '#FFC53D', alignItems: 'center', justifyContent: 'center' }),
  ], { position: 'relative', width: 1920, height: 1080 });
}
