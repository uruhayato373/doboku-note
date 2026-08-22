/**
 * SNS 画像 SVG 共通プリミティブ。
 *
 * 既存 content/sns/x/draft/001 の手書き SVG パターンを踏襲。
 * Hiragino Sans + Noto Sans JP のフォント指定で IG/X 表示時に確実にフォールバックする。
 */

export const FONT = `'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif`;

// `.claude/design-system/svg-tokens.json` および `content/site/**/img/*.svg` と整合
export const COLORS = {
  white: '#ffffff',
  brandFill: '#e8f0fe',
  brand: '#2e6da4',
  brandDeep: '#1a3a5c',
  positive: '#3a7d44',
  positiveFill: '#e6f4ea',
  warn: '#d4a017',
  danger: '#b22234',
  surface: '#f5f5f5',
  surfaceLight: '#f8fafc',
  border: '#e5e7eb',
  inkStrong: '#222222',
  inkBody: '#555555',
  inkMuted: '#8a8a8a',
};

// 5 管理ピラーの色割当（001/002 共通）
export const MGMT_COLORS = {
  経済性管理: COLORS.brand,
  人的資源管理: '#a36b2c', // 既存設計で使われている橙系
  情報管理: '#2e6da4',
  安全管理: COLORS.danger,
  社会環境管理: COLORS.positive,
};

// 共通 XML エスケープ。SVG text 内に流し込む文字列は必ず通す
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 矩形
export function rect({ x, y, w, h, rx = 0, fill = COLORS.white, stroke, sw = 0 }) {
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${strokeAttr} />`;
}

// 円
export function circle({ cx, cy, r, fill }) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
}

// 直線
export function line({ x1, y1, x2, y2, stroke = COLORS.border, sw = 2 }) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" />`;
}

// 1 行テキスト
export function text({
  x, y,
  content,
  size = 32,
  weight = 400,
  fill = COLORS.inkStrong,
  anchor = 'start',
  baseline,
}) {
  const baselineAttr = baseline ? ` dominant-baseline="${baseline}"` : '';
  const weightAttr = weight ? ` font-weight="${weight}"` : '';
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"${weightAttr} fill="${fill}" text-anchor="${anchor}"${baselineAttr}>${esc(content)}</text>`;
}

// 複数行テキスト（折り返し済み行配列を tspan で並べる）
export function multilineText({ x, lines, size = 32, weight = 400, fill = COLORS.inkStrong, lineHeight = 1.4, startY }) {
  const dy = Math.round(size * lineHeight);
  const tspans = lines
    .map((ln, i) => `<tspan x="${x}" y="${startY + i * dy}">${esc(ln)}</tspan>`)
    .join('');
  const weightAttr = weight ? ` font-weight="${weight}"` : '';
  return `<text font-family="${FONT}" font-size="${size}"${weightAttr} fill="${fill}">${tspans}</text>`;
}

// 円 + 数字（4 択選択肢の番号アイコン）
export function numberedCircle({ cx, cy, r, num, bg = COLORS.brand, fg = COLORS.white }) {
  const fontSize = Math.round(r * 1.1);
  return [
    circle({ cx, cy, r, fill: bg }),
    `<text x="${cx}" y="${cy}" font-family="${FONT}" font-size="${fontSize}" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="central">${num}</text>`,
  ].join('\n  ');
}

// SVG ドキュメントラッパ
export function svgDoc({ width, height, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${rect({ x: 0, y: 0, w: width, h: height, fill: COLORS.white })}
${body}
</svg>`;
}

// フッター（doboku-note.com クレジット）— IG カルーセル用 (1080×1350)
export function igFooter() {
  return text({
    x: 1040,
    y: 1318,
    content: 'doboku-note.com',
    size: 24,
    fill: COLORS.inkMuted,
    anchor: 'end',
  });
}

// X 用フッター位置（1200×675）はテンプレ側で個別に配置
