#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監模範論文-ゼネコン/img/ にペルソナ・プロファイル図版 1 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200 固定
//   - フォント ≥ 22px（補足 18px まで許容）
//   - カラートークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-essay-persona-general-contractor.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監模範論文-ゼネコン/img');
mkdirSync(OUT_DIR, { recursive: true });

// カラートークン（src/styles/globals.css と整合）
const BRAND = '#2e6da4';      // 経済性管理
const BRAND_FILL = '#e8f0fe';
const BRAND_DEEP = '#1a3a5c';
const INK_STRONG = '#222222';
const INK_BODY = '#555555';
const INK_MUTED = '#8a8a8a';
const POSITIVE = '#3a7d44';   // 情報管理
const POSITIVE_FILL = '#e6f1e8';
const WARN = '#d4a017';       // 人的資源管理
const WARN_FILL = '#fbf3df';
const DANGER = '#b22234';     // 安全管理
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

// ------------------------------------------------------------------
// 図: ゼネコン土木支店 工事部長｜典型 5 管理トレードオフ・プロファイル
// ------------------------------------------------------------------
function svgPersonaProfile() {
  const H = 860;
  const PAD = 40;

  // ─── ヘッダ ───────────────────────────────────────────────────────
  const titleY = 52;
  const subtitleY = 84;

  // ─── ペルソナカード（上部） ─────────────────────────────────────
  const cardY = 110;
  const cardH = 100;
  const cardRx = 8;
  // カード内 3 列レイアウト
  const col1X = PAD + 20;
  const col2X = PAD + 360;
  const col3X = PAD + 740;
  const cardTextY1 = cardY + 36;
  const cardTextY2 = cardY + 68;
  const cardTextY3 = cardY + 92;

  // ─── 主要 5 管理トレードオフ（中部 3 行） ──────────────────────
  // セクション見出し
  const secY = cardY + cardH + 28;
  const secH = 40;

  // 行の定義
  const rowStartY = secY + secH + 8;
  const rowH = 110;
  const rowGap = 8;

  // 各行: ラベルW=180, 左バッジW=220, 矢印40, 右バッジW=220, 解決フレームW残

  const labelW = 160;
  const badgeW = 244;
  const arrowW = 48;
  const solveW = W - PAD * 2 - labelW - badgeW - arrowW - badgeW - 16;
  const labelX = PAD;
  const leftBadgeX = labelX + labelW + 8;
  const arrowX = leftBadgeX + badgeW + 4;
  const rightBadgeX = arrowX + arrowW + 4;
  const solveX = rightBadgeX + badgeW + 8;

  const tradeoffs = [
    {
      no: '①',
      left: '経済性管理',
      leftSub: '採算・利益率の確保',
      leftColor: BRAND,
      right: '安全管理',
      rightSub: '公衆・作業員の災害防止',
      rightColor: DANGER,
      solve: '解決: ALARP 原則による合理的コスト配分',
    },
    {
      no: '②',
      left: '経済性管理',
      leftSub: 'コスト削減・工期短縮',
      leftColor: BRAND,
      right: '人的資源管理',
      rightSub: '2024年問題・担い手不足対応',
      rightColor: WARN,
      solve: '解決: 自動化建機・ICT施工で生産性向上',
    },
    {
      no: '③',
      left: '情報管理',
      leftSub: 'BIM/CIM・DX システム投資',
      leftColor: POSITIVE,
      right: '経済性管理',
      rightSub: '初期コスト・ROI 回収期間',
      rightColor: BRAND,
      solve: '解決: 段階導入・共通基盤化で費用対効果確保',
    },
  ];

  let body = '';

  // ─── ペルソナカード描画 ─────────────────────────────────────────
  body += `
  <rect x="${PAD}" y="${cardY}" width="${W - PAD * 2}" height="${cardH}" rx="${cardRx}" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2"/>
  <text x="${col1X}" y="${cardTextY1}" font-family="${FONT}" font-size="18" font-weight="800" fill="${BRAND_DEEP}">組織</text>
  <text x="${col1X}" y="${cardTextY2}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">大手ゼネコン 土木支店</text>
  <text x="${col1X}" y="${cardTextY3}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">売上 1,000〜3,000 億円規模</text>

  <text x="${col2X}" y="${cardTextY1}" font-family="${FONT}" font-size="18" font-weight="800" fill="${BRAND_DEEP}">立場</text>
  <text x="${col2X}" y="${cardTextY2}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">工事部長</text>
  <text x="${col2X}" y="${cardTextY3}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">複数現場の総括・安全・原価・技術調整</text>

  <text x="${col3X}" y="${cardTextY1}" font-family="${FONT}" font-size="18" font-weight="800" fill="${BRAND_DEEP}">業務領域</text>
  <text x="${col3X}" y="${cardTextY2}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">道路・橋梁・トンネル 元請</text>
  <text x="${col3X}" y="${cardTextY3}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">1〜5 年工期 / 1 案件 1〜数十億円規模</text>`;

  // ─── セクション見出し（主要トレードオフ） ─────────────────────
  body += `
  <rect x="${PAD}" y="${secY}" width="${W - PAD * 2}" height="${secH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${PAD + 16}" y="${secY + 28}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff">主要 5 管理トレードオフ（典型 3 パターン）</text>`;

  // ─── カラム見出し ─────────────────────────────────────────────
  const colHeadY = rowStartY;
  const colHeadH = 36;
  body += `
  <text x="${labelX + labelW / 2}" y="${colHeadY + 24}" font-family="${FONT}" font-size="18" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">No.</text>
  <text x="${leftBadgeX + badgeW / 2}" y="${colHeadY + 24}" font-family="${FONT}" font-size="18" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">経済性側の要請</text>
  <text x="${rightBadgeX + badgeW / 2}" y="${colHeadY + 24}" font-family="${FONT}" font-size="18" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">対立する管理の要請</text>
  <text x="${solveX + solveW / 2}" y="${colHeadY + 24}" font-family="${FONT}" font-size="18" font-weight="700" fill="${INK_MUTED}" text-anchor="middle">解決フレーム</text>`;

  const dataStartY = rowStartY + colHeadH + 4;

  // ─── トレードオフ行 ────────────────────────────────────────────
  for (let i = 0; i < tradeoffs.length; i++) {
    const t = tradeoffs[i];
    const rowY = dataStartY + i * (rowH + rowGap);
    const midY = rowY + rowH / 2;
    const innerRowH = rowH - 2;

    // 背景
    const rowBg = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    body += `
  <rect x="${PAD}" y="${rowY}" width="${W - PAD * 2}" height="${innerRowH}" rx="6" fill="${rowBg}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

    // No. バッジ
    body += `
  <text x="${labelX + labelW / 2}" y="${midY + 9}" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK_STRONG}" text-anchor="middle">${xml(t.no)}</text>`;

    // 左バッジ（経済性側）
    body += `
  <rect x="${leftBadgeX}" y="${rowY + 12}" width="${badgeW}" height="${rowH - 24}" rx="8" fill="${t.leftColor}"/>
  <text x="${leftBadgeX + badgeW / 2}" y="${midY - 4}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.left)}</text>
  <text x="${leftBadgeX + badgeW / 2}" y="${midY + 22}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(t.leftSub)}</text>`;

    // 矢印（vs）
    body += `
  <text x="${arrowX + arrowW / 2}" y="${midY + 10}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_MUTED}" text-anchor="middle">vs</text>`;

    // 右バッジ（対立管理）
    body += `
  <rect x="${rightBadgeX}" y="${rowY + 12}" width="${badgeW}" height="${rowH - 24}" rx="8" fill="${t.rightColor}"/>
  <text x="${rightBadgeX + badgeW / 2}" y="${midY - 4}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.right)}</text>
  <text x="${rightBadgeX + badgeW / 2}" y="${midY + 22}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(t.rightSub)}</text>`;

    // 解決フレーム
    body += `
  <text x="${solveX + 12}" y="${midY + 10}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(t.solve)}</text>`;
  }

  // ─── 年度別テーブル（下部） ────────────────────────────────────
  const tableStartY = dataStartY + tradeoffs.length * (rowH + rowGap) + 16;
  const tblSecH = 40;

  body += `
  <rect x="${PAD}" y="${tableStartY}" width="${W - PAD * 2}" height="${tblSecH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${PAD + 16}" y="${tableStartY + 28}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff">年度別出題テーマと典型トレードオフ選択ペア</text>`;

  // 列幅の定義
  const tColYear = 80;
  const tColTheme = 340;
  const tColPair = W - PAD * 2 - tColYear - tColTheme;
  const tHeadY = tableStartY + tblSecH;
  const tHeadH = 44;

  // テーブルヘッダ行
  body += `
  <rect x="${PAD}" y="${tHeadY}" width="${W - PAD * 2}" height="${tHeadH}" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${PAD + tColYear / 2}" y="${tHeadY + 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">年度</text>
  <text x="${PAD + tColYear + tColTheme / 2}" y="${tHeadY + 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">出題テーマ</text>
  <text x="${PAD + tColYear + tColTheme + tColPair / 2}" y="${tHeadY + 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">典型トレードオフ選択ペア</text>
  <line x1="${PAD + tColYear}" y1="${tHeadY}" x2="${PAD + tColYear}" y2="${tHeadY + tHeadH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <line x1="${PAD + tColYear + tColTheme}" y1="${tHeadY}" x2="${PAD + tColYear + tColTheme}" y2="${tHeadY + tHeadH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  const tableRows = [
    { year: 'R03', theme: 'BIM/CIM データ統合活用', pair: '情報管理 × 経済性管理', pairColor: POSITIVE },
    { year: 'R04', theme: 'i-Construction DX 計画', pair: '情報管理 × 人的資源管理', pairColor: POSITIVE },
    { year: 'R05', theme: 'SWOT 組織戦略立案', pair: '経済性管理 × 人的資源管理', pairColor: BRAND },
    { year: 'R06', theme: 'CN 施工（低炭素化対応）', pair: '経済性管理 × 社会環境管理', pairColor: BRAND },
    { year: 'R07', theme: '自動化建機・担い手不足', pair: '経済性管理 × 人的資源管理', pairColor: BRAND },
  ];

  const tRowH = 52;
  for (let i = 0; i < tableRows.length; i++) {
    const r = tableRows[i];
    const ry = tHeadY + tHeadH + i * tRowH;
    const rowBg = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    const rMidY = ry + tRowH / 2 + 9;

    body += `
  <rect x="${PAD}" y="${ry}" width="${W - PAD * 2}" height="${tRowH}" fill="${rowBg}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${PAD + tColYear / 2}" y="${rMidY}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(r.year)}</text>
  <text x="${PAD + tColYear + 12}" y="${rMidY}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.theme)}</text>
  <text x="${PAD + tColYear + tColTheme + 12}" y="${rMidY}" font-family="${FONT}" font-size="22" font-weight="700" fill="${r.pairColor}">${xml(r.pair)}</text>
  <line x1="${PAD + tColYear}" y1="${ry}" x2="${PAD + tColYear}" y2="${ry + tRowH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <line x1="${PAD + tColYear + tColTheme}" y1="${ry}" x2="${PAD + tColYear + tColTheme}" y2="${ry + tRowH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;
  }

  // 凡例（色と管理の対応）
  const legendY = tHeadY + tHeadH + tableRows.length * tRowH + 16;
  const legends = [
    { label: '経済性管理', color: BRAND },
    { label: '人的資源管理', color: WARN },
    { label: '安全管理', color: DANGER },
    { label: '情報管理', color: POSITIVE },
    { label: '社会環境管理', color: INK_STRONG },
  ];
  const legItemW = (W - PAD * 2) / legends.length;

  body += `
  <rect x="${PAD}" y="${legendY}" width="${W - PAD * 2}" height="40" rx="6" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;

  for (let i = 0; i < legends.length; i++) {
    const lx = PAD + i * legItemW + legItemW / 2;
    body += `
  <circle cx="${lx - 44}" cy="${legendY + 20}" r="8" fill="${legends[i].color}"/>
  <text x="${lx - 32}" y="${legendY + 26}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(legends[i].label)}</text>`;
  }

  // ブランド識別（右下）
  body += `
  <text x="${W - PAD}" y="${H - 16}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${PAD}" y="${titleY}" font-family="${FONT}" font-size="30" font-weight="800" fill="${INK_STRONG}">ゼネコン土木支店 工事部長｜典型 5 管理トレードオフ・プロファイル</text>
  <text x="${PAD}" y="${subtitleY}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">技術士 総合技術監理部門 記述式 R03-R07（ゼネコンペルソナ）</text>
${body}
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
  console.log('Rendering figure for 総監模範論文-ゼネコン…');
  await render(svgPersonaProfile(), 'figure-persona-profile.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
