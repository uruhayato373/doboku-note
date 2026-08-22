#!/usr/bin/env node
// content/note/技術士総監/解答テンプレ3D/img/ に PNG/SVG 図版 3 枚を生成する。
// （2026-05-25 まで content/note/技術士総監/magazines/essay-template-3d/img/ に配置していたが、
//  単独記事の standard 配置〔content/note/技術士総監/{日本語名}/〕へ移動）
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-template-3d.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/解答テンプレ3D/img');
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
  return `
  <text x="${W - 20}" y="${H - 14}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: 3D マトリクス概念図（アイソメトリック投影）
// ------------------------------------------------------------------
function svgFig1() {
  const H = 880;

  // アイソメトリック投影のユーティリティ
  // isoX(col, row, layer) -> SVG x
  // isoY(col, row, layer) -> SVG y
  const originX = 540;
  const originY = 540;
  const cellW = 36;   // 1セルの幅（アイソ投影後、拡大して可読性向上）
  const cellH = 18;   // 1セルの高さ（アイソ投影後）
  const layerH = 56;  // Z軸1層分の高さ（拡大）

  // アイソメトリック変換
  function isoX(col, row, layer) {
    return originX + (col - row) * cellW;
  }
  function isoY(col, row, layer) {
    return originY + (col + row) * cellH - layer * layerH;
  }

  // 視認性向上のため、表示は 10 テーマ × 5 管理 × 3 ペルソナ に縮約
  // 「テーマ 20 のうち 10 を代表表示」というキャプションで全 300 セルの概念を伝える
  const COLS = 10; // X軸：テーマ数（縮約表示）
  const ROWS = 5;  // Y軸：5管理
  const LAYERS = 3; // Z軸：ペルソナ数

  // 色パレット（レイヤーごと）
  const layerColors = [
    { face: '#c8dff2', top: '#e8f4fd', stroke: BRAND },
    { face: '#b8e3c8', top: '#e6f5ec', stroke: POSITIVE },
    { face: '#fde8a8', top: '#fef8e0', stroke: WARN },
    { face: '#f2c0c4', top: '#fdeaec', stroke: DANGER },
  ];

  let body = '';

  // 後ろから前へ描画（ペインターズアルゴリズム）
  // layer=0 が最奥、layer=3 が最前
  for (let layer = 0; layer < LAYERS; layer++) {
    const lc = layerColors[layer];
    // row を後ろから前へ（大→小）
    for (let row = ROWS - 1; row >= 0; row--) {
      // col を後ろから前へ（大→小）
      for (let col = COLS - 1; col >= 0; col--) {
        // 4頂点（底面）
        const x00 = isoX(col, row, layer);
        const y00 = isoY(col, row, layer);
        const x10 = isoX(col + 1, row, layer);
        const y10 = isoY(col + 1, row, layer);
        const x11 = isoX(col + 1, row + 1, layer);
        const y11 = isoY(col + 1, row + 1, layer);
        const x01 = isoX(col, row + 1, layer);
        const y01 = isoY(col, row + 1, layer);

        // 上面
        const xt00 = isoX(col, row, layer + 1);
        const yt00 = isoY(col, row, layer + 1);
        const xt10 = isoX(col + 1, row, layer + 1);
        const yt10 = isoY(col + 1, row, layer + 1);
        const xt11 = isoX(col + 1, row + 1, layer + 1);
        const yt11 = isoY(col + 1, row + 1, layer + 1);
        const xt01 = isoX(col, row + 1, layer + 1);
        const yt01 = isoY(col, row + 1, layer + 1);

        // 左側面（col=col, row 方向）
        body += `<polygon points="${x00},${y00} ${xt00},${yt00} ${xt01},${yt01} ${x01},${y01}" fill="${lc.face}" stroke="${lc.stroke}" stroke-width="0.5" opacity="0.85"/>`;
        // 右側面（row=row, col 方向）
        body += `<polygon points="${x10},${y10} ${xt10},${yt10} ${xt00},${yt00} ${x00},${y00}" fill="${lc.face}" stroke="${lc.stroke}" stroke-width="0.5" opacity="0.75"/>`;
        // 上面
        body += `<polygon points="${xt00},${yt00} ${xt10},${yt10} ${xt11},${yt11} ${xt01},${yt01}" fill="${lc.top}" stroke="${lc.stroke}" stroke-width="0.5" opacity="0.9"/>`;
      }
    }
  }

  // 軸ラベル
  // X軸（テーマ）: col方向、row=0, layer=0
  const xAxisY = isoY(COLS, 0, 0) + 40;
  body += `
  <text x="${(isoX(0,0,0)+isoX(COLS,0,0))/2}" y="${xAxisY + 14}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND}" text-anchor="middle">← テーマ 20（DX・老朽化・脱炭素・担い手不足・防災…）→</text>`;

  // Y軸（5管理）: row方向、col=0, layer=0
  // 縦に等間隔で並べ、各ラベルから cube クラスタへ細い導線を引く
  const mgmtLabels = ['経済性', '人的資源', '情報', '安全', '社会環境'];
  const yLegendX = 100;
  const yLegendStartY = 320;
  const yLegendSpacing = 56;
  for (let row = 0; row < ROWS; row++) {
    const ly = yLegendStartY + row * yLegendSpacing;
    // ラベル背景
    body += `<rect x="${yLegendX - 70}" y="${ly - 24}" width="140" height="36" rx="6" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="1.5"/>`;
    body += `<text x="${yLegendX}" y="${ly}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">${xml(mgmtLabels[row])}</text>`;
    // 導線
    const tx = isoX(0, row, 0);
    const ty = isoY(0, row, 0) + 8;
    body += `<line x1="${yLegendX + 70}" y1="${ly - 6}" x2="${tx - 4}" y2="${ty - 4}" stroke="${BRAND}" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>`;
  }

  // Z軸（ペルソナ）: layer方向
  const personaLabels = ['ゼネコン', '河川コンサル', '道路発注者'];
  const personaColors = [BRAND, POSITIVE, DANGER];
  for (let layer = 0; layer < LAYERS; layer++) {
    const lx = isoX(COLS + 0.4, 0, layer) + 8;
    const ly = isoY(COLS + 0.4, 0, layer) + (isoY(COLS + 0.4, 0, layer + 1) - isoY(COLS + 0.4, 0, layer)) / 2 + 8;
    body += `<text x="${lx}" y="${ly}" font-family="${FONT}" font-size="22" font-weight="700" fill="${personaColors[layer]}">${xml(personaLabels[layer])}</text>`;
  }

  // 中央の数式バナー
  const bannerY = 130;
  body += `
  <rect x="320" y="${bannerY}" width="560" height="80" rx="12" fill="${BRAND_DEEP}"/>
  <text x="600" y="${bannerY + 36}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle">20 テーマ × 5 管理 × 3 ペルソナ</text>
  <text x="600" y="${bannerY + 68}" font-family="${FONT}" font-size="26" font-weight="700" fill="#facc15" text-anchor="middle">= 300 セル</text>`;

  // 軸ラベルボックス
  body += `
  <rect x="40" y="130" width="240" height="80" rx="10" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="160" y="164" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">X 軸：テーマ 20</text>
  <text x="160" y="196" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">Y 軸：5 管理</text>`;

  body += `
  <rect x="920" y="130" width="240" height="80" rx="10" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="1040" y="164" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">Z 軸：ペルソナ 3</text>
  <text x="1040" y="196" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}" text-anchor="middle">（業種別）</text>`;

  // キャプション
  const captY = H - 80;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="50" rx="8" fill="${BRAND_FILL}"/>
  <text x="60" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">テーマ × 5 管理 × ペルソナ ＝ 300 セルの逆引き辞書</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('3D マトリクス：テーマ × 5 管理 × ペルソナ = 300 セル', '20テーマ × 5管理 × 3ペルソナのアイソメトリック投影（代表 10 テーマ表示）')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 30 分骨子組立フロー（5 ステップ横長フローチャート）
// ------------------------------------------------------------------
function svgFig2() {
  const H = 760;

  const steps = [
    {
      time: '0-5 分',
      title: 'テーマ把握',
      desc: '5 管理の\nどれが主軸?',
      output: '主軸管理\nを決定',
      color: BRAND,
      fill: BRAND_FILL,
    },
    {
      time: '5-10 分',
      title: 'ペルソナ具体化',
      desc: '自分の業種で\n管理対象を特定',
      output: '管理対象\n1-2 個',
      color: POSITIVE,
      fill: POSITIVE_FILL,
    },
    {
      time: '10-20 分',
      title: '施策とトレードオフ',
      desc: '主要 3 施策 +\nトレードオフ列挙',
      output: '施策 3 個\nT/O 1-2 ペア',
      color: WARN,
      fill: WARN_FILL,
    },
    {
      time: '20-25 分',
      title: '将来展望',
      desc: '10 年展望 +\n最大リスク 1 つ',
      output: '展望 1 段落\nリスク + 対応',
      color: DANGER,
      fill: DANGER_FILL,
    },
    {
      time: '25-30 分',
      title: '全体見直し',
      desc: '誤字確認・\n論理の一貫性',
      output: '提出準備\n完了',
      color: INK_STRONG,
      fill: SURFACE_ALT,
    },
  ];

  const n = steps.length;
  const cardW = 190;
  const cardH = 340;
  const arrowW = 36;
  const totalW = cardW * n + arrowW * (n - 1);
  const startX = (W - totalW) / 2;
  const cardY = 140;

  let body = '';

  for (let i = 0; i < n; i++) {
    const s = steps[i];
    const cx = startX + i * (cardW + arrowW);
    const textColor = s.color === INK_STRONG ? '#ffffff' : '#ffffff';
    const headerBg = s.color;
    const cardBg = s.fill;

    // カード外枠
    body += `<rect x="${cx}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="${cardBg}" stroke="${s.color}" stroke-width="3"/>`;

    // 時間ヘッダ（上部）
    body += `<rect x="${cx}" y="${cardY}" width="${cardW}" height="54" rx="12" fill="${headerBg}"/>`;
    body += `<rect x="${cx}" y="${cardY + 36}" width="${cardW}" height="18" fill="${headerBg}"/>`;
    body += `<text x="${cx + cardW / 2}" y="${cardY + 34}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(s.time)}</text>`;

    // タイトル
    body += `<text x="${cx + cardW / 2}" y="${cardY + 92}" font-family="${FONT}" font-size="22" font-weight="800" fill="${s.color}" text-anchor="middle">${xml(s.title)}</text>`;

    // 仕切り線
    body += `<line x1="${cx + 20}" y1="${cardY + 108}" x2="${cx + cardW - 20}" y2="${cardY + 108}" stroke="${s.color}" stroke-width="1.5"/>`;

    // 説明テキスト（改行対応）
    const descLines = s.desc.split('\n');
    for (let j = 0; j < descLines.length; j++) {
      body += `<text x="${cx + cardW / 2}" y="${cardY + 144 + j * 32}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="middle">${xml(descLines[j])}</text>`;
    }

    // アウトプットラベル
    body += `<rect x="${cx + 16}" y="${cardY + 232}" width="${cardW - 32}" height="34" rx="6" fill="${s.color}" opacity="0.15"/>`;
    body += `<text x="${cx + cardW / 2}" y="${cardY + 222}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">アウトプット</text>`;

    // アウトプット値（改行対応）
    const outLines = s.output.split('\n');
    for (let j = 0; j < outLines.length; j++) {
      body += `<text x="${cx + cardW / 2}" y="${cardY + 252 + j * 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="${s.color}" text-anchor="middle">${xml(outLines[j])}</text>`;
    }

    // ステップ番号（下部）
    body += `<text x="${cx + cardW / 2}" y="${cardY + cardH - 16}" font-family="${FONT}" font-size="22" font-weight="800" fill="${s.color}" text-anchor="middle">STEP ${i + 1}</text>`;

    // 矢印（最後のカード以外）
    if (i < n - 1) {
      const ax = cx + cardW + 4;
      const ay = cardY + cardH / 2;
      body += `<polygon points="${ax},${ay - 14} ${ax + arrowW - 4},${ay} ${ax},${ay + 14}" fill="${INK_BODY}"/>`;
    }
  }

  // キャプション
  const captY = cardY + cardH + 40;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="50" rx="8" fill="${WARN_FILL}"/>
  <text x="60" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">30 分で 3,000 字級論文の骨格が完成</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('試験当日 30 分で骨子を組み立てる 5 ステップ', '時間割り × アウトプット × 役割を可視化')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 三層構造テンプレ図解（管理対象→施策→将来展望）
// ------------------------------------------------------------------
function svgFig3() {
  const H = 860;

  const layers = [
    {
      no: '第 1 層',
      title: '管理対象（宣言）',
      color: BRAND,
      fill: BRAND_FILL,
      role: 'テーマを 5 管理のどれで論じるか宣言',
      example: '例：「経済性管理を主軸、人的資源を副次」',
      chars: '200-300 字',
      charLabel: '字数目安',
    },
    {
      no: '第 2 層',
      title: '施策とトレードオフ（メイン）',
      color: WARN,
      fill: WARN_FILL,
      role: '主要 3 施策 + トレードオフ 1-2 ペア',
      example: '例：① BIM/CIM 導入 ② 教育投資 ③ 標準化 / T/O: 経×人',
      chars: '1,500-2,000 字',
      charLabel: '字数目安（論文の核心）',
    },
    {
      no: '第 3 層',
      title: '将来展望と最大リスク（締め）',
      color: POSITIVE,
      fill: POSITIVE_FILL,
      role: '10 年展望 + 最大リスク 1 つ + 対応策',
      example: '例：2035 年自動化 30% / 最大リスク: 雇用喪失 / 対応: リスキリング',
      chars: '500-700 字',
      charLabel: '字数目安',
    },
  ];

  // 中央カラム（メイン）の寸法
  const mainX = 60;
  const mainW = 760;
  const sideX = mainX + mainW + 40;
  const sideW = W - sideX - 40;
  const layerH = [140, 220, 160]; // 各層の高さ
  const gapH = 20;
  const startY = 130;

  let body = '';
  let currentY = startY;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const h = layerH[i];

    // メインカード
    body += `<rect x="${mainX}" y="${currentY}" width="${mainW}" height="${h}" rx="12" fill="${l.fill}" stroke="${l.color}" stroke-width="3"/>`;
    // 左帯
    body += `<rect x="${mainX}" y="${currentY}" width="10" height="${h}" rx="6" fill="${l.color}"/>`;
    // 層番号バッジ
    body += `<rect x="${mainX + 20}" y="${currentY + 16}" width="120" height="36" rx="6" fill="${l.color}"/>`;
    body += `<text x="${mainX + 80}" y="${currentY + 40}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(l.no)}</text>`;
    // タイトル
    body += `<text x="${mainX + 160}" y="${currentY + 42}" font-family="${FONT}" font-size="26" font-weight="800" fill="${l.color}">${xml(l.title)}</text>`;
    // 役割
    body += `<text x="${mainX + 24}" y="${currentY + 84}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">${xml(l.role)}</text>`;
    // 例
    body += `<text x="${mainX + 24}" y="${currentY + 118}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(l.example)}</text>`;
    // 第2層のみ追記（トレードオフ詳細）
    if (i === 1) {
      body += `<text x="${mainX + 24}" y="${currentY + 158}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">施策ごとに：① 問題 → ② 対策 → ③ 効果 → ④ トレードオフ → ⑤ 緩和策</text>`;
      body += `<text x="${mainX + 24}" y="${currentY + 194}" font-family="${FONT}" font-size="22" fill="${INK_MUTED}">（合格論文の黄金パターン：5 要素を 1 施策 400-600 字で展開）</text>`;
    }

    // サイドカード（字数 + 役割）
    body += `<rect x="${sideX}" y="${currentY}" width="${sideW}" height="${h}" rx="12" fill="#ffffff" stroke="${l.color}" stroke-width="2"/>`;
    body += `<rect x="${sideX}" y="${currentY}" width="${sideW}" height="52" rx="12" fill="${l.color}"/>`;
    body += `<rect x="${sideX}" y="${currentY + 38}" width="${sideW}" height="14" fill="${l.color}"/>`;
    body += `<text x="${sideX + sideW / 2}" y="${currentY + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(l.charLabel)}</text>`;
    body += `<text x="${sideX + sideW / 2}" y="${currentY + h / 2 + 20}" font-family="${FONT}" font-size="28" font-weight="800" fill="${l.color}" text-anchor="middle">${xml(l.chars)}</text>`;

    // 矢印（最後以外）
    if (i < layers.length - 1) {
      const arrowX = mainX + mainW / 2;
      const arrowY = currentY + h;
      body += `<polygon points="${arrowX - 20},${arrowY} ${arrowX + 20},${arrowY} ${arrowX},${arrowY + gapH}" fill="${layers[i + 1].color}"/>`;
    }

    currentY += h + gapH;
  }

  // キャプション
  const captY = currentY + 20;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="50" rx="8" fill="${POSITIVE_FILL}"/>
  <text x="60" y="${captY + 34}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">この骨格に沿えば 3 ペルソナ × 20 テーマで応用可能</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('三層構造テンプレ（合格論文の標準骨格）', '管理対象の宣言 → 施策とトレードオフ → 将来展望と最大リスク')}
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
  console.log('Rendering figures for essay-template-3d…');
  await render(svgFig1(), 'figure-01-3d-matrix.png');
  await render(svgFig2(), 'figure-02-30min-flow.png');
  await render(svgFig3(), 'figure-03-three-layer-template.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
