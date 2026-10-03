import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import satori from 'satori';
import sharp from 'sharp';
import opentype from '@shuding/opentype.js';
import { renderCharacterFrame } from './character-framing.mjs';
import { loadRegistry, qualificationBadgeLabel, qualificationLabel, qualificationShortLabel } from './qualification-registry.mjs';
import { REPO_ROOT } from './repository-paths.mjs';

let namesSource = null;

/**
 * カバーの試験区分キー（note-cover-tokens.json の exams のキー: civil-1 など）の名前。名前はトークンに書かず、
 * トークンの qualification:（registry の資格 id か group id）から registry で引く。資格でないキー（common）はトークンの名前。
 * @returns {{ label: string, short: string, badge: string } | null}
 */
export function coverExamNames(examKey, { registry, tokens } = {}) {
  if (!registry || !tokens) {
    namesSource ??= {
      registry: loadRegistry(REPO_ROOT),
      tokens: JSON.parse(readFileSync(join(REPO_ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'), 'utf8')),
    };
    ({ registry = namesSource.registry, tokens = namesSource.tokens } = { registry, tokens });
  }
  const token = tokens.exams?.[examKey];
  if (!token) return null;
  if (!token.qualification) return { label: token.label ?? examKey, short: token.short ?? token.label ?? examKey, badge: token.short ?? token.label ?? examKey };
  return { label: qualificationLabel(registry, token.qualification), short: qualificationShortLabel(registry, token.qualification), badge: qualificationBadgeLabel(registry, token.qualification) };
}

export const NOTE_CHARACTER_CANVAS = { width: 1280, height: 670 };
// 記事は明るい左寄せPOP、マガジンは資格名・商品名を強調する濃色POPで描く。
// 主要文字は左右45px・上下15pxの内側へ置き、人物は右端の補助要素として狭いカードでは切れてよい。
const POP_LAYOUT = {
  safe: { x: 45, y: 15, width: 1190, height: 640 },
  textX: 90, textWidth: 760,
  headline: { x: 90, y: 155, width: 790, height: 196 },
  character: { left: 900, width: 320, maxHeight: 555 },
  lead: 45, proof: 43, benefit: 31,
};
export const COVER_LAYOUTS = {
  article: POP_LAYOUT,
  magazine: {
    safe: POP_LAYOUT.safe,
    textX: 185,
    textWidth: 700,
    character: { left: 910, width: 330, maxHeight: 490 },
  },
};
export const coverLayout = input => COVER_LAYOUTS[input?.magazine ? 'magazine' : 'article'];
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
  if (input.magazine) {
    try { magazineTypography(magazineDisplayCopy(input, copy), measure); } catch (error) { errors.push(error.message); }
    return errors;
  }
  const L = coverLayout(input);
  try { headlineLayout(copy.headline, measure, L.headline); } catch (error) { errors.push(error.message); }
  for (const [label, text, max, width] of [['lead', copy.lead, ...leadFit(L)], ['proof', copy.proof, ...proofFit(L)], ['benefit', copy.benefit, ...benefitFit(L)]]) {
    try { fittedSize(text, max, width, measure); } catch (error) { errors.push(`${label}: ${error.message}`); }
  }
  return errors;
}

const leadFit = L => [L.lead, L.textWidth];
const proofFit = L => [L.proof, L.textWidth];
const benefitFit = L => [L.benefit, L.textWidth - 36];

function context(root) {
  if (contexts.has(root)) return contexts.get(root);
  const dir = join(root, '.claude/skills/conversion/ogp-create/assets/fonts');
  const noto = readFileSync(join(dir, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(dir, 'Inter-Bold.ttf'));
  const font = opentype.parse(noto.buffer.slice(noto.byteOffset, noto.byteOffset + noto.byteLength));
  const value = { font, fonts: [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ], characters: new Map() };
  contexts.set(root, value);
  return value;
}

// Use the actual font's advances, keeping every character. Prefer Japanese word boundaries.
export function headlineLayout(text, measure, HEADLINE = COVER_LAYOUTS.article.headline) {
  const chars = Array.from(clean(text));
  const boundaries = new Set();
  for (const part of new Intl.Segmenter('ja', { granularity: 'word' }).segment(chars.join(''))) {
    boundaries.add(Array.from(text.slice(0, part.index + part.segment.length)).length);
  }
  let best = null;
  for (const size of [100, 96, 90, 84, 78, 72, 66, 60, 54, 48]) {
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
    // 大きさだけで選ぶと、1 行で入る見出しまで大きい字で折り返す（「管理技術／者の要件」）。
    // 行が 1 つ増えるごとに 15% 小さい字と同等に扱い、折り返しの少ない方を選ぶ。
    const rank = found && size * Math.pow(0.85, found.lines.length - 1);
    if (found && (!best || rank > best.rank)) best = { rank, lines: found.lines, size, lineHeight: size * 1.04,
      widths: found.lines.map(line => measure(line, size)), box: HEADLINE };
  }
  if (best) { const { rank, ...layout } = best; return layout; }
  throw new Error(`主見出しが安全領域に入りません（省略せず要編集）: ${text}`);
}

const div = (style, children = [], props = {}) => ({ type: 'div', props: { ...props, style: { display: 'flex', ...style }, children } });
const at = (x, y, width, height, children, style = {}, props = {}) => div({ position: 'absolute', left: x, top: y, width, height, ...style }, children, props);
const textNode = (text, size, color, style = {}, role) => div({ fontSize: size, color, lineHeight: 1.1, whiteSpace: 'nowrap', ...style }, text, role ? { 'data-cover-role': role } : {});

export function magazineDisplayCopy(input, copy = coverCopy(input)) {
  // マガジンカバーの資格名は registry の短い名前（トークンの qualification: から引く）
  const qualification = coverExamNames(input.examKey)?.short;
  if (!qualification) throw new Error(`マガジンの資格名が未定義: ${input.examKey}`);
  let title = copy.headline;
  let proof = copy.proof;
  const pack = title.match(/^(.+?)（(必須科目I＋.+)）$/u);
  if (pack && /合格パック/.test(copy.lead)) { title = `${pack[1]} 合格パック`; proof = pack[2]; }
  else if (title === 'まるごとパック' && /(?:二次|第2次)検定/.test(copy.lead)) title = '二次検定まるごとパック';
  return { qualification, title, proof, authority: input.palette?.authority ? `${input.palette.authority}が作成` : '技術士（総監）が作成' };
}

function magazineSize(text, max, min, width, measure) {
  const size = Math.min(max, Math.floor(width / (measure(text, 1) || 1)));
  if (size < min) throw new Error(`マガジンの文言が表示幅に収まりません: ${text}`);
  return size;
}

function magazineTypography(copy, measure) {
  return {
    qualification: magazineSize(copy.qualification, 116, 52, 700, measure),
    title: magazineSize(copy.title, 86, 38, 700, measure),
    proof: copy.proof ? magazineSize(copy.proof, 36, 26, 690, measure) : null,
  };
}

async function renderMagazineCharacterCover(root, input) {
  const ctx = context(root);
  const measure = (text, size) => ctx.font.getAdvanceWidth(text, size);
  const copy = magazineDisplayCopy(input);
  const typography = magazineTypography(copy, measure);
  const L = COVER_LAYOUTS.magazine;
  const band = input.palette.band;
  const selection = input.cover?.character ? { pose: input.cover.character, reason: '原稿指定' }
    : input.poseSelection || selectPose(input, input.title || copy.title);
  const { pose } = selection;
  const frameKey = `${pose}/${L.character.width}`;
  if (!ctx.characters.has(frameKey)) ctx.characters.set(frameKey, renderCharacterFrame(root, { pose, frame: 'waist', width: L.character.width }));
  const character = await ctx.characters.get(frameKey);
  const scale = Math.min(1, L.character.maxHeight / character.height);
  const characterBox = { width: Math.round(character.width * scale), height: Math.round(character.height * scale) };
  characterBox.left = L.character.left + Math.round((L.character.width - characterBox.width) / 2);
  characterBox.top = 620 - characterBox.height;
  const authorityWidth = Math.ceil(measure(copy.authority, 37) + 60);
  const children = [
    at(0, 0, 1280, 670, [], { background: band }),
    at(24, 24, 1232, 622, [], { border: '4px solid #f4d36b', borderRadius: 18 }),
    at(185, 100, authorityWidth, 68, textNode(copy.authority, 37, band, {}, 'authority'),
      { alignItems: 'center', justifyContent: 'center', background: '#f4d36b', borderRadius: 8 }),
    at(185, 209, 700, 128, textNode(copy.qualification, typography.qualification, '#f4d36b', {}, 'qualification'), { alignItems: 'center' }),
    at(185, 347, 700, 92, textNode(copy.title, typography.title, '#ffffff', {}, 'title'), { alignItems: 'center' }),
    ...(copy.proof ? [
      at(185, 469, 690, 84, [], { borderTop: '3px solid #f4d36b', borderBottom: '3px solid #f4d36b' }),
      at(185, 486, 690, 50, textNode(copy.proof, typography.proof, '#ffffff', {}, 'proof'), { alignItems: 'center' }),
    ] : []),
    { type: 'img', props: { src: `data:image/png;base64,${character.buffer.toString('base64')}`,
      width: characterBox.width, height: characterBox.height,
      style: { position: 'absolute', left: characterBox.left, top: characterBox.top } } },
  ];
  const nodes = [];
  const svg = await satori(div({ width: 1280, height: 670, position: 'relative', fontFamily: 'Noto Sans JP', fontWeight: 700 }, children),
    { ...NOTE_CHARACTER_CANVAS, fonts: ctx.fonts, onNodeDetected: node => { if (node.props?.['data-cover-role']) nodes.push(node); } });
  const errors = [];
  for (const node of nodes) {
    if (node.left < L.safe.x || node.top < L.safe.y || node.left + node.width > L.safe.x + L.safe.width || node.top + node.height > L.safe.y + L.safe.height)
      errors.push(`文字の実描画枠が安全域外: ${node.props['data-cover-role']}`);
    if (node.props['data-cover-role'] !== 'authority' && node.left + node.width > characterBox.left)
      errors.push(`文字と人物が重なります: ${node.props['data-cover-role']}`);
  }
  if (nodes.length !== (copy.proof ? 4 : 3)) errors.push('マガジンの文字枠を取得できません');
  if (errors.length) throw new Error(errors.join(' / '));
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, copy, typography, pose, poseReason: selection.reason, characterBox, sourceSha256: character.sourceSha256,
    measuredHeadlineNodes: nodes.filter(node => ['qualification', 'title'].includes(node.props['data-cover-role'])).map(({ left, top, width, height }) => ({ left, top, width, height })),
    measuredTextNodes: nodes.map(({ left, top, width, height, props }) => ({ role: props['data-cover-role'], left, top, width, height })) };
}

export async function renderNoteCharacterCover(root, input) {
  if (input.magazine) return renderMagazineCharacterCover(root, input);
  const ctx = context(root);
  const measure = (text, size) => ctx.font.getAdvanceWidth(text, size);
  const copy = coverCopy(input);
  const L = coverLayout(input);
  const HEADLINE = L.headline;
  const layout = headlineLayout(copy.headline, measure, HEADLINE);
  const palette = input.palette;
  const band = palette.band;
  const ink = '#102B49';
  const selection = input.cover?.character ? { pose: input.cover.character, reason: '原稿指定' }
    : input.poseSelection || selectPose(input, input.title || copy.headline);
  const { pose } = selection;
  const frameKey = `${pose}/${L.character.width}`;
  if (!ctx.characters.has(frameKey)) ctx.characters.set(frameKey, renderCharacterFrame(root, { pose, frame: 'waist', width: L.character.width }));
  const character = await ctx.characters.get(frameKey);
  const characterSrc = `data:image/png;base64,${character.buffer.toString('base64')}`;
  const characterScale = Math.min(1, L.character.maxHeight / character.height);
  const characterBox = { width: Math.round(character.width * characterScale), height: Math.round(character.height * characterScale) };
  characterBox.left = L.character.left + Math.round((L.character.width - characterBox.width) / 2);
  // 外周枠の内側へ足元を合わせる。右端では腕や小物が切れてもよいが、顔は残す。
  characterBox.top = 660 - characterBox.height;
  const fitted = (text, max, width) => fittedSize(text, max, width, measure);
  const linesTop = HEADLINE.y + (HEADLINE.height - layout.lines.length * layout.lineHeight) / 2;
  const x = L.textX;
  const w = L.textWidth;
  const tint = /^#[0-9a-f]{6}$/i.test(band) ? `${band}18` : '#eaf2fa';
  const leadSize = fitted(copy.lead, ...leadFit(L));
  const leadWidth = Math.min(790, Math.max(490, Math.ceil(measure(copy.lead, leadSize) + 54)));
  // 解説者の肩書は資格ごとに上書きできる（note-cover-tokens.json exams.*.authority・既定は総監）
  const who = input.palette?.authority || '総監';
  const authority = input.magazine ? `${who}が制作` : `${who}が解説`;
  const children = [
    at(0, 0, 1280, 670, [], { background: `linear-gradient(125deg, #ffffff 0%, #f8fafc 58%, ${tint} 100%)` }),
    at(10, 10, 1260, 650, [], { border: `5px solid ${band}`, borderRadius: 8 }),
    at(x, 48, leadWidth, 68, textNode(copy.lead, leadSize, '#ffffff', {}, 'lead'),
      { alignItems: 'center', paddingLeft: 26, background: band, borderRadius: 8 }),
    { type: 'img', props: { src: characterSrc, width: characterBox.width, height: characterBox.height,
      style: { position: 'absolute', left: characterBox.left, top: characterBox.top } } },
    ...layout.lines.map((line, i) => at(HEADLINE.x, linesTop + i * layout.lineHeight, HEADLINE.width, layout.lineHeight,
      textNode(line, layout.size, band,
        { lineHeight: 1.04, letterSpacing: -layout.size / 30, WebkitTextStrokeWidth: layout.size / 90, WebkitTextStrokeColor: band }, `headline-${i}`))),
    at(x, 361, w, 6, [], { background: '#FFC53D' }),
    ...(copy.proof ? [at(x, 382, w, 64, textNode(copy.proof, fitted(copy.proof, ...proofFit(L)), ink, {}, 'proof'), { alignItems: 'center' })] : []),
    ...(copy.benefit ? [at(x, 463, w, 66, textNode(copy.benefit, fitted(copy.benefit, ...benefitFit(L)), '#ffffff', {}, 'benefit'),
      { alignItems: 'center', paddingLeft: 24, background: band, borderRadius: 8 })] : []),
    at(x, 552, 430, 48, textNode(authority, 27, ink, {}, 'authority'),
      { alignItems: 'center', justifyContent: 'center', background: '#FFD86A', borderRadius: 24 }),
  ];
  const nodes = [];
  const svg = await satori(div({ width: 1280, height: 670, position: 'relative', fontFamily: 'Noto Sans JP', fontWeight: 700 }, children),
    { ...NOTE_CHARACTER_CANVAS, fonts: ctx.fonts, onNodeDetected: node => { if (node.props?.['data-cover-role']) nodes.push(node); } });
  const errors = [];
  const safe = L.safe;
  for (const node of nodes) {
    if (node.left < safe.x || node.top < safe.y || node.left + node.width > safe.x + safe.width || node.top + node.height > safe.y + safe.height) {
      errors.push(`文字の実描画枠が安全域外: ${node.props['data-cover-role']}`);
    }
  }
  const headlineNodes = nodes.filter(node => node.props['data-cover-role'].startsWith('headline-'));
  if (headlineNodes.length !== layout.lines.length) errors.push('主見出しの実描画枠を取得できません');
  if (errors.length) throw new Error(errors.join(' / '));
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, copy, layout, pose, poseReason: selection.reason, characterBox, sourceSha256: character.sourceSha256,
    measuredHeadlineNodes: headlineNodes.map(({ left, top, width, height }) => ({ left, top, width, height })),
    measuredTextNodes: nodes.map(({ left, top, width, height, props }) => ({ role: props['data-cover-role'], left, top, width, height })) };
}
