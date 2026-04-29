// Instagram カルーセル MVP デザインモックアップ生成器
// type1（definition, 7 枚）+ type3（quiz, 5 枚）= 12 枚
// 出力:
//   SVG: .claude/skills/social/ig-post-create/design/{type}-{n}-{role}.svg
//   PNG: .tmp/sns/design-mockup-v1/{type}-{n}-{role}.png
//   contact sheet: .tmp/sns/design-mockup-v1/_contact-sheet.png

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../../../../..');
const SVG_DIR = resolve(REPO, '.claude/skills/social/ig-post-create/design');
const PNG_DIR = resolve(REPO, '.tmp/sns/design-mockup-v1');

// ===== デザイントークン（svg-tokens.json と整合）=====
const W = 1080;
const H = 1350;
const SAFE_TOP = 96;     // Instagram UI 干渉回避
const SAFE_BOTTOM = 96;
const SIDE = 80;
const CONTENT_X = SIDE;
const CONTENT_W = W - SIDE * 2;

const C = {
  brand:       '#2e6da4',
  brandDeep:   '#1a3a5c',
  brandFill:   '#e8f0fe',
  ink:         '#222',
  inkBody:     '#555',
  inkMuted:    '#8a8a8a',
  surface:     '#f5f5f5',
  divider:     '#d7d7d7',
  white:       '#ffffff',
  positive:    '#3a7d44',
  positiveFill:'#d0e8d0',
  warn:        '#d4a017',
};

const FONT = "'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif";

// 共通 SVG ヘッダ
const svgHead = (ariaLabel) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${ariaLabel}">
  <style>
    text { font-family: ${FONT}; }
  </style>`;
const svgEnd = `</svg>`;

// 左サイドの細いブランドストライプ（全枚共通の視覚アンカー）

// ページインジケータ（右上）
const pageIndicator = (n, total) => `
  <text x="${W - SIDE}" y="${SAFE_TOP - 32}" text-anchor="end" font-size="22" font-weight="500" fill="${C.inkMuted}">${n} / ${total}</text>`;

// 中間スライド用ヘッダラベル（小さく上に置く）
const sectionLabel = (text) => `
  <text x="${CONTENT_X}" y="${SAFE_TOP + 24}" font-size="26" font-weight="700" fill="${C.brand}" letter-spacing="2">${text}</text>
  <line x1="${CONTENT_X}" y1="${SAFE_TOP + 48}" x2="${CONTENT_X + 80}" y2="${SAFE_TOP + 48}" stroke="${C.brand}" stroke-width="3"/>`;

// ブランドフッター（cover / cta のみ）
const brandFooter = (light = false) => {
  const bg = light ? C.white : C.brandDeep;
  const fg = light ? C.brand : C.white;
  const sub = light ? C.inkMuted : '#a8c4dc';
  return `
  <text x="${CONTENT_X}" y="${H - SAFE_BOTTOM + 8}" font-size="34" font-weight="800" fill="${fg}" letter-spacing="1">doboku-note</text>
  <text x="${CONTENT_X}" y="${H - SAFE_BOTTOM + 44}" font-size="22" font-weight="400" fill="${sub}">doboku-note.com</text>`;
};

// 文字を指定幅で折り返し（おおまかな計算、日本語前提：1 文字 ≒ font-size px）
function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    line += ch;
    if (line.length >= maxChars) { lines.push(line); line = ''; }
  }
  if (line) lines.push(line);
  return lines;
}

// 複数行テキスト
function multilineText(x, y, lines, opts = {}) {
  const { size = 32, weight = 400, fill = C.ink, lineHeight = 1.7 } = opts;
  return lines.map((line, i) =>
    `<text x="${x}" y="${y + i * size * lineHeight}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
  ).join('\n  ');
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

// ===== type1: definition（フォロワーシップを例に 7 枚）=====
function t1_cover() {
  return svgHead('cover: フォロワーシップ') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(1, 7)}

  <!-- カテゴリラベル -->
  <text x="${CONTENT_X}" y="${SAFE_TOP + 60}" font-size="28" font-weight="700" fill="${C.brand}" letter-spacing="3">技術士総監キーワード</text>

  <!-- メインタイトル（中央寄せ） -->
  <text x="${W / 2}" y="${H / 2 - 30}" text-anchor="middle" font-size="120" font-weight="900" fill="${C.ink}" letter-spacing="2">フォロワーシップ</text>

  <!-- サブタイトル -->
  <text x="${W / 2}" y="${H / 2 + 60}" text-anchor="middle" font-size="40" font-weight="400" fill="${C.inkBody}">ケリーの2軸 × 5類型を3分で整理</text>

  <!-- アクセントブロック -->
  <rect x="${W / 2 - 80}" y="${H / 2 + 130}" width="160" height="6" fill="${C.brand}"/>

  <!-- セクションタグ -->
  <rect x="${CONTENT_X}" y="${H - SAFE_BOTTOM - 200}" width="280" height="56" rx="6" fill="${C.brandFill}"/>
  <text x="${CONTENT_X + 24}" y="${H - SAFE_BOTTOM - 162}" font-size="26" font-weight="600" fill="${C.brandDeep}">3.1 人的資源管理</text>

  ${brandFooter(true)}
${svgEnd}`;
}

function t1_def() {
  const body = wrap('部下側の視点からリーダーシップを捉えるアプローチ。', 18);
  const sub = wrap('ロバート・ケリー（1992）が著書『The Power of Followership』で体系化した。', 22);
  return svgHead('def: フォロワーシップとは') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(2, 7)}
  ${sectionLabel('DEFINITION')}

  <!-- 大見出し -->
  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="64" font-weight="800" fill="${C.ink}">とは</text>

  <!-- 本文 -->
  ${multilineText(CONTENT_X, SAFE_TOP + 240, body, { size: 52, weight: 700, fill: C.ink, lineHeight: 1.5 })}

  <!-- 補足 callout -->
  <rect x="${CONTENT_X}" y="${H - SAFE_BOTTOM - 280}" width="${CONTENT_W}" height="200" rx="8" fill="${C.brandFill}"/>
  <rect x="${CONTENT_X}" y="${H - SAFE_BOTTOM - 280}" width="6" height="200" fill="${C.brand}"/>
  <text x="${CONTENT_X + 32}" y="${H - SAFE_BOTTOM - 230}" font-size="24" font-weight="700" fill="${C.brand}" letter-spacing="2">提唱者</text>
  ${multilineText(CONTENT_X + 32, H - SAFE_BOTTOM - 180, sub, { size: 28, weight: 400, fill: C.brandDeep, lineHeight: 1.6 })}
${svgEnd}`;
}

function t1_context() {
  const body = wrap('組織の成果はリーダー単独でなく、フォロワーの行動と姿勢で大きく左右される。', 16);
  return svgHead('context: なぜ重要か') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(3, 7)}
  ${sectionLabel('CONTEXT')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="64" font-weight="800" fill="${C.ink}">なぜ重要か</text>

  ${multilineText(CONTENT_X, SAFE_TOP + 240, body, { size: 50, weight: 700, fill: C.ink, lineHeight: 1.55 })}

  <!-- 比較ビジュアル: リーダー vs フォロワー -->
  <g transform="translate(${CONTENT_X}, ${H - SAFE_BOTTOM - 340})">
    <rect width="${(CONTENT_W - 40) / 2}" height="280" rx="12" fill="${C.surface}" stroke="${C.divider}" stroke-width="1"/>
    <text x="${(CONTENT_W - 40) / 4}" y="60" text-anchor="middle" font-size="28" font-weight="700" fill="${C.inkMuted}">従来</text>
    <text x="${(CONTENT_W - 40) / 4}" y="140" text-anchor="middle" font-size="44" font-weight="800" fill="${C.ink}">リーダー</text>
    <text x="${(CONTENT_W - 40) / 4}" y="200" text-anchor="middle" font-size="28" font-weight="400" fill="${C.inkBody}">のみが成果を</text>
    <text x="${(CONTENT_W - 40) / 4}" y="240" text-anchor="middle" font-size="28" font-weight="400" fill="${C.inkBody}">左右する</text>

    <rect x="${(CONTENT_W - 40) / 2 + 40}" width="${(CONTENT_W - 40) / 2}" height="280" rx="12" fill="${C.brandFill}" stroke="${C.brand}" stroke-width="2"/>
    <text x="${(CONTENT_W - 40) / 2 + 40 + (CONTENT_W - 40) / 4}" y="60" text-anchor="middle" font-size="28" font-weight="700" fill="${C.brand}">ケリーの視点</text>
    <text x="${(CONTENT_W - 40) / 2 + 40 + (CONTENT_W - 40) / 4}" y="140" text-anchor="middle" font-size="44" font-weight="800" fill="${C.brandDeep}">フォロワー</text>
    <text x="${(CONTENT_W - 40) / 2 + 40 + (CONTENT_W - 40) / 4}" y="200" text-anchor="middle" font-size="28" font-weight="400" fill="${C.brandDeep}">の行動が成果を</text>
    <text x="${(CONTENT_W - 40) / 2 + 40 + (CONTENT_W - 40) / 4}" y="240" text-anchor="middle" font-size="28" font-weight="400" fill="${C.brandDeep}">大きく動かす</text>
  </g>
${svgEnd}`;
}

function t1_example() {
  return svgHead('example: ケリーの2軸モデル') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(4, 7)}
  ${sectionLabel('MODEL')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="60" font-weight="800" fill="${C.ink}">ケリーの2軸モデル</text>

  <!-- 軸1 -->
  <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 240})">
    <circle cx="40" cy="40" r="36" fill="${C.brand}"/>
    <text x="40" y="55" text-anchor="middle" font-size="40" font-weight="800" fill="${C.white}">1</text>
    <text x="100" y="36" font-size="40" font-weight="700" fill="${C.ink}">独自のクリティカル</text>
    <text x="100" y="80" font-size="40" font-weight="700" fill="${C.ink}">シンキング</text>
    <text x="100" y="124" font-size="26" font-weight="400" fill="${C.inkBody}">自分の頭で考え、建設的な批判ができるか</text>
  </g>

  <!-- 軸2 -->
  <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 480})">
    <circle cx="40" cy="40" r="36" fill="${C.brand}"/>
    <text x="40" y="55" text-anchor="middle" font-size="40" font-weight="800" fill="${C.white}">2</text>
    <text x="100" y="36" font-size="40" font-weight="700" fill="${C.ink}">積極的関与</text>
    <text x="100" y="80" font-size="40" font-weight="700" fill="${C.ink}">（エンゲージメント）</text>
    <text x="100" y="124" font-size="26" font-weight="400" fill="${C.inkBody}">組織活動に自発的に参加するか</text>
  </g>

  <!-- 補足 -->
  <rect x="${CONTENT_X}" y="${H - SAFE_BOTTOM - 160}" width="${CONTENT_W}" height="100" rx="8" fill="${C.surface}"/>
  <text x="${CONTENT_X + 32}" y="${H - SAFE_BOTTOM - 100}" font-size="28" font-weight="600" fill="${C.ink}">この2軸の組合せで5類型が定義される →</text>
${svgEnd}`;
}

function t1_points() {
  const types = [
    { name: '模範的フォロワー', desc: 'クリティカル × 積極', color: C.positive, fill: C.positiveFill },
    { name: '順応型',           desc: '無批判 × 積極',     color: C.brand,    fill: C.brandFill },
    { name: '実務型',           desc: '中間 × 中間',       color: C.inkBody,  fill: C.surface },
    { name: '孤立型',           desc: 'クリティカル × 消極', color: C.warn,     fill: '#fff3cd' },
    { name: '消極的フォロワー', desc: '無批判 × 消極',     color: C.inkMuted, fill: C.surface },
  ];
  const rows = types.map((t, i) => `
    <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 240 + i * 130})">
      <rect width="${CONTENT_W}" height="110" rx="10" fill="${t.fill}"/>
      <rect width="8" height="110" fill="${t.color}"/>
      <text x="36" y="50" font-size="38" font-weight="800" fill="${C.ink}">${t.name}</text>
      <text x="36" y="90" font-size="26" font-weight="400" fill="${C.inkBody}">${t.desc}</text>
    </g>`).join('');

  return svgHead('points: 5類型') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(5, 7)}
  ${sectionLabel('5 TYPES')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="60" font-weight="800" fill="${C.ink}">5つの類型</text>

  ${rows}
${svgEnd}`;
}

function t1_related() {
  const items = [
    { tag: '3.1', name: 'リーダーシップ' },
    { tag: '3.1', name: 'エンゲージメント' },
    { tag: '3.1', name: '動機づけ理論' },
    { tag: '3.2', name: 'OJT・人材育成' },
  ];
  const rows = items.map((it, i) => `
    <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 280 + i * 140})">
      <rect width="${CONTENT_W}" height="110" rx="12" fill="${C.white}" stroke="${C.divider}" stroke-width="2"/>
      <rect x="20" y="32" width="80" height="46" rx="6" fill="${C.brandFill}"/>
      <text x="60" y="64" text-anchor="middle" font-size="24" font-weight="700" fill="${C.brand}">${it.tag}</text>
      <text x="124" y="68" font-size="40" font-weight="700" fill="${C.ink}">${it.name}</text>
      <text x="${CONTENT_W - 40}" y="68" text-anchor="end" font-size="36" fill="${C.brand}">→</text>
    </g>`).join('');

  return svgHead('related: 関連キーワード') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(6, 7)}
  ${sectionLabel('RELATED')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="60" font-weight="800" fill="${C.ink}">関連キーワード</text>
  <text x="${CONTENT_X}" y="${SAFE_TOP + 200}" font-size="28" font-weight="400" fill="${C.inkBody}">人的資源管理ピラーで深掘りする</text>

  ${rows}
${svgEnd}`;
}

function t1_cta() {
  return svgHead('cta: もっと詳しく') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  ${pageIndicator(7, 7).replace(C.inkMuted, '#a8c4dc')}

  <!-- 装飾円 -->
  <circle cx="${W - 200}" cy="200" r="280" fill="${C.brand}" opacity="0.3"/>
  <circle cx="200" cy="${H - 200}" r="220" fill="${C.brand}" opacity="0.2"/>

  <!-- メイン -->
  <text x="${W / 2}" y="${H / 2 - 120}" text-anchor="middle" font-size="44" font-weight="600" fill="#a8c4dc" letter-spacing="3">もっと詳しく学ぶ</text>

  <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}" letter-spacing="2">技術士総監</text>
  <text x="${W / 2}" y="${H / 2 + 100}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}" letter-spacing="2">キーワード集 2026</text>

  <!-- 検索プロンプト -->
  <rect x="${W / 2 - 280}" y="${H / 2 + 180}" width="560" height="100" rx="50" fill="${C.white}"/>
  <text x="${W / 2 - 220}" y="${H / 2 + 240}" font-size="32" fill="${C.inkMuted}">🔍</text>
  <text x="${W / 2 - 130}" y="${H / 2 + 240}" font-size="36" font-weight="700" fill="${C.brandDeep}">フォロワーシップ doboku</text>

  ${brandFooter(false)}
${svgEnd}`;
}

// ===== type3: quiz（5 枚）=====
function t3_cover() {
  return svgHead('quiz cover') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(1, 5)}

  <!-- カテゴリラベル -->
  <text x="${CONTENT_X}" y="${SAFE_TOP + 60}" font-size="28" font-weight="700" fill="${C.brand}" letter-spacing="3">QUIZ ・ 技術士総監</text>

  <!-- でかい Q -->
  <text x="${W / 2}" y="${H / 2 - 80}" text-anchor="middle" font-size="380" font-weight="900" fill="${C.brandFill}">Q</text>

  <!-- メイン文 -->
  <text x="${W / 2}" y="${H / 2 + 80}" text-anchor="middle" font-size="56" font-weight="800" fill="${C.ink}">フォロワーシップ</text>
  <text x="${W / 2}" y="${H / 2 + 150}" text-anchor="middle" font-size="40" font-weight="500" fill="${C.inkBody}">理論を提唱したのは？</text>

  <!-- セクションタグ -->
  <rect x="${CONTENT_X}" y="${H - SAFE_BOTTOM - 200}" width="280" height="56" rx="6" fill="${C.brandFill}"/>
  <text x="${CONTENT_X + 24}" y="${H - SAFE_BOTTOM - 162}" font-size="26" font-weight="600" fill="${C.brandDeep}">3.1 人的資源管理</text>

  ${brandFooter(true)}
${svgEnd}`;
}

function t3_problem() {
  const choices = [
    { k: 'A', v: 'ピーター・ドラッカー' },
    { k: 'B', v: 'ロバート・ケリー' },
    { k: 'C', v: 'ヘンリー・ミンツバーグ' },
    { k: 'D', v: 'クリス・アージリス' },
  ];
  const rows = choices.map((c, i) => `
    <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 380 + i * 130})">
      <rect width="${CONTENT_W}" height="110" rx="14" fill="${C.surface}" stroke="${C.divider}" stroke-width="1"/>
      <circle cx="60" cy="55" r="34" fill="${C.brand}"/>
      <text x="60" y="68" text-anchor="middle" font-size="36" font-weight="800" fill="${C.white}">${c.k}</text>
      <text x="120" y="70" font-size="36" font-weight="600" fill="${C.ink}">${c.v}</text>
    </g>`).join('');

  return svgHead('quiz problem') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(2, 5)}
  ${sectionLabel('PROBLEM')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 160}" font-size="42" font-weight="700" fill="${C.ink}">部下側の視点から組織成果を捉える</text>
  <text x="${CONTENT_X}" y="${SAFE_TOP + 220}" font-size="42" font-weight="700" fill="${C.ink}">「フォロワーシップ」を体系化したのは？</text>

  ${rows}
${svgEnd}`;
}

function t3_pause() {
  return svgHead('quiz pause') + `
  <rect width="${W}" height="${H}" fill="${C.surface}"/>

  ${pageIndicator(3, 5)}

  <!-- 中央配置 -->
  <text x="${W / 2}" y="${H / 2 - 100}" text-anchor="middle" font-size="200" fill="${C.brand}">⏱</text>

  <text x="${W / 2}" y="${H / 2 + 60}" text-anchor="middle" font-size="64" font-weight="800" fill="${C.ink}">考えてみよう</text>
  <text x="${W / 2}" y="${H / 2 + 140}" text-anchor="middle" font-size="36" font-weight="500" fill="${C.inkBody}">スワイプで答え合わせ →</text>

  <!-- 装飾矢印 -->
  <g transform="translate(${W - 200}, ${H / 2 + 200})">
    <path d="M 0 0 L 60 30 L 0 60 Z" fill="${C.brand}" opacity="0.3"/>
    <path d="M 30 0 L 90 30 L 30 60 Z" fill="${C.brand}" opacity="0.6"/>
    <path d="M 60 0 L 120 30 L 60 60 Z" fill="${C.brand}"/>
  </g>
${svgEnd}`;
}

function t3_answer() {
  return svgHead('quiz answer') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  ${pageIndicator(4, 5)}
  ${sectionLabel('ANSWER')}

  <text x="${CONTENT_X}" y="${SAFE_TOP + 140}" font-size="60" font-weight="800" fill="${C.ink}">正解</text>

  <!-- 答え box -->
  <g transform="translate(${CONTENT_X}, ${SAFE_TOP + 220})">
    <rect width="${CONTENT_W}" height="220" rx="16" fill="${C.positiveFill}" stroke="${C.positive}" stroke-width="3"/>
    <circle cx="100" cy="110" r="60" fill="${C.positive}"/>
    <text x="100" y="130" text-anchor="middle" font-size="64" font-weight="900" fill="${C.white}">B</text>
    <text x="200" y="100" font-size="56" font-weight="800" fill="${C.ink}">ロバート・ケリー</text>
    <text x="200" y="160" font-size="30" font-weight="500" fill="${C.inkBody}">Robert E. Kelley（米国・経営学者）</text>
  </g>

  <!-- 解説 -->
  <text x="${CONTENT_X}" y="${SAFE_TOP + 540}" font-size="32" font-weight="700" fill="${C.brand}" letter-spacing="2">EXPLANATION</text>
  <line x1="${CONTENT_X}" y1="${SAFE_TOP + 560}" x2="${CONTENT_X + 200}" y2="${SAFE_TOP + 560}" stroke="${C.brand}" stroke-width="3"/>

  ${multilineText(CONTENT_X, SAFE_TOP + 620, wrap('1992年の著書『The Power of Followership』で、独自のクリティカルシンキング × 積極的関与の2軸で5類型を定義した。', 22), { size: 34, weight: 600, fill: C.ink, lineHeight: 1.55 })}
${svgEnd}`;
}

function t3_cta() {
  return svgHead('quiz cta') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  ${pageIndicator(5, 5).replace(C.inkMuted, '#a8c4dc')}

  <circle cx="${W - 200}" cy="200" r="280" fill="${C.brand}" opacity="0.3"/>
  <circle cx="200" cy="${H - 200}" r="220" fill="${C.brand}" opacity="0.2"/>

  <text x="${W / 2}" y="${H / 2 - 200}" text-anchor="middle" font-size="44" font-weight="600" fill="#a8c4dc" letter-spacing="3">毎日 1 問・解説付き</text>

  <text x="${W / 2}" y="${H / 2 - 80}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}" letter-spacing="2">技術士総監</text>
  <text x="${W / 2}" y="${H / 2 + 20}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}" letter-spacing="2">過去問演習</text>

  <text x="${W / 2}" y="${H / 2 + 130}" text-anchor="middle" font-size="36" font-weight="500" fill="#cfdef0">680 問・全章カバー</text>

  <!-- 検索プロンプト -->
  <rect x="${W / 2 - 280}" y="${H / 2 + 200}" width="560" height="100" rx="50" fill="${C.white}"/>
  <text x="${W / 2 - 220}" y="${H / 2 + 260}" font-size="32" fill="${C.inkMuted}">🔍</text>
  <text x="${W / 2 - 130}" y="${H / 2 + 260}" font-size="36" font-weight="700" fill="${C.brandDeep}">技術士総監 doboku-note</text>

  ${brandFooter(false)}
${svgEnd}`;
}

// ===== ビルド =====
const slides = [
  { name: 'type1-1-cover',   svg: t1_cover() },
  { name: 'type1-2-def',     svg: t1_def() },
  { name: 'type1-3-context', svg: t1_context() },
  { name: 'type1-4-example', svg: t1_example() },
  { name: 'type1-5-points',  svg: t1_points() },
  { name: 'type1-6-related', svg: t1_related() },
  { name: 'type1-7-cta',     svg: t1_cta() },
  { name: 'type3-1-cover',   svg: t3_cover() },
  { name: 'type3-2-problem', svg: t3_problem() },
  { name: 'type3-3-pause',   svg: t3_pause() },
  { name: 'type3-4-answer',  svg: t3_answer() },
  { name: 'type3-5-cta',     svg: t3_cta() },
];

await mkdir(SVG_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

console.log(`Generating ${slides.length} slides...`);

for (const s of slides) {
  const svgPath = resolve(SVG_DIR, `${s.name}.svg`);
  const pngPath = resolve(PNG_DIR, `${s.name}.png`);
  await writeFile(svgPath, s.svg);
  await sharp(Buffer.from(s.svg))
    .png()
    .toFile(pngPath);
  console.log(`  ✓ ${s.name}`);
}

// contact sheet: 4 列 × 3 行（thumbnail 270×337.5）
const COLS = 4;
const ROWS = 3;
const THUMB_W = 270;
const THUMB_H = Math.round(THUMB_W * H / W); // 337
const GAP = 20;
const PAD = 40;
const SHEET_W = PAD * 2 + COLS * THUMB_W + (COLS - 1) * GAP;
const SHEET_H = PAD * 2 + ROWS * THUMB_H + (ROWS - 1) * GAP + 60; // タイトル行

const composites = [];
for (let i = 0; i < slides.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = PAD + col * (THUMB_W + GAP);
  const y = PAD + 60 + row * (THUMB_H + GAP);
  const buf = await sharp(resolve(PNG_DIR, `${slides[i].name}.png`))
    .resize(THUMB_W, THUMB_H)
    .toBuffer();
  composites.push({ input: buf, top: y, left: x });
}

// 見出し SVG
const titleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="60">
  <style>text{font-family:${FONT};}</style>
  <text x="${PAD}" y="42" font-size="28" font-weight="800" fill="${C.ink}">Instagram Carousel MVP — Design v1</text>
  <text x="${SHEET_W - PAD}" y="42" text-anchor="end" font-size="20" fill="${C.inkMuted}">type1: definition (1-7) ／ type3: quiz (8-12)</text>
</svg>`;
composites.unshift({ input: Buffer.from(titleSvg), top: PAD, left: 0 });

await sharp({
  create: { width: SHEET_W, height: SHEET_H, channels: 4, background: '#fafafa' },
})
  .composite(composites)
  .png()
  .toFile(resolve(PNG_DIR, '_contact-sheet.png'));

console.log(`\nDone.\n  SVG: ${SVG_DIR}\n  PNG: ${PNG_DIR}`);
