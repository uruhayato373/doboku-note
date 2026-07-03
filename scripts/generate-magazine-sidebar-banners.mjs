#!/usr/bin/env node
// public/images/magazines/ に「画像オンリー」右サイドバー用バナーを生成する。
//
// サイズは 300×250（IAB レクタングル中規格 / A8.net バナーと同寸）。
// カード側でテキスト・価格を出さない方針のため、バナー画像そのもので内容を伝える。
// 色面背景（color-block）＋大型白タイトル＋ワードマーク＋小ラベルの構成。
//
// satori（JSX-object → SVG）+ sharp（SVG → png/webp）で self-contained に組む。
// 共有テンプレ（ogp-templates.mjs）・既存カバー生成（generate-magazine-covers.mjs）には依存しない。
//
// 使い方:
//   npm run magazine-sidebar-banners                              # 全バナー生成
//   node scripts/generate-magazine-sidebar-banners.mjs tankan     # id に部分一致する 1 枚だけ生成

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public/images/magazines');
const FONTS_DIR = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');

const W = 300;
const H = 250;

function loadFonts() {
  const noto = readFileSync(join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(FONTS_DIR, 'Inter-Bold.ttf'));
  return [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ];
}

/**
 * 各サイドバーバナーの定義。
 * - id: 出力ファイル名（{id}.png / {id}.webp）と filter 引数のキー
 * - bgTop / bgBottom: 縦グラデの上下色（同値ならベタ塗り）。白文字が読める濃さにする
 * - accent: 細いアクセントバー & ラベル文字色（明色）
 * - lines: タイトル行（白・太字）。各行 [text, fontSize]
 * - label: 上部ピルのテキスト
 */
const BANNERS = [
  {
    id: 'tankan-sidebar',
    bgTop: '#152a52',
    bgBottom: '#0c1830',
    accent: '#38bdf8',
    label: 'note限定 教材',
    lines: [
      ['5管理 精読ガイド', 30],
      ['頻出論点を体系化', 26],
    ],
  },
  {
    id: 'essay-river-consultant-sidebar',
    bgTop: '#0e7490',
    bgBottom: '#0a5468',
    accent: '#a5f3fc',
    label: 'note限定',
    lines: [
      ['総監 模範論文', 30],
      ['河川・砂防コンサル', 25],
      ['R3-R7 5年分', 24],
    ],
  },
  {
    id: 'essay-general-contractor-sidebar',
    bgTop: '#a16207',
    bgBottom: '#774905',
    accent: '#fde68a',
    label: 'note限定',
    lines: [
      ['総監 模範論文', 30],
      ['ゼネコン土木', 28],
      ['R3-R7 5年分', 24],
    ],
  },
  {
    id: 'essay-road-municipality-sidebar',
    bgTop: '#2f6e3b',
    bgBottom: '#1f4a27',
    accent: '#bbf7d0',
    label: 'note限定',
    lines: [
      ['総監 模範論文', 30],
      ['自治体 道路担当', 26],
      ['R3-R7+R8予想', 23],
    ],
  },
  {
    id: 'magazine-r8-essay-forecast-sidebar',
    bgTop: '#9e1b2c',
    bgBottom: '#6f111d',
    accent: '#fca5a5',
    label: 'note限定',
    lines: [
      ['R8 予想問題集', 31],
      ['6テーマ フル論文', 25],
      ['三層構造解答', 26],
    ],
  },
  {
    id: 'links-hub-sidebar',
    bgTop: '#1858B5',
    bgBottom: '#103e80',
    accent: '#bfdbfe',
    label: '教材一覧',
    lines: [
      ['総監・1級土木', 28],
      ['note有料教材', 30],
      ['まとめ', 32],
    ],
  },
  // --- 2026-06-26 追加: サイドバー画像オンリー統一のための旗艦マガジン バナー ---
  //     カテゴリ hub / docs サイドバーを MagazineSidebarCard（画像オンリー）へ一本化する際、
  //     sidebarImageUrl を持たなかった旗艦商品に 300×250 を付与する（satori 生成・無料）。
  {
    id: 'magazine-essay-complete-pack-sidebar',
    bgTop: '#283a86',
    bgBottom: '#15224c',
    accent: '#a5b4fc',
    label: 'note限定',
    lines: [
      ['総監 記述式', 27],
      ['完全パック', 34],
      ['全部入り 全14ペルソナ', 19],
    ],
  },
  {
    id: 'magazine-essay-core-pack-sidebar',
    bgTop: '#1d5a7a',
    bgBottom: '#0f3650',
    accent: '#7dd3fc',
    label: 'note限定',
    lines: [
      ['総監 記述式', 27],
      ['コアパック', 34],
      ['型×設問3×R8予想', 20],
    ],
  },
  {
    id: 'civil-1-gakka-kijutsu-sidebar',
    bgTop: '#155293',
    bgBottom: '#0e3a68',
    accent: '#7dd3fc',
    label: 'note限定',
    lines: [
      ['1級土木 二次学科記述', 22],
      ['テーマ別 出る順', 26],
      ['5テーマ セット', 20],
    ],
  },
  {
    id: 'civil-1-experience-essay-sidebar',
    bgTop: '#b45309',
    bgBottom: '#7c3a06',
    accent: '#fcd34d',
    label: 'note限定',
    lines: [
      ['1級土木 経験記述', 24],
      ['完成答案集', 30],
      ['工種×テーマ別 5管理', 19],
    ],
  },
  {
    id: 'civil-1-pastexam-essay-sidebar',
    bgTop: '#9a3412',
    bgBottom: '#6b240c',
    accent: '#fdba74',
    label: 'note限定',
    lines: [
      ['1級土木 経験記述', 24],
      ['過去問 模範答案', 26],
      ['R03-R07 年度別', 22],
    ],
  },
  {
    id: 'civil-2-experience-essay-sidebar',
    bgTop: '#0f766e',
    bgBottom: '#0a4f49',
    accent: '#5eead4',
    label: 'note限定',
    lines: [
      ['2級土木 経験記述', 24],
      ['完成答案集', 30],
      ['安全・品質・工程', 20],
    ],
  },
  {
    id: 'civil-2-pastexam-essay-sidebar',
    bgTop: '#15803d',
    bgBottom: '#0d5126',
    accent: '#86efac',
    label: 'note限定',
    lines: [
      ['2級土木 経験記述', 24],
      ['過去問 模範答案', 26],
      ['R03-R07 年度別', 22],
    ],
  },
  {
    id: 'civil-membership-lab-sidebar',
    bgTop: '#6d28d9',
    bgBottom: '#4c1d95',
    accent: '#c4b5fd',
    label: 'メンバーシップ',
    lines: [
      ['土木セコカン', 26],
      ['合格ラボ', 30],
      ['月例予想＋添削', 20],
    ],
  },
  {
    // 1級土木 経験記述の旗艦（買い切り・想定工事100×5管理）。サイドバー/記事末尾の
    // 画像オンリー描画（SidebarMagazineList）に載せるため 300×250 を付与。
    id: 'civil-1-keiken-complete-pack-sidebar',
    bgTop: '#155293',
    bgBottom: '#0e3a68',
    accent: '#7cc4f0',
    label: 'note限定',
    lines: [
      ['1級土木 経験記述', 22],
      ['完全攻略パック', 30],
      ['想定工事100×5管理', 18],
    ],
  },
  {
    id: 'civil-2-koji-bank-sidebar',
    bgTop: '#0f766e',
    bgBottom: '#0a4f49',
    accent: '#5eead4',
    label: 'note限定',
    lines: [
      ['2級土木 経験記述', 22],
      ['想定工事バンク', 28],
      ['工種×5管理フル', 18],
    ],
  },
  {
    id: 'cce-essay-magazine-sidebar',
    bgTop: '#475569',
    bgBottom: '#2f3a4a',
    accent: '#cbd5e1',
    label: 'note限定 教材',
    lines: [
      ['コンクリート主任技師', 19],
      ['小論文 模範答案集', 23],
      ['評価される答案の型', 19],
    ],
  },
  {
    id: 'cd-essay-magazine-sidebar',
    bgTop: '#57534e',
    bgBottom: '#36322e',
    accent: '#d6d3d1',
    label: 'note限定 教材',
    lines: [
      ['コンクリート診断士', 20],
      ['記述式 模範答案集', 23],
      ['問題A・問題B', 22],
    ],
  },
  // --- 2026-06-26 追加: 総監 模範論文 ペルソナ別バナー（画像オンリー統一の残9ペルソナ） ---
  {
    id: 'essay-road-consultant-sidebar',
    bgTop: '#155e63', bgBottom: '#0c3d40', accent: '#99f6e4', label: 'note限定',
    lines: [['総監 模範論文', 29], ['道路橋梁コンサル', 24], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-urban-consultant-sidebar',
    bgTop: '#3730a3', bgBottom: '#262076', accent: '#c7d2fe', label: 'note限定',
    lines: [['総監 模範論文', 29], ['都市計画コンサル', 24], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-river-municipality-sidebar',
    bgTop: '#1d6fa5', bgBottom: '#114567', accent: '#bae6fd', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 河川担当', 25], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-sewage-municipality-sidebar',
    bgTop: '#3f6212', bgBottom: '#2a4109', accent: '#d9f99d', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 下水道担当', 22], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-water-municipality-sidebar',
    bgTop: '#0369a1', bgBottom: '#024a72', accent: '#bae6fd', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 上水道担当', 22], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-sabo-municipality-sidebar',
    bgTop: '#78572a', bgBottom: '#523a1a', accent: '#fde68a', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 砂防担当', 25], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-port-municipality-sidebar',
    bgTop: '#0e6e6e', bgBottom: '#094a4a', accent: '#99f6e4', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 港湾担当', 25], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-park-municipality-sidebar',
    bgTop: '#3f7d3f', bgBottom: '#285228', accent: '#bbf7d0', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 公園緑地担当', 21], ['R3-R7 5年分', 23]],
  },
  {
    id: 'essay-urban-municipality-sidebar',
    bgTop: '#5b4f8a', bgBottom: '#3d3460', accent: '#ddd6fe', label: 'note限定',
    lines: [['総監 模範論文', 29], ['自治体 都市計画担当', 21], ['R3-R7 5年分', 23]],
  },
  // --- 2026-07-02 追加: 技術士 建設部門 2次 BK シリーズ（published:true だが sidebarImageUrl 欠落で
  //     サイドバー/記事末尾 CTA が描画されていなかった 12 誌）＋ 総監 設問3バンク・1級土木 combo 大全 ---
  {
    id: 'pe-construction-required-magazine-sidebar',
    bgTop: '#1e3a8a', bgBottom: '#14245c', accent: '#93c5fd', label: 'note限定',
    lines: [['建設部門 2次', 24], ['必須科目I 模範解答', 22], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-road-magazine-sidebar',
    bgTop: '#334155', bgBottom: '#1e293b', accent: '#cbd5e1', label: 'note限定',
    lines: [['建設部門 2次', 24], ['道路 模範解答集', 25], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-river-coast-magazine-sidebar',
    bgTop: '#0e7490', bgBottom: '#0a5468', accent: '#a5f3fc', label: 'note限定',
    lines: [['建設部門 2次', 24], ['河川・砂防 模範解答', 21], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-urban-planning-magazine-sidebar',
    bgTop: '#4338ca', bgBottom: '#2e2a86', accent: '#c7d2fe', label: 'note限定',
    lines: [['建設部門 2次', 24], ['都市計画 模範解答', 22], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-geotechnical-magazine-sidebar',
    bgTop: '#78350f', bgBottom: '#4d2109', accent: '#fcd34d', label: 'note限定',
    lines: [['建設部門 2次', 24], ['土質・基礎 模範解答', 21], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-steel-concrete-magazine-sidebar',
    bgTop: '#475569', bgBottom: '#2f3a4a', accent: '#cbd5e1', label: 'note限定',
    lines: [['建設部門 2次', 24], ['鋼構造・コンクリート', 21], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-construction-planning-magazine-sidebar',
    bgTop: '#b45309', bgBottom: '#7c3a06', accent: '#fcd34d', label: 'note限定',
    lines: [['建設部門 2次', 24], ['施工計画 模範解答', 22], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-environment-magazine-sidebar',
    bgTop: '#15803d', bgBottom: '#0d5126', accent: '#86efac', label: 'note限定',
    lines: [['建設部門 2次', 24], ['建設環境 模範解答', 22], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-port-airport-magazine-sidebar',
    bgTop: '#0369a1', bgBottom: '#024a72', accent: '#bae6fd', label: 'note限定',
    lines: [['建設部門 2次', 24], ['港湾・空港 模範解答', 21], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'pe-construction-power-civil-magazine-sidebar',
    bgTop: '#a16207', bgBottom: '#774905', accent: '#fde68a', label: 'note限定',
    lines: [['建設部門 2次', 24], ['電力土木 模範解答', 22], ['R3-R7 全15記事', 22]],
  },
  {
    id: 'pe-construction-railway-magazine-sidebar',
    bgTop: '#9f1239', bgBottom: '#6b0d28', accent: '#fda4af', label: 'note限定',
    lines: [['建設部門 2次', 24], ['鉄道 模範解答集', 25], ['R3-R7 全15記事', 22]],
  },
  {
    id: 'pe-construction-tunnel-magazine-sidebar',
    bgTop: '#3730a3', bgBottom: '#262076', accent: '#c7d2fe', label: 'note限定',
    lines: [['建設部門 2次', 24], ['トンネル 模範解答', 22], ['R3-R7＋R8予想', 22]],
  },
  {
    id: 'magazine-setsumon3-policy-bank-sidebar',
    bgTop: '#1d5a7a', bgBottom: '#0f3650', accent: '#7dd3fc', label: 'note限定',
    lines: [['総監 記述式', 27], ['設問3 国家施策バンク', 19], ['頻出施策を横断整理', 20]],
  },
  {
    id: 'civil-1-combo-essay-sidebar',
    bgTop: '#b45309', bgBottom: '#7c3a06', accent: '#fcd34d', label: 'note限定',
    lines: [['1級土木 経験記述', 22], ['2テーマ組合せ大全', 24], ['全10組合せ網羅', 20]],
  },
  {
    id: 'pe-construction-road-pack-sidebar',
    bgTop: '#334155', bgBottom: '#1e293b', accent: '#cbd5e1', label: 'note限定 合格パック',
    lines: [['建設部門 2次', 22], ['道路 合格パック', 26], ['必須I＋道路 ¥4,980', 18]],
  },
];

// "doboku" + "-"(アクセント明色) + "note" の 3 スパン構成ワードマーク
function wordmark(accent) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        fontFamily: 'Inter, "Noto Sans JP", sans-serif',
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '-0.3px',
        color: 'rgba(255,255,255,0.85)',
      },
      children: [
        { type: 'span', props: { style: { display: 'flex' }, children: 'doboku' } },
        { type: 'span', props: { style: { display: 'flex', color: accent }, children: '-' } },
        { type: 'span', props: { style: { display: 'flex' }, children: 'note' } },
      ],
    },
  };
}

function pill(text, accent) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.92)',
        color: accent,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.3px',
      },
      children: text,
    },
  };
}

function titleStack(lines) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      },
      children: lines.map(([text, size]) => ({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontFamily: '"Noto Sans JP", Inter, sans-serif',
            fontSize: `${size}px`,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '-0.5px',
            color: '#ffffff',
          },
          children: text,
        },
      })),
    },
  };
}

function accentBar(accent) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '44px',
        height: '3px',
        borderRadius: '2px',
        background: accent,
        marginTop: '14px',
      },
      children: [],
    },
  };
}

function renderElement(b) {
  return {
    type: 'div',
    props: {
      style: {
        width: `${W}px`,
        height: `${H}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 20px',
        background: `linear-gradient(180deg, ${b.bgTop} 0%, ${b.bgBottom} 100%)`,
        fontFamily: '"Noto Sans JP", Inter, sans-serif',
      },
      children: [
        // 上段: ラベルピル
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'center', width: '100%' },
            children: [pill(b.label, b.bgBottom)],
          },
        },
        // 中段: タイトル + アクセントバー（縦中央）
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
            children: [titleStack(b.lines), accentBar(b.accent)],
          },
        },
        // 下段: ワードマーク
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'center', width: '100%' },
            children: [wordmark(b.accent)],
          },
        },
      ],
    },
  };
}

async function renderOne(b, fonts) {
  const svg = await satori(renderElement(b), { width: W, height: H, fonts });
  mkdirSync(OUT_DIR, { recursive: true });
  const pngPath = join(OUT_DIR, `${b.id}.png`);
  const webpPath = join(OUT_DIR, `${b.id}.webp`);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(pngPath, pngBuffer);
  await sharp(pngBuffer).webp({ quality: 90 }).toFile(webpPath);
  const meta = await sharp(pngBuffer).metadata();
  console.log(`  ok: ${b.id}.{png,webp}  (${meta.width}x${meta.height})`);
}

async function main() {
  const filter = process.argv[2];
  const fonts = loadFonts();
  const targets = filter ? BANNERS.filter((b) => b.id.includes(filter)) : BANNERS;
  if (targets.length === 0) {
    console.warn(`no banner matches: ${filter}`);
    process.exit(1);
  }
  console.log(`generating ${targets.length} sidebar banner(s)...`);
  for (const b of targets) {
    await renderOne(b, fonts);
  }
  console.log(`done. output: ${OUT_DIR}/*-sidebar.{png,webp}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
