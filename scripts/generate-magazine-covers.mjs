#!/usr/bin/env node
// note 有料マガジンの「ヘッダー画像」= マガジンdir直下 _cover.png を生成する（note アップロード用）。
//
// magazine-banner テンプレ（ogp-templates.mjs）で 1280×670 を出力する。note のマガジン/クリエイター
// ページのヘッダーは中央 1280×216 帯がクロップ表示されるため、マガジン名をこの帯の縦横中央に配置する。
// 生成した _cover.png は note-magazine-cover.mjs がアップロードする。
//
// 注: サイト側の CTA 画像（旧 public/images/magazines/*-cover）は 2026-07 に廃止した。サイトの note CTA は
//     exam-brand.ts の資格別 cta-bg イラスト＋ HTML 文字でデータ駆動する（本スクリプトは note 側専用）。
//
// 使い方:
//   node scripts/generate-magazine-covers.mjs                 # 全件生成（magazineDir 設定分）
//   node scripts/generate-magazine-covers.mjs river-consultant # 1件だけ生成

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

import { renderTemplate } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
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
 *
 * Crop-safe V4（variant: 'crop-safe-v4' 指定時のみ・opt-in）:
 * - qualifier / magazineName / proof / benefit を使い renderNoteCoverCropSafeV4 で描画
 *   （note のマガジン一覧 中央1280×454・狭ヘッダー 中央1280×216 でも主要文字が切れない三重安全領域）。
 * - visualPrompt / visualAsset: AI 背景素材（文字なし・repo ルート相対）。無ければ fillBg 決定論的背景。
 * - lines[] は後方互換のため残してよい（V4 指定時は使用されない）。
 * - 価格・自動同期できない記事本数は画像へ入れない。
 * 仕様 SSOT: .claude/knowledge/design-system/note-cover-crop-safe-v4.md
 */
export const MAGAZINES = [
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
    // Crop-safe V4 パイロット（2026-07-24・magazine key: m91516dfc27ac）。lines は後方互換で残置（V4 では未使用）。
    // 背景は examKey のブランド写真プール共有（2026-07-24 写真プール統一の決定・個別 visualAsset は不使用）
    variant: 'crop-safe-v4',
    examKey: 'pe-comprehensive',
    magazineDir: 'docs/note/技術士総監/magazines/総監記述式-設問3国家施策バンク',
    qualifier: '技術士 総監｜記述式',
    magazineName: '国家施策バンク',
    proof: '11テーマ・68施策',
    benefit: '設問3の弾薬を備蓄',
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
  {
    id: 'civil-1-marugoto',
    // Crop-safe V4 パイロット（2026-07-24・magazine key: md29a34906314）。lines は後方互換で残置（V4 では未使用）。
    // 背景は examKey のブランド写真プール共有（2026-07-24 写真プール統一の決定・個別 visualAsset は不使用）
    variant: 'crop-safe-v4',
    examKey: 'civil-1',
    fileBaseName: 'civil-1-niji-marugoto-pack-cover',
    magazineDir: 'docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック',
    qualifier: '1級土木｜第2次検定',
    magazineName: 'まるごとパック',
    proof: '経験記述＋学科記述＋直前暗記',
    benefit: '二次対策はこれ一冊で完結',
    lines: ['1級土木 二次検定', 'まるごとパック', '経験記述＋学科記述＋直前暗記'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#f0c040',
    fillBg: '#123a63',
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

// 資格別ブランド写真プール（サイト OGP と共有・brand-image-system.md §3。generate-note-covers.mjs と対）
const OGP_BG_DIR = join(ROOT, '.claude/config/ogp/backgrounds');
const BG_EXAM_ALIAS = { 'civil-1-2': 'civil-1' };
const brandPoolCache = new Map();
async function brandPoolVisual(examKey) {
  if (!examKey) return null;
  const key = BG_EXAM_ALIAS[examKey] || examKey;
  if (brandPoolCache.has(key)) return brandPoolCache.get(key);
  let src = null;
  for (const ext of ['png', 'webp', 'jpg']) {
    const p = join(OGP_BG_DIR, `${key}.${ext}`);
    if (existsSync(p)) {
      const buf = await sharp(p).resize({ width: W, height: H, fit: 'cover', position: 'centre' }).png().toBuffer();
      src = `data:image/png;base64,${buf.toString('base64')}`;
      break;
    }
  }
  brandPoolCache.set(key, src);
  return src;
}

async function renderOne(mag, fonts) {
  let element;
  if (mag.variant === 'crop-safe-v4') {
    // V4: 三重安全領域レイアウト（qualifier/magazineName/proof/benefit）。lines[] は使用しない。
    // 背景解決順: visualAsset（個別 opt-in）→ ブランド写真プール（spec.examKey）→ fillBg 決定論的背景
    let visualSrc = null;
    if (mag.visualAsset) {
      const vpath = join(ROOT, mag.visualAsset);
      if (!existsSync(vpath)) {
        console.warn(`  warn: ${mag.id} visualAsset が見つかりません（${mag.visualAsset}）→ ブランド写真プールへフォールバック`);
      } else {
        const vmeta = await sharp(vpath).metadata();
        if (vmeta.width !== W || vmeta.height !== H) {
          console.warn(`  warn: ${mag.id} visualAsset は ${vmeta.width}×${vmeta.height}（要 ${W}×${H}）→ フォールバック`);
        } else {
          const vbuf = readFileSync(vpath);
          const mime = /\.webp$/i.test(vpath) ? 'image/webp' : /\.jpe?g$/i.test(vpath) ? 'image/jpeg' : 'image/png';
          visualSrc = `data:${mime};base64,${vbuf.toString('base64')}`;
        }
      }
    }
    if (!visualSrc) {
      visualSrc = await brandPoolVisual(mag.examKey);
    }
    element = renderTemplate(
      'note-cover-g2',
      {
        cover: {
          variant: 'crop-safe-v4',
          qualifier: mag.qualifier,
          magazineName: mag.magazineName,
          proof: mag.proof,
          benefit: mag.benefit,
          credential: mag.credential,
        },
        palette: { band: mag.fillBg || '#16365C', accent: mag.accentColor || mag.fillBg || '#16365C', label: mag.category || '' },
        magazine: true,
        visualSrc,
        debugSafetyV4: mag.__debugSafety || false,
      },
      { width: W, height: H },
    );
  } else {
    element = renderTemplate(
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
  }
  const svg = await satori(element, { width: W, height: H, fonts });
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  // note アップロード用の _cover.png のみ生成する（サイト用 public/images/magazines は廃止）。
  if (mag.magazineDir) {
    const magDirAbs = join(ROOT, mag.magazineDir);
    mkdirSync(magDirAbs, { recursive: true });
    writeFileSync(join(magDirAbs, '_cover.png'), pngBuffer);
    console.log(`  ok: ${mag.magazineDir}/_cover.png`);
  } else {
    console.warn(`  skip: ${mag.id} は magazineDir 未設定（サイト用 public cover は廃止済み）`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const debugSafety = argv.includes('--debug-safety');
  const filter = argv.find((a) => !a.startsWith('--'));
  const fonts = loadFonts();
  const targets = filter ? MAGAZINES.filter((m) => m.id.includes(filter)) : MAGAZINES;
  if (targets.length === 0) {
    console.warn(`no magazine matches: ${filter}`);
    process.exit(1);
  }
  console.log(`generating ${targets.length} magazine cover(s)...`);
  for (const mag of targets) {
    await renderOne(debugSafety ? { ...mag, __debugSafety: true } : mag, fonts);
  }
  console.log(`done. output: <magazineDir>/_cover.png`);
}

// check-note-cover-fit.mjs 等から MAGAZINES を import できるよう、直接実行時のみ main を走らせる
const __isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (__isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
