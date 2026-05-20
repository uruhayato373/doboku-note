#!/usr/bin/env node
// docs/note/magazines/総監模範論文-道路発注者/img/ に図版 1 枚 (SVG + PNG) を生成する。
//
// 設計ルール（docs/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200、高さ 900（3 セクション縦積み、表 3 行を見切れなく収める）
//   - フォント ≥ 22px（補足を含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-essay-persona-road-municipality.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/magazines/総監模範論文-道路発注者/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン
const BRAND      = '#2e6da4';
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY   = '#555555';
const INK_MUTED  = '#8a8a8a';
const POSITIVE   = '#3a7d44';
const POSITIVE_FILL = '#e6f1e8';
const WARN       = '#d4a017';
const WARN_FILL  = '#fbf3df';
const DANGER     = '#b22234';
const DANGER_FILL = '#fbe5e7';
const SURFACE_ALT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';

const FONT = "Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif";
const W = 1200;
const H = 900;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 管理色マップ
const MGMT_COLOR = {
  '経済性': BRAND,
  '安全':   DANGER,
  '人的資源': WARN,
  '情報':   POSITIVE,
  '社会環境': INK_STRONG,
};
const MGMT_FILL = {
  '経済性': BRAND_FILL,
  '安全':   DANGER_FILL,
  '人的資源': WARN_FILL,
  '情報':   POSITIVE_FILL,
  '社会環境': '#f0f0f0',
};

// 管理ラベルバッジ（色付き pill）
function mgmtBadge(label, x, y) {
  const col  = MGMT_COLOR[label] ?? INK_STRONG;
  const fill = MGMT_FILL[label]  ?? '#f0f0f0';
  const w = label.length <= 3 ? 88 : 110;
  return `
  <rect x="${x}" y="${y - 20}" width="${w}" height="30" rx="6" fill="${fill}" stroke="${col}" stroke-width="1.5"/>
  <text x="${x + w / 2}" y="${y + 5}" font-family="${FONT}" font-size="18" font-weight="700" fill="${col}" text-anchor="middle">${xml(label)}</text>`;
}

// ×記号
function cross(x, y) {
  return `<text x="${x}" y="${y + 5}" font-family="${FONT}" font-size="20" fill="${INK_MUTED}" text-anchor="middle">×</text>`;
}

function svgPersonaProfile() {
  // --- セクション Y 座標 ---
  const titleY    = 52;
  const subY      = 92;
  const sec1Y     = 125;  // ペルソナ概要ヘッダ
  const sec2Y     = 240;  // トレードオフ ヘッダ
  const sec3Y     = 524;  // 年度別テーブル ヘッダ（Section 2 ③カード底 520 と衝突回避）

  // --- ① ペルソナ概要バー ---
  const personaItems = [
    { icon: '所属', value: '地方自治体 道路維持課' },
    { icon: '管内', value: '橋梁 約500橋' },
    { icon: '立場', value: '課長補佐' },
    { icon: '業務', value: '維持管理・予防保全・住民対応' },
  ];
  const pBarH = 68;
  const pColW = (W - 80) / personaItems.length;
  let personaCards = '';
  for (let i = 0; i < personaItems.length; i++) {
    const px = 40 + i * pColW;
    const bgColor = i % 2 === 0 ? BRAND_FILL : '#f0f4fa';
    personaCards += `
  <rect x="${px}" y="${sec1Y + 44}" width="${pColW - 8}" height="${pBarH}" rx="6" fill="${bgColor}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${px + 12}" y="${sec1Y + 44 + 22}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}">${xml(personaItems[i].icon)}</text>
  <text x="${px + 12}" y="${sec1Y + 44 + 52}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(personaItems[i].value)}</text>`;
  }

  // --- ② トレードオフ 3行カード ---
  const tradeoffs = [
    {
      label: '① 経済性 × 安全',
      desc:  '予算制約  vs  公衆安全確保（橋梁健全性診断・補修費）',
      left:  '経済性',
      right: '安全',
    },
    {
      label: '② 経済性 × 社会環境',
      desc:  'コスト削減  vs  住民合意・説明責任（CN 対応・用地取得）',
      left:  '経済性',
      right: '社会環境',
    },
    {
      label: '③ 人的資源 × 経済性',
      desc:  '熟練退職・採用難  vs  業務委託コスト（技術継承の危機）',
      left:  '人的資源',
      right: '経済性',
    },
  ];

  const cardH = 68;
  const cardGap = 16;
  let tradeoffCards = '';
  for (let i = 0; i < tradeoffs.length; i++) {
    const ty = sec2Y + 44 + i * (cardH + cardGap);
    const t = tradeoffs[i];

    // カード背景
    tradeoffCards += `
  <rect x="40" y="${ty}" width="${W - 80}" height="${cardH}" rx="6" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // 左: 連番ラベル
    tradeoffCards += `
  <text x="60" y="${ty + 40}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}">${xml(t.label.slice(0, 2))}</text>`;

    // 管理バッジ（左）
    const bx1 = 100;
    tradeoffCards += mgmtBadge(t.left, bx1, ty + 35);
    // ×
    const bw1 = t.left.length <= 3 ? 88 : 110;
    tradeoffCards += cross(bx1 + bw1 + 18, ty + 35);
    // 管理バッジ（右）
    const bx2 = bx1 + bw1 + 36;
    tradeoffCards += mgmtBadge(t.right, bx2, ty + 35);

    // 説明テキスト
    const bw2 = t.right.length <= 3 ? 88 : 110;
    const descX = bx2 + bw2 + 30;
    tradeoffCards += `
  <text x="${descX}" y="${ty + 40}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(t.desc)}</text>`;
  }

  // --- ③ 年度別テーブル ---
  const rows = [
    {
      year:   'R05',
      theme:  'SWOT 戦略立案',
      detail: 'データ予防保全・ナレッジ化・DX 施工合理化',
      pairs:  ['経済性', '情報', '人的資源', '社会環境'],
    },
    {
      year:   'R06',
      theme:  'CN 対応（バイパス整備）',
      detail: '電動建機・BIM/CIM・J クレジット・性能規定',
      pairs:  ['社会環境', '経済性'],
    },
    {
      year:   'R07',
      theme:  '橋梁長寿命化 / 少子高齢化',
      detail: 'AI 診断・KM 形式知化・ダウンサイジング',
      pairs:  ['経済性', '安全', '人的資源'],
    },
  ];

  const rowH = 72;
  const colXs = [40, 140, 400, 780];  // 年度 | テーマ | 詳細 | 主要管理ペア
  const colWs = [90, 248, 368, W - 80 - 780 + 40];
  const colLabels = ['年度', 'テーマ', '施策概要', '主要 5 管理ペア'];

  // ヘッダ行
  let tableHeader = `
  <rect x="40" y="${sec3Y + 44}" width="${W - 80}" height="44" rx="6" fill="${BRAND_DEEP}"/>`;
  for (let c = 0; c < colLabels.length; c++) {
    tableHeader += `
  <text x="${colXs[c] + 10}" y="${sec3Y + 44 + 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff">${xml(colLabels[c])}</text>`;
  }

  // データ行
  let tableRows = '';
  for (let i = 0; i < rows.length; i++) {
    const ry = sec3Y + 44 + 44 + i * rowH;
    const bg = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    const r = rows[i];

    tableRows += `
  <rect x="40" y="${ry}" width="${W - 80}" height="${rowH}" fill="${bg}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // 年度
    tableRows += `
  <text x="${colXs[0] + 10}" y="${ry + 42}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND}">${xml(r.year)}</text>`;

    // テーマ
    tableRows += `
  <text x="${colXs[1] + 10}" y="${ry + 42}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(r.theme)}</text>`;

    // 詳細
    tableRows += `
  <text x="${colXs[2] + 10}" y="${ry + 42}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(r.detail)}</text>`;

    // 管理バッジ列
    let bx = colXs[3] + 10;
    for (let j = 0; j < r.pairs.length; j++) {
      const p = r.pairs[j];
      tableRows += mgmtBadge(p, bx, ry + 36);
      const bw = p.length <= 3 ? 88 : 110;
      bx += bw + 8;
    }
  }

  // --- ブランド識別 ---
  const brand = `
  <text x="${W - 20}" y="${H - 12}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;

  // --- SVG 組み立て ---
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <!-- タイトル -->
  <text x="40" y="${titleY}" font-family="${FONT}" font-size="30" font-weight="800" fill="${INK_STRONG}">地方自治体 道路維持課 課長補佐｜典型 5 管理トレードオフ・プロファイル</text>
  <text x="40" y="${subY}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">技術士 総合技術監理部門 記述式 模範論文（R05-R07）道路発注者ペルソナ</text>

  <!-- Section 1: ペルソナ概要 -->
  <text x="40" y="${sec1Y + 26}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}">▍ペルソナ概要</text>
  ${personaCards}

  <!-- Section 2: 主要 5 管理トレードオフ -->
  <text x="40" y="${sec2Y + 26}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}">▍主要 5 管理トレードオフ</text>
  ${tradeoffCards}

  <!-- Section 3: 年度別テーブル -->
  <text x="40" y="${sec3Y + 26}" font-family="${FONT}" font-size="24" font-weight="800" fill="${BRAND_DEEP}">▍年度別 出題テーマ × 主要管理ペア</text>
  ${tableHeader}
  ${tableRows}

  ${brand}
</svg>`;
}

async function main() {
  const svg = svgPersonaProfile();
  const svgPath = join(OUT_DIR, 'figure-persona-profile.svg');
  const pngPath = join(OUT_DIR, 'figure-persona-profile.png');

  writeFileSync(svgPath, svg, 'utf8');
  console.log(`SVG written: ${svgPath}`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(pngPath);
  console.log(`PNG written: ${pngPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
