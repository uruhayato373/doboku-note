#!/usr/bin/env node
// content/note/技術士総監/トレードオフ思考/img/ に本文用 PNG/SVG 図版を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 既知の例外:
//   figure-1-detailed-conflicts は 10 行（policy §3 の 8 行上限を超過）。
//   全 10 ペアの提示が記事の論旨上不可分のため、
//   高頻出 6 行 + 中低頻出 4 行を視覚的セクション分割で運用する。
//
// 使い方:
//   node scripts/render-figure-tradeoff.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/トレードオフ思考/img');
mkdirSync(OUT_DIR, { recursive: true });

// ブランドトークン（src/styles/globals.css と整合）
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
const BORDER_MID = '#d1d5db';

// S/A/B/C ランクの色（モバイル縮小時に区別できる輝度差）
//   S = DANGER（深い赤）
//   A = #e05a4a（明るい赤橙）— S と差別化
//   B = BRAND（青）
//   C = INK_MUTED（グレー）
const RANK_S = DANGER;
const RANK_A = '#e05a4a';
const RANK_B = BRAND;
const RANK_C = INK_MUTED;

// 解決フレーム 5 種の色（トークン外使用を排除）
//   ALARP    = DANGER（リスク領域）
//   LCA/LCC  = BRAND（評価軸の青）
//   段階的実施 = WARN（黄系、漸進）
//   合意形成   = POSITIVE（緑、ステークホルダー和合）
//   リスクベース = BRAND_DEEP（深い青、決定）
const FRAME_ALARP = DANGER;
const FRAME_LCA = BRAND;
const FRAME_PHASED = WARN;
const FRAME_CONSENSUS = POSITIVE;
const FRAME_RISKBASED = BRAND_DEEP;

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandFrame(H) {
  return `
  <text x="${W - 28}" y="${H - 22}" font-family="${FONT}" font-size="18" font-weight="500" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

function rankColor(rank) {
  return { S: RANK_S, A: RANK_A, B: RANK_B, C: RANK_C }[rank] || INK_MUTED;
}

function rankLabel(rank) {
  return { S: '最頻出', A: '頻出', B: '中', C: '低' }[rank] || '';
}

// ------------------------------------------------------------------
// 図 1: 5 管理 × 10 ペア 出題頻度ヒートマップ
// ------------------------------------------------------------------
function svgFrequencyHeatmap() {
  const titleY = 60;
  const subtitleY = 96;
  const gridTop = 140;
  const labelW = 200;
  const colW = 220;
  const cellH = 100;
  const gap = 4;

  // 列ヘッダ（X 軸）= 経済性, 人的資源, 情報, 安全
  const cols = ['経済性', '人的資源', '情報', '安全'];
  // 行ヘッダ（Y 軸）= 人的資源, 情報, 安全, 社会環境
  const rows = ['人的資源', '情報', '安全', '社会環境'];

  // 三角行列のセル（rowIdx, colIdx, rank）— colIdx ≤ rowIdx の三角
  const cells = [
    [0, 0, 'A'], // 人的資源 × 経済性
    [1, 0, 'A'], // 情報 × 経済性
    [1, 1, 'B'], // 情報 × 人的資源
    [2, 0, 'S'], // 安全 × 経済性
    [2, 1, 'A'], // 安全 × 人的資源
    [2, 2, 'B'], // 安全 × 情報
    [3, 0, 'S'], // 社会環境 × 経済性
    [3, 1, 'C'], // 社会環境 × 人的資源
    [3, 2, 'B'], // 社会環境 × 情報
    [3, 3, 'A'], // 社会環境 × 安全
  ];

  // X 軸の列開始位置: labelW + gap + i * (colW + gap)
  const colX = (i) => 40 + labelW + gap + i * (colW + gap);
  // Y 軸の行開始位置: gridTop + headerH + gap + i * (cellH + gap)
  const headerH = 56;
  const rowY = (i) => gridTop + headerH + gap + i * (cellH + gap);

  // ヘッダ
  let body = '';
  // 列ヘッダ（X 軸）
  for (let i = 0; i < cols.length; i++) {
    const x = colX(i);
    body += `
  <rect x="${x}" y="${gridTop}" width="${colW}" height="${headerH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${x + colW / 2}" y="${gridTop + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(cols[i])}</text>`;
  }
  // 行ヘッダ（Y 軸）
  for (let i = 0; i < rows.length; i++) {
    const y = rowY(i);
    body += `
  <rect x="40" y="${y}" width="${labelW}" height="${cellH}" rx="6" fill="${BRAND_DEEP}"/>
  <text x="${40 + labelW / 2}" y="${y + cellH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(rows[i])}</text>`;
  }

  // セル
  for (const [r, c, rank] of cells) {
    const x = colX(c);
    const y = rowY(r);
    const fill = rankColor(rank);
    body += `
  <rect x="${x}" y="${y}" width="${colW}" height="${cellH}" rx="6" fill="${fill}"/>
  <text x="${x + colW / 2}" y="${y + cellH / 2 + 4}" font-family="${FONT}" font-size="46" font-weight="800" fill="#ffffff" text-anchor="middle">${rank}</text>
  <text x="${x + colW / 2}" y="${y + cellH / 2 + 36}" font-family="${FONT}" font-size="22" font-weight="500" fill="#ffffff" text-anchor="middle">${rankLabel(rank)}</text>`;
  }

  // 凡例
  const legendY = rowY(rows.length - 1) + cellH + 32;
  const legendItems = [
    { rank: 'S', label: 'S 最頻出' },
    { rank: 'A', label: 'A 頻出' },
    { rank: 'B', label: 'B 中' },
    { rank: 'C', label: 'C 低' },
  ];
  let legend = `
  <text x="40" y="${legendY + 24}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">出題頻度ランク</text>`;
  let lx = 240;
  for (const item of legendItems) {
    legend += `
  <rect x="${lx}" y="${legendY + 2}" width="36" height="32" rx="6" fill="${rankColor(item.rank)}"/>
  <text x="${lx + 46}" y="${legendY + 24}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(item.label)}</text>`;
    lx += 180;
  }

  const H = legendY + 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <text x="40" y="${titleY}" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">5 管理 × 10 ペア 出題頻度ヒートマップ</text>
  <text x="40" y="${subtitleY}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">過去 17 年（H21〜R07）の記述式・択一複合問題から集計</text>
${body}
${legend}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 10 ペア別 トレードオフ詳細マトリクス
// ------------------------------------------------------------------
function svgDetailedConflicts() {
  const titleY = 56;
  const subtitleY = 92;
  const captionY = 116;
  const captionH = 44;

  const rowH = 100;
  const headerH = 48;

  // カラム定義（W=1200）
  // pair label / freq badge / conflict text / solution frame
  const xMain = 20;
  const wPair = 200;
  const wFreq = 60;
  const wConflict = 480;
  const wSolution = 420;
  const wTotal = wPair + wFreq + wConflict + wSolution; // 1160

  const xPair = xMain;
  const xFreq = xPair + wPair;
  const xConflict = xFreq + wFreq;
  const xSolution = xConflict + wConflict;

  const headerY = captionY + captionH + 24;
  const tableTop = headerY + headerH;

  // データ：高頻出 (S/A) 6 ペア
  const high = [
    ['経済性 × 安全', 'S', 'コスト・工期 vs 安全設備・リスク対策費', 'ALARP / リスクベース意思決定'],
    ['経済性 × 社会環境', 'S', '短期コスト最小化 vs 環境負荷低減・脱炭素', 'LCA・LCC / 段階的実施（補助金活用）'],
    ['経済性 × 人的資源', 'A', 'コスト削減 vs 人材育成・待遇改善', 'OJT 費用対効果分析 / 段階的実施'],
    ['経済性 × 情報', 'A', 'IT 基盤投資コスト vs 情報セキュリティ確保', 'LCC / リスクベース投資判断'],
    ['人的資源 × 安全', 'A', '若手・新人配置 vs 危険作業の経験知不足', '段階的実施（習熟段階別タスク）/ OJT'],
    ['安全 × 社会環境', 'A', '防災・安全対策 vs 景観・生態系への影響', '合意形成（住民参加）/ ALARP 適用'],
  ];
  // 中・低頻出 (B/C) 4 ペア
  const low = [
    ['人的資源 × 情報', 'B', 'ベテラン活用・権限付与 vs 情報漏洩リスク管理', '最小権限原則 / 合意形成（規程整備）'],
    ['情報 × 安全', 'B', '現場情報の即時共有 vs セキュリティ管理の厳格化', 'リスクベース（ゾーン分類）/ 段階的実施'],
    ['情報 × 社会環境', 'B', '環境モニタリング情報増大 vs 管理・保管コスト', 'LCC（データ収集コスト最適化）'],
    ['人的資源 × 社会環境', 'C', '多様な人材活用 vs 地域・環境規制への対応負担', '合意形成 / ステークホルダー調整'],
  ];

  // ヘッダ行
  let head = `
  <rect x="${xPair}" y="${headerY}" width="${wPair}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${xPair + wPair / 2}" y="${headerY + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">管理ペア</text>
  <rect x="${xFreq}" y="${headerY}" width="${wFreq}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${xFreq + wFreq / 2}" y="${headerY + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">頻度</text>
  <rect x="${xConflict}" y="${headerY}" width="${wConflict}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${xConflict + wConflict / 2}" y="${headerY + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">典型対立構造</text>
  <rect x="${xSolution}" y="${headerY}" width="${wSolution}" height="${headerH}" fill="${POSITIVE}"/>
  <text x="${xSolution + wSolution / 2}" y="${headerY + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">有効な解決フレーム</text>`;

  // 行レンダラ
  function row(y, alt, [pair, rank, conflict, solution], muted = false) {
    const fill = alt ? SURFACE_ALT : '#ffffff';
    const pairColor = muted ? INK_BODY : BRAND_DEEP;
    const conflictColor = muted ? INK_BODY : INK_STRONG;
    const pairWeight = muted ? 500 : 700;
    return `
  <rect x="${xPair}" y="${y}" width="${wTotal}" height="${rowH}" fill="${fill}"/>
  <line x1="${xPair}" y1="${y + rowH}" x2="${xPair + wTotal}" y2="${y + rowH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <line x1="${xFreq}" y1="${y}" x2="${xFreq}" y2="${y + rowH}" stroke="${BORDER_MID}" stroke-width="1"/>
  <line x1="${xConflict}" y1="${y}" x2="${xConflict}" y2="${y + rowH}" stroke="${BORDER_MID}" stroke-width="1"/>
  <line x1="${xSolution}" y1="${y}" x2="${xSolution}" y2="${y + rowH}" stroke="${BORDER_MID}" stroke-width="1"/>
  <text x="${xPair + wPair / 2}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="${pairWeight}" fill="${pairColor}" text-anchor="middle">${xml(pair)}</text>
  <rect x="${xFreq + (wFreq - 44) / 2}" y="${y + (rowH - 44) / 2}" width="44" height="44" rx="6" fill="${rankColor(rank)}"/>
  <text x="${xFreq + wFreq / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${rank}</text>
  <text x="${xConflict + 16}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" fill="${conflictColor}">${xml(conflict)}</text>
  <text x="${xSolution + 16}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${POSITIVE}">${xml(solution)}</text>`;
  }

  // 高頻出セクション
  let body = '';
  let y = tableTop;
  for (let i = 0; i < high.length; i++) {
    body += row(y, i % 2 === 0, high[i]);
    y += rowH;
  }

  // 高頻出囲み枠（赤）
  const highBoxTop = headerY - 4;
  const highBoxBottom = y;
  const highFrame = `
  <rect x="${xPair - 4}" y="${highBoxTop}" width="${wTotal + 8}" height="${highBoxBottom - highBoxTop}" rx="6" fill="none" stroke="${DANGER}" stroke-width="2"/>
  <rect x="${xPair + wTotal - 240}" y="${highBoxTop - 14}" width="240" height="28" rx="14" fill="${DANGER}"/>
  <text x="${xPair + wTotal - 120}" y="${highBoxTop + 6}" font-family="${FONT}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">高頻出 S/A — 最優先</text>`;

  // セクション区切り（中・低頻出ヘッダ）
  const sectionGap = 24;
  const sectionH = 44;
  const sectionY = y + sectionGap;
  const lowSection = `
  <rect x="${xPair}" y="${sectionY}" width="${wTotal}" height="${sectionH}" rx="6" fill="${INK_MUTED}"/>
  <text x="${xPair + wTotal / 2}" y="${sectionY + sectionH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">中・低頻出（B / C ランク） — 余裕があれば対策</text>`;

  // 中・低頻出セクション
  y = sectionY + sectionH;
  for (let i = 0; i < low.length; i++) {
    body += row(y, i % 2 === 0, low[i], true);
    y += rowH;
  }

  // 凡例
  const legendY = y + 36;
  const legendItems = [
    { rank: 'S', label: 'S 最頻出' },
    { rank: 'A', label: 'A 頻出' },
    { rank: 'B', label: 'B 中' },
    { rank: 'C', label: 'C 低' },
  ];
  let legend = `
  <text x="${xPair}" y="${legendY + 24}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">出題頻度</text>`;
  let lx = xPair + 140;
  for (const item of legendItems) {
    legend += `
  <rect x="${lx}" y="${legendY + 2}" width="32" height="32" rx="6" fill="${rankColor(item.rank)}"/>
  <text x="${lx + 40}" y="${legendY + 24}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(item.label)}</text>`;
    lx += 170;
  }
  legend += `
  <text x="${lx + 12}" y="${legendY + 24}" font-family="${FONT}" font-size="22" font-weight="600" fill="${POSITIVE}">緑 = 解決フレーム</text>`;

  const H = legendY + 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <text x="${xPair}" y="${titleY}" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">10 ペア別 トレードオフ詳細マトリクス</text>
  <text x="${xPair}" y="${subtitleY}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">典型対立構造と有効な解決フレームを 10 通りすべて展開（出題頻度順）</text>

  <rect x="${xPair}" y="${captionY}" width="${wTotal}" height="${captionH}" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xPair + 16}" y="${captionY + captionH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">記述式では「対立内容＋解決フレーム」をセットで論述する。出題頻度順に整理。</text>

${head}
${body}
${highFrame}
${lowSection}
${legend}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 解決フレーム × 管理ペア 適用マトリクス
// ------------------------------------------------------------------
function svgSolutionFrames() {
  const titleY = 56;
  const subtitleY = 92;
  const captionY = 116;
  const captionH = 44;

  // 左ラベル列 + 5 フレーム列
  const xMain = 40;
  const wRowLabel = 280;
  const wFrameCol = 152;
  const frameGap = 4;
  const wTotal = wRowLabel + 5 * wFrameCol + 4 * frameGap; // 1056
  const headerY = captionY + captionH + 24;
  const headerH = 112;
  const rowH = 60;

  const frameX = (i) => xMain + wRowLabel + i * (wFrameCol + frameGap);

  // フレーム定義（カラー + 名称 + 補足 2 行）
  const frames = [
    { color: FRAME_ALARP, name: 'ALARP', sub1: '許容できる限り', sub2: 'リスクを低減' },
    { color: FRAME_LCA, name: 'LCA / LCC', sub1: '環境負荷 + 総コスト', sub2: '両軸で評価' },
    { color: FRAME_PHASED, name: '段階的実施', sub1: '小規模試行→', sub2: '段階拡大' },
    { color: FRAME_CONSENSUS, name: '合意形成', sub1: 'ステークホルダー', sub2: '参加・合意' },
    { color: FRAME_RISKBASED, name: 'リスクベース', sub1: 'リスク量に', sub2: '比例した資源配分' },
  ];

  // ペア × フレーム適用マトリクス（true = ●、false = なし）
  // 行: 出題頻度順、列: ALARP / LCA-LCC / 段階 / 合意 / リスクベース
  const high = [
    ['経済性 × 安全',     'S', [true,  false, false, false, true ]],
    ['経済性 × 社会環境', 'S', [false, true,  true,  false, false]],
    ['経済性 × 人的資源', 'A', [false, false, true,  false, true ]],
    ['経済性 × 情報',     'A', [false, true,  false, false, true ]],
    ['人的資源 × 安全',   'A', [false, false, true,  false, false]],
    ['安全 × 社会環境',   'A', [true,  false, false, true,  false]],
  ];
  const low = [
    ['人的資源 × 情報',   'B', [false, false, false, true,  false]],
    ['情報 × 安全',       'B', [false, false, true,  false, true ]],
    ['情報 × 社会環境',   'B', [false, true,  false, false, false]],
    ['人的資源 × 社会環境','C', [false, false, false, true,  false]],
  ];

  // ヘッダ（行ラベル列）
  let head = `
  <rect x="${xMain}" y="${headerY}" width="${wRowLabel}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${xMain + wRowLabel / 2}" y="${headerY + headerH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">管理ペア（頻度順）</text>`;

  // ヘッダ（5 フレーム列）
  for (let i = 0; i < frames.length; i++) {
    const x = frameX(i);
    const f = frames[i];
    head += `
  <rect x="${x}" y="${headerY}" width="${wFrameCol}" height="${headerH}" rx="8" fill="${f.color}"/>
  <text x="${x + wFrameCol / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(f.name)}</text>
  <text x="${x + wFrameCol / 2}" y="${headerY + 70}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(f.sub1)}</text>
  <text x="${x + wFrameCol / 2}" y="${headerY + 94}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(f.sub2)}</text>`;
  }

  // 行レンダラ
  function row(y, alt, [pair, rank, marks], muted = false) {
    const fill = alt ? SURFACE_ALT : '#ffffff';
    const pairColor = muted ? INK_BODY : BRAND_DEEP;
    const pairWeight = muted ? 500 : 700;
    let s = `
  <rect x="${xMain}" y="${y}" width="${wTotal}" height="${rowH}" fill="${fill}"/>
  <line x1="${xMain}" y1="${y + rowH}" x2="${xMain + wTotal}" y2="${y + rowH}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xMain + wRowLabel - 16}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="${pairWeight}" fill="${pairColor}" text-anchor="end">${xml(pair)}</text>
  <text x="${xMain + 16}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="${rankColor(rank)}">${rank}</text>`;
    for (let i = 0; i < marks.length; i++) {
      const x = frameX(i);
      if (marks[i]) {
        const c = frames[i].color;
        s += `
  <rect x="${x + 4}" y="${y + 5}" width="${wFrameCol - 8}" height="${rowH - 10}" rx="6" fill="${c}" fill-opacity="0.12"/>
  <text x="${x + wFrameCol / 2}" y="${y + rowH / 2 + 11}" font-family="${FONT}" font-size="30" font-weight="800" fill="${c}" text-anchor="middle">&#x25CF;</text>`;
      } else {
        s += `
  <text x="${x + wFrameCol / 2}" y="${y + rowH / 2 + 8}" font-family="${FONT}" font-size="22" fill="${BORDER_LIGHT}" text-anchor="middle">&#x2013;</text>`;
      }
    }
    return s;
  }

  // 縦罫線
  let verticals = '';
  for (let i = 0; i <= frames.length; i++) {
    const x = i === 0 ? xMain + wRowLabel : frameX(i - 1) + wFrameCol;
    verticals += `
  <line x1="${x}" y1="${headerY}" x2="${x}" y2="${headerY + headerH}" stroke="${BORDER_MID}" stroke-width="1"/>`;
  }

  // 高頻出セクション
  let body = '';
  let y = headerY + headerH;
  for (let i = 0; i < high.length; i++) {
    body += row(y, i % 2 === 0, high[i]);
    y += rowH;
  }

  // 高頻出囲み枠
  const highBoxTop = headerY - 4;
  const highBoxBottom = y;
  const highFrame = `
  <rect x="${xMain - 4}" y="${highBoxTop}" width="${wTotal + 8}" height="${highBoxBottom - highBoxTop}" rx="6" fill="none" stroke="${DANGER}" stroke-width="2"/>`;

  // セクション区切り
  const sectionGap = 24;
  const sectionH = 36;
  const sectionY = y + sectionGap;
  const lowSection = `
  <rect x="${xMain}" y="${sectionY}" width="${wTotal}" height="${sectionH}" rx="6" fill="${INK_MUTED}"/>
  <text x="${xMain + wTotal / 2}" y="${sectionY + sectionH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">中・低頻出（B / C ランク）</text>`;

  // 中・低頻出セクション
  y = sectionY + sectionH;
  for (let i = 0; i < low.length; i++) {
    body += row(y, i % 2 === 0, low[i], true);
    y += rowH;
  }

  // 凡例
  const legendY = y + 32;
  const legend = `
  <text x="${xMain}" y="${legendY + 22}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">&#x25CF; = そのフレームが有効</text>
  <text x="${xMain + 360}" y="${legendY + 22}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">赤枠 = S/A 最頻出ペア</text>`;

  const H = legendY + 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <text x="${xMain}" y="${titleY}" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">解決フレーム × 管理ペア 適用マトリクス</text>
  <text x="${xMain}" y="${subtitleY}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">5 つの解決フレームがどの管理ペアに有効か — &#x25CF; で示す</text>

  <rect x="${xMain}" y="${captionY}" width="${wTotal}" height="${captionH}" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xMain + 16}" y="${captionY + captionH / 2 + 8}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">出題頻度順に並び替え。上段（赤枠）= S/A 最優先 / 下段 = B/C 余裕があれば。</text>

${head}
${body}
${highFrame}
${lowSection}
${legend}
${brandFrame(H)}
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
  console.log('Rendering figures for トレードオフ思考…');
  await render(svgFrequencyHeatmap(), 'figure-tradeoff-matrix.png');
  await render(svgDetailedConflicts(), 'figure-1-detailed-conflicts.png');
  await render(svgSolutionFrames(), 'figure-2-solution-frames.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
