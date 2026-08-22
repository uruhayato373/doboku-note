/**
 * frame-figure レンダラー — サイト図版SVGをSNS/YouTube画像に「枠付け」する決定論コード。
 *
 * 記事用の figure-N.svg（≤400-500幅・ブランド枠なし）を、SNSキャンバスに
 * ヘッダ（概念名＋管理色）＋図（中央・アスペクト維持）＋フッタ（送客）で合成しPNG化する。
 * 「一石二鳥」のSNS側を実現する核。描画は決定論なのでエージェントに委ねない（CLAUDE.md §5）。
 *
 * フォーマット:
 *   ig-single  1080×1350 (IG 4:5)  単一図ポスト
 *   yt-thumb   1280×720  (16:9)    YouTubeサムネ（左テキスト＋右図）
 *   vertical   1080×1920 (9:16)    Shorts/Reels/Stories（feed図を中央レターボックス）
 *
 * Usage:
 *   node .claude/scripts/sns/render-figure-sns.mjs --slug <slug> [--figure figure-1.svg] \
 *        --format ig-single|yt-thumb|vertical|both|all [--concept "..."] [--mgmt 社会環境管理]
 *
 * 出力: content/sns/figures/<slug>/<figure-stem>-<format>.png
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..'); // .claude/scripts/sns → repo root
const { svgDoc, text, rect, line, COLORS, MGMT_COLORS, FONT, esc } = await import(
  pathToFileURL(resolve(__dirname, 'lib', 'svg-base.mjs')).href
);

// --- args ---
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[++i]; }
}
const slug = args.slug;
if (!slug) { console.error('Error: --slug 必須'); process.exit(1); }
const figureName = typeof args.figure === 'string' ? args.figure : 'figure-1.svg';
const formatArg = typeof args.format === 'string' ? args.format : 'ig-single';
const formats = formatArg === 'both' ? ['ig-single', 'yt-thumb']
  : formatArg === 'all' ? ['ig-single', 'yt-thumb', 'vertical']
  : [formatArg];

const svgPath = resolve(ROOT, 'content/site/pe-comprehensive-management', slug, 'img', figureName);
if (!existsSync(svgPath)) { console.error(`Error: SVG not found: ${svgPath}`); process.exit(1); }
const figSvg = readFileSync(svgPath, 'utf8');

// concept: 引数優先、無ければ aria-label の先頭文
const ariaLabel = (figSvg.match(/aria-label="([^"]*)"/) || [])[1] || slug;
const concept = typeof args.concept === 'string' ? args.concept : ariaLabel.split(/[。．]/)[0];
const mgmt = typeof args.mgmt === 'string' ? args.mgmt : '社会環境管理';
const mgmtColor = MGMT_COLORS[mgmt] || COLORS.brand;

// --- 図SVG → PNG (dataURI)。site SVG のフォントは事前焼き込みが必須（resvg <image>内SVGはフォント解決不可） ---
const figR = new Resvg(figSvg, { fitTo: { mode: 'width', value: 1000 }, font: { loadSystemFonts: true } });
const figPng = figR.render();
const figW = figPng.width, figH = figPng.height;
const figAspect = figW / figH;
const figDataUri = `data:image/png;base64,${figPng.asPng().toString('base64')}`;

// 図を boxに収める（アスペクト維持・中央）
function fittedImage(boxX, boxY, boxW, boxH) {
  let w = boxW, h = boxW / figAspect;
  if (h > boxH) { h = boxH; w = boxH * figAspect; }
  const x = Math.round(boxX + (boxW - w) / 2);
  const y = Math.round(boxY + (boxH - h) / 2);
  return `<image href="${figDataUri}" x="${x}" y="${y}" width="${Math.round(w)}" height="${Math.round(h)}" preserveAspectRatio="xMidYMid meet" />`;
}

function buildIgSingle() {
  const W = 1080, H = 1350;
  const body = [
    rect({ x: 0, y: 0, w: W, h: 14, fill: mgmtColor }),                // 管理色トップバー
    text({ x: 60, y: 96, content: mgmt, size: 30, weight: 700, fill: mgmtColor }),
    text({ x: 60, y: 158, content: concept, size: 50, weight: 700, fill: COLORS.brandDeep }),
    rect({ x: 60, y: 190, w: 200, h: 6, rx: 3, fill: mgmtColor }),
    fittedImage(50, 230, W - 100, 950),                               // 図
    line({ x1: 60, y1: 1230, x2: W - 60, y2: 1230, stroke: COLORS.border, sw: 2 }),
    text({ x: 60, y: 1300, content: `詳しくは doboku-note：${concept}`, size: 30, fill: COLORS.inkBody }),
    text({ x: W - 40, y: 1330, content: 'doboku-note.com', size: 24, fill: COLORS.inkMuted, anchor: 'end' }),
  ].join('\n');
  return { svg: svgDoc({ width: W, height: H, body }), W };
}

function buildYtThumb() {
  const W = 1280, H = 720;
  const panelW = 540;
  // 概念を簡易折返し（全角約12字/行）
  const lines = [];
  let cur = '';
  for (const ch of concept) { cur += ch; if (cur.length >= 11) { lines.push(cur); cur = ''; } }
  if (cur) lines.push(cur);
  const titleLines = lines.slice(0, 4);
  const startY = 200 + (4 - titleLines.length) * 30;
  const titleSvg = titleLines.map((ln, i) => text({ x: 56, y: startY + i * 78, content: ln, size: 60, weight: 800, fill: COLORS.brandDeep })).join('\n');
  const body = [
    rect({ x: 0, y: 0, w: 16, h: H, fill: mgmtColor }),
    rect({ x: panelW, y: 0, w: W - panelW, h: H, fill: COLORS.surfaceLight }),
    text({ x: 56, y: 110, content: '技術士 総合技術監理', size: 30, weight: 700, fill: mgmtColor }),
    text({ x: 56, y: 150, content: mgmt, size: 28, weight: 700, fill: COLORS.inkMuted }),
    titleSvg,
    text({ x: 56, y: H - 48, content: 'doboku-note.com', size: 26, fill: COLORS.inkMuted }),
    fittedImage(panelW + 30, 40, W - panelW - 70, H - 80),
  ].join('\n');
  return { svg: svgDoc({ width: W, height: H, body }), W };
}

function buildVertical() {
  // 9:16。feed(4:5)図を中央の大きな箱にレターボックスし、上にヘッダ・下にCTA帯。
  const W = 1080, H = 1920;
  const body = [
    rect({ x: 0, y: 0, w: W, h: 16, fill: mgmtColor }),                 // 管理色トップバー
    text({ x: 60, y: 150, content: mgmt, size: 34, weight: 700, fill: mgmtColor }),
    text({ x: 60, y: 224, content: concept, size: 58, weight: 700, fill: COLORS.brandDeep }),
    rect({ x: 60, y: 262, w: 220, h: 7, rx: 3, fill: mgmtColor }),
    fittedImage(50, 330, W - 100, 1280),                               // 図（中央レターボックス）
    line({ x1: 60, y1: 1700, x2: W - 60, y2: 1700, stroke: COLORS.border, sw: 2 }),
    text({ x: 60, y: 1780, content: `詳しくは doboku-note：${concept}`, size: 34, fill: COLORS.inkBody }),
    text({ x: W - 50, y: 1850, content: 'doboku-note.com', size: 28, fill: COLORS.inkMuted, anchor: 'end' }),
  ].join('\n');
  return { svg: svgDoc({ width: W, height: H, body }), W };
}

const builders = { 'ig-single': buildIgSingle, 'yt-thumb': buildYtThumb, 'vertical': buildVertical };
const outDir = resolve(ROOT, 'content/sns/figures', slug);
mkdirSync(outDir, { recursive: true });
const stem = basename(figureName, '.svg');

for (const fmt of formats) {
  const b = builders[fmt];
  if (!b) { console.error(`Unknown format: ${fmt}`); continue; }
  const { svg, W } = b();
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true } }).render().asPng();
  const out = join(outDir, `${stem}-${fmt}.png`);
  writeFileSync(out, png);
  console.log(`[figure-sns] ${fmt} → content/sns/figures/${slug}/${stem}-${fmt}.png (${png.length} bytes)`);
}
