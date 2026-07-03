#!/usr/bin/env node
// public/images/magazines/ に note 有料マガジン用のカバー画像を生成する。
//
// magazine-banner テンプレ（ogp-templates.mjs）で 1280×670 のマガジンカバーを出力する。
// note のマガジン/クリエイターページのヘッダーは中央 1280×216 帯がクロップ表示されるため、
// マガジン名をこの帯の縦横中央に配置する。doboku-note サイトの aspect-square カード
// クロップにも対応（全要素を全幅中央寄せ）。
//
// 使い方:
//   node scripts/generate-magazine-covers.mjs                 # 全件生成
//   node scripts/generate-magazine-covers.mjs river-consultant # 1件だけ生成

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

import { renderTemplate } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public/images/magazines');
const FONTS_DIR = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');

const W = 1280;
const H = 670;

function loadFonts() {
  const noto = readFileSync(join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(FONTS_DIR, 'Inter-Bold.ttf'));
  return [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ];
}

/**
 * 各マガジンの cover 定義。
 * - id: 出力ファイル名のキー (デフォルト: essay-{id}-cover.{png,webp})
 * - fileBaseName: 任意。指定時は essay- prefix なしで自由なファイル名を使う
 * - lines: タイトル行 (3行構成、各行 17 文字以内推奨)
 * - category: カテゴリチップのラベル
 * - fontSize: 行高 (T06 は 32-48 が安定域)
 */
const MAGAZINES = [
  {
    id: 'river-consultant',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-河川コンサル',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '建設コンサル河川・砂防', '5年分セット (R03-R07)'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'general-contractor',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-ゼネコン',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', 'ゼネコン土木部門', '5年分セット (R03-R07)'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'road-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体道路担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 道路担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'procurement-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体契約調達担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 契約・調達担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'standards-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体技術基準担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 技術基準担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  // ----- 既存ペルソナのカバー欠落分（13本・2026-06-09 補完） -----
  {
    id: 'river-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体河川担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 河川担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'urban-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体都市計画担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 都市計画担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'sewage-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体下水道担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 下水道担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'sabo-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体砂防担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 砂防担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'port-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体港湾担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 港湾担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'park-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体公園緑地担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 公園緑地担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'water-municipality',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-自治体上水道担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 上水道担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'road-consultant',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-道路橋梁コンサル',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '道路・橋梁設計コンサル', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'urban-consultant',
    magazineDir: 'docs/note/技術士総監/magazines/総監模範論文-都市計画コンサル',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '都市計画コンサル', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  // nexco / power-civil は 2026-06-09 不採用（著者＝元自治体発注者の経験座外の異業種）。
  // ----- 新規 3 マガジン (Series 1/3/4/5 — M1 撤回済 2026-05-18) -----
  {
    id: 'whitepaper-r7-strategy',
    fillBg: '#16365C',
    fileBaseName: 'magazine-whitepaper-r7-strategy-cover',
    lines: ['白書 R7 × 5 管理', '7 大テーマ完全対応', 'R08 再出題確率付き'],
    category: '技術士（総合技術監理部門）',
    fontSize: 48,
  },
  {
    id: 'r8-essay-forecast',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-R8予想問題集',
    fillBg: '#16365C',
    fileBaseName: 'magazine-r8-essay-forecast-cover',
    lines: ['R8 予想問題集', '3 大テーマ × 三層構造', '3 ペルソナ別アレンジ'],
    category: '技術士（総合技術監理部門）',
    fontSize: 48,
  },
  // essay-template-3d「解答テンプレ3D」は 2026-06-01 企画中止により cover 生成エントリを削除
  {
    id: 'tradeoff-5kanri',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-5管理クロストレードオフ',
    fillBg: '#16365C',
    fileBaseName: 'magazine-tradeoff-5kanri-cover',
    lines: ['5 管理クロス・トレードオフ', '20 セル全網羅 + 答案ひな型', '解決フレーム辞書付き'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'setsumon3-policy-bank',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-設問3国家施策バンク',
    fillBg: '#16365C',
    fileBaseName: 'magazine-setsumon3-policy-bank-cover',
    lines: ['設問(3) 国家施策バンク', '将来課題 11 テーマ × 国家施策 68 案', '答案 1 枚相当・転写即戦力'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'essay-complete-pack',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-完全パック',
    fillBg: '#16365C',
    fileBaseName: 'magazine-essay-complete-pack-cover',
    lines: ['記述式 完全パック', '型×設問3×予想×模範論文＋精読', '全 14 ペルソナ 全部入り'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'essay-core-pack',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-コアパック',
    fillBg: '#16365C',
    fileBaseName: 'magazine-essay-core-pack-cover',
    lines: ['記述式 コアパック', '型 × 設問3 × R8予想', 'ペルソナ非依存・記述式の土台'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  // ----- 土木 1級/2級 二次学科記述ライン (資格別配色: 1級青 #155293 / 2級緑 #1C5038) -----
  {
    id: 'civil-1-gakka',
    fileBaseName: 'civil-1-gakka-kijutsu-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-テーマ別出る順',
    lines: ['1級土木 二次学科記述', 'テーマ別 出る順', '土工・コンクリート他 5テーマ'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-gakka',
    fileBaseName: 'civil-2-gakka-kijutsu-cover',
    magazineDir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-テーマ別出る順',
    lines: ['2級土木 二次学科記述', 'テーマ別 出る順', '工程表・コンクリート他 5テーマ'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-anki',
    fileBaseName: 'civil-1-anki-note-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-直前暗記ノート',
    lines: ['1級土木 二次学科記述', '直前暗記ノート', '穴埋め一問一答＋赤シートPDF'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-anki',
    fileBaseName: 'civil-2-anki-note-cover',
    magazineDir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-直前暗記ノート',
    lines: ['2級土木 二次学科記述', '直前暗記ノート', '穴埋め一問一答＋赤シートPDF'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  // ----- 土木 1級/2級 施工経験記述 6 マガジン (資格別配色: 1級青 #155293 / 2級緑 #1C5038) -----
  {
    id: 'civil-1-experience',
    fileBaseName: 'civil-1-experience-essay-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-完成答案集',
    lines: ['1級土木 施工経験記述', '工種×テーマ別 完成答案集', '品質・安全・工程・施工計画・環境'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-experience',
    fileBaseName: 'civil-2-experience-essay-cover',
    magazineDir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-完成答案集',
    lines: ['2級土木 施工経験記述', '工種×テーマ別 完成答案集', '安全・品質・工程の3テーマ'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-pastexam',
    fileBaseName: 'civil-1-pastexam-essay-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集',
    lines: ['1級土木 施工経験記述', '過去問 模範答案集', '年度別 R03〜R07（5年分）'],
    category: '1級土木施工管理技士',
    fontSize: 44,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-pastexam',
    fileBaseName: 'civil-2-pastexam-essay-cover',
    magazineDir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-過去問模範答案集',
    lines: ['2級土木 施工経験記述', '過去問 模範答案集', '年度別 R03〜R07（5年分）'],
    category: '2級土木施工管理技士',
    fontSize: 44,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-combo',
    fileBaseName: 'civil-1-combo-essay-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全',
    lines: ['1級土木 施工経験記述', '2テーマ組合せ大全', '5管理 全10組合せ'],
    category: '1級土木施工管理技士',
    fontSize: 44,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-1-keiken-complete',
    fileBaseName: 'civil-1-keiken-complete-pack-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック',
    lines: ['1級土木 施工経験記述', '完全攻略パック', '想定工事100 × 5管理 全網羅'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-koji-bank',
    fileBaseName: 'civil-2-koji-bank-cover',
    magazineDir: 'docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク',
    lines: ['2級土木 施工経験記述', '想定工事バンク', '工種 × 5管理フルカバー'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  // ----- 技術士 建設部門 2次 模範解答集（BK シリーズ・2026-06-09） -----
  {
    id: 'bk-i-required',
    fileBaseName: 'pe-construction-bk-i-required-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-I_必須科目I',
    lines: ['技術士 建設部門 2次', '必須科目I 模範解答集', '5年分セット (R03-R07)'],
    category: '技術士（建設部門・第二次）',
    fontSize: 44,
    fillBg: '#33356B',
  },
  {
    id: 'bk-01-road',
    fileBaseName: 'pe-construction-bk-01-road-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-01_道路',
    lines: ['技術士 建設部門 2次', '道路 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-02-river',
    fileBaseName: 'pe-construction-bk-02-river-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-02_河川砂防',
    lines: ['技術士 建設部門 2次', '河川・砂防・海岸 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-03-urban',
    fileBaseName: 'pe-construction-bk-03-urban-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-03_都市計画',
    lines: ['技術士 建設部門 2次', '都市及び地方計画 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-04-geotech',
    fileBaseName: 'pe-construction-bk-04-geotech-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-04_土質及び基礎',
    lines: ['技術士 建設部門 2次', '土質及び基礎 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-05-steel',
    fileBaseName: 'pe-construction-bk-05-steel-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-05_鋼構造及びコンクリート',
    lines: ['技術士 建設部門 2次', '鋼構造及びコンクリート 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 38,
    fillBg: '#33356B',
  },
  {
    id: 'bk-06-construction',
    fileBaseName: 'pe-construction-bk-06-construction-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-06_施工計画',
    lines: ['技術士 建設部門 2次', '施工計画・施工設備・積算 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 36,
    fillBg: '#33356B',
  },
  {
    id: 'bk-07-environment',
    fileBaseName: 'pe-construction-bk-07-environment-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-07_建設環境',
    lines: ['技術士 建設部門 2次', '建設環境 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-08-port',
    fileBaseName: 'pe-construction-bk-08-port-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-08_港湾及び空港',
    lines: ['技術士 建設部門 2次', '港湾及び空港 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-09-power',
    fileBaseName: 'pe-construction-bk-09-power-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-09_電力土木',
    lines: ['技術士 建設部門 2次', '電力土木 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-10-railway',
    fileBaseName: 'pe-construction-bk-10-railway-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-10_鉄道',
    lines: ['技術士 建設部門 2次', '鉄道 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-11-tunnel',
    fileBaseName: 'pe-construction-bk-11-tunnel-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/BK-11_トンネル',
    lines: ['技術士 建設部門 2次', 'トンネル 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'cd-essay',
    fileBaseName: 'cd-essay-cover',
    magazineDir: 'docs/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集',
    lines: ['コンクリート診断士 記述式', '問題A・問題B 模範答案集', '劣化機構別 全8本セット'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'pe-construction-road-pack',
    fileBaseName: 'pe-construction-road-pack-cover',
    magazineDir: 'docs/note/技術士建設部門/magazines/PACK-01_道路まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '道路（必須科目I＋道路）', '全35記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
];

async function renderOne(mag, fonts) {
  const element = renderTemplate(
    'magazine-banner',
    {
      lines: mag.lines,
      categoryLabel: mag.category,
      fontSize: mag.fontSize,
      ...(mag.accentColor ? { accentColor: mag.accentColor } : {}),
      ...(mag.fillBg ? { fillBg: mag.fillBg } : {}),
    },
    { width: W, height: H },
  );
  const svg = await satori(element, { width: W, height: H, fonts });
  const baseName = mag.fileBaseName ?? `essay-${mag.id}-cover`;
  mkdirSync(OUT_DIR, { recursive: true });
  const pngPath = join(OUT_DIR, `${baseName}.png`);
  const webpPath = join(OUT_DIR, `${baseName}.webp`);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(pngPath, pngBuffer);
  await sharp(pngBuffer).webp({ quality: 90 }).toFile(webpPath);
  console.log(`  ok: ${baseName}.{png,webp}`);
  // マガジンdir直下にも _cover.png を配置（note アップロード用。総監マガジンと同規約）
  if (mag.magazineDir) {
    const magDirAbs = join(ROOT, mag.magazineDir);
    mkdirSync(magDirAbs, { recursive: true });
    writeFileSync(join(magDirAbs, '_cover.png'), pngBuffer);
    console.log(`  ok: ${mag.magazineDir}/_cover.png`);
  }
}

async function main() {
  const filter = process.argv[2];
  const fonts = loadFonts();
  const targets = filter ? MAGAZINES.filter((m) => m.id.includes(filter)) : MAGAZINES;
  if (targets.length === 0) {
    console.warn(`no magazine matches: ${filter}`);
    process.exit(1);
  }
  console.log(`generating ${targets.length} magazine cover(s)...`);
  for (const mag of targets) {
    await renderOne(mag, fonts);
  }
  console.log(`done. output: ${OUT_DIR}/essay-*-cover.{png,webp}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
