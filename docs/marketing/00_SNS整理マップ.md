# SNS 整理マップ（戦略 × エージェント/スキル）

> [!info] このドキュメントの役割
> 分散している SNS 戦略doc・ポリシー・エージェント/スキルの**全体像を一枚に集約**した索引兼健全性マップ（2026-07-03 棚卸し）。各論の真実源は下表のリンク先。ここは「どこに何があるか」「チャネル×キャパの対応」「版・SSOT関係」「穴と優先アクション」を俯瞰するための入口。

## 1. 戦略doc・ポリシーの版と SSOT 関係

| ファイル | 版 | 最終更新 | 位置づけ |
|---|---|---|---|
| `01_SNS集客戦略.md` | **v8** | 2026-07-04 | SNS 全体戦略の SSOT。IG を一次制作へ格上げ・YT は IG Reels の二次展開に再定義。X 凍結対応を統合 |
| `02_チャネル動線設計.md` | **v2** | 2026-05-22 | 5チャネル統合ファネル・UTM 設計・季節×チャネル・実装ロードマップの SSOT |
| `03_多資格SNS展開設計.md` | 実装完了 | 2026-06-02 | 試験軸（総監/1級/2級/建設部門）ディレクトリ・カバー色の多資格対応 |
| `05_YouTube戦略_技術士総監.md` | v1 | 2026-06-12 | **総監 YT の独立 SSOT**（01 を上書き）。Tier1 Shorts＋Tier2 通常動画 |
| `05a_YouTube競合分析_技術士総監_2026-06.md` | 定点 | 2026-06 | 競合分析の根拠資料（年次更新で差分比較） |
| `06_動画コンテンツ運用設計.md` | v1 | 2026-08-21 | **多資格の動画運用SSOT**。動画パック、通常動画を核にした派生、管理画面、KPI、段階実装 |
| `07_YouTube戦略_土木施工管理技士.md` | v1.1 | 2026-09-01 | **1級・2級土木 YT の独立 SSOT**（01 を上書き）。診断・添削接続型で差別化・ロング過去問解説は不参入 |
| `07a_YouTube競合分析_土木施工管理技士_2026-09.md` | 定点 | 2026-09-01 | 競合分析の根拠資料（13ch yt-dlp実測・GET研究所発見・再取得手順つき） |
| `08_YouTube戦略_技術士建設部門.md` | v1 | 2026-09-01 | **建設部門 YT の独立 SSOT**。1級土木×建設部門の横断軸・書き分け空白の先占・準備先行/公開はpilot判定後 |
| `08a_YouTube競合分析_技術士建設部門_2026-09.md` | 定点 | 2026-09-01 | 競合分析の根拠資料（5ch実測・ぺんたID誤り訂正・白地12クエリ） |
| `.claude/knowledge/reference/x-post-policy.md` | — | — | X 投稿規約＋**凍結ガードレール §11**（doc本体より詳細） |
| `.claude/knowledge/reference/content-angle-policy.md` | v1 | 2026-06-09 | **6切り口**（結論/理由/体験/反論/数字/ハウツー）の SSOT・Red Line 1-5 |
| `.claude/knowledge/reference/sns-repurpose-policy.md` | — | — | 6切り口のチャネル別適用 |
| `.claude/knowledge/reference/ig-{carousel-skill,reels-policy,stories-policy,highlight-design-policy,publish-reconcile}.md` | — | — | IG 各コンテンツ型の規約 |
| `.claude/knowledge/reference/yt-shorts-publisher-policy.md` | — | — | YT Shorts 品質基準（4軸） |
| `.claude/knowledge/reference/video-content-policy.md` | v1 | 2026-08-21 | 動画パックschema・状態・専用Generator/Evaluator・機械/公開ゲート |
| `.claude/knowledge/reference/{sns-image-policy,sns-archive-policy,character-asset-policy}.md` | — | — | 画像/退避/マスコットの共通ポリシー |
| `.claude/knowledge/reference/note-funnel-architecture.md` | v1 | 2026-06-16 | note 導線 3層モデルの SSOT（機械可読は `.claude/config/note-funnel.json`） |

> [!note] 版の注意
> X凍結運用の詳細は `x-post-policy §11` が真実源。総監のテーマ・Red Lineは05、多資格の動画パック・役割・管理構造は06が真実源であり、両者を混同しない。

## 2. チャネル × キャパビリティ 対応表

| チャネル | ファネル | 頻度 | 生産 | Generator | Evaluator | ゲート/運用 |
|---|---|---|---|---|---|---|
| IG カルーセル | BOFU・保存 | 週2 | 自動 | `ig-carousel-writer` | `ig-carousel-qa` | — |
| IG Reels | TOFU・リーチ（一次制作） | 週3 | 自動(TTS+ffmpeg) | `ig-reels-writer` | `ig-reels-qa` | ※完成mp4の評価役なし |
| IG ストーリーズ | 進入・双方向 | 随時 | 半手動 | `ig-stories-writer` | `ig-stories-qa` | — |
| IG ハイライト | follow判断 | 四半期/6種 | 半手動 | `ig-highlight-designer` | `ig-highlight-qa` | ※6種実制作が未整備 |
| IG 公開 | — | — | — | — | `ig-publish-auditor` | `/ig-reconcile`（時刻衝突は目視） |
| YT 通常動画 | 検索・信頼・送客 | pilot 4本 | 半手動 | `video-script-writer`（DN-0110で新設） | `video-content-qa`（DN-0110で新設） | `/video-content`（予定）＋人承認 |
| YT Shorts | TOFU・発見 | 手動投入 | 自動生成＋手動dispatch | ※なし（`/yt-shorts-create`） | `yt-shorts-publisher-qa`／`yt-shorts-title-writer` | 関連通常動画へ接続 |
| X | TOFU・信頼 | 週数本 | 手動（別アカウントで運用再開） | `x-post-writer` | `x-post-qa`／`x-repost-curator` | 旧アカ凍結（2026-06-12）→別アカウントで再開。`/publish-x` は当面手動運用 |
| note | BOFU・有料 | — | 決定論スクリプト | `note-operator`系 | `note-funnel-auditor`／`note-fact-checker` | 公開後QA役は非設置(設計上) |

**エージェント15・スキル22**。台帳（`agents-registry.md`/`skills-guide.md`）と実体は**完全同期・件数一致・参照切れ0・退役2件も管理済**。

## 3. 共通基盤

- **6切り口 × 試験軸** を直交させ、リソース増設なしで「試験×角度」を量産（`content-angle-policy.md`）。
- **試験別色トークン**（総監=紺/1級=青/2級=緑）を note cover と SNS 投稿色帯が共用。※コンクリ診断士の色は未割当。
- **共通スライド基盤** `sns-common/slide-render.mjs`（4:5・9:16 実装／**16:9 未実装**＝DN-0110 Phase 1のブロッカー）。
- **動画パック基盤** `content/sns/video-packs/` はDN-0110で新設予定。企画・出典・台本・CTAをSSOTにし、公開状態は `.claude/state/`、バイナリはR2へ分離する。
- **マスコット**「doboku-note 先生」を全チャネル統一。
- **UTM 統一**は実装済（`.claude/config/utm-templates.json`＋`.claude/scripts/lib/utm-builder.mjs`。X/IG=social・YT=video・note=referral、冪等・CLIあり）。**YT 生成スクリプト（yt-shorts-create / per-problem-shorts）の `.replace()` 手書きは `buildUtmUrl()` へ配線済＝sns-config のハードコード utmParams は撤去（2026-07-04）**。X 送客リンクは `check-x-utm`（pre-commit）で utm_source=x/utm_medium=social を強制。

## 4. 穴（capability × infra）と優先アクション

| 種別 | 課題 | 優先 |
|---|---|---|
| インフラ | UTM 統一＝**実装済**（templates＋builder＋YT生成配線完了＋X UTMゲート check-x-utm）。GA4 SNS流入 breakdown＋週次snapshot復旧＋YT公開照合 verify-yt-status も配線済（2026-07-04） | 🟢 |
| doc整合 | 索引の版ドリフト（CLAUDE.md 索引 v5→v7・v1→v2 是正済）／X 凍結対応は `x-post-policy §11`（§11.6 復帰ゲート新設）に一本化・01 は参照化で解消済 | 🟢 |
| インフラ | note CTA ライブ反映が月次のみ（新規公開で未反映が再発） | 🟡 |
| エージェント | 動画マスターのGenerator/Evaluatorが無い。`video-script-writer` / `video-content-qa` の1組だけをDN-0110で新設する | 🟡 |
| 制作 | IG ハイライト6種の実制作／YT 16:9 テンプレ（0.5–1日）／字幕焼き込み | 🟡🟢 |
| エージェント | 投稿時刻の衝突自動検出（現状 `ig-publish-auditor` は目視） | 🟢 |

**着手順の推奨**: ①UTM＋SNS計測基盤＝**実装済** → ②DN-0110 Phase 0（動画schema・state・機械ゲート）→ ③16:9＋通常動画4本pilot → ④専用Generator/Evaluator 1組とread-only管理画面 → ⑤実績テーマだけ他資格・Threadsへ拡張。

## 5. 関連台帳・config

- エージェント詳細＝`.claude/knowledge/reference/agents-registry.md`／スキル早引き＝`.claude/knowledge/reference/skills-guide.md`／退役ログ＝`.claude/knowledge/reference/skills-registry.md`
- config＝`.claude/config/{note-funnel.json, ig-account.json, character-poses.json, figure-canvas.json, utm-templates.json}`

## 6. 投稿型・雛形カタログ（量産の索引）

「どのチャネルに・どの投稿型を・どの雛形(schema)から・どのスキルで量産し・誰が採点し・どの policy に従うか」の一枚索引。**新しい型・雛形はここでは発明しない**（既存の型は揃っており、欠けていたのは索引）。詳細仕様は各 policy が真実源。

### チャネル × 投稿型 × 雛形 × 発動

| チャネル | 主な投稿型 | 雛形(schema) | 発動 | Generator → Evaluator | policy(真実源) |
|---|---|---|---|---|---|
| IG カルーセル | 過去問クイズ／キーワード図解／自己紹介 | `slide-data.json`(v2) | `/ig-post-create`・再生成`/ig-carousel-restyle`・figure変換`/ig-figure-pack` | `ig-carousel-writer` → `ig-carousel-qa` | `ig-carousel-policy.md`／`ig-carousel-skill.md` |
| IG Reels | 過去問1問1リール／論点解説／逆転体験談 | `reels/script.json`(+`caption.txt`) | `/ig-reel-create`（1問=`per-problem-shorts.mjs --ig-mode`） | `ig-reels-writer` → `ig-reels-qa` | `ig-reels-policy.md` |
| IG ストーリーズ | 4枚連投・投票/質問ステッカー・リンク導線 | `stories/caption.txt`＋`stories/note.md` | `node .claude/scripts/instagram/build-stories.mjs` ＋ エージェント（**専用スキルなし＝node＋agent 運用**） | `ig-stories-writer` → `ig-stories-qa` | `ig-stories-policy.md` |
| IG ハイライト | 6種（intro/カルーセル目次/Reelsまとめ/FAQ/お知らせ/教材） | `highlights/NN_*/slide-data.json` | `node .claude/scripts/instagram/build-highlight-materials.mjs`（**専用スキルなし＝node＋agent 運用**） | `ig-highlight-designer` → `ig-highlight-qa` | `ig-highlight-design-policy.md` |
| IG 予約投稿 | カルーセル/リールの予約 | — | `/publish-ig-bs`（照合`/ig-reconcile`） | — → `ig-publish-auditor` | `ig-publish-reconcile.md` |
| YT Shorts | 過去問論点Short（総監は全問展開） | `.claude/state/youtube-schedule.json`（台帳・論点タイトル入力済） | `/yt-shorts-create --from-reels`／`per-problem-shorts.mjs`（YT専用再描画） | `yt-shorts-title-writer` → `yt-shorts-publisher-qa` | `yt-shorts-publisher-policy.md`／`yt-shorts-script-policy.md` |
| 動画パック／YT通常動画 | 悩み直撃解説・思考法・聞き流し・商品導線 | `video-pack.json`＋`script.md`＋`storyboard.json`（DN-0110） | `/video-content`（予定） | `video-script-writer` → `video-content-qa` | `video-content-policy.md`／`06_動画コンテンツ運用設計.md` |
| X | 過去問クイズ／カウントダウン／体験断片／angle分割 | `content/sns/x/{draft,published}/NNN-*/tweets.md` | `/social-post --platform x`・カード`/create-x-card`・引用RP`/x-repost`・（投稿`/publish-x`＝§11.6 到達まで停止・人手） | `x-post-writer` → `x-post-qa`（引用=`x-repost-curator`） | `x-post-policy.md`（§11＝凍結ガード） |
| note | 有料マガジン記事／無料ファネル記事 | `article.md`（frontmatter） | `/pe-note-plan`(企画)→執筆→`/note-publish`等 | `note-operator`系 → `note-funnel-auditor`／`note-fact-checker` | `note-funnel-architecture.md`／`note-selling-structures.md` |

### 横断レイヤー（型に直交する編集レンズ）

- **6切り口**（`content-angle-policy.md`）: 結論／理由／体験／反論／数字／ハウツーを `angle` パラメータで全チャネル横断適用。層別＝TOFU に number/counter/conclusion・現受験生に howto/reason・公務員に experience/conclusion。
- **リパーパス**（`sns-repurpose-policy.md`）: 同一コアを6切り口でチャネル別に展開。X は §5.5、IG/YT は各 writer が参照。
- **画像規約**（`sns-image-policy.md`）＋**図版キャンバス**（`figure-canvas-policy.md`）＝雛形の視覚仕様。

### 型バックログ（競合調査 2026-07-04 で surface・未実装）

競合で伸びている型のうち現行カタログに無いもの。**policy への正式追加は別段（本 PR では surface のみ）**。真実源候補は 07_競合調査 SNS節。

- **聞き流し一問一答**（YouTube の空白型・日建学院で47k再生実測）→ DN-0110の通常動画pilot後に判断。16:9・反復コンテンツ検査が前提。
- **合格後キャリア・現場リアル リール**（IG 差別化・現場密着リールがバイラル実績・**運営者の一次情報素材待ち**）→ 合格体験者ポジションと接続。Red Line（一次情報は note 有料囲い込み）を守る。
- **お悩み相談回答**（技術士系 YT/X で定着）→ **2026-08-28 正式化（素材不要・既存資産で量産可）**。X は §10 のまま（宣伝なしのリプライ・エージェント化しない・人が担う）。IG リールは**新規モード不要**——§7 角度駆動リールの `counter`（反論）角度が「よくある誤解に答える」構造そのものなので、source を記事の `content-authoring.md` frontmatter `faqs`（Q&A形式で既に全記事に存在）に広げれば表現できる。writer（`ig-reels-writer`）・レンダラ（`angle-reel-create.mjs`）の追加実装は無し。詳細 → [ig-reels-policy.md §7](../../.claude/knowledge/reference/ig-reels-policy.md)。

> 使い方: 「この型を量産したい」→ 本表で雛形とスキルを引く／「新しい角度で展開したい」→ 6切り口レイヤー／「competitor に無い型か」→ 型バックログ。件数・台帳の真実源は §2・§5。
