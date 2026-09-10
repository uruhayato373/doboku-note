import { createHash } from 'node:crypto';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { coverFonts } from './youtube-cover.mjs';
import { renderCharacterFrame } from './character-framing.mjs';
import { resolveExam } from '../../.claude/scripts/sns/lib/exam-palette.mjs';
import { cardSpecHash, validateCharacterCard } from './x-character-spec.mjs';

export async function renderXCharacterCard(root, tweet, input) {
  const spec = validateCharacterCard(input);
  const theme = resolveExam(tweet.exam);
  const character = await renderCharacterFrame(root, spec.character);
  const scale = Math.min(1, 330 / character.width, 445 / character.height);
  const cw = Math.round(character.width * scale), ch = Math.round(character.height * scale);
  const placement = { left: 840 + Math.floor((330 - cw) / 2), top: 582 - ch, width: cw, height: ch };
  const txt = (children, style) => ({ type: 'div', props: { style: { display: 'flex', position: 'absolute', fontFamily: 'NotoSansJP', ...style }, children } });
  const note = tweet.funnel === 'note';
  const node = { type: 'div', props: { style: { display: 'flex', position: 'relative', width: 1200, height: 675, background: theme.deep, color: '#FFFFFF', fontFamily: 'NotoSansJP' }, children: [
    txt(theme.label, { left: 58, top: 34, fontSize: 28, fontWeight: 700 }),
    txt('先生と学ぶ', { right: 40, top: 36, fontSize: 24, color: '#FFFFFFBB' }),
    ...spec.headline.map((line, i) => txt(line, { left: 58, top: 112 + i * 98, fontSize: 72, fontWeight: 900, color: i ? '#FFC53D' : '#FFFFFF', whiteSpace: 'nowrap' })),
    { type: 'div', props: { style: { position: 'absolute', left: 58, top: 340, width: 720, height: 3, background: '#FFFFFF40' } } },
    ...spec.points.map((line, i) => txt(line, { left: 64, top: 373 + i * 58, fontSize: 32, fontWeight: 700, whiteSpace: 'nowrap' })),
    { type: 'img', props: { src: `data:image/png;base64,${character.buffer.toString('base64')}`, style: { position: 'absolute', ...placement } } },
    { type: 'div', props: { style: { position: 'absolute', left: 0, top: 609, width: 1200, height: 66, background: '#00000026' } } },
    txt(note ? '活用例と収録内容は、本文のnoteマガジンへ' : '今日のひとつを、自分の知識に。', { left: 58, top: 626, fontSize: 23, fontWeight: 700, color: note ? '#FFC53D' : '#FFFFFFBB' }),
    txt('doboku-note', { right: 42, top: 626, fontSize: 23, fontWeight: 700 }),
  ] } };
  const svg = await satori(node, { width: 1200, height: 675, fonts: coverFonts(root) });
  const buffer = new Resvg(svg).render().asPng();
  return { buffer, meta: { template: 'x-teacher-v1', exam: tweet.exam, headerLabel: theme.label,
    keywordName: spec.headline.join(' '), sectionTitle: tweet.sectionTitle, colors: { bg: theme.deep, fill: theme.soft },
    body: spec.points.join(' '), bodySize: 32, lines: spec.points.length, droppedLines: 0,
    sha256: createHash('sha256').update(buffer).digest('hex'), specSha256: cardSpecHash(spec),
    alt: spec.alt, character: { pose: character.pose, frame: character.frame, sourceSha256: character.sourceSha256, placement, enlarged: false } } };
}
