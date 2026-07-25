#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-安全管理/img/ に本文用 PNG/SVG 図版 11 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（補足キャプションを含めて統一）
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-safety-management.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-安全管理/img');
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
const BORDER_MID = '#d1d5db';

const FONT = 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif';
const W = 1200;

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandFrame() {
  return '';
}

function header(title, subtitle) {
  return `
  <text x="40" y="60" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">${xml(title)}</text>
  <text x="40" y="96" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(subtitle)}</text>`;
}

// ------------------------------------------------------------------
// 図 1: リスク低減措置の優先順位ピラミッド
// ------------------------------------------------------------------
function svgRiskReductionPyramid() {
  const H = 840;
  const cx = W / 2;
  const top = 160;
  const bottom = 660;
  const baseW = 720;
  const totalH = bottom - top;
  const stepH = totalH / 4;

  // 上から：本質→工学→管理→保護具
  // 補足は本文段組みのため短く（ピラミッド内に収まる長さ）。詳細はサイドカードで補う
  const tiers = [
    { label: '本質的対策', sub: '排除・代替', color: POSITIVE, badge: '最優先 ①', detail: '設計段階で危険源を除去' },
    { label: '工学的対策', sub: 'ガード・安全装置', color: BRAND, badge: '② 次善', detail: 'インターロック等で隔離' },
    { label: '管理的対策', sub: 'マニュアル・教育', color: WARN, badge: '③ 補完', detail: '作業手順の標準化' },
    { label: '個人用保護具', sub: '最後の手段', color: DANGER, badge: '④ 最後', detail: '残ったリスクのみ' },
  ];

  let body = '';
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const yTop = top + i * stepH;
    const yBot = top + (i + 1) * stepH;
    // ピラミッド形状（上が狭く下が広い）— 段ごとに線形拡大
    const widthTop = (baseW * (i + 1)) / 4;
    const widthBot = (baseW * (i + 2)) / 4;
    const xLT = cx - widthTop / 2;
    const xRT = cx + widthTop / 2;
    const xLB = cx - widthBot / 2;
    const xRB = cx + widthBot / 2;
    const points = `${xLT},${yTop} ${xRT},${yTop} ${xRB},${yBot} ${xLB},${yBot}`;
    body += `
  <polygon points="${points}" fill="${t.color}" stroke="#ffffff" stroke-width="3"/>
  <text x="${cx}" y="${yTop + stepH / 2 - 8}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.label)}</text>
  <text x="${cx}" y="${yTop + stepH / 2 + 22}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">${xml(t.sub)}</text>`;
    // 右側カード（バッジ + 詳細）。1180 までに収まるよう内側寄せ
    const cardX = cx + baseW / 2 + 20;
    const cardW = 200;
    body += `
  <rect x="${cardX}" y="${yTop + 12}" width="${cardW}" height="${stepH - 24}" rx="10" fill="#ffffff" stroke="${t.color}" stroke-width="2"/>
  <rect x="${cardX}" y="${yTop + 12}" width="${cardW}" height="36" rx="10" fill="${t.color}"/>
  <rect x="${cardX}" y="${yTop + 36}" width="${cardW}" height="12" fill="${t.color}"/>
  <text x="${cardX + cardW / 2}" y="${yTop + 38}" font-family="${FONT}" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.badge)}</text>
  <text x="${cardX + cardW / 2}" y="${yTop + stepH / 2 + 18}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">${xml(t.detail)}</text>`;
  }

  // 左側：優先度バー
  const arrowX = cx - baseW / 2 - 90;
  body += `
  <line x1="${arrowX}" y1="${top + 20}" x2="${arrowX}" y2="${bottom - 20}" stroke="${INK_BODY}" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="${arrowX - 18}" y="${top + 50}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="end">優先度</text>
  <text x="${arrowX - 18}" y="${top + 82}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="end">高</text>
  <text x="${arrowX - 18}" y="${bottom - 20}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="end">低</text>`;

  // キャプション
  const captY = 700;
  const caption = `
  <rect x="40" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="60" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：「保護具を最優先」「本質的対策は最後」は逆順。R5 Ⅰ-1-28 の典型誤答。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK_BODY}"/>
    </marker>
  </defs>
${header('リスク低減措置の優先順位（厚生労働省指針）', '本質的対策を最優先、個人用保護具は最後の手段')}
${body}
${caption}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: システム高信頼化 5用語の使い分け
// ------------------------------------------------------------------
function svgReliabilityTerms() {
  const H = 880;
  // 横軸：故障前（防止） / 故障後（対応）
  // 各列に該当する用語カードを配置
  const colW = 540;
  const xLeft = 40;
  const xRight = xLeft + colW + 40;
  const headerY = 140;
  const headerH = 60;

  // 左列：故障前（防止）
  const leftItems = [
    { name: 'フォールトアボイダンス', sub: '装置全体の故障確率を下げる', detail: '部品の信頼性向上・品質管理徹底', color: BRAND },
    { name: 'フールプルーフ', sub: '人の誤操作を防ぐ', detail: '誤った操作を機械的に検知して実行不可にする', color: BRAND_DEEP },
  ];
  // 右列：故障後（対応）
  const rightItems = [
    { name: 'フォルトトレランス', sub: '一部故障でも全体機能を維持', detail: '冗長化・並列化', color: POSITIVE },
    { name: 'フェールソフト', sub: '機能を一部維持して継続', detail: '100→50 のレベルダウン運転', color: WARN },
    { name: 'フェールセーフ', sub: '安全な方向に制御', detail: '信号機の電源断→全赤', color: DANGER },
  ];

  let body = '';
  // 列ヘッダ
  body += `
  <rect x="${xLeft}" y="${headerY}" width="${colW}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${xLeft + colW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">故障前 — 起こさない設計</text>
  <rect x="${xRight}" y="${headerY}" width="${colW}" height="${headerH}" rx="8" fill="${DANGER}"/>
  <text x="${xRight + colW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">故障後 — 起きても安全</text>`;

  // カード描画関数
  const cardH = 130;
  const cardGap = 20;
  function card(x, y, item) {
    return `
  <rect x="${x}" y="${y}" width="${colW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${item.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="8" height="${cardH}" fill="${item.color}"/>
  <text x="${x + 24}" y="${y + 36}" font-family="${FONT}" font-size="26" font-weight="800" fill="${item.color}">${xml(item.name)}</text>
  <text x="${x + 24}" y="${y + 70}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">${xml(item.sub)}</text>
  <text x="${x + 24}" y="${y + 102}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(item.detail)}</text>`;
  }

  let yL = headerY + headerH + 24;
  for (const it of leftItems) {
    body += card(xLeft, yL, it);
    yL += cardH + cardGap;
  }
  let yR = headerY + headerH + 24;
  for (const it of rightItems) {
    body += card(xRight, yR, it);
    yR += cardH + cardGap;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="60" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">頻出区別：フェールセーフ＝故障後の安全確保／フールプルーフ＝誤操作の防止</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('システム高信頼化 — 5用語の使い分け', '「故障前 vs 故障後」の軸で5つの設計思想を整理')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 警戒レベル5段階表
// ------------------------------------------------------------------
function svgAlertLevels() {
  const H = 800;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 80;
  const wLevel = 180;
  const wInfo = 360;
  const wAction = 580;
  const wTotal = wLevel + wInfo + wAction;

  const levels = [
    { lv: '1', name: '早期注意情報', action: '心構えを高める', color: BRAND, preBadge: false },
    { lv: '2', name: '気象情報等', action: '避難行動の確認', color: WARN, preBadge: false },
    { lv: '3', name: '高齢者等避難', action: '高齢者・要配慮者は避難開始', color: DANGER, preBadge: true },
    { lv: '4', name: '避難指示', action: '危険な場所にいる人は全員避難', color: DANGER, preBadge: false },
    { lv: '5', name: '緊急安全確保', action: '命を守る最善の行動', color: BRAND_DEEP, preBadge: false },
  ];

  let body = '';
  body += `
  <rect x="${x}" y="${headerY}" width="${wLevel}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">警戒レベル</text>
  <rect x="${x + wLevel}" y="${headerY}" width="${wInfo}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">情報の名称</text>
  <rect x="${x + wLevel + wInfo}" y="${headerY}" width="${wAction}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo + wAction / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">取るべき行動</text>`;

  let y = headerY + headerH + 8;
  for (const l of levels) {
    body += `
  <rect x="${x}" y="${y}" width="${wLevel}" height="${rowH}" fill="${l.color}"/>
  <text x="${x + wLevel / 2}" y="${y + 38}" font-family="${FONT}" font-size="40" font-weight="800" fill="#ffffff" text-anchor="middle">レベル ${l.lv}</text>
  <rect x="${x + wLevel}" y="${y}" width="${wInfo}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${x + wLevel + 24}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="26" font-weight="700" fill="${INK_STRONG}">${xml(l.name)}</text>
  <rect x="${x + wLevel + wInfo}" y="${y}" width="${wAction}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${x + wLevel + wInfo + 24}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(l.action)}</text>`;
    if (l.preBadge) {
      body += `
  <rect x="${x + wLevel + wInfo + wAction - 196}" y="${y + 18}" width="172" height="36" rx="18" fill="${WARN}"/>
  <text x="${x + wLevel + wInfo + wAction - 110}" y="${y + 42}" font-family="${FONT}" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">災害発生「前」</text>`;
    }
    y += rowH;
  }

  // キャプション
  const captY = y + 24;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：「高齢者等避難＝災害発生後の緊急避難」は誤り。R7 Ⅰ-1-28 の典型誤答。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('警戒レベル — 5段階の対応行動', '「避難情報に関するガイドライン」（内閣府）に基づく')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 4: システム安全工学手法 比較マトリクス
// ------------------------------------------------------------------
function svgSafetyEngineeringMatrix() {
  const H = 820;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 110;
  const wMethod = 200;
  const wDirection = 260;
  const wTarget = 280;
  const wOutput = 200;
  const wUse = 180;
  const wTotal = wMethod + wDirection + wTarget + wOutput + wUse;

  const cols = [
    { label: '手法', w: wMethod, color: BRAND_DEEP },
    { label: '解析方向', w: wDirection, color: BRAND_DEEP },
    { label: '対象', w: wTarget, color: BRAND_DEEP },
    { label: '出力形式', w: wOutput, color: BRAND_DEEP },
    { label: '代表用途', w: wUse, color: BRAND_DEEP },
  ];

  const rows = [
    ['FMEA', 'ボトムアップ\n（帰納的）', '構成要素の故障モード', '影響度の表', '設計レビュー'],
    ['FTA', 'トップダウン\n（演繹的）', '頂上事象の原因', '故障の木（確率計算）', '事故原因解析'],
    ['ETA', 'ボトムアップ\n（帰納的）', '初期事象の結果展開', '事象の木（YES/NO）', 'シナリオ評価'],
    ['HAZOP', 'ガイドワード型', 'プロセスパラメータのずれ', '危険事象一覧', '化学プラント設計'],
  ];

  let body = '';
  // ヘッダ
  let cx = x;
  for (const c of cols) {
    body += `
  <rect x="${cx}" y="${headerY}" width="${c.w}" height="${headerH}" rx="8" fill="${c.color}"/>
  <text x="${cx + c.w / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(c.label)}</text>`;
    cx += c.w;
  }

  // 行
  let y = headerY + headerH + 8;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fill = i % 2 === 0 ? '#ffffff' : SURFACE_ALT;
    let rx = x;
    body += `
  <rect x="${x}" y="${y}" width="${wTotal}" height="${rowH}" fill="${fill}" stroke="${BORDER_LIGHT}" stroke-width="1"/>`;
    // 手法名（強調）
    body += `
  <text x="${x + wMethod / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="32" font-weight="800" fill="${BRAND}" text-anchor="middle">${xml(r[0])}</text>`;
    rx += wMethod;
    // 解析方向（2行可）
    const dirLines = r[1].split('\n');
    if (dirLines.length === 2) {
      body += `
  <text x="${rx + wDirection / 2}" y="${y + rowH / 2 - 10}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(dirLines[0])}</text>
  <text x="${rx + wDirection / 2}" y="${y + rowH / 2 + 22}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="middle">${xml(dirLines[1])}</text>`;
    } else {
      body += `
  <text x="${rx + wDirection / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(r[1])}</text>`;
    }
    rx += wDirection;
    body += `
  <text x="${rx + wTarget / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="middle">${xml(r[2])}</text>`;
    rx += wTarget;
    body += `
  <text x="${rx + wOutput / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="middle">${xml(r[3])}</text>`;
    rx += wOutput;
    body += `
  <text x="${rx + wUse / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="middle">${xml(r[4])}</text>`;
    y += rowH;
  }

  // キャプション
  const captY = y + 24;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">頻出対比：FTA＝トップダウン（演繹）／ETA＝ボトムアップ（帰納）。逆向きの選択肢が引っかけ。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('システム安全工学手法 — FMEA / FTA / ETA / HAZOP 比較', '4手法 × 4属性で違いを把握')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 5: 信頼性ブロック図 直列・並列・複合
// ------------------------------------------------------------------
function svgReliabilityBlockDiagram() {
  const H = 980;
  const xMain = 40;
  const sectionH = 220;
  const sectionH2 = 260; // 並列は要素が縦3つで縦長なので拡張
  const sectionGap = 32;

  function block(x, y, w, h, label, color = BRAND) {
    return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="${BRAND_DEEP}" stroke-width="2"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(label)}</text>`;
  }

  function wire(x1, y, x2) {
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  }

  // セクション1：直列
  let y0 = 130;
  let body = '';
  body += `
  <rect x="${xMain}" y="${y0}" width="${W - 80}" height="${sectionH}" rx="10" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xMain + 20}" y="${y0 + 36}" font-family="${FONT}" font-size="26" font-weight="800" fill="${BRAND_DEEP}">① 直列システム</text>
  <text x="${xMain + 20}" y="${y0 + 64}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">すべての要素が正常でなければ動かない</text>`;
  // 直列ブロック R1-R2-R3
  const sBlockY = y0 + 88;
  const sBlockH = 60;
  const sBlockW = 140;
  const sStartX = xMain + 80;
  const sGap = 60;
  body += wire(sStartX - 40, sBlockY + sBlockH / 2, sStartX);
  body += block(sStartX, sBlockY, sBlockW, sBlockH, 'R₁');
  body += wire(sStartX + sBlockW, sBlockY + sBlockH / 2, sStartX + sBlockW + sGap);
  body += block(sStartX + sBlockW + sGap, sBlockY, sBlockW, sBlockH, 'R₂');
  body += wire(sStartX + 2 * sBlockW + sGap, sBlockY + sBlockH / 2, sStartX + 2 * sBlockW + 2 * sGap);
  body += block(sStartX + 2 * sBlockW + 2 * sGap, sBlockY, sBlockW, sBlockH, 'R₃');
  body += wire(sStartX + 3 * sBlockW + 2 * sGap, sBlockY + sBlockH / 2, sStartX + 3 * sBlockW + 3 * sGap);
  // 公式
  body += `
  <text x="${W - 60}" y="${y0 + 110}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="end">R = R₁ × R₂ × R₃</text>
  <text x="${W - 60}" y="${y0 + 142}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">例：R=0.9 → 0.9³ = 0.729</text>
  <text x="${W - 60}" y="${y0 + 170}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">直列接続は弱点に引っ張られる</text>`;

  // セクション2：並列
  let y1 = y0 + sectionH + sectionGap;
  body += `
  <rect x="${xMain}" y="${y1}" width="${W - 80}" height="${sectionH2}" rx="10" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xMain + 20}" y="${y1 + 36}" font-family="${FONT}" font-size="26" font-weight="800" fill="${POSITIVE}">② 並列システム</text>
  <text x="${xMain + 20}" y="${y1 + 64}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">いずれかの要素が正常であれば動く（冗長化）</text>`;
  // 並列ブロック R1, R2, R3 を縦に並べる（説明文との重なりを避けるため pCenterY を下げる）
  const pBlockW = 140;
  const pBlockH = 40;
  const pStartX = xMain + 200;
  const pCenterY = y1 + 160;
  const pVGap = 50;
  // 左側に分岐ノード、右側に合流ノード
  const pLeftX = pStartX - 60;
  const pRightX = pStartX + pBlockW + 60;
  // 縦線
  body += `<line x1="${pLeftX}" y1="${pCenterY - pVGap}" x2="${pLeftX}" y2="${pCenterY + pVGap}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  body += `<line x1="${pRightX}" y1="${pCenterY - pVGap}" x2="${pRightX}" y2="${pCenterY + pVGap}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  // 入出力ライン
  body += wire(pLeftX - 60, pCenterY, pLeftX);
  body += wire(pRightX, pCenterY, pRightX + 60);
  // 3 ブロック
  for (let i = 0; i < 3; i++) {
    const by = pCenterY - pVGap + i * pVGap - pBlockH / 2;
    body += `<line x1="${pLeftX}" y1="${by + pBlockH / 2}" x2="${pStartX}" y2="${by + pBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
    body += block(pStartX, by, pBlockW, pBlockH, `R${['₁', '₂', '₃'][i]}`, POSITIVE);
    body += `<line x1="${pStartX + pBlockW}" y1="${by + pBlockH / 2}" x2="${pRightX}" y2="${by + pBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  }
  // 公式（pCenterY 移動に合わせて下に追従）
  body += `
  <text x="${W - 60}" y="${y1 + 140}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="end">R = 1 − (1−R₁)(1−R₂)(1−R₃)</text>
  <text x="${W - 60}" y="${y1 + 172}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">例：R=0.9 → 1 − 0.1³ = 0.999</text>
  <text x="${W - 60}" y="${y1 + 200}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">並列接続は信頼度が大幅向上</text>`;

  // セクション3：複合（直列+並列）
  let y2 = y1 + sectionH2 + sectionGap;
  body += `
  <rect x="${xMain}" y="${y2}" width="${W - 80}" height="${sectionH}" rx="10" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${xMain + 20}" y="${y2 + 36}" font-family="${FONT}" font-size="26" font-weight="800" fill="${DANGER}">③ 複合システム（並列を直列結合）</text>
  <text x="${xMain + 20}" y="${y2 + 64}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">並列部の信頼度を計算 → 直列に結合（R6 Ⅰ-1-31 型）</text>`;
  // 複合：(R1‖R3) → (R2‖R4)
  const cCenterY = y2 + 130;
  const cBlockW = 110;
  const cBlockH = 40;
  const cVGap = 50;
  // 第1並列群
  const cP1X = xMain + 200;
  const cP1L = cP1X - 50;
  const cP1R = cP1X + cBlockW + 50;
  body += `<line x1="${cP1L}" y1="${cCenterY - cVGap / 2}" x2="${cP1L}" y2="${cCenterY + cVGap / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  body += `<line x1="${cP1R}" y1="${cCenterY - cVGap / 2}" x2="${cP1R}" y2="${cCenterY + cVGap / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  body += wire(cP1L - 50, cCenterY, cP1L);
  for (let i = 0; i < 2; i++) {
    const by = cCenterY - cVGap / 2 + i * cVGap - cBlockH / 2;
    body += `<line x1="${cP1L}" y1="${by + cBlockH / 2}" x2="${cP1X}" y2="${by + cBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
    body += block(cP1X, by, cBlockW, cBlockH, ['R₁', 'R₃'][i], BRAND);
    body += `<line x1="${cP1X + cBlockW}" y1="${by + cBlockH / 2}" x2="${cP1R}" y2="${by + cBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  }
  // 中間ライン
  const cP2X = cP1R + 100;
  body += wire(cP1R, cCenterY, cP2X - 50);
  // 第2並列群
  const cP2L = cP2X - 50;
  const cP2R = cP2X + cBlockW + 50;
  body += `<line x1="${cP2L}" y1="${cCenterY - cVGap / 2}" x2="${cP2L}" y2="${cCenterY + cVGap / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  body += `<line x1="${cP2R}" y1="${cCenterY - cVGap / 2}" x2="${cP2R}" y2="${cCenterY + cVGap / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  for (let i = 0; i < 2; i++) {
    const by = cCenterY - cVGap / 2 + i * cVGap - cBlockH / 2;
    body += `<line x1="${cP2L}" y1="${by + cBlockH / 2}" x2="${cP2X}" y2="${by + cBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
    body += block(cP2X, by, cBlockW, cBlockH, ['R₂', 'R₄'][i], BRAND);
    body += `<line x1="${cP2X + cBlockW}" y1="${by + cBlockH / 2}" x2="${cP2R}" y2="${by + cBlockH / 2}" stroke="${INK_STRONG}" stroke-width="3"/>`;
  }
  body += wire(cP2R, cCenterY, cP2R + 50);
  // 公式
  body += `
  <text x="${W - 60}" y="${y2 + 110}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="end">R = R₁₃ × R₂₄</text>
  <text x="${W - 60}" y="${y2 + 142}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">R₁=R₃=0.8 → R₁₃=0.96</text>
  <text x="${W - 60}" y="${y2 + 170}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="end">R₂=R₄=0.7 → R₂₄=0.91 → R=0.874</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('信頼性ブロック図 — 直列・並列・複合', '計算公式と典型例（R6 Ⅰ-1-31 構造）')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 6: Safety 0.0 / 1.0 / 2.0 進化図
// ------------------------------------------------------------------
function svgSafetyEvolution() {
  const H = 800;
  const colW = 360;
  const colGap = 40;
  const startX = (W - (colW * 3 + colGap * 2)) / 2;
  const colY = 150;
  const colH = 480;

  const cols = [
    {
      title: 'Safety 0.0',
      sub: '人の注意力に依存',
      desc: '人領域のみで安全確保',
      color: INK_MUTED,
      // 楕円構成：人領域のみ
      ellipses: [{ cx: 180, cy: 200, rx: 130, ry: 90, fill: BRAND_FILL, label: '人' }],
    },
    {
      title: 'Safety 1.0',
      sub: '機械側の安全設計＋隔離',
      desc: '人と機械を分離して安全性確保',
      color: BRAND,
      // 楕円構成：人と機械が分離（重ならない）
      ellipses: [
        { cx: 110, cy: 170, rx: 90, ry: 70, fill: BRAND_FILL, label: '人' },
        { cx: 250, cy: 270, rx: 90, ry: 70, fill: '#fde9c8', label: '機械' },
      ],
    },
    {
      title: 'Safety 2.0',
      sub: 'IoT・AI による協調安全',
      desc: '人 × 機械 × 環境が情報共有',
      color: POSITIVE,
      // 楕円構成：3 つが重なる
      ellipses: [
        { cx: 130, cy: 170, rx: 100, ry: 80, fill: BRAND_FILL, label: '人' },
        { cx: 230, cy: 170, rx: 100, ry: 80, fill: '#fde9c8', label: '機械' },
        { cx: 180, cy: 270, rx: 100, ry: 80, fill: POSITIVE_FILL, label: '環境' },
      ],
    },
  ];

  let body = '';
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const x = startX + i * (colW + colGap);
    body += `
  <rect x="${x}" y="${colY}" width="${colW}" height="${colH}" rx="12" fill="#ffffff" stroke="${c.color}" stroke-width="3"/>
  <rect x="${x}" y="${colY}" width="${colW}" height="60" rx="12" fill="${c.color}"/>
  <rect x="${x}" y="${colY + 48}" width="${colW}" height="14" fill="${c.color}"/>
  <text x="${x + colW / 2}" y="${colY + 40}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(c.title)}</text>
  <text x="${x + colW / 2}" y="${colY + 96}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}" text-anchor="middle">${xml(c.sub)}</text>`;

    // 楕円群（中央寄せ）
    const diagY = colY + 120;
    for (const el of c.ellipses) {
      body += `
  <ellipse cx="${x + el.cx}" cy="${diagY + el.cy - 100}" rx="${el.rx}" ry="${el.ry}" fill="${el.fill}" fill-opacity="0.7" stroke="${c.color}" stroke-width="2"/>
  <text x="${x + el.cx}" y="${diagY + el.cy - 100 + 8}" font-family="${FONT}" font-size="26" font-weight="800" fill="${c.color}" text-anchor="middle">${xml(el.label)}</text>`;
    }

    // 説明
    body += `
  <text x="${x + colW / 2}" y="${colY + colH - 24}" font-family="${FONT}" font-size="22" fill="${INK_BODY}" text-anchor="middle">${xml(c.desc)}</text>`;
  }

  // 矢印（横方向、進化を示す）
  const arrowY = colY + 380;
  for (let i = 0; i < 2; i++) {
    const ax = startX + (i + 1) * colW + i * colGap + 4;
    body += `
  <text x="${ax + 16}" y="${arrowY}" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK_BODY}">→</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${POSITIVE_FILL}"/>
  <text x="60" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">分類キーワード：「協調・情報共有・IoT」→ Safety 2.0／「保安制御・隔離・分離」→ Safety 1.0</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('Safety 0.0 / 1.0 / 2.0 — 安全設計思想の進化', '人と機械の関係性で見る3段階')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 7: リスク認知バイアス 5種カード
// ------------------------------------------------------------------
function svgRiskBiases() {
  const H = 780;
  // 上段3枚、下段2枚（cardW を広げ + 内側パディング縮小で例文を1行に収める）
  const cardW = 376;
  const cardH = 260;
  const cardGap = 16;
  const topY = 140;
  const botY = topY + cardH + 32;

  const top3X = (W - (cardW * 3 + cardGap * 2)) / 2;
  const bot2X = (W - (cardW * 2 + cardGap)) / 2;

  const biases = [
    { name: '正常性バイアス', def: '異常を「正常」と解釈', ex: '「自宅は影響なし」と避難遅延', color: DANGER },
    { name: '楽観主義バイアス', def: 'ストレス回避で楽観的に解釈', ex: '「自分には起きない」と先送り', color: WARN },
    { name: 'カタストロフィー', def: '稀な壊滅的事象を過大評価', ex: '隕石報道で地震対策費を転用', color: BRAND },
    { name: 'ベテランバイアス', def: '過去経験を優先し現状を軽視', ex: '過去類似苦情が鎮静化と放置', color: POSITIVE },
    { name: 'バージンバイアス', def: '未経験事象を「正常」と判断', ex: '過去にない内部犯行を想定外', color: BRAND_DEEP },
  ];

  function card(x, y, b) {
    return `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${b.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="${cardW}" height="56" rx="12" fill="${b.color}"/>
  <rect x="${x}" y="${y + 44}" width="${cardW}" height="14" fill="${b.color}"/>
  <text x="${x + cardW / 2}" y="${y + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(b.name)}</text>
  <text x="${x + 20}" y="${y + 100}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">定義</text>
  <text x="${x + 20}" y="${y + 132}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(b.def)}</text>
  <text x="${x + 20}" y="${y + 180}" font-family="${FONT}" font-size="22" font-weight="700" fill="${b.color}">例</text>
  <text x="${x + 20}" y="${y + 212}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(b.ex)}</text>`;
  }

  let body = '';
  for (let i = 0; i < 3; i++) {
    body += card(top3X + i * (cardW + cardGap), topY, biases[i]);
  }
  for (let i = 0; i < 2; i++) {
    body += card(bot2X + i * (cardW + cardGap), botY, biases[3 + i]);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('リスク認知バイアス — 5種類の定義と典型例', 'R6 Ⅰ-1-25 のマッチング問題と直結')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 8: 安全 × 他4管理 トレードオフマップ
// ------------------------------------------------------------------
function svgTradeoffMap() {
  // 4 トレードオフを縦に並べ、各行を「対立 / 解決 / 残余リスク」の 3 列で展開
  const xMain = 40;
  const headerY = 130;
  const headerH = 50;
  const labelW = 240;
  const colW = 296;
  const colGap = 8;
  const rowH = 130;
  const rowGap = 12;

  const tradeoffs = [
    {
      label: '経済性管理',
      sub: 'インフラ老朽化',
      color: WARN,
      conflict: '事後保全＝低コスト',
      conflictSub: 'vs 致命的事故リスク（八潮市陥没）',
      solve: 'RBM / ALARP 原則',
      solveSub: '予防保全で30年累計3割縮減',
      residual: 'IoT 遠隔監視',
      residualSub: '住民協働の通報制度で補完',
    },
    {
      label: '人的資源管理',
      sub: '2024年問題・担い手不足',
      color: POSITIVE,
      conflict: '長時間労働＝生産維持',
      conflictSub: 'vs 疲労蓄積・KY能力低下',
      solve: '勤務間インターバル11h',
      solveSub: 'VR/AR で KYT を体感学習',
      residual: 'フェールセーフ強化',
      residualSub: '監視員配置・多言語ピクト',
    },
    {
      label: '情報管理',
      sub: 'DX・自動運転',
      color: BRAND,
      conflict: '自動化＝接触事故防止',
      conflictSub: 'vs サイバー攻撃・AI誤判断',
      solve: '多層防御・OTセキュリティ',
      solveSub: 'PoC で安全検証→横展開',
      residual: 'フェールソフト維持',
      residualSub: '人間最終確認・手動介入',
    },
    {
      label: '社会環境管理',
      sub: '流域治水・激甚災害',
      color: DANGER,
      conflict: 'ハード整備＝防災力',
      conflictSub: 'vs 景観・生態系・生活圏分断',
      solve: 'ミティゲーション階層',
      solveSub: '流域治水PJ2.0／オールハザード',
      residual: 'タイムライン避難計画',
      residualSub: '想定外でソフト補完',
    },
  ];

  const cols = [
    { label: '① 対立の構造', color: DANGER, key: 'conflict', subKey: 'conflictSub' },
    { label: '② 解決フレームワーク', color: POSITIVE, key: 'solve', subKey: 'solveSub' },
    { label: '③ 残余リスクと監視', color: BRAND_DEEP, key: 'residual', subKey: 'residualSub' },
  ];

  const colX = (i) => xMain + labelW + colGap + i * (colW + colGap);
  const totalW = labelW + colGap + cols.length * (colW + colGap);

  // ヘッダ
  let body = `
  <rect x="${xMain}" y="${headerY}" width="${labelW}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${xMain + labelW / 2}" y="${headerY + 33}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">安全管理 ×</text>`;
  for (let i = 0; i < cols.length; i++) {
    const x = colX(i);
    body += `
  <rect x="${x}" y="${headerY}" width="${colW}" height="${headerH}" rx="8" fill="${cols[i].color}"/>
  <text x="${x + colW / 2}" y="${headerY + 33}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(cols[i].label)}</text>`;
  }

  // データ行
  let y = headerY + headerH + 12;
  for (const t of tradeoffs) {
    // 左ラベル列
    body += `
  <rect x="${xMain}" y="${y}" width="${labelW}" height="${rowH}" rx="10" fill="#ffffff" stroke="${t.color}" stroke-width="3"/>
  <rect x="${xMain}" y="${y}" width="10" height="${rowH}" fill="${t.color}"/>
  <text x="${xMain + 24}" y="${y + 42}" font-family="${FONT}" font-size="24" font-weight="800" fill="${t.color}">${xml(t.label)}</text>
  <text x="${xMain + 24}" y="${y + 76}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(t.sub)}</text>`;
    // 3列セル
    for (let i = 0; i < cols.length; i++) {
      const x = colX(i);
      body += `
  <rect x="${x}" y="${y}" width="${colW}" height="${rowH}" rx="10" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1"/>
  <text x="${x + 18}" y="${y + 44}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t[cols[i].key])}</text>
  <text x="${x + 18}" y="${y + 80}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(t[cols[i].subKey])}</text>`;
    }
    y += rowH + rowGap;
  }

  // キャプション
  const captY = y + 10;
  body += `
  <rect x="${xMain}" y="${captY}" width="${totalW}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xMain + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">記述式論文の論理展開：①対立の構造化 → ②解決フレームの提示 → ③残余リスクへの対処、の3段で書く</text>`;

  const H = captY + 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('安全管理 × 他4管理 — 3段階トレードオフマトリクス', '対立の構造／解決フレームワーク／残余リスクと監視を 4 ペアで展開')}
${body}
${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 9: リスクマネジメント全体プロセス図 (ISO 31000)
// ------------------------------------------------------------------
function svgRiskManagementProcess() {
  const H = 760;
  const cx = W / 2;
  const cy = H / 2 + 20;
  const r = 240;

  // 中央：リスク対応の4分類
  let body = '';
  const innerR = 130;
  body += `
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${BRAND_FILL}" stroke="${BRAND_DEEP}" stroke-width="3"/>
  <text x="${cx}" y="${cy - 56}" font-family="${FONT}" font-size="22" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">リスク対応</text>
  <text x="${cx}" y="${cy - 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${POSITIVE}" text-anchor="middle">A. 低減（軽減）</text>
  <text x="${cx}" y="${cy - 4}" font-family="${FONT}" font-size="20" font-weight="700" fill="${BRAND}" text-anchor="middle">B. 移転（保険等）</text>
  <text x="${cx}" y="${cy + 20}" font-family="${FONT}" font-size="20" font-weight="700" fill="${WARN}" text-anchor="middle">C. 回避（断念等）</text>
  <text x="${cx}" y="${cy + 44}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_BODY}" text-anchor="middle">D. 保有（受容）</text>`;

  // 5プロセスを円周上に配置（時計回り、上から開始）
  const steps = [
    { angle: -90, label: 'リスク特定', sub: '発見・認識・記述', color: BRAND },
    { angle: -18, label: 'リスク分析', sub: '特質理解・レベル決定', color: BRAND },
    { angle: 54, label: 'リスク評価', sub: '基準と比較', color: BRAND },
    { angle: 126, label: 'リスク対応', sub: '4分類から選択', color: POSITIVE },
    { angle: 198, label: 'モニタリング', sub: '継続的点検', color: WARN },
  ];

  const boxW = 200;
  const boxH = 80;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const rad = (s.angle * Math.PI) / 180;
    const x = cx + Math.cos(rad) * r - boxW / 2;
    const y = cy + Math.sin(rad) * r - boxH / 2;
    body += `
  <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="10" fill="${s.color}"/>
  <text x="${x + boxW / 2}" y="${y + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${i + 1}. ${xml(s.label)}</text>
  <text x="${x + boxW / 2}" y="${y + 60}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(s.sub)}</text>`;
  }

  // ステップ間を繋ぐ矢印（弧）
  for (let i = 0; i < steps.length; i++) {
    const next = (i + 1) % steps.length;
    const a1 = (steps[i].angle * Math.PI) / 180;
    const a2 = (steps[next].angle * Math.PI) / 180;
    // 始点・終点はボックス端付近、矢印は単純な直線で代用
    const x1 = cx + Math.cos(a1) * (r - 20);
    const y1 = cy + Math.sin(a1) * (r - 20);
    const x2 = cx + Math.cos(a2) * (r - 20);
    const y2 = cy + Math.sin(a2) * (r - 20);
    // 矢印用パスはシンプルな直線（重なり減らすため細く）
    body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK_BODY}" stroke-width="2" stroke-dasharray="4,4" opacity="0.4"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('リスクマネジメント全体プロセス（ISO 31000）', '5プロセスの循環＋中央にリスク対応4分類')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 10: メンタルヘルス 3段階予防図
// ------------------------------------------------------------------
function svgMentalHealthPrevention() {
  const H = 760;
  const x = 60;
  const stepW = (W - 2 * 60) / 3;
  const stepY = 200;
  const stepH = 320;

  const steps = [
    {
      no: '一次予防', sub: '未然防止',
      timing: '事前',
      content: ['労働環境の点検・改善', 'ストレス要因の抑止', '教育研修・職場環境改善'],
      color: POSITIVE,
    },
    {
      no: '二次予防', sub: '早期発見・早期対処',
      timing: '兆候 / 発症',
      content: ['ストレスチェック制度', '兆候の読み取り', '相談窓口・面接指導'],
      color: WARN,
    },
    {
      no: '三次予防', sub: '職場復帰支援',
      timing: '復帰',
      content: ['治療・精神面フォロー', '職場復帰プログラム', '再発・再燃防止'],
      color: BRAND,
    },
  ];

  let body = '';
  // 時間軸
  body += `
  <text x="${x}" y="160" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">時間軸 →</text>
  <line x1="${x + 100}" y1="155" x2="${W - x}" y2="155" stroke="${INK_BODY}" stroke-width="3" marker-end="url(#arrR)"/>`;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const sx = x + i * stepW + 10;
    const sw = stepW - 20;
    body += `
  <rect x="${sx}" y="${stepY}" width="${sw}" height="${stepH}" rx="12" fill="#ffffff" stroke="${s.color}" stroke-width="3"/>
  <rect x="${sx}" y="${stepY}" width="${sw}" height="80" rx="12" fill="${s.color}"/>
  <rect x="${sx}" y="${stepY + 68}" width="${sw}" height="12" fill="${s.color}"/>
  <text x="${sx + sw / 2}" y="${stepY + 36}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(s.no)}</text>
  <text x="${sx + sw / 2}" y="${stepY + 64}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">${xml(s.sub)}</text>
  <rect x="${sx + 20}" y="${stepY + 100}" width="${sw - 40}" height="36" rx="6" fill="${SURFACE_ALT}"/>
  <text x="${sx + sw / 2}" y="${stepY + 124}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">タイミング：${xml(s.timing)}</text>`;
    let cy = stepY + 160;
    for (const c of s.content) {
      body += `
  <text x="${sx + 24}" y="${cy}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">・${xml(c)}</text>`;
      cy += 36;
    }
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${x}" y="${captY}" width="${W - 2 * x}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：「労働環境改善」を二次予防の中心とする選択肢は誤り（一次予防が正解）。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <defs>
    <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK_BODY}"/>
    </marker>
  </defs>
${header('メンタルヘルス 3段階予防 — 取組内容の対応', '一次（未然）／二次（早期）／三次（復帰）の典型取組')}
${body}
${brandFrame(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 11: BCP 結果事象アプローチ集約図
// ------------------------------------------------------------------
function svgBcpResultBased() {
  const H = 800;
  const leftX = 60;
  const rightX = 720;
  const cardW = 320;
  const leftCardH = 60;
  const rightCardH = 80;
  const leftCardGap = 16;
  const rightCardGap = 24;

  // 左：原因事象（5つ）
  const causes = ['直下型地震', '台風・洪水', 'サイバー攻撃', '感染症まん延', 'サプライチェーン断絶'];
  const causesY0 = 180;

  // 右：結果事象（3つ）
  const results = [
    { name: '拠点が使用不能', sub: '建物・設備喪失' },
    { name: 'IT基盤停止', sub: 'システム・通信断' },
    { name: '人的資源不足', sub: '出社不可・健康影響' },
  ];
  const resultsY0 = 220;

  let body = '';
  // 左側ヘッダ
  body += `
  <rect x="${leftX}" y="130" width="${cardW}" height="40" rx="8" fill="${DANGER}"/>
  <text x="${leftX + cardW / 2}" y="${156}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">原因事象（多種多様）</text>`;

  // 左カード
  for (let i = 0; i < causes.length; i++) {
    const y = causesY0 + i * (leftCardH + leftCardGap);
    body += `
  <rect x="${leftX}" y="${y}" width="${cardW}" height="${leftCardH}" rx="10" fill="#ffffff" stroke="${DANGER}" stroke-width="2"/>
  <text x="${leftX + cardW / 2}" y="${y + leftCardH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(causes[i])}</text>`;
  }

  // 中央矢印（集約を表現）— 左から右への複数線が中央でまとまる
  const midX = (leftX + cardW + rightX) / 2;
  for (let i = 0; i < causes.length; i++) {
    const cy = causesY0 + i * (leftCardH + leftCardGap) + leftCardH / 2;
    body += `<line x1="${leftX + cardW + 10}" y1="${cy}" x2="${midX - 30}" y2="${H / 2 + 30}" stroke="${INK_BODY}" stroke-width="2" opacity="0.4"/>`;
  }
  // 中央の集約ノード
  body += `
  <circle cx="${midX - 20}" cy="${H / 2 + 30}" r="32" fill="${WARN}"/>
  <text x="${midX - 20}" y="${H / 2 + 38}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">集約</text>`;
  // 集約 → 右
  for (let i = 0; i < results.length; i++) {
    const ry = resultsY0 + i * (rightCardH + rightCardGap) + rightCardH / 2;
    body += `<line x1="${midX + 10}" y1="${H / 2 + 30}" x2="${rightX - 10}" y2="${ry}" stroke="${POSITIVE}" stroke-width="3" marker-end="url(#arrG)"/>`;
  }

  // 右側ヘッダ
  body += `
  <rect x="${rightX}" y="130" width="${cardW}" height="40" rx="8" fill="${POSITIVE}"/>
  <text x="${rightX + cardW / 2}" y="${156}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">結果事象（少数に集約）</text>`;

  // 右カード
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const y = resultsY0 + i * (rightCardH + rightCardGap);
    body += `
  <rect x="${rightX}" y="${y}" width="${cardW}" height="${rightCardH}" rx="10" fill="#ffffff" stroke="${POSITIVE}" stroke-width="3"/>
  <text x="${rightX + cardW / 2}" y="${y + 32}" font-family="${FONT}" font-size="24" font-weight="800" fill="${POSITIVE}" text-anchor="middle">${xml(r.name)}</text>
  <text x="${rightX + cardW / 2}" y="${y + 60}" font-family="${FONT}" font-size="20" fill="${INK_BODY}" text-anchor="middle">${xml(r.sub)}</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${leftX}" y="${captY}" width="${W - 2 * leftX}" height="44" rx="6" fill="${POSITIVE_FILL}"/>
  <text x="${leftX + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">BCM の本質：原因より結果に着目すれば、原因を問わず汎用的に対応できる。R5 Ⅰ-1-31 の核心。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <defs>
    <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${POSITIVE}"/>
    </marker>
  </defs>
${header('BCP — 結果事象アプローチ', '多様な原因を共通の結果に集約することで汎用的な事業継続体制を構築')}
${body}
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
  console.log('Rendering figures for 5管理-安全管理…');
  await render(svgRiskReductionPyramid(), 'figure-1-risk-reduction-pyramid.png');
  await render(svgReliabilityTerms(), 'figure-2-reliability-terms.png');
  await render(svgAlertLevels(), 'figure-3-alert-levels.png');
  await render(svgSafetyEngineeringMatrix(), 'figure-4-safety-engineering-matrix.png');
  await render(svgReliabilityBlockDiagram(), 'figure-5-reliability-block-diagram.png');
  await render(svgSafetyEvolution(), 'figure-6-safety-evolution.png');
  await render(svgRiskBiases(), 'figure-7-risk-biases.png');
  await render(svgRiskManagementProcess(), 'figure-9-risk-management-process.png');
  await render(svgMentalHealthPrevention(), 'figure-10-mental-health-prevention.png');
  await render(svgBcpResultBased(), 'figure-11-bcp-result-based.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
