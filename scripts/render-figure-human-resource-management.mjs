#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-人的資源管理/img/ に本文用 PNG/SVG 図版 8 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 22px
//   - 色トークンのみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-human-resource-management.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-人的資源管理/img');
mkdirSync(OUT_DIR, { recursive: true });

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

// ------------------------------------------------------------------
// 図 1: 5インセンティブ × 3行動パターン
// ------------------------------------------------------------------
function svgIncentives() {
  const H = 720;
  const xLeft = 40;
  const headerY = 140;
  const headerH = 60;
  const wType = 240;
  const wDesc = 480;
  const wMatch = 400;
  const wTotal = wType + wDesc + wMatch;
  const rowH = 80;

  const cols = [
    { label: '5インセンティブ', w: wType },
    { label: '内容', w: wDesc },
    { label: '相性のよい行動パターン', w: wMatch },
  ];

  const rows = [
    { type: '物質的', desc: '給与・賞与・報奨金などの金銭的報酬', match: 'Ⓐ 経済的行動（利害優先）', color: BRAND },
    { type: '評価的', desc: '表彰・公の賞賛による承認', match: 'Ⓑ 情緒的行動（感情）', color: POSITIVE },
    { type: '人的', desc: '尊敬する上司・良好な職場関係', match: 'Ⓑ 情緒的行動（感情）', color: POSITIVE },
    { type: '理念的', desc: '仕事への自信・達成意欲・使命感', match: 'Ⓒ 管理的行動（合理）', color: WARN },
    { type: '自己実現', desc: '能力発揮・自己可能性の拡大', match: 'Ⓒ 管理的行動（合理）', color: WARN },
  ];

  let body = '';
  let cx = xLeft;
  for (const c of cols) {
    body += `
  <rect x="${cx}" y="${headerY}" width="${c.w}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${cx + c.w / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(c.label)}</text>`;
    cx += c.w;
  }

  let y = headerY + headerH + 8;
  for (const r of rows) {
    cx = xLeft;
    body += `
  <rect x="${cx}" y="${y}" width="${wType}" height="${rowH}" fill="${BRAND_FILL}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + wType / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="26" font-weight="800" fill="${r.color}" text-anchor="middle">${xml(r.type)}</text>`;
    cx += wType;
    body += `
  <rect x="${cx}" y="${y}" width="${wDesc}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(r.desc)}</text>`;
    cx += wDesc;
    body += `
  <rect x="${cx}" y="${y}" width="${wMatch}" height="${rowH}" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}">${xml(r.match)}</text>`;
    y += rowH;
  }

  // キャプション
  const captY = y + 32;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">運用：5インセンティブを3行動パターンと組み合わせ、個人の指向に応じた処遇を設計する。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('5インセンティブ × 3行動パターン', '物質的・評価的・人的・理念的・自己実現の5分類と相性')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 7組織形態の特徴と弱点
// ------------------------------------------------------------------
function svgOrganizations() {
  const H = 920;
  const xLeft = 40;
  const headerY = 140;
  const headerH = 56;
  const wName = 220;
  const wFeature = 480;
  const wWeakness = 420;
  const wTotal = wName + wFeature + wWeakness;
  const rowH = 86;

  const cols = [
    { label: '組織形態', w: wName },
    { label: '特徴', w: wFeature },
    { label: '弱点（試験で問われる）', w: wWeakness },
  ];

  const rows = [
    { name: '職能別組織', feature: '製造・販売・購買などの職能別、専門スキル養成', weakness: '部門最適に偏り、意思決定遅延' },
    { name: '事業部制組織', feature: '製品・市場別に権限と利益責任、迅速な意思決定', weakness: 'セクショナリズム・投資の二重化' },
    { name: 'マトリクス組織', feature: '機能別×事業別の二重指揮命令系統', weakness: '命令系統の複雑化・責任の曖昧化' },
    { name: 'ネットワーク組織', feature: '自律した個人・小組織が柔軟に結合', weakness: '不安定・不確実な結果' },
    { name: 'ピラミッド組織', feature: '上意下達・専門化・分業による合理的運営', weakness: '硬直化・環境変化への追従遅れ' },
    { name: 'ティール組織', feature: '指示系統なし、メンバー自律的意思決定（F.ラルー）', weakness: '高度な自律性が前提、運用難度' },
    { name: '達成型組織', feature: 'メンバーが機械のパーツのように働く', weakness: 'メンバーの疲弊リスク' },
  ];

  let body = '';
  let cx = xLeft;
  for (const c of cols) {
    body += `
  <rect x="${cx}" y="${headerY}" width="${c.w}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${cx + c.w / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(c.label)}</text>`;
    cx += c.w;
  }

  let y = headerY + headerH + 8;
  for (const r of rows) {
    cx = xLeft;
    body += `
  <rect x="${cx}" y="${y}" width="${wName}" height="${rowH}" fill="${BRAND_FILL}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + wName / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="800" fill="${BRAND_DEEP}" text-anchor="middle">${xml(r.name)}</text>`;
    cx += wName;
    body += `
  <rect x="${cx}" y="${y}" width="${wFeature}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">${xml(r.feature)}</text>`;
    cx += wFeature;
    body += `
  <rect x="${cx}" y="${y}" width="${wWeakness}" height="${rowH}" fill="${DANGER_FILL}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" font-weight="700" fill="${DANGER}">${xml(r.weakness)}</text>`;
    y += rowH;
  }

  const captY = y + 24;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">頻出：マトリクスは「責任曖昧化」、ネットワークは「不確実性」、ティールは「F.ラルー」がキーワード。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('7組織形態 — 特徴と弱点', '択一で問われる「組織形態 × 弱点」の対応関係')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: マズロー欲求 5 段階説（ピラミッド）
// ------------------------------------------------------------------
function svgMaslow() {
  const H = 800;
  const cx = 360;
  const baseY = 640;
  const apexY = 180;
  const totalH = baseY - apexY;
  const layers = [
    { name: '生理的欲求', desc: '食物・飲み物・睡眠など生命維持', color: '#d0e8f0', text: INK_STRONG },
    { name: '安全・安定への欲求', desc: '身体的危険・経済的不安からの保護', color: '#b8d8ec', text: INK_STRONG },
    { name: '社会的（連帯）欲求', desc: '友人関係・愛情・所属の欲求', color: '#9ac8e8', text: INK_STRONG },
    { name: '尊厳（自我）欲求', desc: '地位・功名・他者承認の欲求', color: '#7ab4dc', text: '#ffffff' },
    { name: '自己実現欲求', desc: '創造活動・自己経験と知識の発揮', color: '#5a9fd0', text: '#ffffff' },
  ];

  const layerH = totalH / layers.length;
  const baseHalfW = 280;

  let body = '';
  body += `
  <defs>
    <marker id="ah" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <polygon points="0 10, 10 5, 0 0" fill="${INK_STRONG}" />
    </marker>
  </defs>
  <line x1="60" y1="${baseY}" x2="60" y2="${apexY - 30}" stroke="${INK_STRONG}" stroke-width="3" marker-end="url(#ah)" />
  <text x="30" y="${(apexY + baseY) / 2}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_BODY}" transform="rotate(-90 30 ${(apexY + baseY) / 2})" text-anchor="middle">下位充足→上位</text>`;

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const yTop = baseY - (i + 1) * layerH;
    const yBot = baseY - i * layerH;
    const halfW_top = baseHalfW * (1 - (i + 1) / layers.length);
    const halfW_bot = baseHalfW * (1 - i / layers.length);
    const yMid = (yBot + yTop) / 2;
    body += `
  <polygon points="${cx - halfW_bot},${yBot} ${cx + halfW_bot},${yBot} ${cx + halfW_top},${yTop} ${cx - halfW_top},${yTop}" fill="${l.color}" stroke="${INK_STRONG}" stroke-width="1"/>`;
    // 自己実現は頂点が小さいので外側にラベル配置
    if (i === 4) {
      body += `
  <line x1="${cx + halfW_top - 4}" y1="${yMid + 4}" x2="${cx + 80}" y2="${yMid - 30}" stroke="${INK_BODY}" stroke-width="1.5"/>
  <text x="${cx + 86}" y="${yMid - 26}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}">${xml(l.name)}</text>`;
    } else {
      body += `
  <text x="${cx}" y="${yMid + 8}" font-family="${FONT}" font-size="22" font-weight="800" fill="${l.text}" text-anchor="middle">${xml(l.name)}</text>`;
    }
    // 説明文をピラミッド右側に
    body += `
  <text x="${cx + baseHalfW + 40}" y="${yMid + 6}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(l.desc)}</text>`;
  }

  // X-Y理論との対応
  body += `
  <rect x="100" y="${baseY + 60}" width="1000" height="60" rx="8" fill="${BRAND_FILL}"/>
  <text x="120" y="${baseY + 96}" font-family="${FONT}" font-size="22" font-weight="700" fill="${BRAND_DEEP}">X理論＝低次欲求への対応／Y理論＝高次欲求への対応として位置づけ</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('マズロー欲求5段階説', '下位から順に5階層、X-Y理論との対応も押さえる')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 4: 動機づけ理論 3 本柱の対比
// ------------------------------------------------------------------
function svgMotivationTheories() {
  const H = 760;
  const xLeft = 40;
  const colW = 360;
  const cardGap = 20;
  const headerY = 150;
  const headerH = 80;

  const theories = [
    {
      name: 'X-Y理論', color: BRAND, type: '実践論的',
      author: 'マグレガー',
      summary: '人間観でリーダーシップを2分',
      x: 'X：怠惰・命令で動く',
      y: 'Y：自律・進んで働く',
      trap: '「Y理論でアメとムチ」は誤り（X的）',
    },
    {
      name: '欲求5段階説', color: POSITIVE, type: '基礎論的',
      author: 'マズロー',
      summary: '欲求は下位から上位へ',
      x: '生理→安全→社会的',
      y: '尊厳→自己実現',
      trap: '低次充足前は高次欲求は出ない',
    },
    {
      name: '二要因理論', color: WARN, type: '基礎論的',
      author: 'ハーズバーグ',
      summary: '満足と不満は別軸',
      x: '衛生：給与・条件',
      y: '動機付け：達成・成長',
      trap: '衛生要因充足≠満足度向上',
    },
  ];

  let body = '';
  for (let i = 0; i < theories.length; i++) {
    const t = theories[i];
    const x = xLeft + i * (colW + cardGap);

    body += `
  <rect x="${x}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${t.color}"/>
  <text x="${x + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.name)}</text>
  <text x="${x + colW / 2}" y="${headerY + 64}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">${xml(t.author)}（${xml(t.type)}）</text>`;

    const sy = headerY + headerH + 24;
    body += `
  <rect x="${x}" y="${sy}" width="${colW}" height="64" rx="8" fill="${SURFACE_ALT}" stroke="${t.color}" stroke-width="2"/>
  <text x="${x + 20}" y="${sy + 26}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_BODY}">要旨</text>
  <text x="${x + 20}" y="${sy + 54}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t.summary)}</text>`;

    const ay = sy + 84;
    body += `
  <rect x="${x}" y="${ay}" width="${colW}" height="120" rx="8" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${ay + 30}" font-family="${FONT}" font-size="20" font-weight="700" fill="${BRAND_DEEP}">2項対立</text>
  <text x="${x + 20}" y="${ay + 62}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(t.x)}</text>
  <text x="${x + 20}" y="${ay + 96}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(t.y)}</text>`;

    const ty = ay + 140;
    body += `
  <rect x="${x}" y="${ty}" width="${colW}" height="100" rx="8" fill="${DANGER_FILL}"/>
  <text x="${x + 20}" y="${ty + 30}" font-family="${FONT}" font-size="20" font-weight="700" fill="${DANGER}">頻出の引っかけ</text>
  <text x="${x + 20}" y="${ty + 60}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}">${xml(t.trap)}</text>`;
  }

  const captY = H - 70;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">3理論はセットで理解。基礎論（マズロー・ハーズバーグ）と実践論（マグレガー）の区別も問われる。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('動機づけ理論3本柱の対比', 'X-Y／マズロー／ハーズバーグの2項対立と引っかけ')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 5: PM 理論 4 象限
// ------------------------------------------------------------------
function svgPmTheory() {
  const H = 760;
  const cx0 = 200;
  const cy0 = 600;
  const len = 480;
  const cellSize = 240;

  let body = '';
  // 軸
  body += `
  <defs>
    <marker id="ah2" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <polygon points="0 10, 10 5, 0 0" fill="${INK_STRONG}" />
    </marker>
  </defs>
  <line x1="${cx0}" y1="${cy0}" x2="${cx0}" y2="${cy0 - len}" stroke="${INK_STRONG}" stroke-width="2.5" marker-end="url(#ah2)" />
  <line x1="${cx0}" y1="${cy0}" x2="${cx0 + len + 20}" y2="${cy0}" stroke="${INK_STRONG}" stroke-width="2.5" marker-end="url(#ah2)" />
  <text x="${cx0 - 30}" y="${cy0 - len + 8}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}" text-anchor="end">高</text>
  <text x="${cx0 - 30}" y="${cy0 + 8}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}" text-anchor="end">低</text>
  <text x="${cx0 + len + 30}" y="${cy0 + 8}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}">高</text>
  <text x="${cx0 - 80}" y="${cy0 - len / 2 - 14}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}" text-anchor="middle">P機能</text>
  <text x="${cx0 - 80}" y="${cy0 - len / 2 + 14}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}" text-anchor="middle">目標達成</text>
  <text x="${cx0 + len / 2}" y="${cy0 + 56}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}" text-anchor="middle">M機能（集団維持）</text>`;

  // 4象限
  const cells = [
    { x: cx0, y: cy0 - len, label: 'Pm型', desc: '成果は上げるが\n人望なし\nまとめが苦手', color: WARN, fill: WARN_FILL },
    { x: cx0 + cellSize, y: cy0 - len, label: 'PM型', desc: '成果を上げ\n人望もあり\nまとめる力あり', color: POSITIVE, fill: POSITIVE_FILL },
    { x: cx0, y: cy0 - cellSize, label: 'pm型', desc: '成果も低く\nまとめる力も低い', color: DANGER, fill: DANGER_FILL },
    { x: cx0 + cellSize, y: cy0 - cellSize, label: 'pM型', desc: '成果は低いが\n人望があり\nまとめる力あり', color: BRAND, fill: BRAND_FILL },
  ];

  for (const c of cells) {
    body += `
  <rect x="${c.x}" y="${c.y}" width="${cellSize}" height="${cellSize}" fill="${c.fill}" stroke="${c.color}" stroke-width="3"/>
  <text x="${c.x + cellSize / 2}" y="${c.y + 50}" font-family="${FONT}" font-size="32" font-weight="900" fill="${c.color}" text-anchor="middle">${xml(c.label)}</text>`;
    const lines = c.desc.split('\n');
    for (let j = 0; j < lines.length; j++) {
      body += `
  <text x="${c.x + cellSize / 2}" y="${c.y + 100 + j * 32}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}" text-anchor="middle">${xml(lines[j])}</text>`;
    }
  }

  // 凡例
  body += `
  <rect x="${cx0 + len + 50}" y="${cy0 - len + 40}" width="380" height="280" rx="10" fill="${SURFACE_ALT}" stroke="${BORDER_LIGHT}"/>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 78}" font-family="${FONT}" font-size="22" font-weight="800" fill="${INK_STRONG}">PM型 = 最も望ましい</text>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 116}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">P：Performance（目標達成）</text>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 144}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">M：Maintenance（集団維持）</text>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 188}" font-family="${FONT}" font-size="20" font-weight="700" fill="${BRAND_DEEP}">三隅二不二（みすみじゅうじ）</text>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 220}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">日本人心理学者が提唱</text>
  <text x="${cx0 + len + 70}" y="${cy0 - len + 264}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_STRONG}">択一頻出：4タイプの組合せ</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('PM理論 — 4象限', 'P（目標達成）×M（集団維持）の組み合わせで4タイプ')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 6: SL 理論 4 段階移行
// ------------------------------------------------------------------
function svgSlTheory() {
  const H = 700;
  const xLeft = 60;
  const yStart = 200;
  const cardW = 250;
  const cardH = 320;
  const gap = 20;

  const stages = [
    { num: '①', label: '高指示\n低協労', desc: '細かく指示\n細かく監督', target: '部下：未熟', color: DANGER, fill: DANGER_FILL },
    { num: '②', label: '高指示\n高協労', desc: '考えを説明\n疑問に答える', target: '部下：成長中', color: WARN, fill: WARN_FILL },
    { num: '③', label: '高協労\n低指示', desc: '指示は最低限\n意思決定環境', target: '部下：自立的', color: BRAND, fill: BRAND_FILL },
    { num: '④', label: '低協労\n低指示', desc: '権限委譲\n穏やかな監督', target: '部下：成熟', color: POSITIVE, fill: POSITIVE_FILL },
  ];

  let body = '';
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const x = xLeft + i * (cardW + gap);

    // 矢印（カード間）
    if (i < stages.length - 1) {
      body += `
  <polygon points="${x + cardW},${yStart + cardH / 2 - 15} ${x + cardW + 18},${yStart + cardH / 2} ${x + cardW},${yStart + cardH / 2 + 15}" fill="${INK_STRONG}"/>`;
    }

    body += `
  <rect x="${x}" y="${yStart}" width="${cardW}" height="${cardH}" rx="12" fill="${s.fill}" stroke="${s.color}" stroke-width="3"/>
  <circle cx="${x + 40}" cy="${yStart + 40}" r="28" fill="${s.color}"/>
  <text x="${x + 40}" y="${yStart + 50}" font-family="${FONT}" font-size="32" font-weight="900" fill="#ffffff" text-anchor="middle">${xml(s.num)}</text>`;

    const lines = s.label.split('\n');
    for (let j = 0; j < lines.length; j++) {
      body += `
  <text x="${x + cardW / 2}" y="${yStart + 110 + j * 32}" font-family="${FONT}" font-size="26" font-weight="800" fill="${s.color}" text-anchor="middle">${xml(lines[j])}</text>`;
    }
    const dlines = s.desc.split('\n');
    for (let j = 0; j < dlines.length; j++) {
      body += `
  <text x="${x + cardW / 2}" y="${yStart + 200 + j * 28}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}" text-anchor="middle">${xml(dlines[j])}</text>`;
    }
    body += `
  <rect x="${x + 16}" y="${yStart + cardH - 60}" width="${cardW - 32}" height="40" rx="6" fill="#ffffff"/>
  <text x="${x + cardW / 2}" y="${yStart + cardH - 32}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_BODY}" text-anchor="middle">${xml(s.target)}</text>`;
  }

  // キャプション
  const captY = H - 70;
  body += `
  <rect x="40" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="60" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">部下の成熟度に応じて①→②→③→④と移行。最終形は権限委譲。提唱：ハーシー・ブランチャード。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('SL理論 — 4段階移行', '部下の成熟度に応じた指示的行動 × 協労的行動の組合せ')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 7: ジョブ型 vs メンバーシップ型 比較
// ------------------------------------------------------------------
function svgJobVsMembership() {
  const H = 700;
  const xLeft = 40;
  const colW = (W - 100) / 2;
  const xRight = xLeft + colW + 20;
  const headerY = 150;
  const headerH = 80;

  let body = '';
  body += `
  <rect x="${xLeft}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${BRAND}"/>
  <text x="${xLeft + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">ジョブ型雇用</text>
  <text x="${xLeft + colW / 2}" y="${headerY + 62}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">仕事に人を当てはめる（欧米型）</text>
  <rect x="${xRight}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${POSITIVE}"/>
  <text x="${xRight + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">メンバーシップ型雇用</text>
  <text x="${xRight + colW / 2}" y="${headerY + 62}" font-family="${FONT}" font-size="20" fill="#ffffff" text-anchor="middle">人を中心に管理（日本型）</text>`;

  const items = [
    { label: '採用', l: '欠員補充の都度・必要数', r: '新卒一括・長期雇用前提' },
    { label: '配置', l: '顕在能力で判断', r: 'ローテーションで適性発見' },
    { label: '賃金', l: '職種で決定（高め）', r: '勤続・職能で決定' },
    { label: '教育', l: '専門知識・即戦力', r: 'OJT教育中心・幅広い経験' },
    { label: '事業変化対応', l: '容易（職務単位で再編）', r: '困難（人を中心に再配置）' },
  ];

  let y = headerY + headerH + 24;
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
  const captY = H - 70;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">記述：DX対応・リスキリング推進にはジョブ型が、長期育成・組織文化醸成にはメンバーシップ型が向く。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('ジョブ型 vs メンバーシップ型雇用', '採用・配置・賃金・教育・事業変化対応で比較')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 8: 6評価バイアス一覧
// ------------------------------------------------------------------
function svgEvaluationBiases() {
  const H = 800;
  const xLeft = 40;
  const cardW = 365;
  const cardH = 230;
  const gap = 18;
  const cardsPerRow = 3;

  const biases = [
    { name: 'ハロー効果', desc: '優れた点（劣った点）に注目し他の点も同様評価', color: BRAND },
    { name: '中心化傾向', desc: '人間関係配慮で無難な評価が中央値に偏る', color: POSITIVE },
    { name: '寛大化／厳格化', desc: '関係配慮で甘い評価／逆に厳しい評価へ偏る', color: WARN },
    { name: '対比誤差', desc: '評価者自身が基準。得意は厳しく苦手は甘く', color: DANGER },
    { name: '論理的誤差', desc: '無関係な学歴・過去失敗を考慮した異常評価', color: BRAND_DEEP },
    { name: '遠近効果', desc: '近時期の成果を強く意識、過去事項は過少評価', color: '#7a4ec8' },
  ];

  let body = '';
  for (let i = 0; i < biases.length; i++) {
    const b = biases[i];
    const col = i % cardsPerRow;
    const row = Math.floor(i / cardsPerRow);
    const x = xLeft + col * (cardW + gap);
    const y = 150 + row * (cardH + gap);

    body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${b.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="${cardW}" height="60" rx="12" fill="${b.color}"/>
  <rect x="${x}" y="${y + 40}" width="${cardW}" height="20" fill="${b.color}"/>
  <text x="${x + 24}" y="${y + 40}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff">${i + 1}.</text>
  <text x="${x + 80}" y="${y + 40}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff">${xml(b.name)}</text>`;

    // 説明（折り返し）
    const lines = wrap(b.desc, 16);
    for (let j = 0; j < lines.length; j++) {
      body += `
  <text x="${x + 24}" y="${y + 110 + j * 32}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">${xml(lines[j])}</text>`;
    }
  }

  // キャプション
  const captY = H - 70;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">択一頻出：6バイアスの定義と例。透明性・加点主義の徹底でバイアスを抑制する。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('6評価バイアス一覧', '人事考課で生じる代表的な6つの評価誤差')}
${body}
</svg>`;
}

function wrap(s, n) {
  const lines = [];
  let cur = '';
  for (const ch of s) {
    cur += ch;
    if ([...cur].length >= n) {
      lines.push(cur);
      cur = '';
    }
  }
  if (cur) lines.push(cur);
  return lines;
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
  console.log('Rendering figures for 5管理-人的資源管理…');
  await render(svgIncentives(), 'figure-1-incentives.png');
  await render(svgOrganizations(), 'figure-2-organizations.png');
  await render(svgMaslow(), 'figure-3-maslow.png');
  await render(svgMotivationTheories(), 'figure-4-motivation-theories.png');
  await render(svgPmTheory(), 'figure-5-pm-theory.png');
  await render(svgSlTheory(), 'figure-6-sl-theory.png');
  await render(svgJobVsMembership(), 'figure-7-job-vs-membership.png');
  await render(svgEvaluationBiases(), 'figure-8-evaluation-biases.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
