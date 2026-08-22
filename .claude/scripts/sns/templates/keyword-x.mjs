/**
 * 解説型キーワードパック X（Twitter）画像 テンプレ（1200×675）。
 *
 * 1 ツイート = 1 画像。タイトル + サブタイトル + bullet/desc + URL hint。
 */

import { COLORS, rect, line, text, multilineText, svgDoc } from '../lib/svg-base.mjs';
import { wrapByCharCount } from '../lib/text-wrap.mjs';

const W = 1200;
const H = 675;

export function renderKeywordTweet({ tweet, meta }) {
  const heading = stripParens(tweet.heading);
  const bullets = tweet.bullets || [];
  const descLines = tweet.descLines || [];

  // top label: 「総監キーワード解説 #N」
  const labelText = `総監キーワード解説 #${tweet.num}`;
  const labelW = [...labelText].length * 26 + 60;

  // subtitle chip（右上）
  const subtitle = tweet.subtitle || '';

  // 本文領域: bullets が空なら descLines を、bullets があればそれを優先
  const useBullets = bullets.length > 0;
  const items = useBullets ? bullets : descLines;

  // heading wrap
  const headingChars = [...heading].length;
  const headingSize = headingChars <= 18 ? 36 : headingChars <= 26 ? 32 : 28;
  const headingMaxChars = headingChars <= 18 ? 22 : 30;
  const headingLines = wrapByCharCount(heading, headingMaxChars).slice(0, 2);

  // items rendering
  const itemElements = renderItems(items, useBullets);

  const body = [
    // top label
    rect({ x: 60, y: 30, w: labelW, h: 56, rx: 28, fill: COLORS.brand }),
    text({ x: 60 + labelW / 2, y: 58, content: labelText, size: 26, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),
    text({ x: 1160, y: 64, content: 'doboku-note.com', size: 22, fill: COLORS.inkMuted, anchor: 'end' }),

    // subtitle chip
    subtitle ? text({ x: 60, y: 130, content: subtitle, size: 28, weight: 600, fill: COLORS.brand }) : '',

    // keyword name
    text({ x: 60, y: 180, content: meta.keywordName, size: 38, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 60, y1: 200, x2: 1140, y2: 200, stroke: COLORS.brand, sw: 2 }),

    // heading
    multilineText({ x: 60, lines: headingLines, size: headingSize, weight: 700, fill: COLORS.brandDeep, lineHeight: 1.4, startY: 250 }),

    // items
    itemElements,

    // CTA hint footer
    text({ x: 600, y: 645, content: '→ doboku-note で詳しく解説', size: 28, weight: 700, fill: COLORS.brand, anchor: 'middle' }),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderItems(items, useBullets) {
  if (items.length === 0) return '';
  const startY = 360;
  const maxItems = items.length <= 3 ? items.length : Math.min(items.length, 5);
  const rowH = items.length <= 3 ? 70 : items.length === 4 ? 56 : 48;
  const itemSize = items.length <= 3 ? 26 : items.length === 4 ? 22 : 20;
  const elements = [];

  for (let i = 0; i < maxItems; i++) {
    const y = startY + i * rowH;
    const item = items[i];
    if (useBullets) {
      // ▼ マーカー
      elements.push(text({ x: 60, y: y + itemSize, content: '▼', size: itemSize, weight: 700, fill: COLORS.brand }));
    }
    const tx = useBullets ? 95 : 60;
    const itemMaxChars = Math.floor((W - tx - 60) / itemSize);
    const itemLines = wrapByCharCount(item, itemMaxChars).slice(0, 1);
    elements.push(text({ x: tx, y: y + itemSize, content: itemLines[0] || '', size: itemSize, fill: COLORS.inkStrong }));
  }
  return elements.join('\n  ');
}

function stripParens(s) {
  return String(s ?? '')
    .replace(/\(brand[^)]*\)/g, '')
    .replace(/\(positive[^)]*\)/g, '')
    .replace(/\(warn[^)]*\)/g, '')
    .replace(/\(danger[^)]*\)/g, '')
    .replace(/\(#[0-9a-fA-F]{3,8}\)/g, '')
    .trim();
}
