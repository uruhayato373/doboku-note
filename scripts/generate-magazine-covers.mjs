#!/usr/bin/env node
// note 有料マガジンの「ヘッダー画像」= マガジンdir直下 _cover.png を生成する（note アップロード用）。
//
// 2026-09-17 から描画は記事カバーと同じ V5 キャラクターカバー（濃色・仕様 SSOT:
// .claude/knowledge/design-system/note-cover-character-v5.md）。note のマガジン/クリエイターページの
// ヘッダーは中央 1280×216 帯がクロップ表示されるため、主見出しはその帯に収まる枠で描く。
// 生成した _cover.png は note-magazine-cover.mjs がアップロードし、保管先は Drive vault
// （drive-vault.json の note-magazine-cover-png）。
//
// 本ファイルの MAGAZINES は「どのマガジンにカバーがあるか」の一覧（id / magazineDir / lines / category / fillBg）。
// V5 の文言は .claude/config/note-cover-magazine-v4.json（qualifier / magazineName / proof / benefit）を id で
// マージし、無い id は lines[] から補う。MAGAZINES に無いマガジンの補完と退役は
// .claude/config/note-character-covers.json（additionalMagazines / retiredMagazineIds）。
//
// 注: サイト側の CTA 画像（旧 public/images/magazines/*-cover）は 2026-07 に廃止した。サイトの note CTA は
//     exam-brand.ts の資格別 cta-bg イラスト＋ HTML 文字でデータ駆動する（本スクリプトは note 側専用）。
//
// 使い方:
//   node scripts/generate-magazine-covers.mjs                 # 全件生成（magazineDir 設定分）
//   node scripts/generate-magazine-covers.mjs river-consultant # 1件だけ生成（id 部分一致）

import { writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderNoteCharacterCover } from './lib/note-character-cover.mjs';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * 各マガジンの cover 定義。
 * - id: note-cover-magazine-v4.json / note-character-covers.json と突合するキー
 * - magazineDir: _cover.png の出力先（無ければ retiredMagazineIds に退役理由を書く）
 * - lines: タイトル行。V4 マップに文言が無い id はここから主見出し（2 行目）・リード（1 行目）・補足（3 行目）を補う
 * - category: 資格ラベル / fillBg: 帯の色（無ければ試験トークンの deep）
 * - fileBaseName / fontSize / accentColor: 旧テンプレの名残。V5 では使わない（削除は別作業）
 * - 価格・自動同期できない記事本数は画像へ入れない。
 */
export const MAGAZINES = [
  {
    id: 'river-consultant',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-河川コンサル',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '建設コンサル河川・砂防', '5年分セット (R03-R07)'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'general-contractor',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-ゼネコン',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', 'ゼネコン土木部門', '5年分セット (R03-R07)'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'road-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体道路担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 道路担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'procurement-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体契約調達担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 契約・調達担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'standards-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体技術基準担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 技術基準担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  // ----- 既存ペルソナのカバー欠落分（13本・2026-06-09 補完） -----
  {
    id: 'river-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体河川担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 河川担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'urban-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体都市計画担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 都市計画担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'sewage-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体下水道担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 下水道担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'sabo-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体砂防担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 砂防担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'port-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体港湾担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 港湾担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'park-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体公園緑地担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 公園緑地担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'water-municipality',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-自治体上水道担当',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '自治体 上水道担当（発注者）', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'road-consultant',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-道路橋梁コンサル',
    fillBg: '#16365C',
    lines: ['総監記述式 模範論文', '道路・橋梁設計コンサル', '過去問5年＋R8予想セット'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'urban-consultant',
    magazineDir: 'content/note/技術士総監/magazines/総監模範論文-都市計画コンサル',
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
    magazineDir: 'content/note/技術士総監/magazines/総監記述式-R8予想問題集',
    fillBg: '#16365C',
    fileBaseName: 'magazine-r8-essay-forecast-cover',
    lines: ['R8 予想問題集', '3 大テーマ × 三層構造', '3 ペルソナ別アレンジ'],
    category: '技術士（総合技術監理部門）',
    fontSize: 48,
  },
  // essay-template-3d「解答テンプレ3D」は 2026-06-01 企画中止により cover 生成エントリを削除
  {
    id: 'tradeoff-5kanri',
    magazineDir: 'content/note/技術士総監/magazines/総監記述式-5管理クロストレードオフ',
    fillBg: '#16365C',
    fileBaseName: 'magazine-tradeoff-5kanri-cover',
    lines: ['5 管理クロス・トレードオフ', '20 セル全網羅 + 答案ひな型', '解決フレーム辞書付き'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'setsumon3-policy-bank',
    // V4 フィールドは .claude/config/note-cover-magazine-v4.json（一元マップ・magazine key: m91516dfc27ac）
    magazineDir: 'content/note/技術士総監/magazines/総監記述式-設問3国家施策バンク',
    fillBg: '#16365C',
    fileBaseName: 'magazine-setsumon3-policy-bank-cover',
    lines: ['設問(3) 国家施策バンク', '将来課題 11 テーマ × 国家施策 68 案', '答案 1 枚相当・転写即戦力'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'essay-complete-pack',
    magazineDir: 'content/note/技術士総監/magazines/総監記述式-完全パック',
    fillBg: '#16365C',
    fileBaseName: 'magazine-essay-complete-pack-cover',
    lines: ['記述式 完全パック', '型×設問3×予想×模範論文＋精読', '全 14 ペルソナ 全部入り'],
    category: '技術士（総合技術監理部門）',
    fontSize: 44,
  },
  {
    id: 'essay-core-pack',
    magazineDir: 'content/note/技術士総監/magazines/総監記述式-コアパック',
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
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-テーマ別出る順',
    lines: ['1級土木 二次学科記述', 'テーマ別 出る順', '土工・コンクリート他 5テーマ'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-gakka',
    fileBaseName: 'civil-2-gakka-kijutsu-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-テーマ別出る順',
    lines: ['2級土木 二次学科記述', 'テーマ別 出る順', '工程表・コンクリート他 5テーマ'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-anki',
    fileBaseName: 'civil-1-anki-note-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-二次学科記述-直前暗記ノート',
    lines: ['1級土木 二次学科記述', '直前暗記ノート', '穴埋め一問一答＋赤シートPDF'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-anki',
    fileBaseName: 'civil-2-anki-note-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-二次学科記述-直前暗記ノート',
    lines: ['2級土木 二次学科記述', '直前暗記ノート', '穴埋め一問一答＋赤シートPDF'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-marugoto',
    // V4 フィールドは .claude/config/note-cover-magazine-v4.json（一元マップ・magazine key: md29a34906314）
    fileBaseName: 'civil-1-niji-marugoto-pack-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック',
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
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-完成答案集',
    lines: ['1級土木 施工経験記述', '工種×テーマ別 完成答案集', '品質・安全・工程・施工計画・環境'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-experience',
    fileBaseName: 'civil-2-experience-essay-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-完成答案集',
    lines: ['2級土木 施工経験記述', '工種×テーマ別 完成答案集', '安全・品質・工程の3テーマ'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-pastexam',
    fileBaseName: 'civil-1-pastexam-essay-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集',
    lines: ['1級土木 施工経験記述', '過去問 模範答案集', '年度別 R03〜R07（5年分）'],
    category: '1級土木施工管理技士',
    fontSize: 44,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-pastexam',
    fileBaseName: 'civil-2-pastexam-essay-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-施工経験記述-過去問模範答案集',
    lines: ['2級土木 施工経験記述', '過去問 模範答案集', '年度別 R03〜R07（5年分）'],
    category: '2級土木施工管理技士',
    fontSize: 44,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  {
    id: 'civil-1-combo',
    fileBaseName: 'civil-1-combo-essay-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全',
    lines: ['1級土木 施工経験記述', '2テーマ組合せ大全', '5管理 全10組合せ'],
    category: '1級土木施工管理技士',
    fontSize: 44,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-1-keiken-complete',
    fileBaseName: 'civil-1-keiken-complete-pack-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック',
    lines: ['1級土木 施工経験記述', '完全攻略パック', '想定工事150 × 5管理 全網羅'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#155293',
    fillBg: '#155293',
  },
  {
    id: 'civil-2-koji-bank',
    fileBaseName: 'civil-2-koji-bank-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク',
    lines: ['2級土木 施工経験記述', '想定工事バンク', '想定工事60 × 5管理'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#1C5038',
    fillBg: '#1C5038',
  },
  // ----- 技術士 建設部門 2次 模範解答集（BK シリーズ・2026-06-09） -----
  {
    id: 'bk-i-required',
    fileBaseName: 'pe-construction-bk-i-required-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-I_必須科目I',
    lines: ['技術士 建設部門 2次', '必須科目I 模範解答集', '5年分セット (R03-R07)'],
    category: '技術士（建設部門・第二次）',
    fontSize: 44,
    fillBg: '#33356B',
  },
  {
    id: 'bk-01-road',
    fileBaseName: 'pe-construction-bk-01-road-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-01_道路',
    lines: ['技術士 建設部門 2次', '道路 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-02-river',
    fileBaseName: 'pe-construction-bk-02-river-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-02_河川砂防',
    lines: ['技術士 建設部門 2次', '河川・砂防・海岸 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-03-urban',
    fileBaseName: 'pe-construction-bk-03-urban-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-03_都市計画',
    lines: ['技術士 建設部門 2次', '都市及び地方計画 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-04-geotech',
    fileBaseName: 'pe-construction-bk-04-geotech-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-04_土質及び基礎',
    lines: ['技術士 建設部門 2次', '土質及び基礎 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-05-steel',
    fileBaseName: 'pe-construction-bk-05-steel-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-05_鋼構造及びコンクリート',
    lines: ['技術士 建設部門 2次', '鋼構造及びコンクリート 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 38,
    fillBg: '#33356B',
  },
  {
    id: 'bk-06-construction',
    fileBaseName: 'pe-construction-bk-06-construction-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-06_施工計画',
    lines: ['技術士 建設部門 2次', '施工計画・施工設備・積算 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 36,
    fillBg: '#33356B',
  },
  {
    id: 'bk-07-environment',
    fileBaseName: 'pe-construction-bk-07-environment-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-07_建設環境',
    lines: ['技術士 建設部門 2次', '建設環境 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-08-port',
    fileBaseName: 'pe-construction-bk-08-port-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-08_港湾及び空港',
    lines: ['技術士 建設部門 2次', '港湾及び空港 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 40,
    fillBg: '#33356B',
  },
  {
    id: 'bk-09-power',
    fileBaseName: 'pe-construction-bk-09-power-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-09_電力土木',
    lines: ['技術士 建設部門 2次', '電力土木 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-10-railway',
    fileBaseName: 'pe-construction-bk-10-railway-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-10_鉄道',
    lines: ['技術士 建設部門 2次', '鉄道 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'bk-11-tunnel',
    fileBaseName: 'pe-construction-bk-11-tunnel-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/BK-11_トンネル',
    lines: ['技術士 建設部門 2次', 'トンネル 選択科目 模範解答集', 'II-1/II-2/III × R03-R07'],
    category: '技術士（建設部門・第二次）',
    fontSize: 42,
    fillBg: '#33356B',
  },
  {
    id: 'cd-essay',
    fileBaseName: 'cd-essay-cover',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集',
    lines: ['コンクリート診断士 記述式', '問題A・問題B 模範答案集', '劣化機構別 全8本セット'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-structure-case-bank',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-想定構造物8ケース',
    lines: ['コンクリート診断士 記述式', '構造物別 想定8ケース', '問題B フル模範答案集'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-road-bridge-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-道路橋梁8ケース',
    lines: ['コンクリート診断士 記述式', '道路・橋梁 8ケース', '解法ガイド付き'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-water-underground-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-水地下5ケース',
    lines: ['コンクリート診断士 記述式', '水・地下 5ケース', '解法ガイド付き'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-building-facility-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-建築施設4ケース',
    lines: ['コンクリート診断士 記述式', '建築・施設 4ケース', '解法ガイド付き'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-problem-a-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-問題A集中パック',
    lines: ['コンクリート診断士 記述式', '問題A 集中パック', '役割・倫理・維持管理'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-problem-b-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-問題B13ケース',
    lines: ['コンクリート診断士 記述式', '問題B 13ケース', '劣化機構別＋構造物別'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cd-essay-complete-pack',
    magazineDir: 'content/note/コンクリート診断士/magazines/コンクリート診断士-記述式完全パック',
    lines: ['コンクリート診断士 記述式', '問題A・B 完全パック', '全16記事'],
    category: 'コンクリート診断士',
    fontSize: 42,
    fillBg: '#522A69',
  },
  {
    id: 'cce-marugoto',
    fileBaseName: 'cce-marugoto-cover',
    magazineDir: 'content/note/コンクリート主任技士/magazines/コンクリート主任技士-まるごとパック',
    lines: ['コンクリート主任技士', 'まるごとパック', '択一＋小論文＋配合計算'],
    category: 'コンクリート主任技士',
    fontSize: 42,
    fillBg: '#0f6e6e',
  },
  {
    id: 'pe-construction-road-pack',
    fileBaseName: 'pe-construction-road-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-01_道路まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '道路（必須科目I＋道路）', '全35記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-tunnel-pack',
    fileBaseName: 'pe-construction-tunnel-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-02_トンネルまるごと合格パック',
    lines: ['建設部門 2次 合格パック', 'トンネル（必須科目I＋トンネル）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-urban-planning-pack',
    fileBaseName: 'pe-construction-urban-planning-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-03_都市計画まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '都市計画（必須科目I＋都市計画）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-river-coast-pack',
    fileBaseName: 'pe-construction-river-coast-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-04_河川砂防まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '河川砂防（必須科目I＋河川砂防）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-steel-concrete-pack',
    fileBaseName: 'pe-construction-steel-concrete-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-05_鋼コンまるごと合格パック',
    lines: ['建設部門 2次 合格パック', '鋼コン（必須科目I＋鋼コン）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-geotechnical-pack',
    fileBaseName: 'pe-construction-geotechnical-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-04_土質基礎まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '土質基礎（必須科目I＋土質基礎）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-railway-pack',
    fileBaseName: 'pe-construction-railway-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-10_鉄道まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '鉄道（必須科目I＋鉄道）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-environment-pack',
    fileBaseName: 'pe-construction-environment-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-07_建設環境まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '建設環境（必須科目I＋建設環境）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-port-airport-pack',
    fileBaseName: 'pe-construction-port-airport-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-08_港湾空港まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '港湾空港（必須科目I＋港湾空港）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-construction-planning-pack',
    fileBaseName: 'pe-construction-construction-planning-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-06_施工計画まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '施工計画（必須科目I＋施工計画）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'pe-construction-power-civil-pack',
    fileBaseName: 'pe-construction-power-civil-pack-cover',
    magazineDir: 'content/note/技術士建設部門/magazines/PACK-09_電力土木まるごと合格パック',
    lines: ['建設部門 2次 合格パック', '電力土木（必須科目I＋電力土木）', '全29記事 ¥4,980'],
    category: '技術士（建設部門）',
    fontSize: 42,
    fillBg: '#334155',
  },
  {
    id: 'rccm-mondai3',
    fileBaseName: 'rccm-mondai3-cover',
    magazineDir: 'content/note/RCCM/magazines/RCCM問題III-2026模範論文集',
    lines: ['RCCM 問題III 管理技術力', '2026年度 公開6テーマ', '模範論文集（序章無料）'],
    category: 'RCCM',
    fontSize: 42,
    fillBg: '#742D15',
  },
  {
    id: 'civil-1-chokuzen-pack',
    fileBaseName: 'civil-1-chokuzen-pack-cover',
    magazineDir: 'content/note/1級・2級土木/1級土木/magazines/1級土木-二次直前総仕上げパック',
    lines: ['1級土木 二次検定', '直前総仕上げパック', '模試3回＋暗記160問＋出題分析'],
    category: '1級土木施工管理技士',
    fontSize: 42,
    accentColor: '#f0c040',
    fillBg: '#123a63',
  },
  {
    id: 'civil-2-niji-marugoto-pack',
    fileBaseName: 'civil-2-niji-marugoto-pack-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-二次まるごとパック',
    lines: ['2級土木 二次検定', 'まるごとパック', '経験記述＋学科記述＋直前対策'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#f0c040',
    fillBg: '#1C5038',
  },
  {
    id: 'pe1-chokuzen-pack',
    fileBaseName: 'pe1-chokuzen-pack-cover',
    magazineDir: 'content/note/技術士一次/magazines/技術士一次-直前パック',
    lines: ['技術士 第一次試験', '直前パック', '過去問560問＋暗記156問'],
    category: '技術士（第一次試験）',
    fontSize: 42,
    fillBg: '#16365C',
  },
  {
    id: 'ce-chokuzen-pack',
    fileBaseName: 'ce-chokuzen-pack-cover',
    magazineDir: 'content/note/コンクリート技士/magazines/コンクリート技士-直前パック',
    lines: ['コンクリート技士', '択一 直前パック', '配合計算12問＋暗記139問'],
    category: 'コンクリート技士',
    fontSize: 42,
    fillBg: '#168080',
  },
  {
    id: 'cce-takuitsu-chokuzen-pack',
    fileBaseName: 'cce-takuitsu-chokuzen-pack-cover',
    magazineDir: 'content/note/コンクリート主任技士/magazines/コンクリート主任技士-択一直前パック',
    lines: ['コンクリート主任技士', '択一 直前パック', '予想50問＋配合計算＋暗記157問'],
    category: 'コンクリート主任技士',
    fontSize: 42,
    fillBg: '#0f6e6e',
  },
  {
    id: 'civil-2-chokuzen-pack',
    fileBaseName: 'civil-2-chokuzen-pack-cover',
    magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-二次直前総仕上げパック',
    lines: ['2級土木 二次検定', '直前総仕上げパック', '模試3回＋暗記147問＋出題分析'],
    category: '2級土木施工管理技士',
    fontSize: 42,
    accentColor: '#f0c040',
    fillBg: '#1C5038',
  },
  {
    id: 'rccm-marugoto-pack',
    fileBaseName: 'rccm-marugoto-pack-cover',
    magazineDir: 'content/note/RCCM/magazines/RCCM-まるごとパック',
    lines: ['RCCM 資格試験', 'まるごとパック', '問題I〜IV 全対応'],
    category: 'RCCM',
    fontSize: 42,
    fillBg: '#742D15',
  },
];

// 描画は generate-note-covers.mjs と同じ V5 キャラクターカバー（scripts/lib/note-character-cover.mjs）。
// 対象一覧・V4 マップのマージ・設定の補完分（additionalMagazines）・退役（retiredMagazineIds）・ポーズ割当は
// scripts/lib/note-cover-inventory.mjs に集約してあり、1 誌だけ再生成しても一括生成と同じ画像になる。
async function main() {
  const filter = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const inventory = await loadNoteCoverInventory(ROOT, { magazines: MAGAZINES });
  for (const r of inventory.retired) console.log(`  skip: ${r.id} は退役（${r.reason}）`);
  const magazines = inventory.targets.filter((m) => m.kind === 'magazine');
  const targets = filter ? magazines.filter((m) => m.key.slice('magazine:'.length).includes(filter)) : magazines;
  if (targets.length === 0) {
    console.warn(`no magazine matches: ${filter}`);
    process.exit(1);
  }
  console.log(`generating ${targets.length} magazine cover(s)...`);
  const failed = [];
  for (const mag of targets) {
    try {
      const { buffer } = await renderNoteCharacterCover(ROOT, mag.input);
      // note アップロード用の _cover.png のみ生成する（サイト用 public/images/magazines は廃止）。
      const destination = join(ROOT, mag.imagePath);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination + '.tmp', buffer);
      renameSync(destination + '.tmp', destination);
      console.log(`  ok: ${mag.imagePath}`);
    } catch (err) {
      console.error(`  error: ${mag.key} → ${err.message}`);
      failed.push(mag.key);
    }
  }
  // 出力先が解決できないマガジン（magazineDir 無し・退役登録も無し）は生成では直らないので赤にする。
  for (const e of inventory.errors) { console.error(`  error: ${e.key} → ${e.error}`); failed.push(e.key); }
  console.log(`[generate-magazine-covers] ${targets.length} 件を実処理 / 失敗 ${failed.length} 件。output: <magazineDir>/_cover.png`);
  if (failed.length) process.exitCode = 1;
}

// check-note-cover-fit.mjs 等から MAGAZINES を import できるよう、直接実行時のみ main を走らせる
const __isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (__isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
