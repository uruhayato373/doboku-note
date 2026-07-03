# SNS 整理マップ（戦略 × エージェント/スキル）

> [!info] このドキュメントの役割
> 分散している SNS 戦略doc・ポリシー・エージェント/スキルの**全体像を一枚に集約**した索引兼健全性マップ（2026-07-03 棚卸し）。各論の真実源は下表のリンク先。ここは「どこに何があるか」「チャネル×キャパの対応」「版・SSOT関係」「穴と優先アクション」を俯瞰するための入口。

## 1. 戦略doc・ポリシーの版と SSOT 関係

| ファイル | 版 | 最終更新 | 位置づけ |
|---|---|---|---|
| `01_SNS集客戦略.md` | **v7** | 2026-05-28 | SNS 全体戦略の SSOT。IG を一次制作へ格上げ・YT は IG Reels の二次展開に再定義。X 凍結対応の追記あり |
| `02_チャネル動線設計.md` | **v2** | 2026-05-22 | 5チャネル統合ファネル・UTM 設計・季節×チャネル・実装ロードマップの SSOT |
| `03_多資格SNS展開設計.md` | 実装完了 | 2026-06-02 | 試験軸（総監/1級/2級/建設部門）ディレクトリ・カバー色の多資格対応 |
| `05_YouTube戦略_技術士総監.md` | v1 | 2026-06-12 | **総監 YT の独立 SSOT**（01 を上書き）。Tier1 Shorts＋Tier2 通常動画 |
| `05a_YouTube競合分析_技術士総監_2026-06.md` | 定点 | 2026-06 | 競合分析の根拠資料（年次更新で差分比較） |
| `docs/reference/x-post-policy.md` | — | — | X 投稿規約＋**凍結ガードレール §11**（doc本体より詳細） |
| `docs/reference/content-angle-policy.md` | v1 | 2026-06-09 | **6切り口**（結論/理由/体験/反論/数字/ハウツー）の SSOT・Red Line 1-5 |
| `docs/reference/sns-repurpose-policy.md` | — | — | 6切り口のチャネル別適用 |
| `docs/reference/ig-{carousel-skill,reels-policy,stories-policy,highlight-design-policy,publish-reconcile}.md` | — | — | IG 各コンテンツ型の規約 |
| `docs/reference/yt-shorts-publisher-policy.md` | — | — | YT Shorts 品質基準（4軸） |
| `docs/reference/{sns-image-policy,sns-archive-policy,character-asset-policy}.md` | — | — | 画像/退避/マスコットの共通ポリシー |
| `docs/reference/note-funnel-architecture.md` | v1 | 2026-06-16 | note 導線 3層モデルの SSOT（機械可読は `.claude/config/note-funnel.json`） |

> [!note] 版の注意
> 01 の H1 は v7 だが本文に X 凍結（2026-06-12）対応の追記が入っている。凍結運用の詳細は `x-post-policy §11` 側が真実源。総監 YT は 01 でなく 05 が独立 SSOT である点を混同しない。

## 2. チャネル × キャパビリティ 対応表

| チャネル | ファネル | 頻度 | 生産 | Generator | Evaluator | ゲート/運用 |
|---|---|---|---|---|---|---|
| IG カルーセル | BOFU・保存 | 週2 | 自動 | `ig-carousel-writer` | `ig-carousel-qa` | — |
| IG Reels | TOFU・リーチ（一次制作） | 週3 | 自動(TTS+ffmpeg) | `ig-reels-writer` | `ig-reels-qa` | ※完成mp4の評価役なし |
| IG ストーリーズ | 進入・双方向 | 随時 | 半手動 | `ig-stories-writer` | `ig-stories-qa` | — |
| IG ハイライト | follow判断 | 四半期/6種 | 半手動 | `ig-highlight-designer` | `ig-highlight-qa` | ※6種実制作が未整備 |
| IG 公開 | — | — | — | — | `ig-publish-auditor` | `/ig-reconcile`（時刻衝突は目視） |
| YT Shorts | TOFU・検索 | 総監日3/他週1-2 | 自動(総監cron) | ※なし（`/yt-shorts-create`） | `yt-shorts-publisher-qa`／`yt-shorts-title-writer` | — |
| X | TOFU・信頼 | 週数本 | 手動（凍結中） | `x-post-writer` | `x-post-qa`／`x-repost-curator` | `/publish-x` 凍結停止 |
| note | BOFU・有料 | — | 決定論スクリプト | `note-operator`系 | `note-funnel-auditor`／`note-fact-checker` | 公開後QA役は非設置(設計上) |

**エージェント15・スキル22**。台帳（`agents-registry.md`/`skills-guide.md`）と実体は**完全同期・件数一致・参照切れ0・退役2件も管理済**。

## 3. 共通基盤

- **6切り口 × 試験軸** を直交させ、リソース増設なしで「試験×角度」を量産（`content-angle-policy.md`）。
- **試験別色トークン**（総監=紺/1級=青/2級=緑）を note cover と SNS 投稿色帯が共用。※コンクリ診断士の色は未割当。
- **共通スライド基盤** `sns-common/slide-render.mjs`（4:5・9:16 実装／**16:9 未実装**＝YT通常動画のブロッカー）。
- **マスコット**「doboku-note 先生」を全チャネル統一。
- **UTM 統一**は 02§4 で**定義のみ・未実装**（`utm-templates.json` 不在）。

## 4. 穴（capability × infra）と優先アクション

| 種別 | 課題 | 優先 |
|---|---|---|
| インフラ | **UTM 統一が定義のみ→未実装**（GA4 で SNS 経路が分類不能） | 🔴 |
| doc整合 | 索引の版ドリフト（CLAUDE.md 索引 v5→v7・v1→v2 是正済）／X 凍結対応が doc本体と x-post-policy に二分 | 🔴→一部済 |
| インフラ | note CTA ライブ反映が月次のみ（新規公開で未反映が再発） | 🟡 |
| エージェント | **動画 mp4 の品質評価役が無い**（IG Reels・YT Shorts＝台本は採点、完成 mp4 は無評価） | 🟡 |
| 制作 | IG ハイライト6種の実制作／YT 16:9 テンプレ（0.5–1日）／字幕焼き込み | 🟡🟢 |
| エージェント | 投稿時刻の衝突自動検出（現状 `ig-publish-auditor` は目視） | 🟢 |

**着手順の推奨**: ①UTM 実装（backlog タスク化済）→ ②X 凍結後の運営ワークフロー整備 → ③note CTA ライブ反映の自動化 → ④動画 mp4 評価エージェントの新設判断 → ⑤IG ハイライト6種・YT 16:9。

## 5. 関連台帳・config

- エージェント詳細＝`docs/reference/agents-registry.md`／スキル早引き＝`docs/reference/skills-guide.md`／退役ログ＝`docs/reference/skills-registry.md`
- config＝`.claude/config/{note-funnel.json, ig-account.json, character-poses.json, figure-canvas.json}`
