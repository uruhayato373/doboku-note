/**
 * クイズ型 IG カルーセル テンプレ（1080×1350）。
 *
 * 1 投稿 = 10 スライド構成:
 *   01-cover.svg                — カバー（管理分野チップ + シリーズ N/5）
 *   02-q1.svg / 04-q2 / 06-q3 / 08-q4 — 質問スライド
 *   03-a1.svg / 05-a2 / 07-a3 / 09-a4 — 解答スライド
 *   10-cta.svg                   — CTA
 */

import { COLORS, FONT, esc, rect, line, text, multilineText, numberedCircle, svgDoc, igFooter } from '../lib/svg-base.mjs';
import { wrapByCharCount, wrapPreservingNewlines } from '../lib/text-wrap.mjs';

const W = 1080;
const H = 1350;

// ---- カテゴリ chip（カバー用 5 連 + Q/A スライドの top label）の色 ----
// 既存 001 ではすべて brand 色だが、視覚連続性のため category ごとに色を割り当てる選択もある。
// 001 互換: top label は Q=brand / A=positive で固定。
function topLabelColor(kind) {
  return kind === 'A' ? COLORS.positive : COLORS.brand;
}

// =================== Slide 1: カバー ===================
export function renderCover({ category, packIndex, totalPacks, allCategories }) {
  // packIndex: 1..5（5 管理シリーズの何番目か）
  // allCategories: { shortName: '経済性' } の配列、5 つ
  const body = [
    // 上部装飾バナー
    rect({ x: 14, y: 60, w: 1066, h: 200, fill: COLORS.brandFill }),
    text({ x: W / 2, y: 180, content: '総監択一クイズ', size: 48, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),

    // 管理分野チップ（大）
    rect({ x: 180, y: 380, w: 720, h: 180, rx: 20, fill: COLORS.brand }),
    text({ x: W / 2, y: 470, content: category.name, size: 92, weight: 800, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),

    text({ x: W / 2, y: 660, content: '4 問パック', size: 64, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),
    text({ x: W / 2, y: 800, content: '保存して何度も解こう', size: 44, fill: COLORS.inkBody, anchor: 'middle' }),
    text({ x: W / 2, y: 860, content: 'スワイプで Q1 → A1 → Q2 → ...', size: 32, fill: COLORS.inkMuted, anchor: 'middle' }),

    // 5 管理シリーズチップ
    text({ x: W / 2, y: 980, content: `5 管理シリーズ ${packIndex}/${totalPacks}`, size: 26, fill: COLORS.inkMuted, anchor: 'middle' }),
    ...renderSeriesChips(category, allCategories),

    igFooter(),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderSeriesChips(active, all) {
  // 5 chips, 横並び、x=58 から、幅 180、間隔 16
  const chips = [];
  let x = 58;
  for (const cat of all) {
    const isActive = cat.slug === active.slug;
    chips.push(
      rect({ x, y: 1000, w: 180, h: 90, rx: 14, fill: isActive ? COLORS.brand : COLORS.surfaceLight, stroke: isActive ? null : COLORS.border, sw: isActive ? 0 : 2 }),
      text({ x: x + 90, y: 1045, content: cat.shortName, size: 28, weight: 700, fill: isActive ? COLORS.white : COLORS.inkMuted, anchor: 'middle', baseline: 'central' })
    );
    x += 196;
  }
  return chips;
}

// =================== Slide 2/4/6/8: 質問 ===================
export function renderQuestion({ category, q, slotIndex, totalSlots = 4 }) {
  // slotIndex: 1..4（カテゴリ内の問番号）
  const labelText = `Q${q.num} ${category.name}`;
  const choices = q.choices;

  // 質問テキストを 2-3 行で wrap（40px、約 22 字/行）
  const qLines = wrapByCharCount(q.question, 22).slice(0, 3);
  const qStartY = 360;

  // 選択肢配置
  const choiceLayout = computeChoiceLayout(choices.length);
  const choiceBlocks = choices.map((ch, i) =>
    renderChoiceBox({
      x: 80,
      y: choiceLayout.startY + i * choiceLayout.delta,
      w: 920,
      h: choiceLayout.boxH,
      num: i + 1,
      label: ch,
      labelSize: choiceLayout.labelSize,
      circleR: choiceLayout.circleR,
    })
  );

  const body = [
    // top label
    rect({ x: 80, y: 60, w: 380, h: 64, rx: 32, fill: topLabelColor('Q') }),
    text({ x: 270, y: 92, content: labelText, size: 30, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),
    text({ x: 1020, y: 100, content: `slot ${slotIndex}/${totalSlots}`, size: 26, fill: COLORS.inkMuted, anchor: 'end' }),

    // topic
    text({ x: 80, y: 220, content: q.topic, size: 48, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 80, y1: 270, x2: 1000, y2: 270, stroke: COLORS.brand, sw: 3 }),

    // 質問本文
    multilineText({ x: 80, lines: qLines, size: 40, weight: 500, fill: COLORS.inkStrong, lineHeight: 1.5, startY: qStartY }),

    // choices
    ...choiceBlocks,

    // footer hint
    text({ x: W / 2, y: 1230, content: '→ スワイプで答えを見る →', size: 32, weight: 600, fill: COLORS.brand, anchor: 'middle' }),
    igFooter(),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function computeChoiceLayout(n) {
  if (n <= 4) {
    // 4 択: 110px height, 18px gap, start y=580
    return { startY: 580, boxH: 110, delta: 128, labelSize: 36, circleR: 32 };
  }
  // 5 択: 88px height, 16px gap, start y=540（質問本文を 2 行想定）
  return { startY: 540, boxH: 88, delta: 104, labelSize: 30, circleR: 28 };
}

// 解答ブロック内の answerShort（長文時は 2 行・縮小）
function renderAnswerShort({ cx, baselineY, label, maxWidth }) {
  // 1 行で収まる文字数の目安（44px 想定）
  const oneLineMax = 18;
  if ([...label].length <= oneLineMax) {
    return [text({ x: cx, y: baselineY, content: label, size: 44, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' })];
  }
  // 2 行に wrap、フォント縮小
  const size = 32;
  const charPerLine = 22;
  const lines = wrapByCharCount(label, charPerLine).slice(0, 2);
  if (lines.length === 1) {
    return [text({ x: cx, y: baselineY, content: lines[0], size, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' })];
  }
  // 2 行: baselineY を中心に上下に配置
  const lh = Math.round(size * 1.3);
  return lines.map((ln, i) =>
    text({ x: cx, y: baselineY - lh / 2 + i * lh, content: ln, size, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' })
  );
}

function renderChoiceBox({ x, y, w, h, num, label, labelSize, circleR }) {
  const cy = y + h / 2;
  const cx = x + 60;
  const tx = cx + circleR + 30;
  const textWidth = w - (tx - x) - 20;
  // 日本語 ≈ 全角（font-size 幅）
  const maxChars = Math.max(10, Math.floor(textWidth / labelSize));
  const labelLines = wrapByCharCount(label, maxChars).slice(0, 2);
  const labelOneLine = labelLines.length === 1;
  const labelEl = labelOneLine
    ? text({ x: tx, y: cy, content: labelLines[0], size: labelSize, fill: COLORS.inkStrong, baseline: 'central' })
    : multilineText({
        x: tx,
        startY: cy - labelSize * 0.55,
        lines: labelLines,
        size: Math.round(labelSize * 0.9),
        fill: COLORS.inkStrong,
        lineHeight: 1.25,
      });
  return [
    `<g>`,
    rect({ x, y, w, h, rx: 14, fill: COLORS.surfaceLight, stroke: COLORS.border, sw: 2 }),
    numberedCircle({ cx, cy, r: circleR, num }),
    labelEl,
    `</g>`,
  ].join('\n    ');
}

// =================== Slide 3/5/7/9: 解答 ===================
export function renderAnswer({ category, q }) {
  const labelText = `A${q.num} ${category.name}`;
  const circledNum = '①②③④⑤⑥⑦⑧⑨'[q.answerIdx] ?? '?';

  const expLines = wrapByCharCount(q.explanation, 26).slice(0, 6);

  const body = [
    // top label（A 用 = positive 色）
    rect({ x: 80, y: 60, w: 380, h: 64, rx: 32, fill: topLabelColor('A') }),
    text({ x: 270, y: 92, content: labelText, size: 30, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),

    // topic
    text({ x: 80, y: 220, content: q.topic, size: 38, weight: 700, fill: COLORS.inkBody }),

    // ✓ 正答 headline
    text({ x: 80, y: 320, content: '✓ 正答', size: 56, weight: 800, fill: COLORS.positive }),

    // answer block（長い answerShort は 2 行に折り返し、フォント縮小）
    rect({ x: 60, y: 380, w: 960, h: 320, rx: 20, fill: COLORS.positiveFill }),
    text({ x: W / 2, y: 530, content: circledNum, size: 140, weight: 900, fill: COLORS.positive, anchor: 'middle' }),
    ...renderAnswerShort({ cx: W / 2, baselineY: 640, label: q.answerShort, maxWidth: 880 }),

    // divider + 解説
    line({ x1: 80, y1: 760, x2: 1000, y2: 760, stroke: COLORS.border, sw: 2 }),
    text({ x: 80, y: 820, content: '解説', size: 32, weight: 700, fill: COLORS.inkBody }),
    multilineText({ x: 80, lines: expLines, size: 34, fill: COLORS.inkBody, lineHeight: 1.6, startY: 890 }),

    igFooter(),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

// =================== Slide 10: CTA ===================
export function renderCta({ category, packIndex, totalPacks, topics }) {
  // topics: 4 つのトピック名配列（"設備総合効率・ECRS の原則・..."）
  const topicLine = topics.join('・');

  const body = [
    rect({ x: 14, y: 0, w: 1066, h: 100, fill: COLORS.brandFill }),
    text({ x: W / 2, y: 65, content: `Carousel ${String(packIndex).padStart(2, '0')}/${String(totalPacks).padStart(2, '0')}`, size: 36, weight: 700, fill: COLORS.brand, anchor: 'middle' }),

    text({ x: W / 2, y: 240, content: 'もっと解きたい人は', size: 56, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),

    rect({ x: 100, y: 340, w: 880, h: 280, rx: 24, fill: COLORS.brand }),
    text({ x: W / 2, y: 450, content: 'doboku-note で', size: 56, weight: 800, fill: COLORS.white, anchor: 'middle' }),
    text({ x: W / 2, y: 540, content: '全問解説を見る', size: 56, weight: 800, fill: COLORS.white, anchor: 'middle' }),

    text({ x: W / 2, y: 730, content: 'プロフィールのリンクから', size: 40, weight: 600, fill: COLORS.inkBody, anchor: 'middle' }),

    rect({ x: 100, y: 820, w: 880, h: 200, rx: 20, fill: COLORS.surfaceLight, stroke: COLORS.border, sw: 2 }),
    text({ x: W / 2, y: 900, content: '保存ボタンを押して', size: 38, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),
    text({ x: W / 2, y: 960, content: '試験前日に見返そう', size: 38, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),

    text({ x: W / 2, y: 1120, content: truncate(topicLine, 30), size: 32, fill: COLORS.inkMuted, anchor: 'middle' }),

    igFooter(),
  ].join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function truncate(s, max) {
  const arr = [...String(s ?? '')];
  return arr.length <= max ? arr.join('') : arr.slice(0, max - 1).join('') + '…';
}
