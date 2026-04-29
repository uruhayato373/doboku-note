// Instagram カルーセル MVP — デザインバリアント比較用
// Cover: 6 種、中間トーン: 3 種、CTA: 3 種 = 12 枚
// 出力:
//   SVG: .claude/skills/social/ig-post-create/design/variants/
//   PNG: .tmp/sns/design-variants/

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../../../../..');
const SVG_DIR = resolve(REPO, '.claude/skills/social/ig-post-create/design/variants');
const PNG_DIR = resolve(REPO, '.tmp/sns/design-variants');

const W = 1080;
const H = 1350;

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
  warnFill:    '#fff3cd',
  danger:      '#b22234',
  black:       '#0a0a0a',
};

const FONT = "'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif";

const svgHead = (label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
  <style>text{font-family:${FONT};}</style>`;
const svgEnd = `</svg>`;

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;' }[c]));
}

// ===== Cover バリアント =====

// v1: 現状（白 + 中央寄せ・教科書風）
function cover_v1() {
  return svgHead('cover v1 original') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" font-weight="500" fill="${C.inkMuted}">1 / 7</text>
  <text x="80" y="156" font-size="28" font-weight="700" fill="${C.brand}" letter-spacing="3">技術士総監キーワード</text>
  <text x="${W/2}" y="${H/2 - 30}" text-anchor="middle" font-size="120" font-weight="900" fill="${C.ink}" letter-spacing="2">フォロワーシップ</text>
  <text x="${W/2}" y="${H/2 + 60}" text-anchor="middle" font-size="40" fill="${C.inkBody}">ケリーの2軸 × 5類型を3分で整理</text>
  <rect x="${W/2 - 80}" y="${H/2 + 130}" width="160" height="6" fill="${C.brand}"/>
  <text x="80" y="${H - 88}" font-size="34" font-weight="800" fill="${C.brand}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="22" fill="${C.inkMuted}">doboku-note.com</text>
${svgEnd}`;
}

// v2: ダークネイビー + 巨大な「5」
function cover_v2() {
  return svgHead('cover v2 dark big number') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#a8c4dc">1 / 7</text>
  <text x="80" y="156" font-size="32" font-weight="700" fill="#a8c4dc" letter-spacing="4">FOLLOWERSHIP</text>

  <!-- 巨大な 5 -->
  <text x="${W/2}" y="${H/2 + 180}" text-anchor="middle" font-size="900" font-weight="900" fill="${C.brand}" opacity="0.95">5</text>

  <!-- 上重ねテキスト -->
  <text x="${W/2}" y="${H/2 + 280}" text-anchor="middle" font-size="56" font-weight="800" fill="${C.white}">類型で読み解く</text>
  <text x="${W/2}" y="${H/2 + 340}" text-anchor="middle" font-size="44" font-weight="500" fill="#cfdef0">ケリーのフォロワーシップ</text>

  <text x="80" y="${H - 88}" font-size="30" font-weight="800" fill="${C.white}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="20" fill="#a8c4dc">技術士総監キーワード集 2026</text>
${svgEnd}`;
}

// v3: ブランド色全面 + 白抜きフック
function cover_v3() {
  return svgHead('cover v3 brand fullbleed') + `
  <rect width="${W}" height="${H}" fill="${C.brand}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#cfdef0">1 / 7</text>

  <!-- フック -->
  <rect x="80" y="180" width="280" height="60" rx="30" fill="${C.warn}"/>
  <text x="220" y="222" text-anchor="middle" font-size="28" font-weight="800" fill="${C.brandDeep}">3分で整理</text>

  <text x="80" y="${H/2 - 80}" font-size="140" font-weight="900" fill="${C.white}" letter-spacing="-2">フォロワー</text>
  <text x="80" y="${H/2 + 70}" font-size="140" font-weight="900" fill="${C.white}" letter-spacing="-2">シップとは？</text>

  <text x="80" y="${H/2 + 180}" font-size="36" fill="#cfdef0">ケリーの2軸 × 5類型</text>

  <!-- 装飾 -->
  <rect x="80" y="${H/2 + 220}" width="200" height="8" fill="${C.warn}"/>

  <text x="80" y="${H - 88}" font-size="34" font-weight="800" fill="${C.white}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="22" fill="#cfdef0">doboku-note.com</text>
${svgEnd}`;
}

// v4: 黄色背景 + クリックベイト
function cover_v4() {
  return svgHead('cover v4 yellow clickbait') + `
  <rect width="${W}" height="${H}" fill="${C.warn}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" font-weight="600" fill="${C.brandDeep}">1 / 7</text>

  <!-- 大フック「9割」 -->
  <text x="80" y="${H/2 - 200}" font-size="56" font-weight="700" fill="${C.brandDeep}">技術士受験生の</text>
  <g>
    <text x="80" y="${H/2 - 50}" font-size="320" font-weight="900" fill="${C.danger}" letter-spacing="-8">9割</text>
    <text x="430" y="${H/2 - 50}" font-size="56" font-weight="700" fill="${C.brandDeep}">が混同する</text>
  </g>

  <!-- 副題 -->
  <text x="80" y="${H/2 + 120}" font-size="84" font-weight="900" fill="${C.brandDeep}" letter-spacing="-2">フォロワーシップ</text>
  <text x="80" y="${H/2 + 200}" font-size="46" font-weight="700" fill="${C.brandDeep}">5類型を完全整理</text>

  <!-- 矢印アクセント -->
  <text x="80" y="${H/2 + 320}" font-size="44" font-weight="700" fill="${C.danger}">→ スワイプして解説</text>

  <text x="80" y="${H - 88}" font-size="30" font-weight="800" fill="${C.brandDeep}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="20" fill="${C.brandDeep}">技術士総監キーワード集 2026</text>
${svgEnd}`;
}

// v5: 黒背景 + ミニマル
function cover_v5() {
  return svgHead('cover v5 minimal black') + `
  <rect width="${W}" height="${H}" fill="${C.black}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#666">01 / 07</text>

  <!-- 細線アクセント -->
  <line x1="80" y1="200" x2="200" y2="200" stroke="${C.warn}" stroke-width="3"/>
  <text x="80" y="250" font-size="22" fill="${C.warn}" letter-spacing="6">FOLLOWERSHIP</text>

  <!-- メイン -->
  <text x="80" y="${H/2}" font-size="120" font-weight="200" fill="${C.white}" letter-spacing="-2">フォロワー</text>
  <text x="80" y="${H/2 + 130}" font-size="120" font-weight="900" fill="${C.white}" letter-spacing="-2">シップ</text>

  <line x1="80" y1="${H/2 + 200}" x2="${W - 80}" y2="${H/2 + 200}" stroke="#333" stroke-width="1"/>

  <text x="80" y="${H/2 + 270}" font-size="32" font-weight="300" fill="#999">Robert E. Kelley, 1992</text>
  <text x="80" y="${H/2 + 320}" font-size="32" font-weight="300" fill="#999">2 axes × 5 types.</text>

  <text x="80" y="${H - 88}" font-size="26" font-weight="600" fill="${C.white}" letter-spacing="2">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="18" fill="#666">no.31 / 技術士総監</text>
${svgEnd}`;
}

// v6: スプリットブロック
function cover_v6() {
  return svgHead('cover v6 split block') + `
  <rect width="${W}" height="${H/2}" fill="${C.brand}"/>
  <rect y="${H/2}" width="${W}" height="${H/2}" fill="${C.white}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#cfdef0">1 / 7</text>

  <!-- 上半分: 大数字 -->
  <text x="80" y="180" font-size="28" font-weight="700" fill="#cfdef0" letter-spacing="3">KEYWORD #31</text>
  <text x="${W/2}" y="${H/2 - 30}" text-anchor="middle" font-size="200" font-weight="900" fill="${C.white}" letter-spacing="-4">5類型</text>

  <!-- 中央オーバーラップカード -->
  <rect x="80" y="${H/2 - 90}" width="${W - 160}" height="180" rx="16" fill="${C.white}" stroke="${C.brand}" stroke-width="3"/>
  <text x="${W/2}" y="${H/2 + 10}" text-anchor="middle" font-size="64" font-weight="900" fill="${C.ink}">フォロワーシップ</text>
  <text x="${W/2}" y="${H/2 + 60}" text-anchor="middle" font-size="32" fill="${C.inkBody}">ケリーの2軸モデルで読み解く</text>

  <!-- 下半分: 補足 -->
  <text x="80" y="${H - 240}" font-size="32" font-weight="700" fill="${C.brand}" letter-spacing="2">この投稿で分かること</text>
  <text x="80" y="${H - 190}" font-size="30" font-weight="500" fill="${C.ink}">・ 提唱者と背景</text>
  <text x="80" y="${H - 150}" font-size="30" font-weight="500" fill="${C.ink}">・ 2軸モデルの定義</text>
  <text x="80" y="${H - 110}" font-size="30" font-weight="500" fill="${C.ink}">・ 5類型と判別ポイント</text>

  <text x="80" y="${H - 52}" font-size="22" font-weight="700" fill="${C.brand}">doboku-note</text>
${svgEnd}`;
}

// ===== 中間スライド トーンバリアント（同じ「def」内容）=====

// tone A: 現状（白 + 青ラベル）
function tone_A() {
  return svgHead('tone A light') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="${C.inkMuted}">2 / 7</text>
  <text x="80" y="120" font-size="26" font-weight="700" fill="${C.brand}" letter-spacing="2">DEFINITION</text>
  <line x1="80" y1="144" x2="160" y2="144" stroke="${C.brand}" stroke-width="3"/>

  <text x="80" y="240" font-size="64" font-weight="800" fill="${C.ink}">とは</text>
  <text x="80" y="340" font-size="52" font-weight="700" fill="${C.ink}">部下側の視点から</text>
  <text x="80" y="420" font-size="52" font-weight="700" fill="${C.ink}">リーダーシップを捉える</text>
  <text x="80" y="500" font-size="52" font-weight="700" fill="${C.ink}">アプローチ。</text>

  <rect x="80" y="${H - 380}" width="${W - 160}" height="200" rx="8" fill="${C.brandFill}"/>
  <rect x="80" y="${H - 380}" width="6" height="200" fill="${C.brand}"/>
  <text x="112" y="${H - 330}" font-size="24" font-weight="700" fill="${C.brand}" letter-spacing="2">提唱者</text>
  <text x="112" y="${H - 280}" font-size="28" fill="${C.brandDeep}">ロバート・ケリー（1992）</text>
  <text x="112" y="${H - 240}" font-size="28" fill="${C.brandDeep}">『The Power of</text>
  <text x="112" y="${H - 200}" font-size="28" fill="${C.brandDeep}">Followership』で体系化</text>
${svgEnd}`;
}

// tone B: ダーク背景
function tone_B() {
  return svgHead('tone B dark') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#a8c4dc">2 / 7</text>
  <text x="80" y="120" font-size="26" font-weight="700" fill="${C.warn}" letter-spacing="2">DEFINITION</text>
  <line x1="80" y1="144" x2="160" y2="144" stroke="${C.warn}" stroke-width="3"/>

  <text x="80" y="240" font-size="64" font-weight="800" fill="${C.white}">とは</text>
  <text x="80" y="340" font-size="52" font-weight="700" fill="${C.white}">部下側の視点から</text>
  <text x="80" y="420" font-size="52" font-weight="700" fill="${C.white}">リーダーシップを捉える</text>
  <text x="80" y="500" font-size="52" font-weight="700" fill="${C.warn}">アプローチ。</text>

  <rect x="80" y="${H - 380}" width="${W - 160}" height="200" rx="8" fill="#0d2238" stroke="${C.brand}" stroke-width="2"/>
  <rect x="80" y="${H - 380}" width="6" height="200" fill="${C.warn}"/>
  <text x="112" y="${H - 330}" font-size="24" font-weight="700" fill="${C.warn}" letter-spacing="2">提唱者</text>
  <text x="112" y="${H - 280}" font-size="28" fill="${C.white}">ロバート・ケリー（1992）</text>
  <text x="112" y="${H - 240}" font-size="28" fill="#a8c4dc">『The Power of</text>
  <text x="112" y="${H - 200}" font-size="28" fill="#a8c4dc">Followership』で体系化</text>
${svgEnd}`;
}

// tone C: 白 + 黄色アクセント
function tone_C() {
  return svgHead('tone C accent yellow') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="${C.inkMuted}">2 / 7</text>

  <!-- 黄色ラベル -->
  <rect x="80" y="92" width="240" height="56" fill="${C.warn}"/>
  <text x="200" y="130" text-anchor="middle" font-size="26" font-weight="800" fill="${C.brandDeep}" letter-spacing="2">DEFINITION</text>

  <text x="80" y="240" font-size="64" font-weight="800" fill="${C.ink}">とは</text>

  <!-- ハイライト箇所を黄色マーカー風 -->
  <rect x="76" y="305" width="690" height="50" fill="${C.warnFill}"/>
  <text x="80" y="345" font-size="52" font-weight="800" fill="${C.ink}">部下側の視点</text>
  <text x="80" y="425" font-size="52" font-weight="700" fill="${C.ink}">からリーダーシップを</text>
  <text x="80" y="505" font-size="52" font-weight="700" fill="${C.ink}">捉えるアプローチ。</text>

  <rect x="80" y="${H - 380}" width="${W - 160}" height="200" rx="8" fill="${C.warnFill}"/>
  <rect x="80" y="${H - 380}" width="6" height="200" fill="${C.warn}"/>
  <text x="112" y="${H - 330}" font-size="24" font-weight="800" fill="${C.brandDeep}" letter-spacing="2">提唱者</text>
  <text x="112" y="${H - 280}" font-size="28" fill="${C.ink}">ロバート・ケリー（1992）</text>
  <text x="112" y="${H - 240}" font-size="28" fill="${C.ink}">『The Power of</text>
  <text x="112" y="${H - 200}" font-size="28" fill="${C.ink}">Followership』で体系化</text>
${svgEnd}`;
}

// ===== CTA バリアント =====

// CTA v1: 現状（検索プロンプト）
function cta_v1() {
  return svgHead('cta v1 search') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#a8c4dc">7 / 7</text>
  <circle cx="${W - 200}" cy="200" r="280" fill="${C.brand}" opacity="0.3"/>
  <circle cx="200" cy="${H - 200}" r="220" fill="${C.brand}" opacity="0.2"/>
  <text x="${W/2}" y="${H/2 - 120}" text-anchor="middle" font-size="44" fill="#a8c4dc" letter-spacing="3">もっと詳しく学ぶ</text>
  <text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}">技術士総監</text>
  <text x="${W/2}" y="${H/2 + 100}" text-anchor="middle" font-size="80" font-weight="900" fill="${C.white}">キーワード集 2026</text>
  <rect x="${W/2 - 280}" y="${H/2 + 180}" width="560" height="100" rx="50" fill="${C.white}"/>
  <text x="${W/2 - 220}" y="${H/2 + 240}" font-size="32" fill="${C.inkMuted}">🔍</text>
  <text x="${W/2 - 130}" y="${H/2 + 240}" font-size="36" font-weight="700" fill="${C.brandDeep}">フォロワーシップ doboku</text>
  <text x="80" y="${H - 88}" font-size="34" font-weight="800" fill="${C.white}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="22" fill="#a8c4dc">doboku-note.com</text>
${svgEnd}`;
}

// CTA v2: 保存推奨型
function cta_v2() {
  return svgHead('cta v2 save') + `
  <rect width="${W}" height="${H}" fill="${C.white}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="${C.inkMuted}">7 / 7</text>

  <!-- 保存リボンアイコン（SVG パス） -->
  <g transform="translate(${W/2 - 80}, ${H/2 - 360})">
    <path d="M 20 0 L 140 0 L 140 200 L 80 150 L 20 200 Z" fill="${C.warn}" stroke="${C.brandDeep}" stroke-width="6"/>
  </g>

  <text x="${W/2}" y="${H/2 - 60}" text-anchor="middle" font-size="68" font-weight="900" fill="${C.ink}">保存して</text>
  <text x="${W/2}" y="${H/2 + 30}" text-anchor="middle" font-size="68" font-weight="900" fill="${C.ink}">試験前日に見返そう</text>

  <line x1="${W/2 - 100}" y1="${H/2 + 80}" x2="${W/2 + 100}" y2="${H/2 + 80}" stroke="${C.warn}" stroke-width="6"/>

  <text x="${W/2}" y="${H/2 + 160}" text-anchor="middle" font-size="32" fill="${C.inkBody}">右下のリボンマークから 1 タップ</text>

  <!-- フォロー誘導 -->
  <rect x="80" y="${H - 320}" width="${W - 160}" height="160" rx="16" fill="${C.brandFill}"/>
  <text x="${W/2}" y="${H - 260}" text-anchor="middle" font-size="32" font-weight="700" fill="${C.brand}">@doboku.note をフォロー</text>
  <text x="${W/2}" y="${H - 220}" text-anchor="middle" font-size="26" fill="${C.brandDeep}">技術士総監キーワード × 過去問演習を毎日配信</text>
  <text x="${W/2}" y="${H - 180}" text-anchor="middle" font-size="26" font-weight="700" fill="${C.brand}">→ プロフィールから 680 問へ</text>

  <text x="80" y="${H - 88}" font-size="30" font-weight="800" fill="${C.brand}">doboku-note</text>
  <text x="80" y="${H - 52}" font-size="20" fill="${C.inkMuted}">doboku-note.com</text>
${svgEnd}`;
}

// CTA v3: アクション型（DM・プロフ強誘導）
function cta_v3() {
  return svgHead('cta v3 action') + `
  <rect width="${W}" height="${H}" fill="${C.brandDeep}"/>
  <text x="${W - 80}" y="64" text-anchor="end" font-size="22" fill="#a8c4dc">7 / 7</text>

  <!-- 上部: 価値提示 -->
  <text x="${W/2}" y="200" text-anchor="middle" font-size="36" font-weight="700" fill="${C.warn}" letter-spacing="3">受験者限定プレゼント</text>

  <text x="${W/2}" y="320" text-anchor="middle" font-size="76" font-weight="900" fill="${C.white}">5類型まとめ</text>
  <text x="${W/2}" y="400" text-anchor="middle" font-size="76" font-weight="900" fill="${C.white}">PDF を無料配布</text>

  <!-- DM CTA -->
  <rect x="80" y="500" width="${W - 160}" height="180" rx="20" fill="${C.warn}"/>
  <text x="${W/2}" y="565" text-anchor="middle" font-size="32" font-weight="700" fill="${C.brandDeep}">DM で「総監」と送信</text>
  <text x="${W/2}" y="615" text-anchor="middle" font-size="44" font-weight="900" fill="${C.brandDeep}">→ 自動返信で受け取り</text>
  <text x="${W/2}" y="660" text-anchor="middle" font-size="22" fill="${C.brandDeep}">所要 10 秒・登録不要</text>

  <!-- フォロー誘導 -->
  <text x="${W/2}" y="800" text-anchor="middle" font-size="36" font-weight="700" fill="${C.white}">＋ プロフから 680 問へ</text>
  <text x="${W/2}" y="850" text-anchor="middle" font-size="28" fill="#cfdef0">毎週月曜に新規 5 問追加</text>

  <!-- 3 アクション順序 -->
  <g transform="translate(80, 940)">
    <text x="0" y="0" font-size="26" fill="#a8c4dc" letter-spacing="2">NEXT STEPS</text>
    <text x="0" y="50" font-size="32" fill="${C.white}">1. SAVE  保存して試験前日に</text>
    <text x="0" y="100" font-size="32" fill="${C.white}">2. LIKE  応援を伝える</text>
    <text x="0" y="150" font-size="32" fill="${C.white}">3. DM   「総監」と送信</text>
  </g>

  <text x="80" y="${H - 52}" font-size="24" font-weight="700" fill="${C.warn}">@doboku.note</text>
${svgEnd}`;
}

// ===== ビルド =====
const slides = [
  // covers
  { name: 'cover-v1-original',     svg: cover_v1(), label: 'v1 / 現状（白・教科書）' },
  { name: 'cover-v2-dark-bignum',  svg: cover_v2(), label: 'v2 / ダーク + 巨大「5」' },
  { name: 'cover-v3-brand-bleed',  svg: cover_v3(), label: 'v3 / ブランド色全面' },
  { name: 'cover-v4-yellow-bait',  svg: cover_v4(), label: 'v4 / 黄色「9割」フック' },
  { name: 'cover-v5-minimal-blk',  svg: cover_v5(), label: 'v5 / 黒・ミニマル' },
  { name: 'cover-v6-split-block',  svg: cover_v6(), label: 'v6 / スプリットブロック' },
  // tones
  { name: 'tone-A-light',          svg: tone_A(),   label: 'tone A / 現状ライト' },
  { name: 'tone-B-dark',           svg: tone_B(),   label: 'tone B / ダーク' },
  { name: 'tone-C-yellow-accent',  svg: tone_C(),   label: 'tone C / 黄色アクセント' },
  // ctas
  { name: 'cta-v1-search',         svg: cta_v1(),   label: 'CTA v1 / 検索プロンプト' },
  { name: 'cta-v2-save',           svg: cta_v2(),   label: 'CTA v2 / 保存推奨' },
  { name: 'cta-v3-action',         svg: cta_v3(),   label: 'CTA v3 / DM 誘導' },
];

await mkdir(SVG_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

console.log(`Generating ${slides.length} variants...`);
for (const s of slides) {
  await writeFile(resolve(SVG_DIR, `${s.name}.svg`), s.svg);
  await sharp(Buffer.from(s.svg)).png().toFile(resolve(PNG_DIR, `${s.name}.png`));
  console.log(`  ✓ ${s.name}`);
}

// ===== グループ別 contact sheet =====
async function makeSheet(filename, items, title) {
  const COLS = items.length <= 3 ? 3 : 3;
  const ROWS = Math.ceil(items.length / COLS);
  const THUMB_W = 360;
  const THUMB_H = Math.round(THUMB_W * H / W);
  const GAP = 24;
  const PAD = 40;
  const LABEL_H = 48;
  const SHEET_W = PAD * 2 + COLS * THUMB_W + (COLS - 1) * GAP;
  const SHEET_H = PAD * 2 + 70 + ROWS * (THUMB_H + LABEL_H + GAP);

  const composites = [];
  // タイトル
  const titleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="60">
    <style>text{font-family:${FONT};}</style>
    <text x="${PAD}" y="42" font-size="32" font-weight="800" fill="${C.ink}">${escapeXml(title)}</text>
  </svg>`;
  composites.push({ input: Buffer.from(titleSvg), top: PAD, left: 0 });

  for (let i = 0; i < items.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (THUMB_W + GAP);
    const y = PAD + 70 + row * (THUMB_H + LABEL_H + GAP);
    const buf = await sharp(resolve(PNG_DIR, `${items[i].name}.png`))
      .resize(THUMB_W, THUMB_H)
      .toBuffer();
    composites.push({ input: buf, top: y, left: x });

    // ラベル
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${LABEL_H}">
      <style>text{font-family:${FONT};}</style>
      <text x="0" y="32" font-size="22" font-weight="600" fill="${C.brand}">${escapeXml(items[i].label)}</text>
    </svg>`;
    composites.push({ input: Buffer.from(labelSvg), top: y + THUMB_H + 4, left: x });
  }

  await sharp({ create: { width: SHEET_W, height: SHEET_H, channels: 4, background: '#fafafa' } })
    .composite(composites)
    .png()
    .toFile(resolve(PNG_DIR, filename));
}

const covers = slides.filter(s => s.name.startsWith('cover-'));
const tones  = slides.filter(s => s.name.startsWith('tone-'));
const ctas   = slides.filter(s => s.name.startsWith('cta-'));

await makeSheet('_sheet-covers.png', covers, '表紙バリアント — 6 種');
await makeSheet('_sheet-tones.png',  tones,  '中間スライドのトーン — 3 種');
await makeSheet('_sheet-ctas.png',   ctas,   'CTA バリアント — 3 種');

console.log(`\nDone. PNG: ${PNG_DIR}`);
console.log(`  - _sheet-covers.png`);
console.log(`  - _sheet-tones.png`);
console.log(`  - _sheet-ctas.png`);
