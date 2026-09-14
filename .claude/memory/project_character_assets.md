---
name: project_character_assets
description: ブランドマスコット「doboku-note 先生」ポーズ素材を実画像で再マッピング・重複整理（15→11 verified）。旧slugは全て死語
metadata: 
  node_type: memory
  type: project
  originSessionId: ff06574e-3026-4af4-affd-b309cc406ac7
---

ブランドマスコット「doboku-note 先生」（40代男性土木技術者・白ヘルメット doboku-note 文字・濃紺作業服＋黄色反射ベスト・メガネ・軽いひげ・セミリアルアニメ調）のポーズ素材ライブラリ。

**2026-06-29 棚卸し（PR #292・feat/character-assets）**: 初版(2026-06-26 ChatGPT生成→flood-fill透過)の slug は AI 抽出のグリッド位置由来で**実ポーズと全面的に不一致**だった（manifest も verified:false）。全15ファイルを目視確認し是正。
- **重複4件削除**: 無名 `.png`(=pointing複製) / `pc-work.png`(=smileのバイト完全複製) / `serious.png`(=pointing複製) / `point-emphasis-2.png`(=good-sign複製)。
- **11ポーズへ正名化**（character-poses.json verified:true）: gesture=pointing(指立て)/good-sign(親指)/explaining(手のひら提示)/wave(挨拶) ・ expression=thinking(顎に手)/surprised(両手上げ)/congrats(バンザイ)/smile(立ち笑顔) ・ item=whiteboard/pc-work(ノートPC)/reading(教科書)。
- **旧 slug は全て死語**（idea/arms-crossed/serious/point-emphasis(-2)/point-up は廃止。旧 congrats=実は読書、旧 point-up=実はバンザイ、旧 wave=実はホワイトボード、旧 whiteboard=実はノートPC）。今後ポーズを指す時は新 slug を使う。
- **腕組み(arms-crossed)は実在ポーズが無く未収録**（必要なら新規生成）。
- ポーズ名の参照は `.claude/config/character-poses.json` のみ（SNSパック/リール台本は特定ポーズ名を未参照＝リネーム安全）。

**SSOT**: 設定書=`docs/sns/_assets/character/CHARACTER-SPEC.md` / 機械可読=`.claude/config/character-poses.json`(verified) / 運用=`docs/reference/character-asset-policy.md` / 抽出=`npm run character-extract`。素材=`docs/sns/_assets/character/*.png`（背景透過・全身正面）＋`_source/grid-1〜3.png`。

**未着手（ユーザー要望・2026-06-29）**: ②note カバー/OGP へキャラ合成（テンプレ renderNoteCoverG2/mono-tag 改修・要プロトタイプ）③プロフィール/アイコン整備（スペック§5＝円形・青背景・橋/クレーンのシルエット・バスト）。関連 [[project_note_cover_g2]] [[project_ogp_design_ssot]]
