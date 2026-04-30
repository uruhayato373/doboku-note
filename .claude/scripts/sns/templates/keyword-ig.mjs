/**
 * 解説型キーワードパック IG カルーセル テンプレ（1080×1350）。
 *
 * スライド種別:
 *   cover / definition / figure-fullbleed / explanation /
 *   numbered-list / related / cta
 */

import { readFileSync, existsSync } from 'node:fs';
import { COLORS, FONT, esc, rect, line, text, multilineText, svgDoc, igFooter } from '../lib/svg-base.mjs';
import { wrapByCharCount } from '../lib/text-wrap.mjs';

const W = 1080;
const H = 1350;

function labelFill(kind) {
  if (kind === 'positive') return COLORS.positive;
  if (kind === 'warn') return COLORS.warn;
  if (kind === 'danger') return COLORS.danger;
  return COLORS.brand;
}

function topLabel({ y = 60, label, kind }) {
  if (!label) return '';
  // ラベル幅を文字数から推定（大きめにとる）
  const charCount = [...label].length;
  const w = Math.max(220, charCount * 28 + 60);
  return [
    rect({ x: 80, y, w, h: 64, rx: 32, fill: labelFill(kind) }),
    text({ x: 80 + w / 2, y: y + 32, content: label, size: 28, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }),
  ].join('\n  ');
}

// ========== Slide 1: cover ==========
export function renderCover({ data, meta }) {
  const main = stripParens(data.main || meta.keywordName);
  const sub = stripParens(data.sub || '');
  const badge = stripParens(data.badge || meta.badge);

  // メインタイトル: 長文は wrap + フォント縮小
  const charCount = [...main].length;
  const fontSize = charCount <= 8 ? 92 : charCount <= 14 ? 72 : 56;
  const maxChars = charCount <= 8 ? 12 : charCount <= 14 ? 14 : 16;
  const lines = wrapByCharCount(main, maxChars).slice(0, 2);
  const lineH = Math.round(fontSize * 1.2);
  const blockH = lines.length * lineH;
  const blockTop = (H - blockH) / 2 - 60;

  const body = [
    // 全面 brand-fill 背景は柔らかく上半分のみ
    rect({ x: 0, y: 0, w: W, h: 700, fill: COLORS.brandFill }),

    // バッジ（上部）
    badge ? rect({ x: 80, y: 100, w: Math.max(360, [...badge].length * 26 + 60), h: 60, rx: 30, fill: COLORS.brand }) : '',
    badge ? text({ x: 80 + Math.max(360, [...badge].length * 26 + 60) / 2, y: 132, content: badge, size: 28, weight: 700, fill: COLORS.white, anchor: 'middle', baseline: 'central' }) : '',

    // メインタイトル
    ...lines.map((ln, i) => text({
      x: W / 2, y: blockTop + (i + 1) * lineH - lineH / 4,
      content: ln, size: fontSize, weight: 800, fill: COLORS.brandDeep, anchor: 'middle',
    })),

    // サブタイトル
    sub ? text({ x: W / 2, y: blockTop + blockH + 80, content: sub, size: 40, weight: 600, fill: COLORS.inkBody, anchor: 'middle' }) : '',

    text({ x: W / 2, y: 1180, content: '保存して試験前日に見返そう', size: 36, fill: COLORS.inkMuted, anchor: 'middle' }),
    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

// ========== Slide 2: definition ==========
export function renderDefinition({ data, meta }) {
  const mainText = stripParens(data.mainText || '');
  const supplement = stripParens(data.supplement || '');

  // 920px 幅に収まるサイズと wrap を選定
  const sized = pickFitting(mainText, [
    { size: 52, maxChars: 17 },
    { size: 44, maxChars: 20 },
    { size: 38, maxChars: 23 },
    { size: 32, maxChars: 28 },
  ], 4);
  const mainLines = sized.lines;
  const mainSize = sized.size;
  const mainStartY = 360;

  const supLines = supplement ? wrapByCharCount(supplement, 28).slice(0, 3) : [];

  const body = [
    topLabel({ label: data.label || '定義', kind: data.labelKind || 'brand' }),

    text({ x: 80, y: 240, content: meta.keywordName, size: 56, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 80, y1: 290, x2: 1000, y2: 290, stroke: COLORS.brand, sw: 3 }),

    multilineText({ x: 80, lines: mainLines, size: mainSize, weight: 700, fill: COLORS.brandDeep, lineHeight: 1.5, startY: mainStartY }),

    supLines.length > 0 ? rect({ x: 80, y: 1000, w: 920, h: 180, rx: 16, fill: COLORS.brandFill }) : '',
    ...supLines.map((ln, i) =>
      text({ x: 540, y: 1060 + i * 50, content: ln, size: 32, fill: COLORS.brandDeep, anchor: 'middle' })
    ),

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

// ========== Slide 3: figure-fullbleed ==========
export function renderFigure({ data, meta }) {
  const emphasis = stripParens(data.emphasis);
  const svgPath = meta.referenceSvgAbsPath;
  const hasFigure = svgPath && existsSync(svgPath);

  let figureBlock = '';
  if (hasFigure) {
    const svgRaw = readFileSync(svgPath, 'utf8');
    const inner = extractSvgInner(svgRaw);
    if (inner) {
      // 中央配置・アスペクト比維持で 920×640 領域に収める
      const targetX = 80, targetY = 270, targetW = 920, targetH = 720;
      const { vbW, vbH } = inner.viewBox;
      const ratio = Math.min(targetW / vbW, targetH / vbH);
      const drawW = vbW * ratio;
      const drawH = vbH * ratio;
      const offsetX = targetX + (targetW - drawW) / 2;
      const offsetY = targetY + (targetH - drawH) / 2;
      figureBlock = `<g transform="translate(${offsetX}, ${offsetY}) scale(${ratio})">${inner.body}</g>`;
    }
  }

  const empLines = emphasis ? wrapByCharCount(emphasis, 22).slice(0, 2) : [];

  const body = [
    topLabel({ label: data.label || '核心の図解', kind: data.labelKind || 'positive' }),

    figureBlock || text({ x: W / 2, y: H / 2, content: '（図解 SVG なし）', size: 36, fill: COLORS.inkMuted, anchor: 'middle' }),

    empLines.length > 0 ? rect({ x: 80, y: 1080, w: 920, h: 110, rx: 16, fill: COLORS.brandFill }) : '',
    ...empLines.map((ln, i) =>
      text({ x: 540, y: 1115 + i * 40, content: ln, size: 30, weight: 700, fill: COLORS.brandDeep, anchor: 'middle' })
    ),

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function extractSvgInner(svgRaw) {
  // <svg ... viewBox="x y w h" ...> ... </svg> から viewBox と内容を取り出す
  const svgTag = svgRaw.match(/<svg([^>]*)>([\s\S]*)<\/svg>/);
  if (!svgTag) return null;
  const attrs = svgTag[1];
  const inner = svgTag[2];
  const vb = attrs.match(/viewBox\s*=\s*"([^"]+)"/);
  let vbW = 0, vbH = 0;
  if (vb) {
    const parts = vb[1].split(/\s+/).map(parseFloat);
    if (parts.length === 4) { vbW = parts[2]; vbH = parts[3]; }
  } else {
    const wm = attrs.match(/width\s*=\s*"([\d.]+)/);
    const hm = attrs.match(/height\s*=\s*"([\d.]+)/);
    if (wm) vbW = parseFloat(wm[1]);
    if (hm) vbH = parseFloat(hm[1]);
  }
  if (!vbW || !vbH) return null;
  // <?xml ?> 宣言を除去
  return { viewBox: { vbW, vbH }, body: inner.replace(/<\?xml[^?]*\?>/g, '') };
}

// ========== Slides 4-7: explanation ==========
export function renderExplanation({ data, meta }) {
  const items = (data.items || []).slice(0, 6);
  const hasTable = data.comparisonTable && data.comparisonTable.body && data.comparisonTable.body.length > 0;

  const body = [
    topLabel({ label: data.label || '', kind: data.labelKind || 'brand' }),

    // 見出し
    text({ x: 80, y: 240, content: stripParens(data.heading || ''), size: 50, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 80, y1: 290, x2: 1000, y2: 290, stroke: COLORS.brand, sw: 3 }),

    // メインテキスト
    ...renderMainText(data.mainText, 360),

    // テーブル or リスト
    hasTable
      ? renderTable(data.comparisonTable, 480)
      : renderItemList(items, 380 + (data.mainText ? 200 : 0)),

    // 強調（最下部 callout）
    ...renderEmphasis(data.emphasis, 1080),

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderMainText(mainText, startY) {
  if (!mainText) return [];
  const lines = wrapByCharCount(mainText, 24).slice(0, 3);
  const size = lines.length === 1 ? 40 : 36;
  return [multilineText({ x: 80, lines, size, weight: 700, fill: COLORS.brandDeep, lineHeight: 1.4, startY })];
}

function renderItemList(items, startY) {
  if (items.length === 0) return '';
  const itemSize = items.length <= 3 ? 32 : items.length <= 4 ? 28 : 26;
  const lineH = Math.round(itemSize * 2);
  const elements = [];
  for (let i = 0; i < items.length; i++) {
    const y = startY + i * lineH;
    if (y > 1020) break; // 強調エリアにかぶらないように
    const item = items[i];
    // bullet
    elements.push(rect({ x: 80, y: y + itemSize * 0.3, w: 14, h: 14, rx: 7, fill: COLORS.brand }));
    // text（長文は 2 行折り返し）
    const itemLines = wrapByCharCount(item, Math.floor((W - 160 - 30) / itemSize)).slice(0, 2);
    if (itemLines.length === 1) {
      elements.push(text({ x: 110, y: y + itemSize, content: itemLines[0], size: itemSize, fill: COLORS.inkStrong }));
    } else {
      elements.push(multilineText({ x: 110, lines: itemLines, size: itemSize - 2, fill: COLORS.inkStrong, lineHeight: 1.3, startY: y + itemSize - 4 }));
    }
  }
  return elements.join('\n  ');
}

function renderTable(table, startY) {
  // 簡易レンダ: 2-4 列まで
  const { header, body } = table;
  const cols = header.length;
  const tableW = 920;
  const colW = Math.floor(tableW / cols);
  const rowH = 60;
  const xLeft = 80;
  const elements = [];

  // header
  elements.push(rect({ x: xLeft, y: startY, w: tableW, h: rowH, fill: COLORS.brand }));
  for (let i = 0; i < cols; i++) {
    elements.push(text({
      x: xLeft + i * colW + colW / 2,
      y: startY + rowH / 2,
      content: truncate(header[i], 12),
      size: 24,
      weight: 700,
      fill: COLORS.white,
      anchor: 'middle',
      baseline: 'central',
    }));
  }

  // body
  for (let r = 0; r < body.length && r < 6; r++) {
    const y = startY + (r + 1) * rowH;
    elements.push(rect({ x: xLeft, y, w: tableW, h: rowH, fill: r % 2 === 0 ? COLORS.surfaceLight : COLORS.white, stroke: COLORS.border, sw: 1 }));
    for (let i = 0; i < cols; i++) {
      const cell = body[r][i] || '';
      const cellMaxChars = Math.max(8, Math.floor(colW / 24));
      const cellLines = wrapByCharCount(cell, cellMaxChars).slice(0, 2);
      if (cellLines.length === 1) {
        elements.push(text({
          x: xLeft + i * colW + colW / 2,
          y: y + rowH / 2,
          content: cellLines[0],
          size: 22,
          fill: COLORS.inkStrong,
          anchor: 'middle',
          baseline: 'central',
        }));
      } else {
        elements.push(multilineText({
          x: xLeft + i * colW + colW / 2,
          lines: cellLines,
          size: 20,
          fill: COLORS.inkStrong,
          lineHeight: 1.2,
          startY: y + rowH / 2 - 8,
        }));
      }
    }
  }
  return elements.join('\n  ');
}

function renderEmphasis(emphasis, y) {
  if (!emphasis) return [];
  const text_ = stripParens(emphasis);
  const lines = wrapByCharCount(text_, 22).slice(0, 2);
  return [
    rect({ x: 80, y, w: 920, h: lines.length === 1 ? 90 : 130, rx: 16, fill: COLORS.brandFill }),
    ...lines.map((ln, i) => text({
      x: 540, y: y + (lines.length === 1 ? 60 : 50 + i * 40),
      content: ln, size: 30, weight: 700, fill: COLORS.brandDeep, anchor: 'middle',
    })),
  ];
}

// ========== Slide 8: numbered-list ==========
export function renderNumberedList({ data, meta }) {
  const items = (data.items || []).slice(0, 5);
  const itemH = items.length <= 3 ? 200 : items.length === 4 ? 160 : 130;
  const startY = 320;

  const body = [
    topLabel({ label: data.label || '試験で狙われる', kind: 'warn' }),

    text({ x: 80, y: 240, content: '引っかけポイント', size: 48, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 80, y1: 290, x2: 1000, y2: 290, stroke: COLORS.warn, sw: 3 }),

    ...items.map((it, i) => renderNumberedItem({ x: 80, y: startY + i * itemH, w: 920, h: itemH - 20, num: i + 1, bold: it.bold, body: it.body })),

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderNumberedItem({ x, y, w, h, num, bold, body }) {
  const numSize = 56;
  const boldSize = 30;
  const bodySize = 26;
  const elements = [];
  // 番号サークル
  elements.push(`<circle cx="${x + 50}" cy="${y + 50}" r="40" fill="${COLORS.warn}" />`);
  elements.push(text({ x: x + 50, y: y + 50, content: String(num), size: numSize, weight: 900, fill: COLORS.white, anchor: 'middle', baseline: 'central' }));

  // テキスト領域
  const tx = x + 120;
  if (bold) {
    const boldLines = wrapByCharCount(bold, 20).slice(0, 2);
    elements.push(multilineText({ x: tx, lines: boldLines, size: boldSize, weight: 800, fill: COLORS.brandDeep, lineHeight: 1.3, startY: y + 30 }));
    if (body) {
      const bodyLines = wrapByCharCount(body, 24).slice(0, 2);
      const bodyStartY = y + 30 + boldLines.length * Math.round(boldSize * 1.3) + 10;
      elements.push(multilineText({ x: tx, lines: bodyLines, size: bodySize, fill: COLORS.inkBody, lineHeight: 1.3, startY: bodyStartY }));
    }
  } else {
    const bodyLines = wrapByCharCount(body, 22).slice(0, 3);
    elements.push(multilineText({ x: tx, lines: bodyLines, size: boldSize, weight: 700, fill: COLORS.inkStrong, lineHeight: 1.3, startY: y + 40 }));
  }
  return elements.join('\n  ');
}

// ========== Slide 9: related ==========
export function renderRelated({ data, meta }) {
  const items = (data.items || []).slice(0, 6);
  const startY = 360;
  const itemH = 90;

  const body = [
    topLabel({ label: data.label || 'セットで覚える', kind: 'brand' }),

    text({ x: 80, y: 240, content: '関連キーワード', size: 50, weight: 800, fill: COLORS.inkStrong }),
    line({ x1: 80, y1: 290, x2: 1000, y2: 290, stroke: COLORS.brand, sw: 3 }),

    ...items.map((it, i) => renderRelatedItem({ x: 80, y: startY + i * itemH, w: 920, h: itemH - 12, label: it })),

    data.supplement
      ? rect({ x: 80, y: 1080, w: 920, h: 110, rx: 16, fill: COLORS.brandFill })
      : '',
    data.supplement
      ? text({ x: 540, y: 1140, content: stripParens(data.supplement), size: 30, weight: 700, fill: COLORS.brandDeep, anchor: 'middle' })
      : '',

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function renderRelatedItem({ x, y, w, h, label }) {
  const cleanLabel = stripParens(label);
  const lines = wrapByCharCount(cleanLabel, 30).slice(0, 1);
  return [
    rect({ x, y, w, h, rx: 16, fill: COLORS.surfaceLight, stroke: COLORS.border, sw: 2 }),
    `<circle cx="${x + 28}" cy="${y + h / 2}" r="6" fill="${COLORS.brand}" />`,
    text({ x: x + 56, y: y + h / 2, content: lines[0] || '', size: 28, weight: 600, fill: COLORS.inkStrong, baseline: 'central' }),
  ].join('\n  ');
}

// ========== Slide 10: cta ==========
export function renderCta({ data, meta }) {
  const main = data.main || '全解説 + 関連キーワードは';
  const ctaText = data.ctaText || 'doboku-note で全文を見る';
  const sub = data.sub || 'プロフィールのリンクから';

  const body = [
    rect({ x: 14, y: 0, w: 1066, h: 100, fill: COLORS.brandFill }),
    text({ x: W / 2, y: 65, content: meta.keywordName, size: 36, weight: 700, fill: COLORS.brand, anchor: 'middle' }),

    text({ x: W / 2, y: 240, content: main, size: 50, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),

    rect({ x: 100, y: 340, w: 880, h: 280, rx: 24, fill: COLORS.brand }),
    ...wrapCta(ctaText).map((ln, i, arr) =>
      text({
        x: W / 2,
        y: 480 - (arr.length - 1) * 45 + i * 90,
        content: ln,
        size: 56,
        weight: 800,
        fill: COLORS.white,
        anchor: 'middle',
      })
    ),

    text({ x: W / 2, y: 730, content: sub, size: 40, weight: 600, fill: COLORS.inkBody, anchor: 'middle' }),

    rect({ x: 100, y: 820, w: 880, h: 200, rx: 20, fill: COLORS.surfaceLight, stroke: COLORS.border, sw: 2 }),
    text({ x: W / 2, y: 900, content: '保存ボタンを押して', size: 38, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),
    text({ x: W / 2, y: 960, content: '試験前日に見返そう', size: 38, weight: 700, fill: COLORS.inkStrong, anchor: 'middle' }),

    text({ x: W / 2, y: 1120, content: meta.badge || '', size: 28, fill: COLORS.inkMuted, anchor: 'middle' }),

    igFooter(),
  ].filter(Boolean).join('\n  ');
  return svgDoc({ width: W, height: H, body });
}

function wrapCta(s) {
  const arr = [...String(s ?? '')];
  if (arr.length <= 14) return [s];
  // 「で」を切れ目に分割を試みる
  const m = String(s).match(/^(.+?で)(.+)$/);
  if (m) return [m[1], m[2]];
  return wrapByCharCount(s, 12).slice(0, 2);
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

function pickFitting(text, candidates, maxLines) {
  for (const c of candidates) {
    const lines = wrapByCharCount(text, c.maxChars);
    if (lines.length <= maxLines) return { lines: lines.slice(0, maxLines), size: c.size };
  }
  const last = candidates[candidates.length - 1];
  return { lines: wrapByCharCount(text, last.maxChars).slice(0, maxLines), size: last.size };
}

function truncate(s, max) {
  const arr = [...String(s ?? '')];
  return arr.length <= max ? arr.join('') : arr.slice(0, max - 1).join('') + '…';
}

export const RENDERERS = {
  cover: renderCover,
  definition: renderDefinition,
  'figure-fullbleed': renderFigure,
  explanation: renderExplanation,
  'numbered-list': renderNumberedList,
  related: renderRelated,
  cta: renderCta,
};
