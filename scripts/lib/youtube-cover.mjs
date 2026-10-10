import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { renderCharacterFrame } from './character-framing.mjs';
import { readApprovedCover } from './youtube-approved-cover.mjs';
import { resolveExam, EXAM_KEYS } from '../../.claude/scripts/sns/lib/exam-palette.mjs';
import { readDataset } from './dataset-io.mjs';
import { qualificationShortLabel } from './qualification-names.mjs';

export const COVER_FORMATS = {
  longform: { width: 1920, height: 1080, fontSize: 138, maxChars: 8, characterBox: [1280, 180, 560, 800] },
  shorts: { width: 1080, height: 1920, fontSize: 112, maxChars: 8, characterBox: [230, 900, 570, 690] },
};
const FONT = 'NotoSansJP';
const WHITE = '#ffffff';
const ACCENT = '#FFC53D';
const BACKGROUND = '#0F2742';
const text = (children, style) => ({ type: 'div', props: { style: { display: 'flex', fontFamily: FONT, ...style }, children } });

/** Keep authored line breaks. Reject long headlines instead of shrinking/truncating. */
export function validateCoverSpec(spec) {
  const layout = Object.hasOwn(COVER_FORMATS, spec?.format) ? COVER_FORMATS[spec.format] : null;
  if (!layout) throw new Error('cover format は longform / shorts');
  if (!Array.isArray(spec.headline) || spec.headline.length < 2 || spec.headline.length > 3 ||
      spec.headline.some(line => typeof line !== 'string' || !line.trim() || /[\r\n]/.test(line) || [...line].length > layout.maxChars)) {
    throw new Error(`headline は 2〜3 行・各 ${layout.maxChars} 文字以内（縮小・省略しません）`);
  }
  if (!Number.isInteger(spec.accentLine) || spec.accentLine < 0 || spec.accentLine >= spec.headline.length) throw new Error('accentLine が範囲外');
  if (typeof spec.subtitle !== 'string' || [...spec.subtitle].length > 24 || /[\r\n]/.test(spec.subtitle)) throw new Error('subtitle は24文字以内の1行');
  if (/[\u2160-\u217f]/.test(spec.headline.join('') + spec.subtitle)) throw new Error('表紙の科目番号は ASCII の I / II / III で記載してください（使用フォントにローマ数字記号の字形がありません）');
  if (!spec.character?.pose || !spec.character?.frame) throw new Error('character の pose / frame が必要');
  if (!EXAM_KEYS.includes(spec.exam)) throw new Error('cover exam は試験パレットの正規キーを指定してください');
  if (spec.design !== undefined && spec.design !== 'pop-v2') throw new Error('未知の表紙デザインです');
  if (spec.pop && (!['explain', 'question', 'compare', 'write', 'listen', 'plan'].includes(spec.pop.variant) ||
      typeof spec.pop.authority !== 'string' || [...spec.pop.authority].length > 10)) throw new Error('POP の切り口・著者表記が不正です');
  return layout;
}

export function validateCoverDesign(design, { exam } = {}) {
  if (design?.schemaVersion !== 1 || !design.covers || typeof design.covers !== 'object' ||
      Array.isArray(design.covers) || !Object.keys(design.covers).length) throw new Error('有効な cover spec が0件、またはschemaVersionが不正です');
  for (const [key, spec] of Object.entries(design.covers)) {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error('cover key は英数字とハイフンのみ');
    validateCoverSpec(spec);
    if (exam !== undefined && spec.exam !== exam) throw new Error(`${key}: cover と動画パックの試験が不一致`);
  }
  return design;
}

const fontsByRoot = new Map();
export function coverFonts(root) {
  if (fontsByRoot.has(root)) return fontsByRoot.get(root);
  const fonts = [700, 900].map(weight => ({ name: FONT,
    data: readFileSync(join(root, `node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff`)),
    weight, style: 'normal' }));
  fontsByRoot.set(root, fonts);
  return fonts;
}

/** Authored typography + reviewed character crop. No remote assets or original image edits. */
export async function renderYoutubeCover(root, spec) {
  const layout = validateCoverSpec(spec);
  const approved = await readApprovedCover(root, spec, layout);
  if (approved) return approved;
  if (spec.design === 'pop-v2') return renderPopCover(root, spec, layout);
  const { width, height, fontSize, characterBox } = layout;
  const vertical = spec.format === 'shorts';
  const theme = resolveExam(spec.exam);
  const character = await renderCharacterFrame(root, { ...spec.character, width: 0 });
  const [bx, by, bw, bh] = characterBox;
  const scale = Math.min(1, bw / character.width, bh / character.height);
  const cw = Math.round(character.width * scale);
  const ch = Math.round(character.height * scale);
  const left = Math.round(bx + (bw - cw) / 2);
  const top = by + bh - ch;
  const x = vertical ? 80 : 100;
  const headingY = vertical ? 365 : 290;
  const node = { type: 'div', props: { style: {
    display: 'flex', position: 'relative', width, height, background: BACKGROUND, color: WHITE, fontFamily: FONT,
  }, children: [
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width, height: 22, background: theme.base } } },
    text(theme.label, { position: 'absolute', left: x, top: vertical ? 240 : 115, fontSize: vertical ? 38 : 48, fontWeight: 700 }),
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: x, top: headingY, flexDirection: 'column' }, children:
      spec.headline.map((line, index) => text(line, { fontSize, fontWeight: 900, lineHeight: 1.28,
        whiteSpace: 'nowrap', color: index === spec.accentLine ? ACCENT : WHITE })) } },
    text(spec.subtitle, { position: 'absolute', left: x, top: headingY + spec.headline.length * fontSize * 1.28 + 38,
      fontSize: vertical ? 34 : 44, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }),
    { type: 'img', props: { src: `data:image/png;base64,${character.buffer.toString('base64')}`, width: cw, height: ch,
      style: { position: 'absolute', left, top } } },
    text('doboku-note', { position: 'absolute', left: x, top: vertical ? 1590 : 955,
      fontSize: vertical ? 30 : 36, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }),
  ] } };
  const svg = await satori(node, { width, height, fonts: coverFonts(root) });
  const buffer = new Resvg(svg).render().asPng();
  return { buffer, svg, provenance: { template: 'teacher-headline-v1', spec, width, height,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    character: { pose: character.pose, frame: character.frame, sourceSha256: character.sourceSha256,
      rect: character.rect, placement: { left, top, width: cw, height: ch }, enlarged: false } } };
}

/** Editable POP lettering, qualification colour and separately reviewed teacher artwork. */
async function renderPopCover(root, spec, { width, height }) {
  const vertical = spec.format === 'shorts';
  const theme = resolveExam(spec.exam);
  const character = await renderCharacterFrame(root, { ...spec.character, width: 0 });
  const variant = spec.pop?.variant ?? 'explain';
  const x = vertical ? 72 : 96;
  const headingY = vertical ? 390 : 360;
  const fontSize = vertical ? 112 : spec.headline.length === 3 ? 112 : 136;
  const lineHeight = 1.12;
  const characterBox = vertical ? [260, 930, 630, 610] : [1248, 120, 590, 850];
  const [bx, by, bw, bh] = characterBox;
  const scale = Math.min(1, bw / character.width, bh / character.height);
  const cw = Math.round(character.width * scale), ch = Math.round(character.height * scale);
  const placement = { left: Math.round(bx + (bw - cw) / 2), top: by + bh - ch, width: cw, height: ch };
  const qual = theme.qualification.startsWith('pe-')
    ? qualificationShortLabel(readDataset(root, 'config.qualification-registry'), theme.qualification) : theme.short;
  const outlined = { fontWeight: 900, whiteSpace: 'nowrap', lineHeight: 1.1,
    textShadow: `4px 5px 0 ${theme.deep}` };
  const blocks = [
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width, height,
      background: `linear-gradient(140deg, ${theme.deep} 0%, ${theme.base} 50%, ${theme.soft} 100%)` } } },
    ...[0, 1, 2, 3].map(i => ({ type: 'div', props: { style: { display: 'flex', position: 'absolute',
      left: width * 0.52 + i * 125, top: -300, width: 52, height: height + 800,
      transform: 'rotate(36deg)', background: i === 1 ? '#FFE600' : 'rgba(255,255,255,.13)' } } })),
    text(qual, { ...outlined, position: 'absolute', left: x, top: vertical ? 210 : 105,
      fontSize: vertical ? 112 : [...qual].length > 6 ? 128 : 184, color: WHITE }),
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: x, top: vertical ? 347 : 294,
      width: vertical ? 740 : 1060, height: 15, transform: 'rotate(-2deg)', background: '#FFE600' } } },
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: 0, top: headingY - 24,
      width: vertical ? width : 1250, height: spec.headline.length * fontSize * lineHeight + 62,
      background: 'rgba(255,255,255,.97)', transform: 'rotate(-1deg)' } } },
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: x, top: headingY,
      flexDirection: 'column' }, children: spec.headline.map((line, i) => text(line, {
      fontSize, fontWeight: 900, lineHeight, whiteSpace: 'nowrap',
      color: i === spec.accentLine ? (variant === 'question' || variant === 'write' ? '#D50B17' : theme.deep) : theme.deep,
      textShadow: i === spec.accentLine ? '3px 4px 0 #FFE600' : '2px 3px 0 rgba(0,0,0,.08)',
    })) } },
  ];
  if (spec.subtitle) blocks.push(text(spec.subtitle, { position: 'absolute', left: x,
    top: headingY + spec.headline.length * fontSize * lineHeight + 68,
    maxWidth: vertical ? 890 : 1110, fontSize: vertical ? 34 : 44, fontWeight: 900,
    padding: '8px 14px', color: theme.deep, background: WHITE, whiteSpace: 'nowrap' }));
  blocks.push(
    { type: 'div', props: { style: { display: 'flex', position: 'absolute', left: x,
      top: vertical ? 1570 : 920, width: vertical ? 755 : 1060, height: vertical ? 100 : 110,
      background: '#FFE600', transform: 'rotate(-2deg)' } } },
    text(spec.pop?.authority ?? '総監が制作', { position: 'absolute', left: x + 30,
      top: vertical ? 1578 : 932, fontSize: vertical ? 64 : 80, fontWeight: 900, color: theme.deep, whiteSpace: 'nowrap' }),
    { type: 'img', props: { src: `data:image/png;base64,${character.buffer.toString('base64')}`,
      width: cw, height: ch, style: { position: 'absolute', ...placement } } },
  );
  const svg = await satori({ type: 'div', props: { style: { display: 'flex', position: 'relative',
    width, height, fontFamily: FONT, color: WHITE }, children: blocks } }, { width, height, fonts: coverFonts(root) });
  const buffer = new Resvg(svg).render().asPng();
  return { buffer, svg, provenance: { template: 'character-pop-v2', spec, width, height,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    character: { pose: character.pose, frame: character.frame, sourceSha256: character.sourceSha256,
      rect: character.rect, placement, enlarged: false }, variant } };
}
