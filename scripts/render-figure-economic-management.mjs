#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-経済性管理/img/ に本文用 PNG/SVG 図版 8 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px
//   - 色トークンのみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-economic-management.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-経済性管理/img');
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

function header(title, subtitle) {
  return `
  <text x="40" y="60" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">${xml(title)}</text>
  <text x="40" y="96" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(subtitle)}</text>`;
}

function brandMark(h) {
  return `  <text x="${W - 40}" y="${h - 20}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="end">doboku-note.com</text>`;
}

// ------------------------------------------------------------------
// 図 1: PFI 4方式の比較（BTO / BOT / RO / コンセッション）
// ------------------------------------------------------------------
function svgPfiSchemes() {
  const H = 760;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 100;
  const wMethod = 200;
  const wOwn = 280;
  const wOp = 200;
  const wEnd = 260;
  const wExample = 180;
  const wTotal = wMethod + wOwn + wOp + wEnd + wExample;

  const cols = [
    { label: '方式', w: wMethod },
    { label: '所有権', w: wOwn },
    { label: '運営主体', w: wOp },
    { label: '事業終了時', w: wEnd },
    { label: '代表例', w: wExample },
  ];

  const rows = [
    { method: 'BTO', desc: 'Build-Transfer-Operate', own: '完成後すぐ公共', op: 'SPC（民間）', end: '所有公共のまま', ex: '学校・庁舎・病院' },
    { method: 'BOT', desc: 'Build-Operate-Transfer', own: '事業期間中は民間', op: 'SPC（民間）', end: '期間終了後に移転', ex: '有料道路・空港' },
    { method: 'RO', desc: 'Rehabilitate-Operate', own: '公共（既存施設）', op: 'SPC（民間）', end: '所有公共のまま', ex: '老朽インフラ改修' },
    { method: 'コンセッション', desc: '公共施設等運営権', own: '公共（運営権のみ民間）', op: 'SPC（民間）', end: '運営権設定期間で終了', ex: '空港・上下水道' },
  ];

  let body = '';
  let cx = x;
  for (const c of cols) {
    body += `
  <rect x="${cx}" y="${headerY}" width="${c.w}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${cx + c.w / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(c.label)}</text>`;
    cx += c.w;
  }

  let y = headerY + headerH + 8;
  for (const r of rows) {
    cx = x;
    body += `
  <rect x="${cx}" y="${y}" width="${wMethod}" height="${rowH}" fill="${BRAND_FILL}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + wMethod / 2}" y="${y + 42}" font-family="${FONT}" font-size="28" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">${xml(r.method)}</text>
  <text x="${cx + wMethod / 2}" y="${y + 72}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">${xml(r.desc)}</text>`;
    cx += wMethod;
    body += `
  <rect x="${cx}" y="${y}" width="${wOwn}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.own)}</text>`;
    cx += wOwn;
    body += `
  <rect x="${cx}" y="${y}" width="${wOp}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.op)}</text>`;
    cx += wOp;
    body += `
  <rect x="${cx}" y="${y}" width="${wEnd}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.end)}</text>`;
    cx += wEnd;
    body += `
  <rect x="${cx}" y="${y}" width="${wExample}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(r.ex)}</text>`;
    y += rowH;
  }

  // キャプション
  const captY = y + 32;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：BTO は「完成後すぐ公共所有」、BOT は「事業期間中は民間所有」。所有権タイミングが核心。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('PFI 4方式の比較', '所有権・運営主体・事業終了時の処理で見分ける')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 投資判断3手法の比較（NPV / IRR / 回収期間）
// ------------------------------------------------------------------
function svgInvestmentMethods() {
  const H = 700;
  const colW = 360;
  const xLeft = 40;
  const cardGap = 20;
  const headerY = 150;
  const headerH = 70;

  const methods = [
    {
      name: 'NPV', full: '正味現在価値', color: POSITIVE,
      formula: '将来CF を割引率で\n現在価値に変換', criterion: 'NPV > 0 で採択',
      pro: '金額で意思決定可能', con: '割引率の前提に依存',
    },
    {
      name: 'IRR', full: '内部収益率', color: BRAND,
      formula: 'NPV = 0 となる\n割引率を求める', criterion: 'IRR > 資本コスト',
      pro: '比率で複数案比較', con: '複数解・規模無視',
    },
    {
      name: '回収期間法', full: 'Payback Period', color: WARN,
      formula: '初期投資の回収まで\nに要する年数', criterion: '基準年数以内',
      pro: '直感的・短期重視', con: '時間価値・回収後CF無視',
    },
  ];

  let body = '';
  for (let i = 0; i < methods.length; i++) {
    const m = methods[i];
    const x = xLeft + i * (colW + cardGap);
    body += `
  <rect x="${x}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${m.color}"/>
  <text x="${x + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(m.name)}</text>
  <text x="${x + colW / 2}" y="${headerY + 60}" font-family="${FONT}" font-size="22" fill="#ffffff" text-anchor="middle">${xml(m.full)}</text>`;

    // 計算式ボックス
    const fy = headerY + headerH + 24;
    body += `
  <rect x="${x}" y="${fy}" width="${colW}" height="100" rx="8" fill="${SURFACE_ALT}" stroke="${m.color}" stroke-width="2"/>
  <text x="${x + 20}" y="${fy + 32}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}">計算式</text>`;
    const flines = m.formula.split('\n');
    for (let j = 0; j < flines.length; j++) {
      body += `
  <text x="${x + 20}" y="${fy + 60 + j * 26}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(flines[j])}</text>`;
    }

    // 採択基準
    const cy = fy + 124;
    body += `
  <rect x="${x}" y="${cy}" width="${colW}" height="60" rx="8" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${cy + 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}">採択基準</text>
  <text x="${x + 20}" y="${cy + 52}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}">${xml(m.criterion)}</text>`;

    // 長所
    const py = cy + 80;
    body += `
  <rect x="${x}" y="${py}" width="${colW}" height="60" rx="8" fill="${POSITIVE_FILL}"/>
  <text x="${x + 20}" y="${py + 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="${POSITIVE}">長所</text>
  <text x="${x + 20}" y="${py + 52}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(m.pro)}</text>`;

    // 短所
    const dy = py + 76;
    body += `
  <rect x="${x}" y="${dy}" width="${colW}" height="60" rx="8" fill="${DANGER_FILL}"/>
  <text x="${x + 20}" y="${dy + 28}" font-family="${FONT}" font-size="22" font-weight="700" fill="${DANGER}">短所</text>
  <text x="${x + 20}" y="${dy + 52}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(m.con)}</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">頻出区別：回収期間法は「時間価値を無視」「回収後 CF を無視」が短所。NPV・IRR との優劣はここに帰着。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('投資判断3手法の比較', 'NPV・IRR・回収期間法の長所と短所を一覧で押さえる')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: QC7つ道具 vs 新QC7つ道具
// ------------------------------------------------------------------
function svgQc7Tools() {
  const H = 900;
  const colW = 540;
  const xLeft = 40;
  const xRight = xLeft + colW + 40;
  const headerY = 140;
  const headerH = 60;

  const oldTools = [
    { name: 'パレート図', desc: '重点項目の特定（80:20）' },
    { name: '特性要因図', desc: '原因の構造化（4M）' },
    { name: 'ヒストグラム', desc: 'データ分布の把握' },
    { name: '散布図', desc: '2変数の相関' },
    { name: 'グラフ・管理図', desc: '異常点検出（3σ管理）' },
    { name: 'チェックシート', desc: '集計・確認' },
    { name: '層別', desc: 'グループ分け解析' },
  ];
  const newTools = [
    { name: '親和図', desc: '言語データの整理' },
    { name: '連関図', desc: '因果関係の解析' },
    { name: '系統図', desc: '目的—手段の展開' },
    { name: 'マトリックス図', desc: '2軸の関連分析' },
    { name: 'マトリックスデータ解析', desc: '主成分分析等' },
    { name: 'PDPC 法', desc: '過程決定計画図' },
    { name: 'アローダイアグラム', desc: '日程計画（PERT）' },
  ];

  let body = '';
  // 列ヘッダ
  body += `
  <rect x="${xLeft}" y="${headerY}" width="${colW}" height="${headerH}" rx="8" fill="${BRAND}"/>
  <text x="${xLeft + colW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">QC7つ道具（数値データ）</text>
  <rect x="${xRight}" y="${headerY}" width="${colW}" height="${headerH}" rx="8" fill="${BRAND_DEEP}"/>
  <text x="${xRight + colW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">新QC7つ道具（言語データ）</text>`;

  // カード
  const rowH = 70;
  const rowGap = 8;
  function tool(x, y, t, color) {
    return `
  <rect x="${x}" y="${y}" width="${colW}" height="${rowH}" rx="6" fill="#ffffff" stroke="${color}" stroke-width="2"/>
  <rect x="${x}" y="${y}" width="6" height="${rowH}" fill="${color}"/>
  <text x="${x + 24}" y="${y + 30}" font-family="${FONT}" font-size="24" font-weight="800" fill="${color}">${xml(t.name)}</text>
  <text x="${x + 24}" y="${y + 56}" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(t.desc)}</text>`;
  }

  let yL = headerY + headerH + 20;
  for (const t of oldTools) {
    body += tool(xLeft, yL, t, BRAND);
    yL += rowH + rowGap;
  }
  let yR = headerY + headerH + 20;
  for (const t of newTools) {
    body += tool(xRight, yR, t, BRAND_DEEP);
    yR += rowH + rowGap;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：親和図はQC7つ道具ではなく新QC7つ道具。データ種別で見分ける。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('QC7つ道具 vs 新QC7つ道具', '数値データ用と言語データ用で7つずつ、合計14ツールを区別する')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 4: PERT vs CPM の違い
// ------------------------------------------------------------------
function svgPertVsCpm() {
  const H = 760;
  const xLeft = 40;
  const colW = (W - 100) / 2;
  const xRight = xLeft + colW + 20;
  const headerY = 150;
  const headerH = 80;

  let body = '';
  body += `
  <rect x="${xLeft}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${BRAND}"/>
  <text x="${xLeft + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">PERT</text>
  <text x="${xLeft + colW / 2}" y="${headerY + 62}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">Program Evaluation and Review Technique</text>
  <rect x="${xRight}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${POSITIVE}"/>
  <text x="${xRight + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">CPM</text>
  <text x="${xRight + colW / 2}" y="${headerY + 62}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">Critical Path Method</text>`;

  const items = [
    { label: '出自', l: '米国海軍ポラリス計画', r: '化学プラント保全' },
    { label: '時間見積', l: '3点見積（楽観・最頻・悲観）', r: '1点見積（決定論的）' },
    { label: '対象', l: '不確実性の高い研究開発', r: '繰り返し型のプロジェクト' },
    { label: 'コスト', l: '時間管理が中心', r: '時間と費用のトレードオフ分析' },
    { label: '解析', l: '確率的（正規分布近似）', r: '決定論的（コスト最適化）' },
  ];

  let y = headerY + headerH + 20;
  const rowH = 64;
  for (const it of items) {
    body += `
  <rect x="${xLeft}" y="${y}" width="${colW}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${xLeft + 16}" y="${y + 26}" font-family="${FONT}" font-size="18" font-weight="700" fill="${BRAND}">${xml(it.label)}</text>
  <text x="${xLeft + 16}" y="${y + 52}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(it.l)}</text>
  <rect x="${xRight}" y="${y}" width="${colW}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${xRight + 16}" y="${y + 26}" font-family="${FONT}" font-size="18" font-weight="700" fill="${POSITIVE}">${xml(it.label)}</text>
  <text x="${xRight + 16}" y="${y + 52}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(it.r)}</text>`;
    y += rowH;
  }

  // キャプション
  const captY = y + 32;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：PERT は3点見積、CPM は1点見積＋コスト分析。不確実性の扱いが本質的な違い。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('PERT vs CPM — 日程計画2手法の使い分け', '時間見積の方法と確率/決定論の違いで見分ける')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 5: 開発プロセス5種比較
// ------------------------------------------------------------------
function svgDevProcesses() {
  const H = 800;
  const xLeft = 40;
  const headerY = 140;
  const cardW = (W - 80 - 16) / 3;  // 3列
  const cardH = 220;
  const cardGap = 16;

  const procs = [
    { name: 'ウォーターフォール', subtitle: '上流→下流の一方向', color: BRAND, suit: '要件が確定した大規模案件', risk: '後戻りコストが大' },
    { name: 'V字モデル', subtitle: '開発と検証を対応', color: BRAND_DEEP, suit: '品質保証が重要な系（医療・航空）', risk: '上流変更に弱い' },
    { name: 'スパイラルモデル', subtitle: 'リスク重視の反復', color: POSITIVE, suit: '不確実性の高い大規模開発', risk: '管理コストが大' },
    { name: 'アジャイル', subtitle: '短いイテレーション', color: WARN, suit: '要件が変動する Web/SaaS', risk: 'ドキュメント不足化' },
    { name: 'イテレーティブ', subtitle: '段階的拡張', color: DANGER, suit: 'プロトタイプ重視の研究開発', risk: '全体設計が後手化' },
  ];

  let body = '';
  for (let i = 0; i < procs.length; i++) {
    const p = procs[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = xLeft + col * (cardW + cardGap);
    const y = headerY + row * (cardH + cardGap);

    body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${p.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="${cardW}" height="60" rx="10" fill="${p.color}"/>
  <rect x="${x}" y="${y + 40}" width="${cardW}" height="20" fill="${p.color}"/>
  <text x="${x + cardW / 2}" y="${y + 32}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(p.name)}</text>
  <text x="${x + cardW / 2}" y="${y + 54}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(p.subtitle)}</text>`;

    body += `
  <text x="${x + 20}" y="${y + 92}" font-family="${FONT}" font-size="18" font-weight="700" fill="${POSITIVE}">適用</text>
  <text x="${x + 20}" y="${y + 116}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(p.suit)}</text>`;

    body += `
  <text x="${x + 20}" y="${y + 156}" font-family="${FONT}" font-size="18" font-weight="700" fill="${DANGER}">注意点</text>
  <text x="${x + 20}" y="${y + 180}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(p.risk)}</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：アジャイル＝「文書不要」は誤り。動くソフト優先であってドキュメント否定ではない。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('開発プロセス5種の比較', '反復型・順次型・リスク重視型を要件の確定度で使い分ける')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 6: B/S・P/L・C/F の関係図
// ------------------------------------------------------------------
function svgFinancialStatements() {
  const H = 760;
  const xLeft = 40;
  const headerY = 140;

  // B/S（左）・P/L（中央）・C/F（右）の3カラム
  const colW = 360;
  const colGap = 20;
  const xBs = xLeft;
  const xPl = xBs + colW + colGap;
  const xCf = xPl + colW + colGap;
  const cardY = headerY + 20;
  const cardH = 460;

  let body = '';
  // B/S
  body += `
  <rect x="${xBs}" y="${cardY}" width="${colW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${BRAND}" stroke-width="3"/>
  <rect x="${xBs}" y="${cardY}" width="${colW}" height="60" rx="10" fill="${BRAND}"/>
  <text x="${xBs + colW / 2}" y="${cardY + 30}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">B/S — 貸借対照表</text>
  <text x="${xBs + colW / 2}" y="${cardY + 54}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">期末時点のストック</text>`;

  // 資産 vs 負債/純資産（左右二分割）
  const bsBoxY = cardY + 80;
  const bsBoxH = cardH - 100;
  body += `
  <rect x="${xBs + 20}" y="${bsBoxY}" width="${colW / 2 - 22}" height="${bsBoxH}" fill="${BRAND_FILL}"/>
  <text x="${xBs + colW / 4 + 10}" y="${bsBoxY + 36}" font-family="${FONT}" font-size="22" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">資産</text>
  <text x="${xBs + colW / 4 + 10}" y="${bsBoxY + 80}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">流動資産</text>
  <text x="${xBs + colW / 4 + 10}" y="${bsBoxY + 110}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">固定資産</text>
  <text x="${xBs + colW / 4 + 10}" y="${bsBoxY + 140}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">繰延資産</text>`;

  body += `
  <rect x="${xBs + colW / 2 + 2}" y="${bsBoxY}" width="${colW / 2 - 22}" height="${bsBoxH * 0.55}" fill="${DANGER_FILL}"/>
  <text x="${xBs + 3 * colW / 4 - 10}" y="${bsBoxY + 36}" font-family="${FONT}" font-size="22" font-weight="800" fill="${DANGER}" text-anchor="middle">負債</text>
  <text x="${xBs + 3 * colW / 4 - 10}" y="${bsBoxY + 80}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">流動負債</text>
  <text x="${xBs + 3 * colW / 4 - 10}" y="${bsBoxY + 110}" font-family="${FONT}" font-size="18" fill="${INK_BODY}" text-anchor="middle">固定負債</text>
  <rect x="${xBs + colW / 2 + 2}" y="${bsBoxY + bsBoxH * 0.55}" width="${colW / 2 - 22}" height="${bsBoxH * 0.45}" fill="${POSITIVE_FILL}"/>
  <text x="${xBs + 3 * colW / 4 - 10}" y="${bsBoxY + bsBoxH * 0.55 + 36}" font-family="${FONT}" font-size="22" font-weight="800" fill="${POSITIVE}" text-anchor="middle">純資産</text>`;

  // P/L
  body += `
  <rect x="${xPl}" y="${cardY}" width="${colW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${POSITIVE}" stroke-width="3"/>
  <rect x="${xPl}" y="${cardY}" width="${colW}" height="60" rx="10" fill="${POSITIVE}"/>
  <text x="${xPl + colW / 2}" y="${cardY + 30}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">P/L — 損益計算書</text>
  <text x="${xPl + colW / 2}" y="${cardY + 54}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">期間のフロー（損益）</text>`;

  const plItems = [
    { label: '売上高', y: 100 },
    { label: '－売上原価', y: 140 },
    { label: '＝売上総利益', y: 180, bold: true },
    { label: '－販管費', y: 220 },
    { label: '＝営業利益', y: 260, bold: true },
    { label: '±営業外損益', y: 300 },
    { label: '＝経常利益', y: 340, bold: true },
    { label: '±特別損益・税', y: 380 },
    { label: '＝当期純利益', y: 420, bold: true },
  ];
  for (const it of plItems) {
    body += `
  <text x="${xPl + 24}" y="${cardY + it.y}" font-family="${FONT}" font-size="22" font-weight="${it.bold ? 800 : 400}" fill="${it.bold ? POSITIVE : INK_BODY}">${xml(it.label)}</text>`;
  }

  // C/F
  body += `
  <rect x="${xCf}" y="${cardY}" width="${colW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${WARN}" stroke-width="3"/>
  <rect x="${xCf}" y="${cardY}" width="${colW}" height="60" rx="10" fill="${WARN}"/>
  <text x="${xCf + colW / 2}" y="${cardY + 30}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">C/F — キャッシュフロー</text>
  <text x="${xCf + colW / 2}" y="${cardY + 54}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">期間の現金増減</text>`;

  const cfItems = [
    { label: '営業活動 CF', sub: '本業の現金創出力', y: 100 },
    { label: '投資活動 CF', sub: '設備投資・有価証券', y: 200 },
    { label: '財務活動 CF', sub: '借入・配当・増資', y: 300 },
  ];
  for (const it of cfItems) {
    body += `
  <rect x="${xCf + 20}" y="${cardY + it.y}" width="${colW - 40}" height="80" rx="6" fill="${WARN_FILL}"/>
  <text x="${xCf + 36}" y="${cardY + it.y + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}">${xml(it.label)}</text>
  <text x="${xCf + 36}" y="${cardY + it.y + 60}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(it.sub)}</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">頻出区別：B/S はストック（時点）、P/L・C/F はフロー（期間）。利益とキャッシュは一致しない。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('財務3表の関係 — B/S・P/L・C/F', 'ストック（B/S）とフロー（P/L・C/F）を分けて理解する')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 7: バスタブカーブと保全方式
// ------------------------------------------------------------------
function svgBathtubCurve() {
  const H = 770;
  const xLeft = 80;
  const xRight = W - 60;
  const yTop = 180;
  const yBot = 480;
  const plotW = xRight - xLeft;
  const plotH = yBot - yTop;

  // 3区分（初期/偶発/摩耗）
  const x1 = xLeft + plotW * 0.25;  // 初期/偶発の境界
  const x2 = xLeft + plotW * 0.7;   // 偶発/摩耗の境界

  // バスタブカーブのパス（簡易）
  // 初期：高→低、偶発：低保つ、摩耗：低→高
  const path = `
    M ${xLeft} ${yTop + 20}
    Q ${xLeft + 80} ${yBot - 40}, ${x1} ${yBot - 60}
    L ${x2} ${yBot - 60}
    Q ${xRight - 60} ${yBot - 40}, ${xRight} ${yTop + 20}
  `;

  let body = '';
  // 軸
  body += `
  <line x1="${xLeft}" y1="${yBot}" x2="${xRight}" y2="${yBot}" stroke="${INK_STRONG}" stroke-width="2"/>
  <line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yBot}" stroke="${INK_STRONG}" stroke-width="2"/>
  <text x="${xLeft - 24}" y="${yTop + 20}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="end">高</text>
  <text x="${xLeft - 24}" y="${yBot}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}" text-anchor="end">低</text>
  <text x="${xLeft - 50}" y="${(yTop + yBot) / 2}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}" text-anchor="middle" transform="rotate(-90 ${xLeft - 50} ${(yTop + yBot) / 2})">故障率</text>
  <text x="${(xLeft + xRight) / 2}" y="${yBot + 40}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}" text-anchor="middle">時間（経年）</text>`;

  // 区分背景
  body += `
  <rect x="${xLeft}" y="${yTop}" width="${x1 - xLeft}" height="${plotH}" fill="${DANGER_FILL}" opacity="0.4"/>
  <rect x="${x1}" y="${yTop}" width="${x2 - x1}" height="${plotH}" fill="${POSITIVE_FILL}" opacity="0.4"/>
  <rect x="${x2}" y="${yTop}" width="${xRight - x2}" height="${plotH}" fill="${WARN_FILL}" opacity="0.4"/>`;

  // バスタブカーブ
  body += `
  <path d="${path}" stroke="${BRAND}" stroke-width="4" fill="none"/>`;

  // 区分ラベル
  body += `
  <text x="${(xLeft + x1) / 2}" y="${yTop - 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${DANGER}" text-anchor="middle">初期故障期</text>
  <text x="${(x1 + x2) / 2}" y="${yTop - 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${POSITIVE}" text-anchor="middle">偶発故障期</text>
  <text x="${(x2 + xRight) / 2}" y="${yTop - 10}" font-family="${FONT}" font-size="24" font-weight="800" fill="${WARN}" text-anchor="middle">摩耗故障期</text>`;

  // 各期に対応する保全
  const cardY = yBot + 80;
  const cardH = 130;
  const cardW = (plotW - 40) / 3;
  const maintenances = [
    { x: xLeft, label: '初期故障期', desc: '製造欠陥・初期不良', maint: '事後保全（BM）\n＋デバッグ運転', color: DANGER },
    { x: xLeft + cardW + 20, label: '偶発故障期', desc: '故障率最低・有効寿命', maint: '予防保全（PM）\n状態監視保全（CBM）', color: POSITIVE },
    { x: xLeft + 2 * (cardW + 20), label: '摩耗故障期', desc: '部品劣化・寿命末期', maint: '時間計画保全（TBM）\n更新・部品交換', color: WARN },
  ];
  for (const m of maintenances) {
    body += `
  <rect x="${m.x}" y="${cardY}" width="${cardW}" height="${cardH}" rx="8" fill="#ffffff" stroke="${m.color}" stroke-width="3"/>
  <rect x="${m.x}" y="${cardY}" width="${cardW}" height="36" rx="8" fill="${m.color}"/>
  <rect x="${m.x}" y="${cardY + 24}" width="${cardW}" height="12" fill="${m.color}"/>
  <text x="${m.x + cardW / 2}" y="${cardY + 26}" font-family="${FONT}" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(m.label)}</text>`;
    body += `
  <text x="${m.x + 16}" y="${cardY + 60}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(m.desc)}</text>`;
    const mlines = m.maint.split('\n');
    for (let i = 0; i < mlines.length; i++) {
      body += `
  <text x="${m.x + 16}" y="${cardY + 90 + i * 24}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(mlines[i])}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('バスタブカーブと保全方式の対応', '故障率の3区分に応じて保全戦略を切り替える')}
${body}
${brandMark(H)}
</svg>`;
}

// ------------------------------------------------------------------
// 図 8: 経済性 × 4管理 トレードオフマップ
// ------------------------------------------------------------------
function svgTradeoffMap() {
  const H = 760;
  const xLeft = 40;
  const headerY = 140;
  const cardW = (W - 80 - 30) / 2;  // 2列
  const cardH = 230;
  const cardGap = 30;

  const pairs = [
    {
      partner: '安全管理',
      color: DANGER,
      conflict: 'コスト圧縮 ↔ 予防保全',
      framework: 'ALARP / RBM',
      example: '橋梁点検頻度の削減 — 突発損傷リスクの上昇',
    },
    {
      partner: '人的資源管理',
      color: POSITIVE,
      conflict: '人件費圧縮 ↔ 組織能力',
      framework: 'コア／ノンコア分離',
      example: '請負化の拡大 — 技能伝承の断絶',
    },
    {
      partner: '情報管理',
      color: BRAND,
      conflict: 'IT投資 ↔ 短期収益',
      framework: 'ROI 評価 / 段階導入',
      example: 'BIM/CIM 導入の初期投資 — 数年スパンの回収',
    },
    {
      partner: '社会環境管理',
      color: WARN,
      conflict: 'コスト最適化 ↔ 外部不経済',
      framework: 'LCA / ライフサイクルコスト',
      example: '安価建材の採用 — CO₂ 排出量増・地域景観影響',
    },
  ];

  let body = '';
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = xLeft + col * (cardW + cardGap);
    const y = headerY + row * (cardH + cardGap);

    body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${p.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="${cardW}" height="50" rx="10" fill="${p.color}"/>
  <rect x="${x}" y="${y + 30}" width="${cardW}" height="20" fill="${p.color}"/>
  <text x="${x + cardW / 2}" y="${y + 32}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">経済性 × ${xml(p.partner)}</text>`;

    body += `
  <text x="${x + 24}" y="${y + 88}" font-family="${FONT}" font-size="18" font-weight="700" fill="${DANGER}">対立軸</text>
  <text x="${x + 24}" y="${y + 116}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(p.conflict)}</text>`;

    body += `
  <text x="${x + 24}" y="${y + 148}" font-family="${FONT}" font-size="18" font-weight="700" fill="${BRAND}">解決フレーム</text>
  <text x="${x + 24}" y="${y + 176}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(p.framework)}</text>`;

    body += `
  <text x="${x + 24}" y="${y + 206}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">例: ${xml(p.example)}</text>`;
  }

  // キャプション
  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">記述式：4管理いずれも「対立構造→解決フレーム→残余リスクと監視」の3段階で論じる。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('経済性管理 × 他の4管理 — トレードオフマップ', '記述式で頻出の4ペアを対立軸・解決フレーム・例で整理')}
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
  console.log('Rendering figures for 5管理-経済性管理…');
  await render(svgPfiSchemes(), 'figure-1-pfi-schemes.png');
  await render(svgInvestmentMethods(), 'figure-2-investment-methods.png');
  await render(svgQc7Tools(), 'figure-3-qc7-tools.png');
  await render(svgPertVsCpm(), 'figure-4-pert-vs-cpm.png');
  await render(svgDevProcesses(), 'figure-5-dev-processes.png');
  await render(svgFinancialStatements(), 'figure-6-financial-statements.png');
  await render(svgBathtubCurve(), 'figure-7-bathtub-curve.png');
  await render(svgTradeoffMap(), 'figure-8-tradeoff-map.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
