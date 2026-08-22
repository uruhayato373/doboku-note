/**
 * クイズ型 X（Twitter）画像 テンプレ（1200×675、16:9）。
 *
 * 1 問につき 2 枚:
 *   tweet-{NN}-{cat}.svg  — 質問画像（メインツイート）
 *   answer-{NN}-{cat}.svg — 解答画像（リプライツリー）
 */

import { COLORS, esc, rect, line, text, multilineText, numberedCircle, svgDoc } from '../lib/svg-base.mjs';
import { wrapByCharCount } from '../lib/text-wrap.mjs';

const W = 1200;
const H = 675;

function xFooter(content = 'doboku-note.com') {
  return text({ x: 1160, y: 64, content, size: 22, fill: COLORS.inkMuted, anchor: 'end' });
}

// =================== 質問画像 ===================
export function renderTweet({ category, q }) {
  const labelText = `Q${q.num} ${category.name}`;
  const qLines = wrapByCharCount(q.question, 32).slice(0, 2);

  const choices = q.choices;
  // 5 択でも 4 択でも 2 列グリッド。3 行 × 2 列 = 6 セル分の容量（5 択は 3 行、最終行 1 列のみ）
  const cells = renderChoiceGrid(choices);

  const body = [
    // top label
    rect({ x: 60, y: 40, w: 360, h: 56, rx: 28, fill: COLORS.brand }),
    text({ x: 240, y: 68, content: labelText, size: 26, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),
    xFooter(),

    // topic
    text({ x: 60, y: 140, content: q.topic, size: 32, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 60, y1: 160, x2: 1140, y2: 160, stroke: COLORS.brand, sw: 2 }),

    // 質問本文
    multilineText({ x: 60, lines: qLines, size: 30, weight: 500, fill: COLORS.inkStrong, lineHeight: 1.5, startY: 200 }),

    // choice grid
    ...cells,

    // footer
    text({ x: 600, y: 655, content: '↓ 答えはリプライツリーに ↓', size: 28, weight: 700, fill: COLORS.brand, anchor: 'middle' }),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderChoiceGrid(choices) {
  // 配置: 2 列 × 2-3 行（5 択は 3 行、最終行 1 列のみ）
  // 質問本文は y=200-260 を占有、選択肢開始 y=290
  const cells = [];
  const layout = choices.length <= 4
    ? { startY: 290, rowH: 130, boxH: 110, fontSize: 22, circleR: 26 }
    : { startY: 290, rowH: 100, boxH: 88, fontSize: 20, circleR: 22 };
  const colXs = [80, 610];
  const colW = 510;

  for (let i = 0; i < choices.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = colXs[col];
    const y = layout.startY + row * layout.rowH;
    cells.push(renderXChoiceBox({
      x, y, w: colW, h: layout.boxH,
      num: i + 1,
      label: choices[i],
      labelSize: layout.fontSize,
      circleR: layout.circleR,
    }));
  }
  return cells;
}

// X answer block 内の answerShort
function renderXAnswerShort({ x, cy, label }) {
  const arr = [...label];
  if (arr.length <= 22) {
    return [text({ x, y: cy, content: label, size: 44, weight: 700, fill: COLORS.inkStrong, baseline: 'central' })];
  }
  const size = 30;
  const lines = wrapByCharCount(label, 30).slice(0, 2);
  if (lines.length === 1) {
    return [text({ x, y: cy, content: lines[0], size, weight: 700, fill: COLORS.inkStrong, baseline: 'central' })];
  }
  const lh = Math.round(size * 1.3);
  return lines.map((ln, i) =>
    text({ x, y: cy - lh / 2 + i * lh, content: ln, size, weight: 700, fill: COLORS.inkStrong, baseline: 'central' })
  );
}

function renderXChoiceBox({ x, y, w, h, num, label, labelSize, circleR }) {
  const cy = y + h / 2;
  const cx = x + 40;
  // 日本語は ≈ font-size 幅（全角）。box 幅から circle と padding を引く
  const tx = cx + circleR + 16;
  const textWidth = w - (tx - x) - 12; // 右余白 12px
  const maxChars = Math.max(8, Math.floor(textWidth / labelSize));
  const labelLines = wrapByCharCount(label, maxChars).slice(0, 2);
  const labelOneLine = labelLines.length === 1;
  const labelEl = labelOneLine
    ? text({ x: tx, y: cy, content: labelLines[0], size: labelSize, fill: COLORS.inkStrong, baseline: 'central' })
    : multilineText({
        x: tx,
        startY: cy - labelSize * 0.55,
        lines: labelLines,
        size: labelSize,
        fill: COLORS.inkStrong,
        lineHeight: 1.25,
      });
  return [
    `<g>`,
    rect({ x, y, w, h, rx: 12, fill: COLORS.surfaceLight, stroke: COLORS.border, sw: 2 }),
    numberedCircle({ cx, cy, r: circleR, num }),
    labelEl,
    `</g>`,
  ].join('\n    ');
}

// =================== 解答画像 ===================
export function renderAnswer({ category, q }) {
  const labelText = `A${q.num} ${category.name}`;
  const circledNum = '①②③④⑤⑥⑦⑧⑨'[q.answerIdx] ?? '?';
  const expLines = wrapByCharCount(q.explanation, 38).slice(0, 3);

  const body = [
    // top label（A: positive）
    rect({ x: 60, y: 30, w: 360, h: 56, rx: 28, fill: COLORS.positive }),
    text({ x: 240, y: 58, content: labelText, size: 26, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),
    xFooter(),

    // topic
    text({ x: 60, y: 140, content: q.topic, size: 28, weight: 700, fill: COLORS.inkBody }),
    line({ x1: 60, y1: 160, x2: 1140, y2: 160, stroke: COLORS.brand, sw: 2 }),

    // ✓ 正答
    text({ x: 60, y: 230, content: '✓ 正答', size: 32, weight: 800, fill: COLORS.positive }),

    // answer block（長い answerShort は 2 行・縮小）
    rect({ x: 40, y: 270, w: 1120, h: 180, rx: 16, fill: COLORS.positiveFill }),
    text({ x: 160, y: 360, content: circledNum, size: 110, weight: 900, fill: COLORS.positive, anchor: 'middle', baseline: 'central' }),
    ...renderXAnswerShort({ x: 240, cy: 360, label: q.answerShort }),

    // 解説 label
    text({ x: 60, y: 495, content: '解説', size: 22, weight: 700, fill: COLORS.inkBody }),

    // explanation
    multilineText({ x: 60, lines: expLines, size: 26, fill: COLORS.inkBody, lineHeight: 1.6, startY: 530 }),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}
