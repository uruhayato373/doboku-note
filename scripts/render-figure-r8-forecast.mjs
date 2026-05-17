#!/usr/bin/env node
// docs/note/magazines/r8-essay-forecast/img/ に本文用 PNG/SVG 図版 3 枚を生成する。
//
// 設計ルール（docs/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプション 22px 含む）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-r8-forecast.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/magazines/r8-essay-forecast/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン
const BRAND = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';
const POSITIVE_FILL = '#e6f1e8';
const WARN = '#d4a017';
const WARN_FILL = '#fbf3df';
const DANGER = '#b22234';
const DANGER_FILL = '#fbe5e7';
const SURFACE_ALT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function header(title, subtitle) {
  return `
  <text x="40" y="60" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">${xml(title)}</text>
  <text x="40" y="96" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(subtitle)}</text>`;
}

function brandMark(H) {
  return `<text x="${W - 20}" y="${H - 16}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: R8 予想 3 大テーマスコア比較
// ------------------------------------------------------------------
function svgR8ThemesScore() {
  const H = 780;

  const themes = [
    {
      title: '資源循環 ×\nサプライチェーン\n強靭化',
      score: '8.5 / 10',
      badge: '最有力候補',
      tradeoff: '経×社 / 安×社 / 経×人',
      color: DANGER,
      fill: DANGER_FILL,
    },
    {
      title: '気候変動適応 ×\nグリーンインフラ',
      score: '8.0 / 10',
      badge: '対抗候補',
      tradeoff: '経×社 / 安×社 / 情×人',
      color: WARN,
      fill: WARN_FILL,
    },
    {
      title: '少子高齢化\n深化',
      score: '7.5 / 10',
      badge: '3 派生パターン',
      tradeoff: '経×人 / 情×人 / 情×経',
      color: BRAND,
      fill: BRAND_FILL,
    },
  ];

  const cardW = 340;
  const cardH = 520;
  const cardGap = 30;
  const totalW = cardW * 3 + cardGap * 2;
  const startX = (W - totalW) / 2;
  const cardY = 130;

  let body = '';

  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    const x = startX + i * (cardW + cardGap);

    // カード背景
    body += `
  <rect x="${x}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${t.color}" stroke-width="3"/>`;

    // カードヘッダ
    body += `
  <rect x="${x}" y="${cardY}" width="${cardW}" height="80" rx="12" fill="${t.color}"/>
  <rect x="${x}" y="${cardY + 68}" width="${cardW}" height="12" fill="${t.color}"/>`;

    // バッジ
    body += `
  <text x="${x + cardW / 2}" y="${cardY + 52}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.badge)}</text>`;

    // テーマタイトル（3行対応）
    const lines = t.title.split('\n');
    const lineH = 40;
    const titleStartY = cardY + 120;
    for (let li = 0; li < lines.length; li++) {
      body += `
  <text x="${x + cardW / 2}" y="${titleStartY + li * lineH}" font-family="${FONT}" font-size="26" font-weight="800" fill="${t.color}" text-anchor="middle">${xml(lines[li])}</text>`;
    }

    // スコア
    const scoreY = cardY + 260;
    body += `
  <text x="${x + cardW / 2}" y="${scoreY}" font-family="${FONT}" font-size="48" font-weight="800" fill="${t.color}" text-anchor="middle">${xml(t.score)}</text>
  <text x="${x + cardW / 2}" y="${scoreY + 36}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}" text-anchor="middle">予想スコア</text>`;

    // 区切り線
    body += `
  <line x1="${x + 24}" y1="${scoreY + 60}" x2="${x + cardW - 24}" y2="${scoreY + 60}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // トレードオフ
    const tradeY = scoreY + 100;
    body += `
  <text x="${x + cardW / 2}" y="${tradeY - 20}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">想定トレードオフ</text>
  <rect x="${x + 20}" y="${tradeY}" width="${cardW - 40}" height="60" rx="8" fill="${t.fill}"/>
  <text x="${x + cardW / 2}" y="${tradeY + 40}" font-family="${FONT}" font-size="22" font-weight="700" fill="${t.color}" text-anchor="middle">${xml(t.tradeoff)}</text>`;
  }

  // キャプション
  const captY = cardY + cardH + 32;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="52" rx="6" fill="${BRAND_FILL}"/>
  <text x="${W / 2}" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}" text-anchor="middle">過去 9 年検証で 60-70% 的中。3 テーマのいずれか出題確率が高い</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('R08 出題予想 3 大テーマ（スコア順）', '総合技術監理部門・記述式 R8 予想')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 三層構造フロー（解答骨子の組立手順）
// ------------------------------------------------------------------
function svgThreeLayerFlow() {
  const H = 860;

  const layers = [
    {
      no: '第 1 層',
      label: '管理対象',
      desc: 'テーマを 5 管理のどれで論じるか宣言',
      example: '例: 資源循環 → 経済性管理を主軸、社会環境管理を副次',
      color: BRAND,
      fill: BRAND_FILL,
    },
    {
      no: '第 2 層',
      label: '施策とトレードオフ',
      desc: '主要 3 施策 + トレードオフ明示',
      example: '例: ① 再資源化施設整備 ② サプライチェーン可視化 ③ 廃棄物 KPI 設定\n     + 経済性 vs 社会環境のトレードオフ',
      color: WARN,
      fill: WARN_FILL,
    },
    {
      no: '第 3 層',
      label: '将来展望と最大リスク',
      desc: '10 年展望 + 最大リスクへの対応',
      example: '例: 2035 年 CN 達成 / 最大リスク = 国際資源価格変動 → 代替素材研究強化',
      color: POSITIVE,
      fill: POSITIVE_FILL,
    },
  ];

  const boxW = 1100;
  const boxH = 180;
  const boxX = (W - boxW) / 2;
  const startY = 140;
  const boxGap = 56; // 矢印スペース含む

  let body = '';

  // 矢印定義
  body += `
  <defs>
    <marker id="arrDown" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="10" markerHeight="10" orient="auto">
      <path d="M 0 0 L 10 0 L 5 10 z" fill="${INK_BODY}"/>
    </marker>
  </defs>`;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const y = startY + i * (boxH + boxGap);

    // 外枠
    body += `
  <rect x="${boxX}" y="${y}" width="${boxW}" height="${boxH}" rx="12" fill="#ffffff" stroke="${l.color}" stroke-width="3"/>`;

    // 左アクセント帯（番号+ラベル）
    const accentW = 200;
    body += `
  <rect x="${boxX}" y="${y}" width="${accentW}" height="${boxH}" rx="12" fill="${l.color}"/>
  <rect x="${boxX + accentW - 12}" y="${y}" width="12" height="${boxH}" fill="${l.color}"/>`;

    body += `
  <text x="${boxX + accentW / 2}" y="${y + 68}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(l.no)}</text>
  <text x="${boxX + accentW / 2}" y="${y + 110}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(l.label)}</text>`;

    // 右コンテンツエリア
    const contentX = boxX + accentW + 24;
    body += `
  <text x="${contentX}" y="${y + 52}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(l.desc)}</text>`;

    // 例文（2行対応）
    const exLines = l.example.split('\n');
    for (let li = 0; li < exLines.length; li++) {
      body += `
  <text x="${contentX}" y="${y + 98 + li * 36}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(exLines[li])}</text>`;
    }

    // 矢印（最後の層はなし）
    if (i < layers.length - 1) {
      const arrowY1 = y + boxH;
      const arrowY2 = y + boxH + boxGap - 4;
      const cx = W / 2;
      body += `
  <line x1="${cx}" y1="${arrowY1}" x2="${cx}" y2="${arrowY2}" stroke="${INK_BODY}" stroke-width="4" marker-end="url(#arrDown)"/>`;
    }
  }

  // キャプション
  const captY = startY + layers.length * (boxH + boxGap) - boxGap + 16;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="52" rx="6" fill="${BRAND_FILL}"/>
  <text x="${W / 2}" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}" text-anchor="middle">30 分で全テーマに適用できる骨子テンプレ</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('三層構造テンプレ（管理対象 → 施策 → 将来展望）', '解答骨子の組立手順')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 5 大トレードオフ早見表
// ------------------------------------------------------------------
function svgTradeoffTypes() {
  const rows = [
    { type: '経×人', content: 'コスト削減 vs 人材確保', example: '自動化建機導入で雇用減', color: BRAND },
    { type: '情×人', content: 'DX 推進 vs リスキリング', example: '高齢技術者の置き換え難', color: POSITIVE },
    { type: '情×経', content: 'データ統合 vs 初期投資', example: 'BIM/CIM の Phase 投入', color: WARN },
    { type: '効率化×安全', content: '工期短縮 vs 事故リスク', example: '24 時間施工の災害発生率上昇', color: DANGER },
    { type: '経×社', content: '採算性 vs 環境保全', example: '再エネ転換のコスト負担', color: INK_STRONG },
  ];

  const headerH = 64;
  const rowH = 80;
  const tableX = 40;
  const tableW = W - 80;
  const wType = 200;
  const wContent = 420;
  const wExample = tableW - wType - wContent;
  const tableY = 130;

  const H = tableY + headerH + rows.length * rowH + 120;

  let body = '';

  // テーブルヘッダ
  body += `
  <rect x="${tableX}" y="${tableY}" width="${wType}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + wType / 2}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">型</text>
  <rect x="${tableX + wType}" y="${tableY}" width="${wContent}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + wType + wContent / 2}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">内容</text>
  <rect x="${tableX + wType + wContent}" y="${tableY}" width="${wExample}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + wType + wContent + wExample / 2}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">典型例</text>`;

  let y = tableY + headerH;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;

    // 行背景
    body += `
  <rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${fill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // 型（色付きバッジ）
    body += `
  <rect x="${tableX + 16}" y="${y + (rowH - 48) / 2}" width="${wType - 32}" height="48" rx="8" fill="${r.color}"/>
  <text x="${tableX + wType / 2}" y="${y + rowH / 2 + 10}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(r.type)}</text>`;

    // 内容
    body += `
  <text x="${tableX + wType + 20}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK_STRONG}">${xml(r.content)}</text>`;

    // 典型例
    body += `
  <text x="${tableX + wType + wContent + 20}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(r.example)}</text>`;

    y += rowH;
  }

  // キャプション
  const captY = y + 24;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="52" rx="6" fill="${BRAND_FILL}"/>
  <text x="${W / 2}" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}" text-anchor="middle">これら 5 型のいずれかが R8 でも論点として組み込まれる</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('R8 想定 5 大トレードオフ型', '記述式で問われる管理間競合の早見表')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// レンダリング
// ------------------------------------------------------------------
async function render(svg, outName) {
  const svgPath = join(OUT_DIR, outName.replace(/\.png$/, '.svg'));
  const pngPath = join(OUT_DIR, outName);
  writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`  ok: ${outName}`);
}

async function main() {
  console.log('Rendering figures for r8-essay-forecast…');
  await render(svgR8ThemesScore(), 'figure-01-r8-themes-score.png');
  await render(svgThreeLayerFlow(), 'figure-02-three-layer-flow.png');
  await render(svgTradeoffTypes(), 'figure-03-tradeoff-types.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
