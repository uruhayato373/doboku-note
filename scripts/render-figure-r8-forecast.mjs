#!/usr/bin/env node
// content/note/技術士総監/magazines/r8-essay-forecast/img/ に本文用 PNG/SVG 図版 3 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
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
const OUT_DIR = join(ROOT, 'content/note/技術士総監/R8予想問題/img');
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
// 図 1: R8 予想 6 大テーマ スコア順一覧
// ------------------------------------------------------------------
function svgR8ThemesScore() {
  const rows = [
    { theme: '経済安全保障 × サプライチェーン強靱化', axis: '経 × 社 × 情', score: '9.0 / 10', color: DANGER },
    { theme: '資源循環 × サプライチェーン強靭化', axis: '経 × 社 × 情', score: '8.5 / 10', color: WARN },
    { theme: 'AI 社会 × 情報ガバナンス', axis: '情 × 安 × 経', score: '8.5 / 10', color: WARN },
    { theme: '気候変動適応 × グリーンインフラ', axis: '社 × 安 × 経', score: '8.0 / 10', color: BRAND },
    { theme: '災害復旧 × 複合災害対応', axis: '安 × 情 × 人', score: '8.0 / 10', color: BRAND },
    { theme: '老朽化インフラ × 予防保全', axis: '安 × 経 × 人', score: '7.5 / 10', color: POSITIVE },
  ];

  const headerH = 64;
  const rowH = 80;
  const tableX = 40;
  const tableW = W - 80;
  const wTheme = 660;
  const wAxis = 260;
  const wScore = tableW - wTheme - wAxis;
  const tableY = 130;

  const H = tableY + headerH + rows.length * rowH + 200;

  let body = '';

  // テーブルヘッダ
  body += `
  <rect x="${tableX}" y="${tableY}" width="${wTheme}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + 24}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff">テーマ</text>
  <rect x="${tableX + wTheme}" y="${tableY}" width="${wAxis}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + wTheme + wAxis / 2}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">5 管理主軸</text>
  <rect x="${tableX + wTheme + wAxis}" y="${tableY}" width="${wScore}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${tableX + wTheme + wAxis + wScore / 2}" y="${tableY + 42}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">予想スコア</text>`;

  let y = tableY + headerH;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;

    // 行背景
    body += `
  <rect x="${tableX}" y="${y}" width="${tableW}" height="${rowH}" fill="${fill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // テーマ名
    body += `
  <text x="${tableX + 24}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(r.theme)}</text>`;

    // 5 管理主軸
    body += `
  <text x="${tableX + wTheme + wAxis / 2}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="middle">${xml(r.axis)}</text>`;

    // 予想スコアバッジ
    const badgeW = 160;
    const badgeH = 48;
    const badgeX = tableX + wTheme + wAxis + (wScore - badgeW) / 2;
    body += `
  <rect x="${badgeX}" y="${y + (rowH - badgeH) / 2}" width="${badgeW}" height="${badgeH}" rx="8" fill="${r.color}"/>
  <text x="${badgeX + badgeW / 2}" y="${y + rowH / 2 + 10}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(r.score)}</text>`;

    y += rowH;
  }

  // キャプション
  const captY = y + 32;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="52" rx="6" fill="${BRAND_FILL}"/>
  <text x="${W / 2}" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}" text-anchor="middle">R7 白書の重点 + 足元の時事性 + 過去未消化論点から選定（的中保証なし）</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('R8 出題予想 6 大テーマ（スコア順）', '総合技術監理部門・記述式 R8 予想')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 三層構造フロー（解答骨子の組立手順）
// ------------------------------------------------------------------
function svgThreeLayerFlow() {
  const H = 960;

  const layers = [
    {
      no: '第 1 層',
      label: '管理対象',
      desc: '管理対象と前提条件を具体的に設定',
      example: '例: 自分の事業/組織を具体名で挙げ、顕在課題と既施策の問題点を仕込む',
      color: BRAND,
      fill: BRAND_FILL,
    },
    {
      no: '第 2 層',
      label: '施策とトレードオフ',
      desc: '5 年以内の施策 2 つ + 5 管理間トレードオフを明示',
      example: '例: 施策ごとに 2 つ以上の管理分野にまたがらせ、衝突と克服策を 1 文で示す',
      color: WARN,
      fill: WARN_FILL,
    },
    {
      no: '第 3 層',
      label: '将来展望と最大リスク',
      desc: '10-25 年後の国家施策 + 最大リスクへの対応',
      example: '例: 2050 年想定の国家施策 + 最大障害 → 管理行為（法制化・体制再設計）で克服',
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
    <marker id="arrDown" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto">
      <path d="M 0 0 L 0 10 L 10 5 z" fill="${INK_BODY}"/>
    </marker>
  </defs>`;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const y = startY + i * (boxH + boxGap);

    // 外枠
    body += `
  <rect x="${boxX}" y="${y}" width="${boxW}" height="${boxH}" rx="12" fill="#ffffff" stroke="${l.color}" stroke-width="3"/>`;

    // 左アクセント帯（番号+ラベル）
    const accentW = 280;
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

  const H = tableY + headerH + rows.length * rowH + 200;

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
