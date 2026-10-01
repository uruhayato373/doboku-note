---
name: character-asset-ssot
description: ブランドマスコット「doboku-note先生」のSSOT管理一式（設定書＋manifest＋抽出スクリプト＋配線）
metadata: 
  node_type: memory
  type: reference
  originSessionId: ffdcbfc9-a4ad-4cf0-9af2-f7f9d83d62a7
---

ブランドマスコット「doboku-note 先生」（40代男性・土木技術者・先生役）を SSOT で管理化（2026-06-26, commit 2b2ffb376）。素材保存だけだったのを「真実源＋機械可読＋再利用ツール」に。

- **アイデンティティ SoT** = `docs/sns/_assets/character/CHARACTER-SPEC.md`（設定書＝人格/外見/ブランド色/避けたい表現/ロードマップ）。不変条件: ヘルメット文字 `doboku-note`・濃紺作業着＋黄反射ベスト・メガネ・セミリアル、`どぼくらぼ` 誤字や若すぎ/写真風はNG。VOICEVOX speaker 13（青山龍星）。
- **ポーズ機械可読 SoT** = `.claude/config/character-poses.json`（slug/file/label/category/beat、`verified:false`=AI生成からの自動推定名で要本人確認）。初版14ポーズ＋`_source/`生成元グリッド3枚。
- **運用 SSOT** = `docs/reference/character-asset-policy.md`（保存/命名/生成→抽出/チャネル別使用/管理分担）。CLAUDE.md索引に登録済み。
- **抽出ツール** = `npm run character-extract -- --in <dir> [--names ...] [--montage]`（無地背景生成画像→白背景 flood-fill 透過＋トリム→ポーズ名保存）。淡色/影が残れば aidesigner remove_image_background（無料）。

**Why:** AIは「透過」「同一人物9体グリッド」を守れない→1ポーズ=1画像・無地背景で生成→ツールで透過が確定運用（[[gemini-cost-confirm]] 同様、AIに無理をさせず後処理で担保）。
**How to apply:** ポーズ追加は character-extract→manifest追記→develop別worktreeでcommit。**エージェントは作らない**（pose選択=manifest引き・抽出=決定的処理。[[mechanical-task-direct]]）。リール合成は ig-reels-policy §7 の `character:"<pose>"`。関連 [[project_ig_reels_civil]]。
