#!/usr/bin/env node
// docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-社会環境管理/img/ に本文用 PNG/SVG 図版 8 枚を生成する。
//
// 設計ルール（.claude/knowledge/reference/note-svg-policy.md 準拠）:
//   - キャンバス幅 1200（同一記事内で統一）
//   - フォント ≥ 18px（必須読み取りは 22px 以上）
//   - 色トークンのみ使用
//   - 識別は右下 doboku-note.com テキストのみ
//
// 使い方:
//   node scripts/render-figure-social-environment-management.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-社会環境管理/img');
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

// ------------------------------------------------------------------
// 図 1: CCS / BECCS / DACCS 比較
// ------------------------------------------------------------------
function svgCarbonRemoval() {
  const H = 720;
  const colW = 360;
  const xLeft = 40;
  const cardGap = 20;
  const headerY = 150;
  const headerH = 70;

  const techs = [
    {
      name: 'CCS', full: 'Carbon Capture and Storage', color: BRAND,
      source: '発電所・工場の排出CO₂', target: '地中深くに貯留',
      effect: '排出抑制', ng: 'カーボンネガティブにはならない',
    },
    {
      name: 'BECCS', full: 'Bioenergy with CCS', color: POSITIVE,
      source: 'バイオマス燃焼CO₂', target: '地中圧入・貯留',
      effect: 'カーボンネガティブ', ng: 'バイオマス供給の限界',
    },
    {
      name: 'DACCS', full: 'Direct Air CCS', color: WARN,
      source: '大気中のCO₂を直接回収', target: '地中圧入・貯留',
      effect: 'カーボンネガティブ', ng: 'コスト・エネルギー大',
    },
  ];

  let body = '';
  for (let i = 0; i < techs.length; i++) {
    const t = techs[i];
    const x = xLeft + i * (colW + cardGap);

    body += `
  <rect x="${x}" y="${headerY}" width="${colW}" height="${headerH}" rx="10" fill="${t.color}"/>
  <text x="${x + colW / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(t.name)}</text>
  <text x="${x + colW / 2}" y="${headerY + 60}" font-family="${FONT}" font-size="18" fill="#ffffff" text-anchor="middle">${xml(t.full)}</text>`;

    const fy = headerY + headerH + 24;
    body += `
  <rect x="${x}" y="${fy}" width="${colW}" height="100" rx="8" fill="${SURFACE_ALT}" stroke="${t.color}" stroke-width="2"/>
  <text x="${x + 20}" y="${fy + 30}" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK_BODY}">回収対象</text>
  <text x="${x + 20}" y="${fy + 60}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t.source)}</text>
  <text x="${x + 20}" y="${fy + 86}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">→ ${xml(t.target)}</text>`;

    const ey = fy + 124;
    body += `
  <rect x="${x}" y="${ey}" width="${colW}" height="60" rx="8" fill="${POSITIVE_FILL}"/>
  <text x="${x + 20}" y="${ey + 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${POSITIVE}">効果</text>
  <text x="${x + 20}" y="${ey + 52}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(t.effect)}</text>`;

    const dy = ey + 76;
    body += `
  <rect x="${x}" y="${dy}" width="${colW}" height="80" rx="8" fill="${DANGER_FILL}"/>
  <text x="${x + 20}" y="${dy + 28}" font-family="${FONT}" font-size="20" font-weight="700" fill="${DANGER}">課題・限界</text>
  <text x="${x + 20}" y="${dy + 52}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">${xml(t.ng)}</text>`;
  }

  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">頻出区別：CCS は排出抑制、BECCS と DACCS はカーボンネガティブ。回収対象（排出源 / バイオマス / 大気）が核心。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('CCS / BECCS / DACCS の比較', '回収対象とカーボンネガティブ達成可否で見分ける')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 2: 国際条約 4 種の対象物マトリクス
// ------------------------------------------------------------------
function svgConventions() {
  const H = 760;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 100;
  const wName = 220;
  const wYear = 110;
  const wTarget = 280;
  const wDetail = 510;
  const wTotal = wName + wYear + wTarget + wDetail;

  const cols = [
    { label: '条約名', w: wName },
    { label: '採択年', w: wYear },
    { label: '対象物', w: wTarget },
    { label: '正式名称・要点', w: wDetail },
  ];

  const rows = [
    { name: 'ラムサール条約', year: '1971', target: '湿地・水鳥', detail: '特に水鳥の生息地として重要な湿地の保全', color: BRAND },
    { name: 'バーゼル条約', year: '1989', target: '有害廃棄物', detail: '有害廃棄物の越境移動の規制。プラごみも対象', color: DANGER },
    { name: 'ワシントン条約', year: '1973', target: '絶滅危惧種', detail: '絶滅のおそれがある動植物の国際取引規制', color: WARN },
    { name: 'ストックホルム条約', year: '2001', target: 'POPs（残留性有機汚染物質）', detail: 'PCB・DDT 等 POPs の製造・使用規制', color: POSITIVE },
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
  <rect x="${cx}" y="${y}" width="${wName}" height="${rowH}" fill="${BRAND_FILL}" stroke="${BORDER_LIGHT}"/>
  <rect x="${cx}" y="${y}" width="6" height="${rowH}" fill="${r.color}"/>
  <text x="${cx + wName / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="800" fill="${r.color}" text-anchor="middle">${xml(r.name)}</text>`;
    cx += wName;
    body += `
  <rect x="${cx}" y="${y}" width="${wYear}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + wYear / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}" text-anchor="middle">${xml(r.year)}</text>`;
    cx += wYear;
    body += `
  <rect x="${cx}" y="${y}" width="${wTarget}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(r.target)}</text>`;
    cx += wTarget;
    body += `
  <rect x="${cx}" y="${y}" width="${wDetail}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${cx + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(r.detail)}</text>`;
    y += rowH;
  }

  const captY = y + 32;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：4条約と対象物の組合せ。一語入れ替えで誤答を作る択一の典型。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('国際条約 4種 — 対象物の対応マトリクス', 'ラムサール/バーゼル/ワシントン/ストックホルムの4対応暗記が択一の鍵')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 3: 警戒レベル 5 段階表
// ------------------------------------------------------------------
function svgAlertLevels() {
  const H = 820;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 90;
  const wLevel = 200;
  const wInfo = 340;
  const wIssuer = 160;
  const wAction = 240;
  const wBadge = 180;
  const wTotal = wLevel + wInfo + wIssuer + wAction + wBadge;

  const levels = [
    { lv: '1', name: '早期注意情報', issuer: '気象庁', action: '災害への心構えを高める', color: BRAND, pre: false },
    { lv: '2', name: '大雨・洪水・高潮注意報', issuer: '気象庁', action: '自らの避難行動を確認', color: WARN, pre: false },
    { lv: '3', name: '高齢者等避難', issuer: '市町村長', action: '高齢者等は避難開始', color: DANGER, pre: true },
    { lv: '4', name: '避難指示', issuer: '市町村長', action: '危険な場所から全員避難', color: DANGER, pre: false },
    { lv: '5', name: '緊急安全確保', issuer: '市町村長', action: '命を守る最善の行動', color: BRAND_DEEP, pre: false },
  ];

  let body = '';
  body += `
  <rect x="${x}" y="${headerY}" width="${wLevel}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">警戒レベル</text>
  <rect x="${x + wLevel}" y="${headerY}" width="${wInfo}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">情報の名称</text>
  <rect x="${x + wLevel + wInfo}" y="${headerY}" width="${wIssuer}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo + wIssuer / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">発令者</text>
  <rect x="${x + wLevel + wInfo + wIssuer}" y="${headerY}" width="${wAction}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo + wIssuer + wAction / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">取るべき行動</text>
  <rect x="${x + wLevel + wInfo + wIssuer + wAction}" y="${headerY}" width="${wBadge}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wLevel + wInfo + wIssuer + wAction + wBadge / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">タイミング</text>`;

  let y = headerY + headerH + 8;
  for (const l of levels) {
    body += `
  <rect x="${x}" y="${y}" width="${wLevel}" height="${rowH}" fill="${l.color}"/>
  <text x="${x + wLevel / 2}" y="${y + 42}" font-family="${FONT}" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle">レベル ${l.lv}</text>
  <rect x="${x + wLevel}" y="${y}" width="${wInfo}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wLevel + 24}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="24" font-weight="700" fill="${INK_STRONG}">${xml(l.name)}</text>
  <rect x="${x + wLevel + wInfo}" y="${y}" width="${wIssuer}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wLevel + wInfo + wIssuer / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_BODY}" text-anchor="middle">${xml(l.issuer)}</text>
  <rect x="${x + wLevel + wInfo + wIssuer}" y="${y}" width="${wAction}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wLevel + wInfo + wIssuer + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(l.action)}</text>
  <rect x="${x + wLevel + wInfo + wIssuer + wAction}" y="${y}" width="${wBadge}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>`;
    if (l.pre) {
      body += `
  <rect x="${x + wLevel + wInfo + wIssuer + wAction + 12}" y="${y + 25}" width="${wBadge - 24}" height="40" rx="20" fill="${WARN}"/>
  <text x="${x + wLevel + wInfo + wIssuer + wAction + wBadge / 2}" y="${y + 51}" font-family="${FONT}" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">災害発生「前」</text>`;
    } else if (l.lv === '5') {
      body += `
  <rect x="${x + wLevel + wInfo + wIssuer + wAction + 12}" y="${y + 25}" width="${wBadge - 24}" height="40" rx="20" fill="${DANGER}"/>
  <text x="${x + wLevel + wInfo + wIssuer + wAction + wBadge / 2}" y="${y + 51}" font-family="${FONT}" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">発生又は切迫</text>`;
    }
    y += rowH;
  }

  const captY = y + 32;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：レベル3「高齢者等避難」は災害発生「前」の段階。「後」と書くと誤答。R7 Ⅰ-1-32 の典型。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('警戒レベル — 5段階の対応行動', '令和3年5月「避難情報に関するガイドライン」改定版')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 4: 環境保全 7 原則
// ------------------------------------------------------------------
function svgEnvPrinciples() {
  const H = 800;
  const xLeft = 40;
  const headerY = 140;
  const cardW = (W - 80 - 30) / 2;
  const cardH = 100;
  const cardGap = 12;

  const principles = [
    { name: '拡大生産者責任 (EPR)', desc: '製造〜廃棄・リサイクルまで生産者責任に拡大', color: BRAND_DEEP },
    { name: '汚染者負担の原則 (PPP)', desc: '汚染者が環境劣化対処費を負担。OECD 1972', color: DANGER },
    { name: '予防的措置', desc: '不確実性があっても重大不可逆影響なら措置', color: WARN },
    { name: '順応的取組', desc: '結果に合わせ柔軟対応。生物多様性保全には不適', color: POSITIVE },
    { name: '源流対策原則', desc: '排出口でなく設計・製法で発生源対策', color: BRAND },
    { name: '協働原則', desc: '企画・立案・実行で民間各主体の参加を得る', color: BRAND_DEEP },
    { name: '補完性原則', desc: '基礎単位で処理できないものを広域で処理', color: DANGER },
  ];

  let body = '';
  for (let i = 0; i < principles.length; i++) {
    const p = principles[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = xLeft + col * (cardW + cardGap);
    const y = headerY + row * (cardH + cardGap);

    body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="8" fill="#ffffff" stroke="${p.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="8" height="${cardH}" fill="${p.color}"/>
  <circle cx="${x + 50}" cy="${y + cardH / 2}" r="28" fill="${p.color}"/>
  <text x="${x + 50}" y="${y + cardH / 2 + 10}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle">${i + 1}</text>
  <text x="${x + 92}" y="${y + 36}" font-family="${FONT}" font-size="22" font-weight="800" fill="${p.color}">${xml(p.name)}</text>
  <text x="${x + 92}" y="${y + 70}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(p.desc)}</text>`;
  }

  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：「順応的取組は生物多様性保全に望ましい」は誤り。R4 Ⅰ-1-29 等で頻出。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('環境保全の 7原則', '5原則ではなく7原則。EPR・PPP・予防的措置以外も押さえる')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 5: 環境経済評価 5 手法
// ------------------------------------------------------------------
function svgEconomicEvaluation() {
  const H = 860;
  const x = 40;
  const headerY = 140;
  const headerH = 56;
  const rowH = 100;
  const wType = 180;
  const wMethod = 220;
  const wDetail = 380;
  const wRange = 340;
  const wTotal = wType + wMethod + wDetail + wRange;

  const methods = [
    { type: '顕示選好型', method: '代替法', detail: '市場財で置換した費用で評価', range: '置換する市場財がないと不能', color: BRAND },
    { type: '顕示選好型', method: 'トラベルコスト法', detail: '旅行費用で訪問価値を評価', range: 'レクリエーション施設限定', color: BRAND },
    { type: '顕示選好型', method: 'ヘドニック法', detail: '地価への反映から環境価値を評価', range: '地域的な事項に限定', color: BRAND },
    { type: '表明選好型', method: '仮想評価法（CVM）', detail: 'アンケートで支払意志額を尋ねる', range: '適用範囲広く非利用価値も評価可', color: POSITIVE },
    { type: '表明選好型', method: 'コンジョイント分析', detail: '複数代替案で属性単位の選好評価', range: '適用範囲広く準備に手間', color: POSITIVE },
  ];

  let body = '';
  body += `
  <rect x="${x}" y="${headerY}" width="${wType}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wType / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">系統</text>
  <rect x="${x + wType}" y="${headerY}" width="${wMethod}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wType + wMethod / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">評価手法</text>
  <rect x="${x + wType + wMethod}" y="${headerY}" width="${wDetail}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wType + wMethod + wDetail / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">内容</text>
  <rect x="${x + wType + wMethod + wDetail}" y="${headerY}" width="${wRange}" height="${headerH}" fill="${BRAND_DEEP}"/>
  <text x="${x + wType + wMethod + wDetail + wRange / 2}" y="${headerY + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">適用範囲・特徴</text>`;

  let y = headerY + headerH + 8;
  for (const m of methods) {
    body += `
  <rect x="${x}" y="${y}" width="${wType}" height="${rowH}" fill="${m.color === BRAND ? BRAND_FILL : POSITIVE_FILL}" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wType / 2}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="800" fill="${m.color === BRAND ? BRAND_DEEP : POSITIVE}" text-anchor="middle">${xml(m.type)}</text>
  <rect x="${x + wType}" y="${y}" width="${wMethod}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wType + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="22" font-weight="700" fill="${INK_STRONG}">${xml(m.method)}</text>
  <rect x="${x + wType + wMethod}" y="${y}" width="${wDetail}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wType + wMethod + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(m.detail)}</text>
  <rect x="${x + wType + wMethod + wDetail}" y="${y}" width="${wRange}" height="${rowH}" fill="#ffffff" stroke="${BORDER_LIGHT}"/>
  <text x="${x + wType + wMethod + wDetail + 16}" y="${y + rowH / 2 + 9}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(m.range)}</text>`;
    y += rowH;
  }

  const captY = y + 32;
  body += `
  <rect x="${x}" y="${captY}" width="${wTotal}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${x + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">引っかけ：「ヘドニック法はアンケート」「コンジョイント分析は顕示選好型」は誤り。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('環境経済評価 — 5手法の系統別比較', '顕示選好型 3 + 表明選好型 2 = 5手法')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 6: 環境アセスメント 7 工程フロー
// ------------------------------------------------------------------
function svgEnvAssessmentFlow() {
  const H = 800;
  const xLeft = 40;
  const headerY = 140;
  const stepW = (W - 80 - 60) / 4;
  const stepH = 90;
  const stepGapV = 30;
  const arrowH = 20;

  const steps = [
    { num: 1, name: '計画段階配慮書', desc: '位置・規模等の検討', color: BRAND, target: '第一種事業のみ義務' },
    { num: 2, name: 'スクリーニング', desc: 'アセス要否の個別判定', color: WARN, target: '第二種事業のみ' },
    { num: 3, name: 'スコーピング', desc: 'アセス項目・方法の決定', color: BRAND_DEEP, target: '住民意見を反映' },
    { num: 4, name: '環境アセス実施', desc: '調査・予測・評価', color: POSITIVE, target: '動植物調査手法 6種' },
    { num: 5, name: '準備書', desc: 'アセス結果案の縦覧', color: BRAND, target: '住民意見の収集' },
    { num: 6, name: '評価書', desc: '最終結果の確定', color: BRAND_DEEP, target: '免許等での審査' },
    { num: 7, name: '事後調査', desc: '対策実績の検証', color: BRAND_DEEP, target: '不確実性大の場合' },
  ];

  let body = '';
  // 1段目（4ステップ）
  for (let i = 0; i < 4; i++) {
    const s = steps[i];
    const x = xLeft + i * (stepW + 20);
    const y = headerY;

    body += `
  <rect x="${x}" y="${y}" width="${stepW}" height="${stepH}" rx="10" fill="#ffffff" stroke="${s.color}" stroke-width="3"/>
  <circle cx="${x + 36}" cy="${y + stepH / 2}" r="22" fill="${s.color}"/>
  <text x="${x + 36}" y="${y + stepH / 2 + 8}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${s.num}</text>
  <text x="${x + 70}" y="${y + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="${s.color}">${xml(s.name)}</text>
  <text x="${x + 70}" y="${y + 56}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(s.desc)}</text>
  <text x="${x + 70}" y="${y + 78}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}">${xml(s.target)}</text>`;

    if (i < 3) {
      const ax = x + stepW + 4;
      body += `
  <text x="${ax + 6}" y="${y + stepH / 2 + 8}" font-family="${FONT}" font-size="24" font-weight="800" fill="${INK_BODY}">→</text>`;
    }
  }

  // 中間：右下から左下への矢印
  const midY = headerY + stepH + stepGapV;
  body += `
  <text x="${W - 60}" y="${midY + 30}" font-family="${FONT}" font-size="24" font-weight="800" fill="${INK_BODY}" text-anchor="end">↓</text>`;

  // 2段目（3ステップ）逆並び
  for (let i = 0; i < 3; i++) {
    const s = steps[6 - i];
    const x = xLeft + (3 - i) * (stepW + 20);
    const y = midY + 60;

    body += `
  <rect x="${x}" y="${y}" width="${stepW}" height="${stepH}" rx="10" fill="#ffffff" stroke="${s.color}" stroke-width="3"/>
  <circle cx="${x + 36}" cy="${y + stepH / 2}" r="22" fill="${s.color}"/>
  <text x="${x + 36}" y="${y + stepH / 2 + 8}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${s.num}</text>
  <text x="${x + 70}" y="${y + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="${s.color}">${xml(s.name)}</text>
  <text x="${x + 70}" y="${y + 56}" font-family="${FONT}" font-size="18" fill="${INK_BODY}">${xml(s.desc)}</text>
  <text x="${x + 70}" y="${y + 78}" font-family="${FONT}" font-size="18" fill="${INK_MUTED}">${xml(s.target)}</text>`;

    if (i < 2) {
      const ax = x - 18;
      body += `
  <text x="${ax + 6}" y="${y + stepH / 2 + 8}" font-family="${FONT}" font-size="24" font-weight="800" fill="${INK_BODY}">←</text>`;
    }
  }

  // SEA 補足
  const seaY = midY + 60 + stepH + 40;
  body += `
  <rect x="${xLeft}" y="${seaY}" width="${W - 80}" height="100" rx="8" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${seaY + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="${BRAND_DEEP}">戦略的環境アセスメント (SEA)</text>
  <text x="${xLeft + 20}" y="${seaY + 60}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">事業計画が固まる前に行うアセス。事業ではなく計画・政策レベルの事前評価。</text>
  <text x="${xLeft + 20}" y="${seaY + 86}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">第一種事業の「計画段階配慮書」もこの考え方を反映している。</text>`;

  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：「スクリーニングは第一種事業に対し実施」は誤り（第二種事業のみ）。R6 Ⅰ-1-30 の典型。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('環境アセスメント — 7工程フロー', '配慮書 → スクリーニング → スコーピング → 実施 → 準備書 → 評価書 → 事後調査')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 7: LCA 4プロセス + 影響評価3ステップ
// ------------------------------------------------------------------
function svgLcaProcess() {
  const H = 920;
  const xLeft = 40;
  const headerY = 150;
  const cardW = (W - 80 - 30) / 2;

  // 左側: LCA 4プロセス
  let body = '';
  body += `
  <rect x="${xLeft}" y="${headerY}" width="${cardW}" height="60" rx="10" fill="${BRAND}"/>
  <text x="${xLeft + cardW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">LCA 4プロセス（ISO 14040）</text>`;

  const procs = [
    { num: 1, name: '目的及び調査範囲の設定', desc: '評価対象・システム境界の定義' },
    { num: 2, name: 'インベントリ分析', desc: '積み上げ法 / 産業連関法' },
    { num: 3, name: '影響評価', desc: '環境問題への影響を評価' },
    { num: 4, name: '結果の解釈', desc: '製品改善・戦略・政策へ反映' },
  ];
  let py = headerY + 76;
  for (const p of procs) {
    body += `
  <rect x="${xLeft}" y="${py}" width="${cardW}" height="80" rx="8" fill="#ffffff" stroke="${BRAND}" stroke-width="2"/>
  <circle cx="${xLeft + 36}" cy="${py + 40}" r="22" fill="${BRAND}"/>
  <text x="${xLeft + 36}" y="${py + 48}" font-family="${FONT}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${p.num}</text>
  <text x="${xLeft + 70}" y="${py + 32}" font-family="${FONT}" font-size="22" font-weight="800" fill="${BRAND_DEEP}">${xml(p.name)}</text>
  <text x="${xLeft + 70}" y="${py + 60}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(p.desc)}</text>`;
    py += 96;
  }

  // 右側: 影響評価 3ステップ
  const xRight = xLeft + cardW + 30;
  body += `
  <rect x="${xRight}" y="${headerY}" width="${cardW}" height="60" rx="10" fill="${POSITIVE}"/>
  <text x="${xRight + cardW / 2}" y="${headerY + 38}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">影響評価 3ステップ</text>`;

  const subs = [
    { num: 'a', name: '分類化', desc: 'インベントリ項目を環境問題に関係づけ' },
    { num: 'b', name: '特性化', desc: '影響度を定量的に算出' },
    { num: 'c', name: '重み付け', desc: '統合化指標を計算' },
  ];
  let sy = headerY + 76;
  for (const s of subs) {
    body += `
  <rect x="${xRight}" y="${sy}" width="${cardW}" height="100" rx="8" fill="#ffffff" stroke="${POSITIVE}" stroke-width="2"/>
  <rect x="${xRight}" y="${sy}" width="60" height="100" fill="${POSITIVE}"/>
  <text x="${xRight + 30}" y="${sy + 60}" font-family="${FONT}" font-size="38" font-weight="800" fill="#ffffff" text-anchor="middle">${s.num}</text>
  <text x="${xRight + 80}" y="${sy + 36}" font-family="${FONT}" font-size="24" font-weight="800" fill="${POSITIVE}">${xml(s.name)}</text>
  <text x="${xRight + 80}" y="${sy + 70}" font-family="${FONT}" font-size="20" fill="${INK_BODY}">${xml(s.desc)}</text>`;
    sy += 116;
  }

  // インベントリ手法
  const invY = py + 20;
  body += `
  <rect x="${xLeft}" y="${invY}" width="${cardW}" height="80" rx="8" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${invY + 30}" font-family="${FONT}" font-size="20" font-weight="800" fill="${BRAND_DEEP}">インベントリ分析手法</text>
  <text x="${xLeft + 20}" y="${invY + 56}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">積み上げ法（詳細計算）／産業連関法（マクロ分析）</text>`;

  // クローズドループ vs オープンループ
  body += `
  <rect x="${xRight}" y="${invY}" width="${cardW}" height="80" rx="8" fill="${POSITIVE_FILL}"/>
  <text x="${xRight + 20}" y="${invY + 30}" font-family="${FONT}" font-size="20" font-weight="800" fill="${POSITIVE}">リサイクルの扱い</text>
  <text x="${xRight + 20}" y="${invY + 56}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">クローズドループ／オープンループ</text>`;

  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${WARN_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK_STRONG}">引っかけ：「産業連関法は新技術分析にも適している」は誤り（連関表に含まれない物は分析不能）。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('LCA — 4プロセス + 影響評価 3ステップ', 'ISO 14040 規格に基づくライフサイクルアセスメント')}
${body}
</svg>`;
}

// ------------------------------------------------------------------
// 図 8: TCFD 4要求項目 + 気候関連リスクの2分類
// ------------------------------------------------------------------
function svgTcfd() {
  const H = 920;
  const xLeft = 40;
  const headerY = 150;
  const cardW = (W - 80 - 30) / 2;
  const cardH = 220;
  const cardGap = 30;

  const items = [
    {
      num: 1, title: 'ガバナンス', subtitle: 'Governance',
      detail: '経営陣の関与・監督体制・経営者の役割の開示',
      color: BRAND_DEEP,
    },
    {
      num: 2, title: '戦略', subtitle: 'Strategy',
      detail: 'リスクと機会の経営戦略への反映。シナリオ分析の実施',
      color: BRAND,
    },
    {
      num: 3, title: 'リスク管理', subtitle: 'Risk Management',
      detail: '気候関連リスクの識別・評価・管理プロセス',
      color: WARN,
    },
    {
      num: 4, title: '指標と目標', subtitle: 'Metrics & Targets',
      detail: 'リスクと機会を評価する指標・目標の開示',
      color: POSITIVE,
    },
  ];

  let body = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = xLeft + col * (cardW + cardGap);
    const y = headerY + row * (cardH + cardGap);

    body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${it.color}" stroke-width="3"/>
  <rect x="${x}" y="${y}" width="${cardW}" height="80" rx="10" fill="${it.color}"/>
  <rect x="${x}" y="${y + 60}" width="${cardW}" height="20" fill="${it.color}"/>
  <circle cx="${x + 50}" cy="${y + 40}" r="28" fill="#ffffff"/>
  <text x="${x + 50}" y="${y + 50}" font-family="${FONT}" font-size="32" font-weight="800" fill="${it.color}" text-anchor="middle">${it.num}</text>
  <text x="${x + 92}" y="${y + 36}" font-family="${FONT}" font-size="28" font-weight="800" fill="#ffffff">${xml(it.title)}</text>
  <text x="${x + 92}" y="${y + 64}" font-family="${FONT}" font-size="18" fill="#ffffff">${xml(it.subtitle)}</text>`;

    body += `
  <text x="${x + 24}" y="${y + 130}" font-family="${FONT}" font-size="22" fill="${INK_STRONG}">${xml(it.detail)}</text>`;
  }

  // 気候関連リスクの2分類
  const riskY = headerY + cardH * 2 + cardGap + 20;
  body += `
  <rect x="${xLeft}" y="${riskY}" width="${cardW}" height="80" rx="10" fill="${WARN_FILL}" stroke="${WARN}" stroke-width="2"/>
  <text x="${xLeft + 20}" y="${riskY + 30}" font-family="${FONT}" font-size="22" font-weight="800" fill="${WARN}">移行リスク</text>
  <text x="${xLeft + 20}" y="${riskY + 58}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">政策・法規制・技術・市場の変化</text>`;

  const xRight = xLeft + cardW + cardGap;
  body += `
  <rect x="${xRight}" y="${riskY}" width="${cardW}" height="80" rx="10" fill="${DANGER_FILL}" stroke="${DANGER}" stroke-width="2"/>
  <text x="${xRight + 20}" y="${riskY + 30}" font-family="${FONT}" font-size="22" font-weight="800" fill="${DANGER}">物理的リスク</text>
  <text x="${xRight + 20}" y="${riskY + 58}" font-family="${FONT}" font-size="20" fill="${INK_STRONG}">急性・慢性の気候変動による物理変化</text>`;

  const captY = H - 124;
  body += `
  <rect x="${xLeft}" y="${captY}" width="${W - 80}" height="44" rx="6" fill="${BRAND_FILL}"/>
  <text x="${xLeft + 20}" y="${captY + 30}" font-family="${FONT}" font-size="22" font-weight="600" fill="${BRAND_DEEP}">記述式：TCFD 4項目 + 移行/物理的リスクの2分類で気候関連の経営戦略を論じる骨格になる。</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
${header('TCFD — 4要求項目と気候関連リスクの2分類', 'Task Force on Climate-related Financial Disclosures')}
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
  console.log('Rendering figures for 5管理-社会環境管理…');
  await render(svgCarbonRemoval(), 'figure-1-carbon-removal.png');
  await render(svgConventions(), 'figure-2-conventions.png');
  await render(svgAlertLevels(), 'figure-3-alert-levels.png');
  await render(svgEnvPrinciples(), 'figure-4-env-principles.png');
  await render(svgEconomicEvaluation(), 'figure-5-economic-evaluation.png');
  await render(svgEnvAssessmentFlow(), 'figure-6-env-assessment-flow.png');
  await render(svgLcaProcess(), 'figure-7-lca-process.png');
  await render(svgTcfd(), 'figure-8-tcfd.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
