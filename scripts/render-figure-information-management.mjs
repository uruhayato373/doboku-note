#!/usr/bin/env node
// content/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-情報管理/img/ に本文用 PNG/SVG 図版 10 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px（本文）、補足 18px 以上、16px 未満は絶対禁止
//   - 末尾余白 80px 以上
//   - 色トークン（src/styles/globals.css と整合）のみ使用
//   - ウォーターマーク不要（brandFrame は空文字、ユーザー指示）
//
// 使い方:
//   node scripts/render-figure-information-management.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'content/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-情報管理/img');
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

function brandFrame() { return ''; }

function header(title, subtitle = '') {
  return `
  <text x="40" y="60" font-family="${FONT}" font-size="32" font-weight="800" fill="${INK_STRONG}">${xml(title)}</text>
  ${subtitle ? `<text x="40" y="96" font-family="${FONT}" font-size="22" fill="${INK_BODY}">${xml(subtitle)}</text>` : ''}`;
}

// ------------------------------------------------------------------
// 図 1: トレードオフマトリクス（情報管理 × 他4管理）
// ------------------------------------------------------------------
function svgTradeoffMap() {
  const rowStart = 130;
  const rowH = 160;
  // 3段 × 4列。最終段下端 = rowStart + rowH*2 + 48 + (rowH-20) = 638
  const H = 640 + 80; // 720
  const pairs = [
    { label: '情報 × 経済性', theme: 'DX投資', tension: '生産性向上 vs 投資コスト', solution: '段階的PoC・ROI分析', color: BRAND, fill: BRAND_FILL },
    { label: '情報 × 人的資源', theme: 'テレワーク', tension: '業務効率 vs 情報漏洩リスク', solution: 'ゼロトラスト・最小権限', color: POSITIVE, fill: POSITIVE_FILL },
    { label: '情報 × 安全', theme: 'ヒヤリハット共有', tension: '透明性 vs 競争秘匿', solution: '匿名化・ノーブレーム文化', color: WARN, fill: WARN_FILL },
    { label: '情報 × 社会環境', theme: 'データ活用', tension: 'データ便益 vs プライバシー', solution: '匿名化・GDPR対応', color: DANGER, fill: DANGER_FILL },
  ];
  const colW = (W - 80) / 4;

  let cards = '';
  pairs.forEach((p, i) => {
    const x = 40 + i * colW;
    cards += `
    <rect x="${x}" y="${rowStart}" width="${colW - 16}" height="${rowH}" rx="12" fill="${p.fill}" stroke="${p.color}" stroke-width="2"/>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + 34}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${p.color}">${xml(p.label)}</text>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + 60}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(p.theme)}</text>
    <rect x="${x}" y="${rowStart + rowH + 24}" width="${colW - 16}" height="${rowH}" rx="12" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1.5"/>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + rowH + 58}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK_STRONG}">対立の構造</text>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + rowH + 86}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="${INK_BODY}">${xml(p.tension.split(' vs ')[0])}</text>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + rowH + 108}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="${p.color}">vs ${xml(p.tension.split(' vs ')[1])}</text>
    <rect x="${x}" y="${rowStart + rowH * 2 + 48}" width="${colW - 16}" height="${rowH - 20}" rx="12" fill="${p.fill}" stroke="${p.color}" stroke-width="1.5"/>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + rowH * 2 + 82}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="${p.color}">解決の方向</text>
    <text x="${x + (colW - 16) / 2}" y="${rowStart + rowH * 2 + 110}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="${INK_STRONG}">${xml(p.solution)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('情報管理 × 他4管理 トレードオフマトリクス', '各ペアの対立構造と解決の方向性')}
  ${cards}
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: SECIモデル（4象限）
// ------------------------------------------------------------------
function svgSeciModel() {
  const cx = W / 2;
  const cy = 380;
  const qW = 460;
  const qH = 240;
  // 最終要素: 軸ラベル y=cy+qH+50=670
  const H = 670 + 80; // 750
  const quads = [
    { label: '共同化（S）', sub: '暗黙知 → 暗黙知', desc: '体験・観察・模倣による共有', example: 'OJT・現場巡回', x: cx - qW - 10, y: cy - qH - 10, color: BRAND, fill: BRAND_FILL },
    { label: '表出化（E）', sub: '暗黙知 → 形式知', desc: '言語化・概念化・マニュアル化', example: 'ナレッジベース構築', x: cx + 10, y: cy - qH - 10, color: POSITIVE, fill: POSITIVE_FILL },
    { label: '内面化（I）', sub: '形式知 → 暗黙知', desc: '実践による体得・スキル習得', example: 'マニュアルを実際に使う', x: cx - qW - 10, y: cy + 10, color: WARN, fill: WARN_FILL },
    { label: '連結化（C）', sub: '形式知 → 形式知', desc: '体系化・統合・データベース整備', example: '報告書まとめ・DB化', x: cx + 10, y: cy + 10, color: DANGER, fill: DANGER_FILL },
  ];

  let qs = '';
  quads.forEach(q => {
    qs += `
    <rect x="${q.x}" y="${q.y}" width="${qW}" height="${qH}" rx="16" fill="${q.fill}" stroke="${q.color}" stroke-width="2.5"/>
    <text x="${q.x + qW / 2}" y="${q.y + 46}" text-anchor="middle" font-size="26" font-weight="800" fill="${q.color}">${xml(q.label)}</text>
    <text x="${q.x + qW / 2}" y="${q.y + 80}" text-anchor="middle" font-size="20" font-weight="600" fill="${INK_STRONG}">${xml(q.sub)}</text>
    <text x="${q.x + qW / 2}" y="${q.y + 114}" text-anchor="middle" font-size="18" fill="${INK_BODY}">${xml(q.desc)}</text>
    <text x="${q.x + qW / 2}" y="${q.y + 150}" text-anchor="middle" font-size="18" fill="${INK_MUTED}">例: ${xml(q.example)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('SECIモデル — 知識変換の4プロセス', '野中郁次郎のナレッジマネジメント理論')}
  <!-- 軸ラベル -->
  <text x="${cx}" y="${cy - qH - 30}" text-anchor="middle" font-size="20" font-weight="600" fill="${INK_MUTED}">暗黙知</text>
  <text x="${cx}" y="${cy + qH + 50}" text-anchor="middle" font-size="20" font-weight="600" fill="${INK_MUTED}">形式知</text>
  <text x="${cx - qW - 30}" y="${cy + 6}" text-anchor="middle" font-size="20" font-weight="600" fill="${INK_MUTED}" transform="rotate(-90 ${cx - qW - 30} ${cy})">From</text>
  <text x="${cx + qW + 50}" y="${cy + 6}" text-anchor="middle" font-size="20" font-weight="600" fill="${INK_MUTED}" transform="rotate(90 ${cx + qW + 50} ${cy})">To</text>
  <!-- 軸線 -->
  <line x1="${cx - qW - 20}" y1="${cy}" x2="${cx + qW + 20}" y2="${cy}" stroke="${BORDER_LIGHT}" stroke-width="2"/>
  <line x1="${cx}" y1="${cy - qH - 20}" x2="${cx}" y2="${cy + qH + 20}" stroke="${BORDER_LIGHT}" stroke-width="2"/>
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="${INK_MUTED}"/>
    </marker>
  </defs>
  ${qs}
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 知的財産権 存続期間比較
// ------------------------------------------------------------------
function svgIpRightsDuration() {
  const rights = [
    { name: '特許権', period: '出願から20年', note: '医薬品等は5年延長可', bars: 20, color: BRAND },
    { name: '実用新案権', period: '出願から10年', note: '無審査主義（早期登録）', bars: 10, color: POSITIVE },
    { name: '意匠権', period: '出願から25年', note: '2020年改正。秘密意匠制度あり', bars: 25, color: WARN },
    { name: '商標権', period: '登録から10年', note: '更新登録で実質無期限', bars: 10, color: DANGER },
    { name: '著作権', period: '死後70年', note: '創作時に自動発生（登録不要）', bars: 70, color: BRAND_DEEP },
  ];

  const barAreaX = 400;
  const barAreaW = W - barAreaX - 60;
  const maxBars = 70;
  const rowH = 74;
  const rowStart = 130;
  const barH = 42;
  // 最終メモ行 y = rowStart + rights.length * rowH + 58 = 558
  const H = 558 + 80; // 638 → 640

  let rows = '';
  rights.forEach((r, i) => {
    const y = rowStart + i * rowH;
    const bw = (r.bars / maxBars) * barAreaW;
    const labelX = barAreaX + bw + 12;
    const labelOverflows = labelX + 80 > W;
    const labelAttr = labelOverflows
      ? `x="${W - 10}" text-anchor="end"`
      : `x="${labelX}"`;
    rows += `
    <text x="${barAreaX - 16}" y="${y + barH / 2 + 8}" text-anchor="end" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(r.name)}</text>
    <rect x="${barAreaX}" y="${y}" width="${bw}" height="${barH}" rx="6" fill="${r.color}"/>
    <text ${labelAttr} y="${y + barH / 2 + 8}" font-size="20" font-weight="600" fill="${labelOverflows ? '#ffffff' : r.color}">${xml(r.period)}</text>
    <text x="${barAreaX}" y="${y + barH + 18}" font-size="18" fill="${INK_MUTED}">${xml(r.note)}</text>`;
  });

  const noteY = rowStart + rights.length * rowH + 30;
  const note1 = '産業財産権（特許・実用新案・意匠・商標）は登録が必要。著作権は登録不要で創作時に自動発生。';
  const note2 = '商標権は更新登録により実質的に無期限。唯一の更新可能な産業財産権。';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('知的財産権 存続期間比較', '産業財産権4法 + 著作権')}
  ${rows}
  <text x="40" y="${noteY}" font-size="18" fill="${INK_BODY}">${xml(note1)}</text>
  <text x="40" y="${noteY + 28}" font-size="18" fill="${DANGER}">${xml(note2)}</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 4: 3種類の平均の使い分け
// ------------------------------------------------------------------
function svgThreeAverages() {
  const avgs = [
    {
      name: '算術平均', formula: '(x₁+x₂+…+xₙ)/n',
      when: '単純な合計÷個数',
      use: '試験の平均点・月収の平均',
      trap: '外れ値の影響を受けやすい',
      color: BRAND, fill: BRAND_FILL,
    },
    {
      name: '幾何平均', formula: 'ⁿ√(x₁×x₂×…×xₙ)',
      when: '倍率・成長率・価格指数の平均',
      use: '売上成長率・物価指数',
      trap: '値がすべて正の場合のみ使用可',
      color: POSITIVE, fill: POSITIVE_FILL,
    },
    {
      name: '調和平均', formula: 'n / (1/x₁+1/x₂+…+1/xₙ)',
      when: '速度・密度の往復平均',
      use: '往復の平均速度・単価の平均',
      trap: '「同距離」か「同量」が前提',
      color: WARN, fill: WARN_FILL,
    },
  ];

  // cards end at y=500. Note at 520. H=520+20+80=620.
  const noteY = 520;
  const H = noteY + 20 + 80; // 620

  const colW = (W - 80) / 3;
  let cards = '';
  avgs.forEach((a, i) => {
    const x = 40 + i * colW;
    const cw = colW - 20;
    cards += `
    <rect x="${x}" y="110" width="${cw}" height="390" rx="14" fill="${a.fill}" stroke="${a.color}" stroke-width="2.5"/>
    <text x="${x + cw / 2}" y="152" text-anchor="middle" font-size="26" font-weight="800" fill="${a.color}">${xml(a.name)}</text>
    <rect x="${x + 16}" y="164" width="${cw - 32}" height="54" rx="8" fill="white" stroke="${a.color}" stroke-width="1.5"/>
    <text x="${x + cw / 2}" y="197" text-anchor="middle" font-size="20" fill="${a.color}" font-weight="700">${xml(a.formula)}</text>
    <text x="${x + 20}" y="250" font-size="19" font-weight="700" fill="${INK_STRONG}">使う場面</text>
    <text x="${x + 20}" y="276" font-size="18" fill="${INK_BODY}">${xml(a.when)}</text>
    <text x="${x + 20}" y="330" font-size="19" font-weight="700" fill="${INK_STRONG}">具体例</text>
    <text x="${x + 20}" y="356" font-size="18" fill="${INK_BODY}">${xml(a.use)}</text>
    <text x="${x + 20}" y="412" font-size="19" font-weight="700" fill="${DANGER}">注意点</text>
    <text x="${x + 20}" y="438" font-size="18" fill="${DANGER}">${xml(a.trap)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('3種類の平均の使い分け', '算術平均 / 幾何平均 / 調和平均')}
  ${cards}
  <text x="40" y="${noteY}" font-size="18" fill="${INK_MUTED}">覚え方: 比率・成長 → 幾何平均（√の形）、速度・密度 → 調和平均（逆数）、それ以外 → 算術平均</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 5: データ分析プロセス
// ------------------------------------------------------------------
function svgDataAnalysisFlow() {
  const steps = [
    { label: 'データ収集', sub: 'IoT・DB・センサ等', color: BRAND, fill: BRAND_FILL },
    { label: 'データ\nクレンジング', sub: '重複削除・正規化・修正', color: POSITIVE, fill: POSITIVE_FILL },
    { label: 'データ\nウェアハウス格納', sub: '時系列・内容別に蓄積', color: WARN, fill: WARN_FILL },
    { label: 'データ\nマイニング', sub: '規則性・パターン発見', color: DANGER, fill: DANGER_FILL },
    { label: '知識の活用', sub: 'BI・意思決定・予測', color: BRAND_DEEP, fill: '#dde8f5' },
  ];
  const stepW = 180;
  const stepH = 160;
  const arrowW = 44;
  const totalW = steps.length * stepW + (steps.length - 1) * arrowW;
  const startX = (W - totalW) / 2;
  const cy = 260;
  // ml note at y=390
  const noteY = 390;
  const H = noteY + 20 + 80; // 490

  let flow = '';
  steps.forEach((s, i) => {
    const x = startX + i * (stepW + arrowW);
    const lines = s.label.split('\n');
    flow += `
    <rect x="${x}" y="${cy - stepH / 2}" width="${stepW}" height="${stepH}" rx="14" fill="${s.fill}" stroke="${s.color}" stroke-width="2.5"/>`;
    if (lines.length === 1) {
      flow += `<text x="${x + stepW / 2}" y="${cy - 18}" text-anchor="middle" font-size="22" font-weight="700" fill="${s.color}">${xml(lines[0])}</text>`;
    } else {
      flow += `<text x="${x + stepW / 2}" y="${cy - 28}" text-anchor="middle" font-size="22" font-weight="700" fill="${s.color}">${xml(lines[0])}</text>
    <text x="${x + stepW / 2}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="700" fill="${s.color}">${xml(lines[1])}</text>`;
    }
    flow += `<text x="${x + stepW / 2}" y="${cy + 30}" text-anchor="middle" font-size="18" fill="${INK_BODY}">${xml(s.sub)}</text>
    <text x="${x + stepW / 2}" y="${cy + 56}" text-anchor="middle" font-size="18" fill="${INK_MUTED}">Step ${i + 1}</text>`;
    if (i < steps.length - 1) {
      const ax = x + stepW;
      flow += `
    <line x1="${ax}" y1="${cy}" x2="${ax + arrowW - 14}" y2="${cy}" stroke="${INK_MUTED}" stroke-width="3"/>
    <polygon points="${ax + arrowW - 2},${cy} ${ax + arrowW - 14},${cy - 8} ${ax + arrowW - 14},${cy + 8}" fill="${INK_MUTED}"/>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('ビッグデータ分析プロセス', 'データ収集 → クレンジング → 格納 → マイニング → 活用')}
  ${flow}
  <text x="40" y="${noteY}" font-size="18" fill="${INK_BODY}">機械学習は「仮説なし」でデータからパターンを自動発見。統計分析は「仮説あり」の確認的アプローチ。</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 6: 情報セキュリティ CIA + ISMS 構造
// ------------------------------------------------------------------
function svgCiaIsms() {
  const cia = [
    { name: '機密性', en: 'Confidentiality', desc: '許可された者のみが情報にアクセスできる', color: BRAND, fill: BRAND_FILL },
    { name: '完全性', en: 'Integrity', desc: '情報が正確・完全で不正改ざんなし', color: POSITIVE, fill: POSITIVE_FILL },
    { name: '可用性', en: 'Availability', desc: '必要な時に許可された者がアクセスできる', color: WARN, fill: WARN_FILL },
  ];

  const ciaColW = (W - 80 - 40) / 3;
  let ciaCards = '';
  cia.forEach((c, i) => {
    const x = 40 + i * (ciaColW + 20);
    ciaCards += `
    <rect x="${x}" y="110" width="${ciaColW}" height="180" rx="12" fill="${c.fill}" stroke="${c.color}" stroke-width="2"/>
    <text x="${x + ciaColW / 2}" y="152" text-anchor="middle" font-size="26" font-weight="800" fill="${c.color}">${xml(c.name)}（${c.en[0]}）</text>
    <text x="${x + ciaColW / 2}" y="186" text-anchor="middle" font-size="19" fill="${INK_MUTED}">${xml(c.en)}</text>
    <text x="${x + ciaColW / 2}" y="224" text-anchor="middle" font-size="18" fill="${INK_BODY}">${xml(c.desc)}</text>
    <text x="${x + ciaColW / 2}" y="268" text-anchor="middle" font-size="18" fill="${INK_MUTED}">CIAの「${c.en[0]}」</text>`;
  });

  // ISMS説明: ismsY=330, rows×46+80 = 5×46+80=310 → bottom=640
  const ismsY = 330;
  const rows = [
    { k: '規格', v: 'ISO/IEC 27001（JIS化：JIS Q 27001）' },
    { k: '方針の確立者', v: 'トップマネジメント（実務担当者ではない）★頻出引っかけ' },
    { k: '対象', v: '組織全体のマネジメントシステム（技術面＋組織面）' },
    { k: '認証制度', v: 'ISMS適合性評価制度（第三者評価）' },
    { k: 'ISO15408との違い', v: 'ISMSは組織・運用面、ISO15408は製品の技術機能のみ' },
  ];
  // ISMS rect bottom: ismsY + rows.length * 46 + 80 = 330 + 230 + 80 = 640
  // H = 640 + 80 = 720
  const H = 720;

  let ismsRows = '';
  rows.forEach((r, i) => {
    const y = ismsY + 60 + i * 46;
    const isWarn = r.v.includes('★');
    ismsRows += `
    <text x="72" y="${y}" font-size="19" font-weight="700" fill="${INK_STRONG}">${xml(r.k)}</text>
    <text x="260" y="${y}" font-size="19" fill="${isWarn ? DANGER : INK_BODY}">${xml(r.v)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('情報セキュリティの基本 — CIA + ISMS', '3要素と情報セキュリティマネジメントシステム')}
  ${ciaCards}
  <rect x="40" y="${ismsY}" width="${W - 80}" height="${rows.length * 46 + 80}" rx="12" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}" stroke-width="1.5"/>
  <text x="72" y="${ismsY + 40}" font-size="24" font-weight="800" fill="${BRAND}">ISMS（ISO/IEC 27001）</text>
  ${ismsRows}
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 7: コミュニケーション技法7種
// ------------------------------------------------------------------
function svgCommunicationTechniques() {
  const techs = [
    { num: '①', name: 'ファシリテーション', desc: '議論の舵取り・結論への収束', color: BRAND },
    { num: '②', name: 'コーチング', desc: '質問で気づきを引き出す（指示ではない）', color: POSITIVE },
    { num: '③', name: 'カウンセリング', desc: '共感・要約・矛盾指摘で意識変容', color: WARN },
    { num: '④', name: 'ネゴシエーション', desc: 'Win-Win を目指した合意・調整', color: DANGER },
    { num: '⑤', name: '合意形成', desc: 'ステークホルダーの意見一致を図る', color: BRAND_DEEP },
    { num: '⑥', name: 'プッシュ型', desc: '送信者が積極発信（メール・手紙）', color: BRAND },
    { num: '⑦', name: 'プル型', desc: '受信者が必要時にアクセス（ポータル）', color: POSITIVE },
  ];

  const rowH = 72;
  // 7 rows: last row bottom = 116 + 6*72 + 68 = 116 + 432 + 68 = 616
  const noteY = 626;
  const H = noteY + 22 + 80; // 728 → 740

  let rows = '';
  techs.forEach((t, i) => {
    const y = 116 + i * rowH;
    const rowBg = i % 2 === 0 ? SURFACE_ALT : 'white';
    rows += `
    <rect x="40" y="${y}" width="${W - 80}" height="${rowH - 4}" rx="8" fill="${rowBg}"/>
    <rect x="40" y="${y}" width="64" height="${rowH - 4}" rx="8" fill="${t.color}"/>
    <text x="72" y="${y + rowH / 2 + 8}" text-anchor="middle" font-size="26" font-weight="800" fill="white">${xml(t.num)}</text>
    <text x="124" y="${y + 28}" font-size="22" font-weight="700" fill="${t.color}">${xml(t.name)}</text>
    <text x="124" y="${y + 54}" font-size="18" fill="${INK_BODY}">${xml(t.desc)}</text>`;
  });

  const note = '択一引っかけ：コーチングは「批判的評価を促す」ではなく「気づきを引き出す」。プッシュ型は「読まれるかは受信者次第」。';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('コミュニケーション技法7種', '定義・適用場面の対応関係を整理する')}
  ${rows}
  <text x="40" y="${noteY}" font-size="18" fill="${DANGER}">${xml(note)}</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 8: 特許出願から取得までのフロー（縦フロー版）
// ------------------------------------------------------------------
function svgPatentFlow() {
  const steps = [
    { label: '① 特許出願', note: '特許庁に出願書類（明細書・図面等）を提出', color: BRAND, fill: BRAND_FILL },
    { label: '② 方式審査', note: '書類の形式上の確認（不備なら補正命令）', color: BRAND, fill: BRAND_FILL },
    { label: '③ 出願公開', note: '出願日から1年6ヶ月後に公開（早期公開申請も可）', color: WARN, fill: WARN_FILL },
    { label: '④ 出願審査請求', note: '出願日から3年以内に請求必須（未請求 = 取下扱い）', color: WARN, fill: WARN_FILL },
    { label: '⑤ 実体審査', note: '特許要件（新規性・進歩性・産業上利用可能性）の審査', color: POSITIVE, fill: POSITIVE_FILL },
  ];

  const stepX = 100;
  const stepW = W - 200;
  const stepH = 72;
  const gap = 18;
  const startY = 120;

  let flow = '';
  steps.forEach((s, i) => {
    const y = startY + i * (stepH + gap);
    flow += `
    <rect x="${stepX}" y="${y}" width="${stepW}" height="${stepH}" rx="12" fill="${s.fill}" stroke="${s.color}" stroke-width="2"/>
    <text x="${stepX + 32}" y="${y + 30}" font-size="24" font-weight="800" fill="${s.color}">${xml(s.label)}</text>
    <text x="${stepX + 32}" y="${y + 58}" font-size="18" fill="${INK_BODY}">${xml(s.note)}</text>`;
    if (i < steps.length - 1) {
      const ay = y + stepH;
      flow += `
    <line x1="${W / 2}" y1="${ay}" x2="${W / 2}" y2="${ay + gap - 4}" stroke="${INK_MUTED}" stroke-width="2.5"/>
    <polygon points="${W / 2},${ay + gap - 2} ${W / 2 - 8},${ay + gap - 12} ${W / 2 + 8},${ay + gap - 12}" fill="${INK_MUTED}"/>`;
    }
  });

  // 分岐: 実体審査の後
  const lastStepBottom = startY + 4 * (stepH + gap) + stepH; // 542
  const splitY = lastStepBottom + 30;
  const branchBoxY = splitY + 30;
  const branchBoxH = 82;
  const branchW = (stepW - 40) / 2;

  flow += `
  <!-- 分岐矢印 -->
  <line x1="${W / 2}" y1="${lastStepBottom}" x2="${W / 2}" y2="${splitY}" stroke="${INK_MUTED}" stroke-width="2.5"/>
  <line x1="${stepX + branchW / 2 + 20}" y1="${splitY}" x2="${stepX + stepW - branchW / 2 - 20}" y2="${splitY}" stroke="${INK_MUTED}" stroke-width="2.5"/>
  <!-- 左: 特許査定 -->
  <line x1="${stepX + branchW / 2 + 20}" y1="${splitY}" x2="${stepX + branchW / 2 + 20}" y2="${branchBoxY}" stroke="${POSITIVE}" stroke-width="2"/>
  <rect x="${stepX}" y="${branchBoxY}" width="${branchW}" height="${branchBoxH}" rx="12" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2"/>
  <text x="${stepX + branchW / 2}" y="${branchBoxY + 34}" text-anchor="middle" font-size="24" font-weight="800" fill="${POSITIVE}">特許査定</text>
  <text x="${stepX + branchW / 2}" y="${branchBoxY + 60}" text-anchor="middle" font-size="18" fill="${INK_BODY}">→ 特許料納付 → 設定登録</text>
  <!-- 右: 拒絶査定 -->
  <line x1="${stepX + stepW - branchW / 2 - 20}" y1="${splitY}" x2="${stepX + stepW - branchW / 2 - 20}" y2="${branchBoxY}" stroke="${DANGER}" stroke-width="2"/>
  <rect x="${stepX + branchW + 40}" y="${branchBoxY}" width="${branchW}" height="${branchBoxH}" rx="12" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>
  <text x="${stepX + branchW + 40 + branchW / 2}" y="${branchBoxY + 34}" text-anchor="middle" font-size="24" font-weight="800" fill="${DANGER}">拒絶査定</text>
  <text x="${stepX + branchW + 40 + branchW / 2}" y="${branchBoxY + 60}" text-anchor="middle" font-size="18" fill="${INK_BODY}">→ 不服審判・再出願可</text>`;

  const keyY = branchBoxY + branchBoxH + 36;
  const key1 = '★ 先願主義：最初に出願した者が権利を取得（発明の創作時期は無関係）';
  const key2 = '★ 審査請求なし = 取下扱い。出願日から3年以内の請求が必須。';
  // H = keyY + 28 + 80
  const H = keyY + 28 + 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('特許取得フロー', '出願から登録まで。審査請求は出願日から3年以内')}
  ${flow}
  <text x="40" y="${keyY}" font-size="19" font-weight="600" fill="${BRAND}">${xml(key1)}</text>
  <text x="40" y="${keyY + 28}" font-size="19" font-weight="600" fill="${DANGER}">${xml(key2)}</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 9: 4つのデータ尺度
// ------------------------------------------------------------------
function svgDataScale() {
  const scales = [
    { name: '名義尺度', en: 'Nominal', example: '郵便番号・電話番号・血液型', ops: '大小比較×、差分×、比率×', stat: '最頻値', color: INK_MUTED, fill: SURFACE_ALT },
    { name: '順序尺度', en: 'Ordinal', example: '5段階評価・震度・学年', ops: '大小比較○、差分×、比率×', stat: '中央値', color: BRAND, fill: BRAND_FILL },
    { name: '間隔尺度', en: 'Interval', example: '温度（℃）・西暦・知能指数', ops: '大小比較○、差分○、比率×', stat: '算術平均', color: POSITIVE, fill: POSITIVE_FILL },
    { name: '比例尺度', en: 'Ratio', example: '身長・体重・金額・距離', ops: '大小比較○、差分○、比率○', stat: '算術平均', color: WARN, fill: WARN_FILL },
  ];

  const rowH = 90;
  // last row bottom = 110 + 3*90 + 82 = 462. note at 472.
  const noteY = 472;
  const H = noteY + 22 + 80; // 574 → 580

  let rows = '';
  scales.forEach((s, i) => {
    const y = 110 + i * rowH;
    rows += `
    <rect x="40" y="${y}" width="${W - 80}" height="${rowH - 8}" rx="10" fill="${s.fill}" stroke="${s.color}" stroke-width="1.5"/>
    <text x="72" y="${y + 38}" font-size="23" font-weight="800" fill="${s.color}">${xml(s.name)}</text>
    <text x="72" y="${y + 62}" font-size="18" fill="${INK_MUTED}">${xml(s.en)}</text>
    <text x="310" y="${y + 38}" font-size="18" fill="${INK_BODY}">${xml(s.example)}</text>
    <text x="310" y="${y + 64}" font-size="18" fill="${INK_MUTED}">${xml(s.ops)}</text>
    <rect x="${W - 220}" y="${y + 12}" width="160" height="52" rx="8" fill="white" stroke="${s.color}" stroke-width="1.5"/>
    <text x="${W - 140}" y="${y + 32}" text-anchor="middle" font-size="17" fill="${INK_MUTED}">代表統計量</text>
    <text x="${W - 140}" y="${y + 56}" text-anchor="middle" font-size="20" font-weight="700" fill="${s.color}">${xml(s.stat)}</text>`;
  });

  const note = '間隔尺度と比例尺度の違い：間隔尺度は「絶対ゼロ点がない」（℃の0度は寒さの基準）。比例尺度は絶対ゼロ点あり（0kgは本当に質量ゼロ）。';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('4つのデータ尺度と適切な統計量', '名義・順序・間隔・比例の違いを正確に把握')}
  ${rows}
  <text x="40" y="${noteY}" font-size="18" fill="${INK_BODY}">${xml(note)}</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 図 10: ゼロトラストvs境界型セキュリティ（描画順修正版）
// ------------------------------------------------------------------
function svgZeroTrustVsBoundary() {
  const lx = 60;
  const lw = (W - 160) / 2;
  const rx = lx + lw + 40;
  const rw = lw;
  const boxY = 110;
  const boxH = 360;
  // warn text at boxY+boxH+40 = 510. H = 510+22+80 = 612 → 620
  const warnY = boxY + boxH + 40;
  const H = warnY + 22 + 80; // 612

  const leftItems = [
    '内部ネットワーク = 信頼領域',
    '外部 = 不信頼領域',
    'VPNで境界を拡張',
    '一度認証されれば内部は自由',
    '境界突破で全データが危険',
  ];
  const rightItems = [
    '内部も外部も区別なく不信頼',
    '全アクセスを個別に認証',
    'VPNに依存しない',
    '最小権限・継続認証が基本',
    '両者を組み合わせた多層防御が理想',
  ];

  // 描画順: rects → titles → items（テキストを必ずrectの後に描画）
  let leftTextItems = '';
  leftItems.forEach((t, i) => {
    leftTextItems += `<text x="${lx + 20}" y="${boxY + 76 + i * 52}" font-size="18" fill="${INK_BODY}">・${xml(t)}</text>`;
  });
  let rightTextItems = '';
  rightItems.forEach((t, i) => {
    const color = t.includes('両者') ? POSITIVE : INK_BODY;
    rightTextItems += `<text x="${rx + 20}" y="${boxY + 76 + i * 52}" font-size="18" fill="${color}">・${xml(t)}</text>`;
  });

  const warn = '★ VPNは「境界型セキュリティ」の手段。ゼロトラストとは異なる概念（R07頻出引っかけ）。';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  ${header('境界型セキュリティ vs ゼロトラストセキュリティ', 'クラウド時代のセキュリティパラダイムシフト')}
  <!-- rects を先に描画してからテキストをその上に重ねる -->
  <rect x="${lx}" y="${boxY}" width="${lw}" height="${boxH}" rx="14" fill="${BRAND_FILL}" stroke="${BRAND}" stroke-width="2.5"/>
  <rect x="${rx}" y="${boxY}" width="${rw}" height="${boxH}" rx="14" fill="${POSITIVE_FILL}" stroke="${POSITIVE}" stroke-width="2.5"/>
  <!-- タイトルテキスト -->
  <text x="${lx + lw / 2}" y="${boxY + 46}" text-anchor="middle" font-size="24" font-weight="800" fill="${BRAND}">境界型セキュリティ</text>
  <text x="${rx + rw / 2}" y="${boxY + 46}" text-anchor="middle" font-size="24" font-weight="800" fill="${POSITIVE}">ゼロトラストセキュリティ</text>
  <!-- 各項目テキスト（rect描画後に重ねる） -->
  ${leftTextItems}
  ${rightTextItems}
  <!-- vs -->
  <text x="${lx + lw + 20}" y="${boxY + boxH / 2 + 12}" text-anchor="middle" font-size="32" font-weight="800" fill="${INK_MUTED}">vs</text>
  <text x="40" y="${warnY}" font-size="19" font-weight="700" fill="${DANGER}">${xml(warn)}</text>
  ${brandFrame()}
</svg>`;
}

// ------------------------------------------------------------------
// 共通: SVG → PNG レンダリング
// ------------------------------------------------------------------
async function render(name, svgContent) {
  const svgPath = join(OUT_DIR, `${name}.svg`);
  const pngPath = join(OUT_DIR, `${name}.png`);
  writeFileSync(svgPath, svgContent, 'utf8');
  await sharp(Buffer.from(svgContent))
    .png({ quality: 90 })
    .toFile(pngPath);
  console.log(`  ✓ ${name}`);
}

// ------------------------------------------------------------------
// メイン
// ------------------------------------------------------------------
(async () => {
  console.log('情報管理 図版生成開始...');
  await render('figure-1-tradeoff-map', svgTradeoffMap());
  await render('figure-2-seci-model', svgSeciModel());
  await render('figure-3-ip-rights-duration', svgIpRightsDuration());
  await render('figure-4-three-averages', svgThreeAverages());
  await render('figure-5-data-analysis-flow', svgDataAnalysisFlow());
  await render('figure-6-cia-isms', svgCiaIsms());
  await render('figure-7-communication-techniques', svgCommunicationTechniques());
  await render('figure-8-patent-flow', svgPatentFlow());
  await render('figure-9-data-scale', svgDataScale());
  await render('figure-10-zero-trust', svgZeroTrustVsBoundary());
  console.log('完了: 10枚 生成');
})();
