---
title: .claude/knowledge/reference/ 索引
---

# .claude/knowledge/reference/ 索引

プロジェクトの指示は 3 層で分担する。**CLAUDE.md**＝常時読み込みの核（≤150 行。目的・ディレクトリ・12 原則・主要文書の短い索引）／**`.claude/rules/*.md`**＝`paths:` frontmatter を持つパス条件付き規約（該当ファイルを Read/Edit したときだけ載る）／**このディレクトリ**＝作業時に都度 Read する作業マニュアル。**索引の真実源はこのファイル**（2026-09-08 に CLAUDE.md「リファレンス索引」からここへ移設）。

## ファイル一覧（.claude/knowledge/）

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [commands.md](./commands.md) | 頻用コマンド全一覧（用途別・各コマンドの理由と罠。CLAUDE.md から移設） | `npm run` で何を叩くか探すとき／新 script を package.json に足したとき |
| [.claude/knowledge/reference/content-authoring.md](./content-authoring.md) | MDX コンポーネント・過去問構造・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき |
| [.claude/knowledge/reference/reference-sources-policy.md](./reference-sources-policy.md) | 参考文献6区分の逐語・図・文字起こし公開・出典粒度と、原本→Drive文字起こし→記事 `sources` ID→検査のライフサイクル SSOT | 原本・一次資料から文字起こしや記事を作るとき／参考文献を追加・変更するとき |
| [.claude/knowledge/reference/docs-markdown-style.md](./docs-markdown-style.md) | docs/ 配下 .md ドキュメントの Obsidian callout（`> [!note]` 等）運用ルール・MDX `<Callout>` との対比・推奨 4 タイプ | docs/handoffs/ / docs/{領域}/ / .claude/knowledge/reference/ の .md を書くとき |
| [.claude/knowledge/reference/image-policy.md](./image-policy.md) | 図版種別判定フロー・CC/PD 写真ソース・出典表記・写真 SVG 化禁止ルール | 図/写真を追加・置換するとき |
| [.claude/knowledge/reference/brand-image-system.md](./brand-image-system.md) | 資格別ブランド写真プールの多フォーマット展開＋サイト色スキーム統一の SSOT（wide/square の2マスター→hero/OGP/note カバー/カード/300×250 バナーへクロップ展開・色ターゲット・Codex 生成プロンプト・生成→保存→反映パイプライン） | hero/OGP/note カバー/カード/広告バナーの背景写真を新規作成・差替・統一するとき |
| [.claude/knowledge/reference/note-svg-policy.md](./note-svg-policy.md) | note 記事用 図解 SVG/PNG ポリシー（キャンバス・最小フォント・余白・密度上限・失敗パターン） | `content/note/**/img/figure-*` を作成・修正するとき |
| [.claude/knowledge/reference/figure-canvas-policy.md](./figure-canvas-policy.md) | サイト図版 `figure-*.svg` の固定キャンバス標準（feed 4:5 `400×500`／landscape 16:9 `640×360` `--wide`・概念名タイトル禁止・記事+SNS両用）。機械可読は `.claude/config/figure-canvas.json`、ガード `check-figure-canvas`、整形 `svg-canvas-fitter`、カタログ生成 `build-svg-catalog`（fitStatus の真実源）、SNS 書き出し `render-figure-sns` | `figure-*.svg` を新規作成・移行・SNS 書き出しするとき |
| [.claude/knowledge/reference/note-publish-enhancement.md](./note-publish-enhancement.md) | note 記事を公開レベルに引き上げる10工程手順書（網羅性照合／過去問配置／図版／カバー／e-gov リンク／段落分割／検証） | note 記事を新規公開・大規模改善するとき |
| [.claude/knowledge/reference/note-api-verification.md](./note-api-verification.md) | note 公開状態の照合（`npm run verify-note-magazines`）。public API でマガジン一覧・収録記事を取得し note-magazines.ts と突合。会社PCプロキシの `curl --ssl-no-revoke` 回避策・note API エンドポイント・Playwright フォールバック | note 公開状態を SoT と突合・価格/配線ドリフトを検出するとき |
| [.claude/knowledge/reference/note-essay-review-checklist.md](./note-essay-review-checklist.md) | note 模範論文（総監記述式）レビュー手順書（字数→散文性→監理可能性→専門度→白書根拠の9ステップ、各施策600字以内が最優先） | 模範論文／R8予想問題集を新規・改修するとき |
| [.claude/knowledge/reference/note-funnel-architecture.md](./note-funnel-architecture.md) | note 導線（ファネル）の資格別 3 層モデル（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）・原則・見直しサイクルの SSOT。機械可読は `.claude/config/note-funnel.json`、監査は `audit-note-funnel` スキル／`check-note-funnel` CI／`note-funnel-auditor` エージェント | note 記事・マガジンの回遊/購入導線を設計・見直し・新規 L2 もくじを追加するとき |
| [.claude/knowledge/reference/note-selling-structures.md](./note-selling-structures.md) | note 記事**内部**の構成テンプレ（売れる9型＝悩み直撃/勘違い破壊/Before→After/失敗談→教訓/ロードマップ/チェックリスト/比較/ケーススタディ/販売導線）＋5ステップ骨格＋資格・記事タイプ別かき分け早見表。資格横断で共通。funnel（記事**間**導線）とは直交 | note 記事の導入・無料部分・販売導線を設計するとき／note 執筆 Generator が記事タイプに合う型を選ぶとき |
| [.claude/knowledge/reference/sns-image-policy.md](./sns-image-policy.md) | SNS 投稿画像ポリシー（IG/X/Shorts のキャンバス・スワイプ方向・記号統一・wrap 算法・長文選択肢自動切替） | `content/sns/{instagram,x,youtube}/` 配下の画像を作成・修正するとき |
| [.claude/knowledge/reference/sns-archive-policy.md](./sns-archive-policy.md) | SNS バイナリ（reels wav/mp4・YouTube Shorts mp4）の退避運用。SoT/生成物の切り分け・3層モデル・置き場は Google Drive vault `制作物/SNS音声動画/`（`drive-vault-sync --group sns-archived-media`。2026-09-05 DN-0170 で旧 `upload-sns-r2`＝public R2 系統を廃止）・`sns-archive-auditor` の判定 | content/sns のバイナリで容量が圧迫されたとき・投稿済みパックを退避するとき |
| [.claude/knowledge/reference/asset-storage-policy.md](./asset-storage-policy.md) | アセット置き場の SSOT（**誰が使うかで決める 3 行ルール**＝サイトが配信→public R2／GitHub Actions が読み書き→private R2／人か手元のスクリプトだけ→Google Drive vault。各 group の行き先表・Drive vault の 4 フォルダ・端末初期設定・R2→Drive 移行の必須順序〔dry-run→commit→`--verify --cloud`→R2 削除→forget〕・退避後に壊れる読み手の直し方・cover PNG が byte 再現できない実測）。機械可読は R2 側 `.claude/config/asset-storage.json`（台帳 `manifest.json`）と Drive 側 `.claude/config/drive-vault.json`（台帳 `drive-manifest.json`）。迷ったら `/asset-route` | 新しい端末を用意するとき・画像/PDF が手元に無いとき・アセットを新規追加したとき・退避対象を読むコードを書くとき |
| [.claude/knowledge/reference/links-hub.md](./links-hub.md) | `/links` SNS bio 用リンクハブの設計・UTM 設計・メンテ手順・KPI（Linktree 代替の自前実装） | `/links` 新 商品追加・Featured 切替・SNS bio リンク変更時 |
| [.claude/knowledge/reference/sns-repurpose-policy.md](./sns-repurpose-policy.md) | 全 SNS チャネル共通の6切り口リパーパス戦略（結論/理由/体験/反論/数字/ハウツー）。チャネル別適用方法・`angle` パラメータ仕様 | SNS 投稿のネタ展開・複数切り口生成時 |
| [.claude/knowledge/reference/ig-carousel-skill.md](./ig-carousel-skill.md) | IG カルーセル 2 シリーズ運用（A: 択一クイズパック・運営者作問 / B: 過去問パック・H21-R7 全 640 問）・5 管理別色テーマ・slide-data.json スキーマ・配信ロードマップ | IG カルーセル投稿準備・パック編集・SoT 再生成時 |
| [.claude/knowledge/reference/ig-publish-reconcile.md](./ig-publish-reconcile.md) | IG 公開状態の照合＋未公開の予約投稿の運用 SSOT（アカウント `@dobokunotecom` の `.claude/config/ig-account.json`・posted.json/status.json 3 スキーマ・ドリフト 7 分類・プランナー月チップ読取・週次配線・develop worktree 手順）。`verify-ig-status`→`ig-reconcile` スキル→`ig-publish-auditor` で運用 | IG 投稿の公開状態を確認・SoT ドリフト是正・未公開を予約するとき |
| [.claude/knowledge/reference/ig-reels-policy.md](./ig-reels-policy.md) | IG Reels の `reels/script.json` スキーマ・キャプション/ハッシュタグルール・5 軸ルーブリック・Reels モード分岐の禁忌（カルーセル流用 CTA 禁止）。戦略 v7 で新設 | IG Reels 台本作成・採点・YT 派生時 |
| [.claude/knowledge/reference/character-asset-policy.md](./character-asset-policy.md) | ブランドマスコット「doboku-note 先生」素材ライブラリ運用 SSOT（アイデンティティ＝CHARACTER-SPEC.md／ポーズ機械可読＝`.claude/config/character-poses.json`／生成→抽出 `npm run character-extract`／チャネル別使用）。エージェントは作らず manifest＋スクリプトで管理 | キャラ素材を追加・抽出・SNS/リールで使うとき |
| [.claude/knowledge/reference/ig-stories-policy.md](./ig-stories-policy.md) | IG Stories の 4 枚連投・stories/caption.txt + note.md スキーマ・3 軸ルーブリック（コピー力／リンク導線／ステッカー双方向性）・ハイライト戦略。戦略 v7 で新設 | IG Stories キュレーション・採点・ハイライト整備時 |
| [.claude/knowledge/reference/yt-shorts-publisher-policy.md](./yt-shorts-publisher-policy.md) | YouTube Shorts（IG Reels 派生 mp4 + meta.json）の 4 軸ルーブリック・UTM 必須要素・タイトル/概要欄テンプレ。戦略 v7 で新設、yt-shorts-create --from-reels と対応 | YT Shorts 派生生成後の品質採点・概要欄テンプレ確認時 |
| [.claude/knowledge/reference/ig-highlight-design-policy.md](./ig-highlight-design-policy.md) | IG ハイライト（highlights/NN_*）モダンシック意匠の slide-data.json スキーマ・6 種パレット/アイコン・タイポ階層 4 段・4 軸ルーブリック。戦略 v7.1 で新設 | IG ハイライト Stories 設計・採点・新ハイライト追加時 |
| [.claude/knowledge/reference/x-post-policy.md](./x-post-policy.md) | X(旧Twitter)投稿の多資格運用ポリシー（280 weighted 文字数・試験別ベースタグ/テンプレ・投稿型・5 軸ルーブリック・偽成功検証・create-x-card 試験別色）。`x-post-writer`/`x-post-qa` の真実源 | X 投稿執筆・採点・多資格展開・create-x-card 改修時 |
| [.claude/knowledge/reference/content-angle-policy.md](./content-angle-policy.md) | SNS コンテンツ角度の真実源（6 切り口=結論/理由/体験/反論/数字/ハウツー・既存 note/サイト資産マッピング・`angle` パラメータ分業設計・層別優先・Red Line・パイロット計画）。各 SNS Generator/Evaluator が共通参照 | 過去問以外の角度で SNS 投稿を企画・執筆・採点するとき／既存 note 記事を多媒体展開するとき |
| [.claude/knowledge/reference/exam-content-policy.md](./exam-content-policy.md) | 試験別コンテンツ整備方針＋コンテンツ別レビュー視点＋新資格追加手順 | PDF→MDX 変換・品質レビュー時 |
| [.claude/knowledge/reference/skills-guide.md](./skills-guide.md) | アクティブスキル カテゴリ別早引き＋用途別ガイド（今やること別スキル推奨組み合わせ） | 使えるスキルを素早く探すとき |
| [.claude/knowledge/reference/skills-registry.md](./skills-registry.md) | スキルのガバナンス記録（退役ログ・カテゴリ変更履歴・テンプレート駆動設計） | 退役スキル確認・設計変更履歴・新スキル重複チェック |
| [.claude/knowledge/reference/agents-registry.md](./agents-registry.md) | エージェント詳細表＋スキル→エージェント呼出マップ＋Generator/Evaluator 分離原則 | サブエージェント呼出時の担当範囲確認・連携設計時 |
| [.claude/knowledge/reference/skills-design-guide.md](./skills-design-guide.md) | Skills 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） | 新規スキル・エージェント作成時 / 既存 description レビュー時 |
| [.claude/knowledge/reference/workflows.md](./workflows.md) | 週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・ブランチ詳細・Phase 別ロードマップ | 週次 PDCA・変換作業・ブランチ運用詳細確認時 |
| [.claude/knowledge/reference/information-architecture.md](./information-architecture.md) | Knowledge-first 配置モデル（knowledge / runtime / capability / agent content / docs content）・判断フロー。GitHub Issue 廃止の真実源 | 新しい情報の置き場に迷うとき・CI/スキル/ドキュメント設計時 |
| [.claude/knowledge/reference/measurement-incidents.md](./measurement-incidents.md) | 計測データの欠損・誤報・不整合 + 外部検証アクセスの罠（2026-W16 BAILOUT、2026-04-25 Cloudflare Bot 等）+ **計測は CI/CD 供給が正・ローカル creds 不要の恒久ルール（2026-06-05）** + **PSI は field(CrUX)で実害判定・lab は診断／単発 lab 値で CRITICAL を立てない恒久ルール（2026-07-27）** | 計測スキル/エージェント設計時・外部 Validator/ボットを使う作業時・**計測やAPIをローカルで叩こうとするとき（会社 PC はプロキシで外部 API 遮断）**・**PSI/CWV の重大度を判断するとき** |
| [.claude/knowledge/reference/gsc-management.md](./gsc-management.md) | GSC 継続管理 SSOT（index coverage / performance / hygiene の分業表・閾値・cadence・判断マトリクス・観測/判断ログ）。coverage=`gsc-index-auditor`＋月次 `/gsc-review`＋CI `index-coverage.yml`、performance=`metrics-analyzer`＋週次 `/weekly-improve` | サイトのインデックス率/検索流入を診断・継続管理するとき・GSC 系スキル/エージェント設計時 |
| [.claude/knowledge/reference/data-storage-decision.md](./data-storage-decision.md) | データストレージ判断 ADR（D1 不採用・frontmatter + build-time JSON 継続・再検討トリガー条件） | DB 導入を検討するとき／iOS アプリ着手時／コンテンツ規模が大きく変わるとき |
| [.claude/knowledge/reference/book-list.md](./book-list.md) | Amazonアソシエイト紹介書籍リスト（手動キュレーション記録）。**書籍アフィリは2026-06-25完全廃止＝参考用の歴史資料** | 過去の書誌キュレーションを参照するとき（書籍アフィリ自体は廃止済み） |
| [.claude/knowledge/reference/affiliate-operations.md](./affiliate-operations.md) | アフィリエイト運用 SSOT（3 ASP 横断＝A8/もしも/afb）。収益方針（転職一本・講座/教材/書籍は Red Line）・**サイト帰属の罠**（3 ASP とも doboku-note と stats47 が同一口座に同居し afb は既定 stats47。判定は `scripts/lib/asp-site-guard.mjs` に集約し**不一致は例外で停止**）・ASP 別のクセ・カタログスキーマ・運用フロー・配置ポリシー・計測ラベル規約・整合ゲート。機械可読は `.claude/state/ads/affiliate-catalog.json` と `.claude/config/affiliate-asp.json`、運用は `/affiliate-status`・`/affiliate-apply`・`affiliate-operator` | 提携状態を確認・提携申請・ASP を跨いで比較・アフィリの配置方針を決めるとき |
| [.claude/knowledge/reference/coconala-operations.md](./coconala-operations.md) | ココナラ運用 SSOT（受注フロー・**KPI 週次＝分析画面を read-only 自動取得** `npm run coconala-analytics`〔2026-08-17 に「手動貼付が正」を撤回・§4〕・スキーマ〔カタログ `src/lib/coconala-services.ts`／`.claude/state/coconala/{orders-log,orders-snapshot,kpi-log}.json`〕・安全弁〔捏造NG・外部誘導NG・**返信送信は運営者**〕・**受注とDMの実体収集** `npm run coconala-orders`→突合 `check-coconala-orders`・**休止/再開/アーカイブ** `npm run coconala-pause`〔`paused` は `pauseReason` で恒久廃止 retired と不在 absence を区別〕・ドリフト検知 `npm run check-coconala-wiring`）。`/coconala-order`→受注E2E、`/coconala-status`→KPI照合、`coconala-operator` で運用。戦略・出品文面は `content/note/1級・2級土木/ココナラ展開キット.md` | ココナラの受注処理・KPI 記録・出品状態の変更・スキーマを触るとき |
| [.claude/knowledge/reference/brain-operations.md](./brain-operations.md) | Brain 運用 SSOT（商品カタログ `src/lib/brain-products.ts`・listings・配布 ZIP→R2 経路・出品自動化 `scripts/brain-publish.mjs`〔draft-first＋--commit・同意モーダルは--agree gate〕・審査後 status flip・Brain UI のクセ・ドリフト検知 `npm run check-brain-wiring`）。`/brain-publish`＋`brain-operator` で運用。商品企画・検証は `docs/products/brain-*/` | Brain へ出品・修正・審査結果反映・新商品配線・配布 ZIP 更新のとき |
| [.claude/knowledge/reference/sales-tracking.md](./sales-tracking.md) | note 売上管理 SSOT（販売履歴・productId 命名規則・月次集計・運用フロー）。手動転記→`/record-sales`→`sales-recorder` で正規化→`.claude/state/sales/sales-log.json` | 販売履歴を記録・集計するとき、新商品の productId を追加するとき |
| [.claude/knowledge/reference/notebooklm-cli-gotchas.md](./notebooklm-cli-gotchas.md) | notebooklm CLI（Python v0.3.4）の挙動クセ集（venv exe で proxy 通らず 503・list で exit 1 false-positive・全角括弧の cmd.exe 解析破綻・source add --title 無効化 等） | notebooklm を呼ぶ新規スクリプト・skill 設計時／既存 wrapper の挙動確認時 |
| [.claude/knowledge/reference/content-principles.md](./content-principles.md) | コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種使い分け等） | キーワードページ執筆・評価時 |
| [.claude/knowledge/design-system/design-system.md](../design-system/design-system.md) | サイト UI・記事タイポグラフィのデザイン**単一 SSOT**（トークン体系・レイアウト体系 PageShell/PageHeader/SectionCard・記事 prose・5 原則・禁止パターン・更新手順）。トークン値の真実源は `src/styles/globals.css`（editorial `--accent/--paper/--ink/--rule`＝ページ/prose、`--color-*`＝SVG 図版＋Tailwind semantic の二系統） | コンポーネント作成・ページ改修・SVG 図版作成・色選定時 |
| [video-content-policy.md](./video-content-policy.md) | 動画パックのSSOT境界・schema・状態・Generator/Evaluator責務・機械ゲート・公開契約 | YouTube通常動画を核にShorts/IG/Xへ派生するとき、動画管理画面・スキル・エージェントを実装するとき |

### 上の表に無いファイル

索引を書き漏らしたまま増えたもの。行を書けるものから上の表へ移す。

- [a8-affiliate-pipeline.md](./a8-affiliate-pipeline.md) — a8-affiliate-pipeline.md
- [article-structure-guide.md](./article-structure-guide.md) — 記事構成ガイド（civil ガイド記事）
- [author-authority-banner.md](./author-authority-banner.md) — 著者オーソリティ 汎用バナー 運用ポリシー
- [ci-cd-security-hardening.md](./ci-cd-security-hardening.md) — ci-cd-security-hardening.md
- [coconala-blog-policy.md](./coconala-blog-policy.md) — coconala-blog-policy.md
- [codex-division-of-labor.md](./codex-division-of-labor.md) — codex-division-of-labor.md
- [content-lifecycle.md](./content-lifecycle.md) — コンテンツ ライフサイクル（全チャネル共通ステージ）
- [figure-provenance.md](./figure-provenance.md) — 図 provenance システム（出所・品質・次アクションの恒久記録）
- [ig-carousel-policy.md](./ig-carousel-policy.md) — ig-carousel-policy.md
- [implementation-handoff.md](./implementation-handoff.md) — implementation-handoff.md
- [ogp-prompts.md](./ogp-prompts.md) — OGP デザインリファレンス
- [pe-cem-pass-rate-history.md](./pe-cem-pass-rate-history.md) — 技術士第二次試験 総合技術監理部門 年度別合格率（H26-R7）
- [pe-cem-school-prices.md](./pe-cem-school-prices.md) — 技術士総監 主要スクール価格（2026年5月時点）
- [pe-exam-by-division.md](./pe-exam-by-division.md) — 技術士第二次試験 技術部門別 受験者数・合格率（R6最終 / R7筆記）
- [playwright-auth-profiles.md](./playwright-auth-profiles.md) — playwright-auth-profiles.md
- [reference-sites.md](./reference-sites.md) — reference-sites.md
- [textbook-pdf-archive.md](./textbook-pdf-archive.md) — textbook-pdf-archive.md
- [todo-lifecycle.md](./todo-lifecycle.md) — todo-lifecycle.md
- [todo-standards.md](./todo-standards.md) — todo-standards.md
- [yt-shorts-script-policy.md](./yt-shorts-script-policy.md) — yt-shorts-script-policy.md

## reference 以外の入口

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [docs/operations/gsc-ga4-playwright-automation-spec.md](../../../docs/operations/gsc-ga4-playwright-automation-spec.md) | GSC/GA4 Playwright UI CSV 取得＋既存 API 突合＋URL 分類の実装指示書（真実源）。`/google-search-growth`（`gsc-browser-collector`/`gsc-csv-auditor`/`seo-fix-planner`）・`scripts/{google-console-login,fetch-gsc-ui-csv,fetch-ga4-ui-csv,normalize-google-console-csv,report-search-growth}.mjs`・設定 `.claude/config/google-console-automation.json`。ローカル専用・approval gate・自動変更は内部リンク旧 URL 修正のみ | GSC UI CSV を Playwright で取得・正規化・突合して修正計画を作るとき／`/google-search-growth` 系を改修するとき |
| [docs/design/callout-gallery.md](../../../docs/design/callout-gallery.md) | Callout 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）。GitHub 画面で視覚確認可能 | MDX で `<Callout type="...">` を選ぶとき |
| [docs/design/speclist-gallery.md](../../../docs/design/speclist-gallery.md) | SpecSheetList 5 バリエーションの視覚ギャラリー（ordered / unordered × dot/dash/square） | MDX で `<SpecSheetList>` を選ぶとき |
| [src/components/ui/Callout/README.md](../../../src/components/ui/Callout/README.md) | Callout コンポーネント直下リファレンス（12 種一覧表・デザイン仕様・旧 type 移行表） | Callout を実装・改修・MDX で使うとき |
| [src/components/ui/SpecSheetList/README.md](../../../src/components/ui/SpecSheetList/README.md) | SpecSheetList コンポーネント直下リファレンス（仕様書調リスト、旧 CustomList 統合） | SpecSheetList を実装・改修・MDX で使うとき |
| [tools/admin-app/README.md](../../../tools/admin-app/README.md) | 運営管理画面（ローカル専用・Next.js 版）の起動・タブ構成・設計方針。`npm run admin` で `http://127.0.0.1:3021`。計測（GA4/GSC/PSI）・エージェント/スキル・画像ギャラリー（OGP/記事図版/note/SNS）・SNS状態板・記事/note/マガジン一覧・売上・品質・投稿ジョブ・**TODO（.claude/todo 統合ビュー）**を1画面で。RSC ファースト・ルート node_modules 再利用・**ビルド/デプロイなし・dev モード専用**。投稿は既存 CLI を child_process 実行しガードは CLI 側に残す（旧 zero-dep 版 tools/admin は 2026-07-16 退役） | 管理画面を起動・改修するとき／計測・SNS・画像・売上・品質・TODO を目視管理するとき |
| `.claude/config/` | ツール設定（OGP テンプレ/ルール/改行設定、PSI しきい値・URL リスト等、エージェント編集領域） | OGP・PSI・自動化ツールのルール・閾値を調整するとき |
| [docs/strategy/README.md](../../../docs/strategy/README.md) | 戦略の入口・索引（トピック軸＝何の戦略か × 資格軸＝どの資格か の2軸ナビ、横断戦略 ↔ 各 noteコンテンツ計画.md の相互リンク） | 「この戦略はどこ？」と迷ったとき・各資格の戦略入口を辿るとき |
| `docs/strategy/01_プロダクト戦略.md` | 5問フレームワーク（顧客・問題・解決策・体験・成功指標）の one-page 北極星文書。全戦略の出発点 | 戦略の全体像を把握したいとき・意思決定の根拠を確認するとき |
| `docs/strategy/03_事業戦略.md` | v3 事業戦略 | 収益化・差別化戦略の確認時 |
| `docs/strategy/04_収益化戦略.md` | 収益化戦略（v3＋v8 注記）。note 個別価格・リリース計画の真実源は各試験の noteコンテンツ計画.md へ移譲済み | note・YouTube・PWA/iOS アプリ戦略検討時 |
| `docs/marketing/01_SNS集客戦略.md` | SNS 集客戦略 v7（Instagram を一次制作チャネルに格上げ・YouTube Shorts は IG Reels mp4 の二次展開に再定義、X＝合格者発信の信頼／note 誘導動線。X 凍結対応は x-post-policy §11、総監 YT は 05 が独立 SSOT。全体像は 00_SNS整理マップ.md） | SNS 投稿設計・YouTube/Instagram 自動化検討時 |
| `content/note/README.md` | note 記事 SSOT 索引（試験別構造・戦略 SSOT 体系）。戦略・Red Line・価格企画の真実源は各試験の noteコンテンツ計画.md（`技術士総監/`・`技術士建設部門/`・`1級・2級土木/`）、実価格・noteUrl は `src/lib/note-magazines.ts` | note コンテンツ発売・受験期コンテンツ設計時 |
| `docs/marketing/02_チャネル動線設計.md` | 5 チャネル動線設計 v2（X / YouTube / Instagram / note / サイトの統合ファネル設計、UTM 統一フォーマット、季節 × チャネルマトリクス、4 Phase 実装ロードマップ） | チャネル間動線・UTM 設計・季節調整検討時、note ↔ サイト境界ルール確認時 |

## 読み方の原則

1. **CLAUDE.md は判断の土台** — プロジェクトの目的・URL 設計・必須ルール・12 原則（§5 ハーネス設計原則を含む）。細部はここと `.claude/rules/` に置く
2. **このディレクトリは作業時に都度 Read** — 毎ターンは読まれない。該当スキル実行時や具体的な手順確認時にだけ読み込む
3. **重複を避ける** — 同じ情報を CLAUDE.md・rules・reference に二重に置かない。CLAUDE.md と rules には「参照先」のみ記載し、実体はこちら

## 更新ルール

- **新スキル追加時** → `skills-registry.md` と `skills-guide.md` を更新、必要なら `workflows.md` も
- **新エージェント追加時** → `agents-registry.md`「エージェント一覧」を更新（CLAUDE.md に per-agent の表は無い。model の既定は CLAUDE.md §5）
- **新資格追加時** → `exam-content-policy.md` の整備方針差分表・レビュー視点表の両方に列を追加
- **コンテンツ品質ルール変更時** → `.claude/knowledge/reference/content-principles.md`（真実源）をまず更新し、`content-authoring.md` は参照として揃える
- **このディレクトリに .md を足したとき** → 上の「ファイル一覧」に行を足す。CLAUDE.md の索引には足さない（毎ターン読む必要がある主要文書だけ例外）

## CLAUDE.md との関係

CLAUDE.md「リファレンス索引」は主要文書の短い表と、このファイル・`docs/README.md`・`.claude/rules/` への入口だけを持つ。逆参照はこのファイルを参照先として使うこと。

## frontmatter スキーマ

`.claude/knowledge/reference/*.md` には YAML frontmatter を必ず付与する。Obsidian の Front Matter Title プラグインがこの `title:` を読み、ファイルツリー・タブ・グラフ・検索の表示名を日本語化する。

### 必須フィールド

| フィールド | 必須 | 用途 | 例 |
|---|---|---|---|
| `title` | ✅ | Obsidian 表示名、将来の HTML `<title>` 等 | `紹介書籍リスト（Amazonアソシエイト用）` |

### 拡張フィールド候補（任意）

将来必要に応じて追加可能。最小限の `title:` だけで開始し、必要が出てきた時点でフィールドを増やす方針:

| フィールド | 用途 | 例 |
|---|---|---|
| `description` | サマリ（ファイル一覧ページや SeeAlso 生成用） | `Amazonアソシエイト用の紹介書籍台帳` |
| `tags` | Obsidian タグ・横断検索 | `[reference, monetization]` |
| `updated` | 最終更新日（手動運用 or pre-commit 自動化） | `2026-05-19` |
| `aliases` | Obsidian エイリアス（短縮表記検索） | `[書籍リスト]` |
| `owner` | 担当エージェント・担当者 | `strategy-advisor` |

### フォールバック

プラグイン設定:
- **main**: `title`（frontmatter から取得）
- **fallback**: `#heading`（無い場合は H1 を使う）

つまり H1 が日本語で存在すれば、frontmatter が無いファイルも日本語表示される。ただし新規作成時は **必ず frontmatter 付与** が原則（明示性・将来拡張性のため）。

### 新規 .md 作成時のテンプレ

```markdown
---
title: ドキュメントタイトル
---

# ドキュメントタイトル

本文...
```

H1 と `title:` を二重管理する必要があるのは煩雑だが、両者の役割が異なる:
- `title:` → ツール（Obsidian / 将来の Linter / 集計スクリプト）が読む
- `# H1` → 人間が GitHub やテキストエディタで開いたときに見る
- 値が一致している限り問題なし。差別化したい場合（例: ファイルツリーは短く、本文H1はフル）は意図的に変えてOK

