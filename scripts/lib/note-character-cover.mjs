import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import satori from 'satori';
import sharp from 'sharp';
import opentype from '@shuding/opentype.js';
import { renderCharacterFrame } from './character-framing.mjs';

export const NOTE_CHARACTER_CANVAS = { width: 1280, height: 670 };
const HEADLINE = { x: 345, y: 239, width: 394, height: 196 };
const CORE = { x: 325, y: 227, width: 630, height: 216 };
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const contexts = new Map();

export function resolveCoverExam(path, tokens) {
  const segments = path.replaceAll('\\', '/').split('/');
  for (const [key, value] of Object.entries(tokens.exams)) {
    if (key !== 'civil-1-2' && value?.dir && segments.includes(value.dir)) return key;
  }
  if (segments.includes(tokens.exams['civil-1-2']?.dir)) return 'civil-1-2';
  // 未知 dir は無言でフォールバックしない（2026-08-18 に技術士一次が総監色で 1 か月超出荷された事故の再発防止）。
  const known = Object.values(tokens.exams).filter((exam) => exam?.dir).map((exam) => exam.dir).join(' / ');
  throw new Error(`カバーの試験区分を解決できません: ${path}（note-cover-tokens.json の exams に dir を追加する。既知: ${known}）`);
}

export function coverCopy({ cover = {}, coverTitle, title, magazine = false, lines, category = '' }) {
  const fallback = (Array.isArray(coverTitle) ? coverTitle : coverTitle ? [coverTitle] : lines || [title])
    .map(clean).filter(Boolean);
  const headline = clean(magazine ? cover.magazineName : cover.headline) || fallback[fallback.length > 1 ? 1 : 0];
  if (!headline) throw new Error('主見出しがありません');
  return {
    headline,
    lead: clean(magazine ? cover.qualifier : cover.leadIn) || (fallback.length > 1 ? fallback[0] : category),
    proof: clean(magazine ? cover.proof : [cover.hi, cover.hiSuffix].filter(Boolean).join(' ')) || fallback[2] || '',
    benefit: clean(cover.benefit) || fallback.slice(3).join(' '),
  };
}

export function coverPoseCandidates(input) {
  if (input.cover?.character) return { poses: [input.cover.character], reason: '原稿指定' };
  const copy = coverCopy(input);
  const topic = [input.title, copy.headline, copy.lead, copy.proof].filter(Boolean).join(' ');
  if (/\b(?:AI|DX|ICT|BIM|CIM|ChatGPT)\b|生成AI|データ活用|デジタル/i.test(topic)) {
    return { poses: ['pc-work'], reason: 'AI・デジタル活用' };
  }
  if (/合格体験|合格記|合格報告|合格しました/.test(topic)) return { poses: ['congrats'], reason: '合格体験・報告' };
  if (/もくじ|目次|サイトマップ|はじめに|自己紹介|会員案内|メンバーシップ案内/.test(topic)) {
    return { poses: ['wave', 'smile'], reason: '案内・導入' };
  }
  if (/精読|暗記|勉強法|学習法|学習計画|学習習慣|独学|テキスト/.test(topic)) {
    return { poses: ['reading', 'thinking', 'smile'], reason: '精読・学習法' };
  }
  if (/過去問|予想|演習|模擬|お題|問題集|想定問答|口頭試験/.test(topic)) {
    return { poses: ['thinking', 'pointing', 'reading'], reason: '問題演習・問いかけ' };
  }
  if (input.magazine) return { poses: ['good-sign', 'explaining', 'reading', 'smile'], reason: '教材セットの案内' };
  if (/注意|失敗|間違|落とし穴|\bNG\b/.test(topic)) return { poses: ['pointing', 'thinking'], reason: '注意点・振り返り' };
  if (/模範|完成答案|記述|論文|解答|答案|テンプレ|施工経験/.test(topic)) {
    return { poses: ['reading', 'explaining', 'pointing', 'thinking'], reason: '答案・書き方の解説' };
  }
  return { poses: ['explaining', 'pointing', 'reading'], reason: '知識・要点の解説' };
}

function selectPose(input, key, previousPose) {
  const { poses, reason } = coverPoseCandidates(input);
  const choices = poses.length > 1 ? poses.filter(pose => pose !== previousPose) : poses;
  const index = createHash('sha256').update(key).digest().readUInt32BE(0) % choices.length;
  return { pose: choices[index], reason };
}

// Assign the full inventory before filtering so individual rerenders keep their pose.
export function assignCoverPoses(targets) {
  const previous = new Map();
  return targets.map(target => {
    const group = `${target.kind}/${target.input.examKey}`;
    const poseSelection = selectPose(target.input, target.key, previous.get(group));
    previous.set(group, poseSelection.pose);
    return { ...target, input: { ...target.input, poseSelection } };
  });
}

/** 補足行のフォントサイズ。max から幅に収まるまで縮め、18px 未満になる文言は失敗（省略しない）。 */
export function fittedSize(text, max, width, measure) {
  const size = Math.min(max, Math.floor(width / (measure(text, 1) || 1)));
  if (text && size < 18) throw new Error(`補足が長すぎます（省略せず要編集）: ${text}`);
  return size;
}

// 描画と同じ実測で、主見出し・リード・補足・訴求帯が枠に入るかだけを検査する（PNG は作らない）。
// check-note-cover-fit（pre-commit）が原稿の cover: を生成前に止めるために使う。
export function coverFitIssues(root, input) {
  const ctx = context(root);
  const measure = (text, size) => ctx.font.getAdvanceWidth(text, size);
  const errors = [];
  let copy;
  try { copy = coverCopy(input); } catch (error) { return [error.message]; }
  try { headlineLayout(copy.headline, measure); } catch (error) { errors.push(error.message); }
  for (const [label, text, max, width] of [['lead', copy.lead, ...LEAD_FIT], ['proof', copy.proof, ...PROOF_FIT], ['benefit', copy.benefit, ...BENEFIT_FIT]]) {
    try { fittedSize(text, max, width, measure); } catch (error) { errors.push(`${label}: ${error.message}`); }
  }
  return errors;
}

const LEAD_FIT = [28, 584];
const PROOF_FIT = [32, 388];
const BENEFIT_FIT = [26, 554];

function context(root) {
  if (contexts.has(root)) return contexts.get(root);
  const dir = join(root, '.claude/skills/conversion/ogp-create/assets/fonts');
  const noto = readFileSync(join(dir, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(dir, 'Inter-Bold.ttf'));
  const font = opentype.parse(noto.buffer.slice(noto.byteOffset, noto.byteOffset + noto.byteLength));
  const value = { font, fonts: [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ], characters: new Map(), backgrounds: new Map() };
  contexts.set(root, value);
  return value;
}

// Use the actual font's advances, keeping every character. Prefer Japanese word boundaries.
export function headlineLayout(text, measure) {
  const chars = Array.from(clean(text));
  const boundaries = new Set();
  for (const part of new Intl.Segmenter('ja', { granularity: 'word' }).segment(chars.join(''))) {
    boundaries.add(Array.from(text.slice(0, part.index + part.segment.length)).length);
  }
  for (const size of [96, 90, 84, 78, 72, 66, 60, 54, 48]) {
    const maxLines = Math.min(3, Math.floor(HEADLINE.height / (size * 1.04)));
    const memo = new Map();
    const solve = (start, remaining) => {
      if (start === chars.length) return { lines: [], score: 0 };
      if (!remaining) return null;
      const key = `${start}/${remaining}`;
      if (memo.has(key)) return memo.get(key);
      let best = null;
      for (let end = start + 1; end <= chars.length; end++) {
        const line = chars.slice(start, end).join('').trim();
        const width = measure(line, size);
        if (width + 3 > HEADLINE.width) break;
        if (/^[、。，．）)】」』]/u.test(chars[end] || '') || /[（(【「『]$/u.test(line)) continue;
        const rest = solve(end, remaining - 1);
        if (!rest) continue;
        const insideLatin = /[A-Za-z0-9]/.test(chars[end - 1] || '') && /[A-Za-z0-9]/.test(chars[end] || '');
        const score = rest.score + Math.pow((HEADLINE.width - width) / HEADLINE.width, 2)
          + (end < chars.length && !boundaries.has(end) ? .2 : 0) + (insideLatin ? 8 : 0);
        if (!best || score < best.score) best = { lines: [line, ...rest.lines], score };
      }
      memo.set(key, best);
      return best;
    };
    const found = solve(0, maxLines);
    if (found) return { lines: found.lines, size, lineHeight: size * 1.04,
      widths: found.lines.map(line => measure(line, size)), box: HEADLINE };
  }
  throw new Error(`主見出しが安全領域に入りません（省略せず要編集）: ${text}`);
}

const div = (style, children = [], props = {}) => ({ type: 'div', props: { ...props, style: { display: 'flex', ...style }, children } });
const at = (x, y, width, height, children, style = {}, props = {}) => div({ position: 'absolute', left: x, top: y, width, height, ...style }, children, props);
const textNode = (text, size, color, style = {}, role) => div({ fontSize: size, color, lineHeight: 1.1, whiteSpace: 'nowrap', ...style }, text, role ? { 'data-cover-role': role } : {});

export async function renderNoteCharacterCover(root, input) {
  const ctx = context(root);
  const measure = (text, size) => ctx.font.getAdvanceWidth(text, size);
  const copy = coverCopy(input);
  const layout = headlineLayout(copy.headline, measure);
  const palette = input.palette;
  const dark = Boolean(input.magazine);
  const band = palette.band;
  const ink = dark ? '#ffffff' : '#102B49';
  const selection = input.cover?.character ? { pose: input.cover.character, reason: '原稿指定' }
    : input.poseSelection || selectPose(input, input.title || copy.headline);
  const { pose } = selection;
  if (!ctx.characters.has(pose)) ctx.characters.set(pose, renderCharacterFrame(root, { pose, frame: 'waist', width: 280 }));
  const character = await ctx.characters.get(pose);
  const characterSrc = `data:image/png;base64,${character.buffer.toString('base64')}`;
  const characterScale = Math.min(1, 330 / character.height);
  const characterBox = { width: Math.round(character.width * characterScale), height: Math.round(character.height * characterScale) };
  characterBox.left = 750 + Math.round((280 - characterBox.width) / 2);
  characterBox.top = 172;
  const alias = input.examKey === 'civil-1-2' ? 'civil-1' : input.examKey;
  if (!ctx.backgrounds.has(alias)) {
    let src = null;
    for (const ext of ['png', 'webp', 'jpg']) {
      const path = join(root, `.claude/config/ogp/backgrounds/${alias}.${ext}`);
      if (!existsSync(path)) continue;
      const buffer = await sharp(path).resize({ width: 1280, height: 670, fit: 'cover' }).png().toBuffer();
      src = `data:image/png;base64,${buffer.toString('base64')}`; break;
    }
    ctx.backgrounds.set(alias, src);
  }
  const background = ctx.backgrounds.get(alias);
  const fitted = (text, max, width) => fittedSize(text, max, width, measure);
  const linesTop = HEADLINE.y + (HEADLINE.height - layout.lines.length * layout.lineHeight) / 2;
  const children = [
    at(0, 0, 1280, 670, [], { background: dark ? `linear-gradient(130deg, ${band}, #0f172b)` : 'linear-gradient(130deg, #f7fbff, #eaf2fa)' }),
    ...(background ? [{ type: 'img', props: { src: background, width: 1280, height: 670, style: { position: 'absolute', left: 0, top: 0, opacity: dark ? .13 : .45 } } }] : []),
    at(278, 0, 746, 670, [], { background: dark ? `linear-gradient(90deg, ${band}00, ${band}dd 15%, ${band}ee 70%, ${band}00)` : 'linear-gradient(90deg, #ffffff00, #f8fbfff5 15%, #f8fbfff5 75%, #ffffff00)' }),
    at(345, 45, 590, 35, textNode('doboku-note', 24, ink, { fontFamily: 'Inter' })),
    at(345, 128, 590, 45, textNode(copy.lead, fitted(copy.lead, ...LEAD_FIT), dark ? '#f6e2b4' : band), { alignItems: 'center' }),
    { type: 'img', props: { src: characterSrc, width: characterBox.width, height: characterBox.height,
      style: { position: 'absolute', left: characterBox.left, top: characterBox.top } } },
    ...layout.lines.map((line, i) => at(HEADLINE.x, linesTop + i * layout.lineHeight, HEADLINE.width, layout.lineHeight,
      textNode(line, layout.size, dark && i === layout.lines.length - 1 ? '#FFD266' : ink,
        { lineHeight: 1.04, WebkitTextStrokeWidth: layout.size / 85, WebkitTextStrokeColor: dark && i === layout.lines.length - 1 ? '#FFD266' : ink }, `headline-${i}`))),
    at(345, 437, 394, 5, [], { background: '#E8B640' }),
    ...(copy.proof ? [at(345, 454, 394, 40, textNode(copy.proof, fitted(copy.proof, ...PROOF_FIT), dark ? '#ffe2a2' : band), { alignItems: 'center' })] : []),
    ...(copy.benefit ? [at(345, 510, 590, 52, textNode(copy.benefit, fitted(copy.benefit, ...BENEFIT_FIT), dark ? '#28364a' : '#ffffff'),
      { alignItems: 'center', justifyContent: 'center', background: dark ? '#F2CB74' : band, borderRadius: 9 })] : []),
  ];
  const nodes = [];
  const svg = await satori(div({ width: 1280, height: 670, position: 'relative', fontFamily: 'Noto Sans JP', fontWeight: 700 }, children),
    { ...NOTE_CHARACTER_CANVAS, fonts: ctx.fonts, onNodeDetected: node => { if (node.props?.['data-cover-role']) nodes.push(node); } });
  const errors = [];
  for (const node of nodes) {
    if (node.left < CORE.x || node.top < CORE.y || node.left + node.width > CORE.x + CORE.width || node.top + node.height > CORE.y + CORE.height) {
      errors.push(`主見出しの実描画枠がcore-safe外: ${node.props['data-cover-role']}`);
    }
  }
  if (nodes.length !== layout.lines.length) errors.push('主見出しの実描画枠を取得できません');
  if (errors.length) throw new Error(errors.join(' / '));
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, copy, layout, pose, poseReason: selection.reason, characterBox, sourceSha256: character.sourceSha256,
    measuredHeadlineNodes: nodes.map(({ left, top, width, height }) => ({ left, top, width, height })) };
}
