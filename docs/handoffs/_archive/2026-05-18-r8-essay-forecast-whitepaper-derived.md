---
title: 2026-05-18 R8 候補テーマ予測ページ 白書発リフレーミング + 3 軸スコア導入
date: 2026-05-18
session_focus: r8-essay-keyword-forecast を「キーワード発」から「白書発」フレーミングに転換、NotebookLM 横断分析で 8 テーマ抽出 + 3 軸スコアで透明判定
related_strategy: docs/note/noteコンテンツ計画.md（Red Line #5/#7）
related_plan: docs/project/02_コンテンツ/06_R8記述式予測フロー.md（同 commit で新規）
---

# 2026-05-18 R8 候補テーマ予測 白書発リフレーミング 引き継ぎ

## 何が起きたか（1 行）

`r8-essay-keyword-forecast` を「事前選定 6 テーマを白書で正当化」する確証バイアス手順から「白書 17 冊を AI 横断分析して 2050 年 課題を抽出 → 5 管理対立で論述可能なもの 8 本に絞り込み → 3 軸スコアで透明判定」する白書発フレーミングに転換、12,825 字 → 18,055 字に再構成。

## 経緯（ユーザー指摘 → アプローチ転換）

### Phase 1: 確証バイアス手順で着手

事前に持っていた 6 テーマ A-F（気候変動適応 / 資源循環 × SCM / 少子高齢化 / インフラ老朽化 / GX / i-Con 2.0）を NotebookLM で根拠検索する設計を提示。ユーザーから「キーワードありき」「白書からテーマを抽出するのが NotebookLM の使い方では」と指摘される。

### Phase 2: 白書発抽出に転換

ユーザーが NotebookLM 白書ノートブック ID `2bf7f0dd-3935-49be-8cef-2d428c59eaa9`（「最新の白書」、17 冊収録）を提供。`notebooklm login` 実施後、以下 3 クエリを実行:

1. **メインクエリ**: 「最新の白書17冊から、2050年に向けて日本社会が直面する主要な技術社会課題を抽出し、5管理対立構造で論述できるテーマを示してください」→ 5 テーマ surface
2. **防災軸補強**: 気候変動由来災害・流域治水・グリーンインフラ・国土強靱化・能登半島地震復旧 → 追加 5 論点（うち 4 は独立テーマ化、1 は #4 と重複）
3. **少子高齢化軸補強**: 全世代型社会保障・地方創生・地域コミュニティ・社会保障世代間バランス → 4 論点（うち 2 は統合、1 は独立、1 は #1 と重複）

### Phase 3: 統合 → 8 テーマ確定

メインクエリ 5 + 補強 9 = 14 候補を dedupe/統合し、5 管理対立構造で論述可能・既存サイト KW ページでカバー可能なもの 8 本を確定:

| ID | テーマ | 既存対応 | 3 軸スコア |
|---|---|---|---|
| T1 | 気候変動適応 × グリーンインフラ × 流域治水 | A 拡張 | ◎/◎/◎ |
| T2 | 能登半島地震復旧 × 複合災害対応 | 新規（旧 I 候補独立化） | ◎/◎/○ |
| T3 | 循環経済 × ネイチャーポジティブ × サプライチェーン強靱化 | B + ネイチャーポジティブ前景化 | ◎/◎/○ |
| T4 | 少子高齢化 × 全世代型社会保障 × 地方創生 | C 社会政策側面 | ◎/◎/◎ |
| T5 | 人手不足 × インフラ維持 × i-Construction 2.0 × 自動化技術 | 新規（C+D+F のクロス） | ◎/◎/◎ |
| T6 | 老朽化インフラ予防保全 × 群マネ | D（NotebookLM で完全一致） | ◎/◎/◎ |
| T7 | GX × エネルギー安全保障の両立 | E + G（エネルギー安保前景化） | ◎/◎/○ |
| T8 | AI 社会深化 × 情報ガバナンス × リスク管理 | F + J（AI ガバナンス前景化） | ◎/◎/○ |

## 本セッションで実施した作業

### H1: 設計ドキュメント新規作成
- `docs/project/02_コンテンツ/06_R8記述式予測フロー.md`: 「テーマ予測 → R8 予想問題 → ペルソナ模範解答」3 段階フロー設計。各段階の品質基準（3 軸スコア）、サイト/note 分業、既存資産マッピング、Phase 別実装計画（Phase 1 手動 → Phase 2 スキル → Phase 3 サブエージェント）、Red Line #8 候補を明文化

### H2: r8-essay-keyword-forecast/article.mdx 全面改訂
- 12,825 → 18,055 字に拡張
- title / description / faqs / 本文すべて「白書発」フレーミングに書き換え
- 6 テーマ A-F → 8 テーマ T1-T8 に再構成
- 各テーマブロックに 3 軸スコア（根拠 / 立案 / 解答 ◎○）+ 根拠白書（章・特集テーマ）を明示
- 学習配分の目安・5 管理視点逆引きも T1-T8 ベースに更新
- `writeMdxFile`（lib/mdx-io.mjs）経由で CRLF 保持書き込み

### H3: 内部リンクインデックス更新
- `npm run refresh-indexes` 実行: src/config/{keyword-relations, doc-meta-index, cross-exam-keywords, pillar-exam-questions, tag-dictionary}.json 自動再生成

## 検証チェックリスト

- [x] CRLF 保持確認（mdx-io.mjs 経由、hasMixed=false）
- [x] U+FFFD（文字化け）なし
- [x] 内部リンク 42 件すべて実在確認
- [x] `node .claude/scripts/lint-mdx-mobile.mjs` 12-* 違反 0 件
- [x] curl http://localhost:3020/docs/pe-comprehensive-management-r8-essay-keyword-forecast HTTP 200
- [x] SSR で T1-T8 + 3 軸スコアが正しくレンダリング
- [ ] develop 直 push 後の HTTP 200 確認（commit 後）

## NotebookLM CLI 運用 学び（gotcha 追加候補）

本セッションで CLI v0.3.4 の以下挙動を確認:

### 1. アクティブ notebook 不一致時の conversation 混線

`notebooklm ask -n <id>` で notebook を指定しても、現在のアクティブ notebook が別 ID の場合、conversation_id が別 notebook のものを引き継いで失敗する。症状: 「短い英文は通るが、別 notebook 関連の日本語は exit 1」。

**回避**: 事前に `notebooklm use <id>` で目的の notebook をアクティブに切替 + `notebooklm clear` で conversation をリセットしてから ask。

### 2. ENOBUFS （spawnSync stdout 1MB 超え）

NotebookLM の長文回答（800KB+）は Node の `spawnSync` デフォルト stdout buffer（1MB）を超える。`notebooklm-cross-query.mjs` の wrapper は `maxBuffer` を指定していないため失敗する。

**回避**: 専用ヘルパーで `maxBuffer: 50 * 1024 * 1024` を渡すか、wrapper 側に同 option を追加する。

→ `docs/reference/notebooklm-cli-gotchas.md` に追加予定（別 commit）。

## 残作業 / 注意事項

- **note M3「R8 予想問題集」更新**: M3 マガジンに新規 T2（能登復旧）+ T5（人手不足×i-Con 2.0）の章を追加する必要あり。現状 6 章構成 → 8 章構成に拡張するか、T2 と T5 を既存章に統合するか note 側で判断
- **Red Line #8 確定**: 「予測コンテンツの 3 軸スコア透明判定」を Red Line #7 統合 or 新設の判断を `docs/note/noteコンテンツ計画.md` 編集時に確定
- **Phase 2 スキル化**: 3 軸スコア判定を `/predict-essay-themes` スキルとして実装する検討（着手条件は M3 売上 ≥ 月¥10k）
- **新規 KW ページ作成候補**: 本ページから内部リンクされない論点（流域治水 2.0・i-Construction 2.0・自然を活用した解決策 NbS・能登半島地震・全世代型社会保障・地方創生 2.0）の独立 KW ページ作成検討

## 学び

| 観点 | 内容 |
|---|---|
| 順序の重要性 | 「テーマ → 白書で根拠検索」は確証バイアスを生む。「白書 → 抽出 → 5 管理対立フィルタ」が正しい順序。事前にユーザーから指摘されなければ気づけなかった盲点 |
| 透明性 = 購買動機 | 3 軸スコア（根拠 ◎ / 立案 ◎ / 解答 ◎○）を全テーマで明示することで、なぜこの 8 本かの説明責任が果たせる。note 有料記事の差別化は「数」ではなく「選定プロセスの透明性」 |
| NotebookLM の真価 | 17 冊横断分析を人手でやれば数日かかる作業を、適切な質問で 30 秒で済む。ただし conversation state や buffer サイズの落とし穴があり、wrapper の整備が運用品質を直接決める |
| 8 テーマの構造的意味 | 既存 6 + 新規 2（T2 能登復旧、T5 人手不足×i-Con 2.0）。T2 は白書で独立論点として強く、T5 は C+D+F のクロス領域が白書発で前景化した結果。両方とも「事前にキーワード集ベースで考えていたら見逃していた」テーマ |

この経験を Red Line #8 案「予測コンテンツは 3 軸スコア透明判定 + 白書発抽出を必須とする」として明文化したい。Phase 2 のスキル化時に再発防止の構造的担保となる。
