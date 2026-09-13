import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { coverFonts } from './youtube-cover.mjs';
import { renderCharacterFrame } from './character-framing.mjs';
import { readVerifiedVideoPng } from './youtube-approved-cover.mjs';
import { renderYoutubeCover } from './youtube-cover.mjs';
import { resolveExam } from '../../.claude/scripts/sns/lib/exam-palette.mjs';

export const IG_DESIGN = 'bridge-notebook-a-v1';
export const IG_CTA_NARRATION = 'フォローして、試験対策を続けましょう。詳しい解説はプロフィールのリンクからご覧ください。';
export function instagramRendererDigest(root, type) {
  const files = ['scripts/lib/instagram-video-design.mjs', 'scripts/lib/video-explanation.mjs',
    '.claude/config/video-brand.json', '.claude/config/character-poses.json',
    type === 'carousel' ? 'scripts/render-instagram-video-pack-carousels.mjs' : 'scripts/render-instagram-video-pack-reels.mjs'];
  if (type === 'reel') files.push('scripts/lib/video-narration-cache.mjs', 'scripts/lib/video-subtitles.mjs', '.claude/scripts/lib/sns-common/reading-dict.mjs');
  return createHash('sha256').update(Buffer.concat(files.map(p => readFileSync(join(root, p))))).digest('hex');
}
const C = { ink: '#0F2742', blue: '#1858B5', paper: '#FFFFFF', yellow: '#FFC53D', light: '#F1F6FC' };
const FONT = "'NotoSansJP', 'Noto Sans JP'";
const box = (style, children = []) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const text = (value, style = {}) => box({ fontFamily: FONT, fontWeight: 700, color: C.ink, ...style }, value);
const img = (buffer, style) => ({ type: 'img', props: { src: `data:image/png;base64,${buffer.toString('base64')}`, style } });

export async function instagramLogo(root) {
  const config = JSON.parse(readFileSync(join(root, '.claude/config/video-brand.json')));
  return readVerifiedVideoPng(root, config.logo, config.logo);
}

/** Reposition the approved logo into the portrait safe area; keep the approved headline and character. */
export async function instagramReelCover(root, spec, logo, headline) {
  if (headline) {
    if (!Array.isArray(headline) || headline.length < 2 || headline.length > 3 || headline.some(line => typeof line !== 'string' || !line.trim() || [...line].length > 8)) throw new Error('Reelの改訂表紙は2〜3行・各8字以内');
    const character = await renderCharacterFrame(root, { ...spec.character, width: 0 });
    const scale = Math.min(1, 440 / character.width, 540 / character.height);
    const width = Math.round(character.width * scale), height = Math.round(character.height * scale);
    const node = box({ width: 1080, height: 1920, background: C.ink, position: 'relative' }, [
      box({ position: 'absolute', left: 0, top: 0, width: 1080, height: 12, background: C.blue }),
      text(resolveExam(spec.exam).label, { position: 'absolute', left: 64, top: 250, fontSize: 34, color: C.paper }),
      box({ position: 'absolute', left: 64, top: 365, flexDirection: 'column', gap: 16 }, headline.map((line, i) => text(line, {
        fontSize: 100, lineHeight: 1.3, fontWeight: 900, whiteSpace: 'nowrap', color: i === headline.length - 1 ? C.yellow : C.paper,
      }))),
      box({ position: 'absolute', left: 48, top: 919, width: 388, height: 151, borderRadius: 16, background: C.paper }),
      img(logo, { position: 'absolute', left: 64, top: 935, width: 356, height: 119 }),
      img(character.buffer, { position: 'absolute', left: 960 - width, top: 1535 - height, width, height }),
    ]);
    return (await renderInstagramNode(root, node, 1920)).buffer;
  }
  const { buffer } = await renderYoutubeCover(root, spec);
  const sample = await sharp(buffer).extract({ left: 20, top: 1800, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const background = { r: sample[0], g: sample[1], b: sample[2], alpha: 1 };
  const patch = await sharp({ create: { width: 460, height: 150, channels: 4, background } }).png().toBuffer();
  const mark = await sharp(logo).resize({ width: 356, height: 119 }).png().toBuffer();
  return sharp(buffer).composite([{ input: patch, left: 47, top: 1687 }, { input: mark, left: 64, top: 935 }]).png().toBuffer();
}

function wrap(value, capacity) {
  const totalUnits = [...value].reduce((n, c) => n + (/^[\x20-\x7e]$/.test(c) ? 0.6 : 1), 0);
  if (!value.includes('\n') && totalUnits > capacity) capacity = Math.min(capacity, Math.ceil(totalUnits / Math.ceil(totalUnits / capacity)));
  const out = []; let row = ''; let units = 0;
  for (const ch of value) {
    const u = /^[\x20-\x7e]$/.test(ch) ? 0.6 : 1;
    if (ch === '\n') { out.push(row); row = ''; units = 0; continue; }
    if (row && units + u > capacity) {
      if (/[、。，．！？：；）］」』]/u.test(ch) || /[（［「『]$/u.test(row)) {
        const chars = [...row], last = chars.pop(); out.push(chars.join('')); row = last; units = /^[\x20-\x7e]$/.test(last) ? 0.6 : 1;
      } else { out.push(row); row = ''; units = 0; }
    }
    row += ch; units += u;
  }
  if (row) out.push(row);
  return out;
}
function fitted(value, width, height, max, min, style = {}) {
  const lineHeight = style.lineHeight ?? 1.35;
  for (let fontSize = max; fontSize >= min; fontSize -= 2) {
    const rows = wrap(value, (width - fontSize * 0.5) / fontSize);
    if (rows.length * fontSize * lineHeight <= height) return text(rows.join('\n'), {
      width, fontSize, lineHeight, whiteSpace: 'pre', ...style,
    });
  }
  throw new Error(`Instagramの画面に入りません。文章を分割してください: ${value}`);
}
function canvas(height, children) {
  return box({ width: 1080, height, background: C.paper, position: 'relative', fontFamily: FONT }, [
    box({ position: 'absolute', left: 0, top: 0, width: 1080, height: 12, background: C.blue }), ...children,
  ]);
}
function header(label, logo, top = 62) {
  return [text(label, { position: 'absolute', left: 64, top: top + 20, fontSize: 32 }),
    img(logo, { position: 'absolute', left: 684, top, width: 332, height: 111 })];
}

export async function instagramCoverNode(root, slide, label, logo) {
  const character = await renderCharacterFrame(root, { ...slide.character, width: 0 });
  const scale = Math.min(1, 445 / character.width, 460 / character.height);
  const width = Math.round(character.width * scale), height = Math.round(character.height * scale);
  return canvas(1350, [
    ...header(label, logo),
    box({ position: 'absolute', left: 64, top: 275, flexDirection: 'column', gap: 8 },
      slide.headline.map((line, i) => text(line, { fontSize: 108, lineHeight: 1.3, fontWeight: 900, color: i === slide.headline.length - 1 ? C.blue : C.ink,
        background: i === slide.headline.length - 1 ? C.yellow : 'transparent', padding: '0 8px', whiteSpace: 'nowrap' }))),
    fitted(slide.subtitle, 500, 165, 44, 38, { position: 'absolute', left: 72, top: slide.headline.length === 3 ? 755 : 690 }),
    img(character.buffer, { position: 'absolute', left: 1030 - width, top: 1265 - height, width, height }),
    box({ position: 'absolute', left: 64, top: 1000, width: 500, flexDirection: 'column', gap: 24 }, [
      text('要点を整理して', { fontSize: 48, fontWeight: 900 }),
      text('次の一歩へ', { fontSize: 64, fontWeight: 900, color: C.blue }),
      text('スワイプして確認 →', { fontSize: 34, marginTop: 32 }),
    ]),
  ]);
}

export function instagramPointNode(slide, label, logo, index, total) {
  if (!slide.items?.length || slide.items.length > 3) throw new Error('pointは1〜3項目に分割してください');
  const cardHeight = (740 - (slide.items.length - 1) * 20) / slide.items.length;
  return canvas(1350, [
    ...header(label, logo),
    text(`${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, { position: 'absolute', left: 64, top: 226, fontSize: 32, color: C.blue }),
    fitted(slide.heading, 950, 196, 76, 64, { position: 'absolute', left: 64, top: 289, fontWeight: 900 }),
    ...slide.items.map((item, i) => box({ position: 'absolute', left: 64, top: 506 + i * (cardHeight + 20), width: 952,
      height: cardHeight, padding: 20, background: C.light, borderLeft: `8px solid ${C.blue}`, borderRadius: 16, alignItems: 'center' }, [
      fitted(item, 880, cardHeight - 40, 66, 50, { lineHeight: 1.25 }),
    ])),
    text(index === total - 1 ? '保存して、あとで復習' : '続きで確認 →', { position: 'absolute', left: 64, top: 1260, fontSize: 30, color: C.blue }),
  ]);
}

export function instagramCtaNode(logo, { reel = false } = {}) {
  const height = reel ? 1920 : 1350;
  const top = reel ? 260 : 150;
  return canvas(height, [
    img(logo, { position: 'absolute', left: reel ? 102 : 160, top, width: 760, height: 253 }),
    box({ position: 'absolute', left: 64, top: top + 340, width: reel ? 836 : 952, flexDirection: 'column', alignItems: 'center', gap: 18 }, [
      text(reel ? 'フォローして' : '保存して', { fontSize: 90, fontWeight: 900 }),
      text(reel ? '試験対策を続けよう' : '何度でも復習', { fontSize: reel ? 82 : 90, fontWeight: 900, color: C.blue }),
    ]),
    box({ position: 'absolute', left: reel ? 64 : 96, top: top + 630, width: reel ? 836 : 888, padding: '30px 28px', background: C.yellow, borderRadius: 16,
      flexDirection: 'column', alignItems: 'center', gap: 16 }, [
      text('詳しい解説は', { fontSize: 44 }),
      text('プロフィールのリンクへ', { fontSize: reel ? 58 : 62, fontWeight: 900 }),
    ]),
    text('土木・建設系資格の学びを、毎日の習慣に。', { position: 'absolute', left: 96, top: top + 895, fontSize: 36, color: C.ink }),
    ...(reel ? [text('VOICEVOX：青山龍星', { position: 'absolute', left: 96, top: 1560, fontSize: 28, color: C.ink })] : []),
  ]);
}

export async function renderInstagramNode(root, node, height) {
  const fonts = [...coverFonts(root), { name: 'Noto Sans JP', weight: 700, style: 'normal',
    data: readFileSync(join(root, '.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf')) }];
  const svg = await satori(node, { width: 1080, height, fonts });
  return { svg, buffer: new Resvg(svg).render().asPng() };
}
