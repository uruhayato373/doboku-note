# doboku-note - 土木・建設系試験対策ハブ

土木・建設系の実務資格受験者向け試験対策サイト。現在は1級土木施工管理技士と技術士（総合技術監理部門）を整備中。Next.js + MDX + Cloudflare Pages で構築。

## プロジェクトコンテキスト

**設計思想** — ユーザーが「ここだけで合格できる」体験を軸資格ごとに提供する試験対策ハブ。Obsidian（ステージング）→ doboku-note（プロダクション）→ PWA 過去問演習アプリ（資格別 PWA × 共通エンジン、過去問演習は iOS から移管）の流れでコンテンツを管理。収益モデルは AdSense + note 有料記事 + YouTube + PWA 過去問アプリ。詳細: `docs/project/01_戦略/02_設計思想.md`、`docs/project/01_戦略/03_事業戦略.md`、`docs/project/05_プロダクト/06_PWA過去問アプリ設計方針.md`

**技術スタック**

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 + next-mdx-remote |
| 言語 | JavaScript (ESM), MDX |
| 数式 | KaTeX (remark-math + rehype-katex) |
| 図表 | SVG / PNG（R2 配信） |
| 検索 | Pagefind (ビルド時 `out/pagefind` 生成・クライアントサイド全文検索) |
| 分析 | Google Analytics (gtag: G-8VXJ1RL1HG) |
| 広告 | Google AdSense (ca-pub-7995274743017484) |
| 画像配信 | Cloudflare R2 (`storage.doboku-note.com`) |
| ホスティング | Cloudflare Pages |
| CI/CD | GitHub Actions → Cloudflare Pages |

**ディレクトリ**

```
.local/r2/posts/               # すべてのコンテンツ（git 追跡下）
  civil-construction-1/        # 1級土木施工管理技士（Convention A: 個別ファイル名）
  pe-comprehensive-management/ # 技術士・総合技術監理（Convention B: article.mdx）
src/                           # コンポーネント・CSS・レイアウト
docs/project/                  # プロジェクト管理ドキュメント
.claude/knowledge/reference/             # 作業マニュアル（詳細・手順）
.claude/skills/                # スキル定義（件数の SSOT: skills-registry.md カテゴリ構造）
.claude/agents/                # サブエージェント定義（件数の SSOT: agents-registry.md 一覧表）
tools/admin-app/               # 運営管理画面 Next.js 版（ローカル専用・npm run admin・全タブ）
```

**URL**: すべて `/docs/{slug}` フラット。Convention A（個別ファイル名）と Convention B（`article.mdx`）が共存。新規コンテンツは Convention B 推奨。詳細・frontmatter テンプレ → [content-authoring.md](.claude/knowledge/reference/content-authoring.md)

**frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`

**デプロイ**: `main` push で GitHub Actions → Cloudflare Pages 自動デプロイ。`develop` → `main` は `/deploy` スキル経由でユーザーが判断。

**頻用コマンド**

```bash
npm run dev               # 開発サーバー（ポート 3020）
npm run build             # 本番ビルド
npm run serve             # ビルド結果プレビュー
npm run type-check        # TypeScript チェック
npm run refresh-indexes   # 静的インデックス再生成（backlinks + cross-exam + tags + pillar問題 + popular記事[GA4]）
npm run generate-webp     # png/jpg → webp 変換
npm run upload-images-r2  # 画像を R2 にアップロード
npm run upload-sns-r2     # SNS バイナリ(reels wav/mp4)を R2 へ退避（--purge-local でローカル削除）
npm run lint              # ESLint チェック（no-console: warn/error のみ許容）
npm run quality:audit     # コード・記事・画像/SVGの機械チェックを横断実行→.claude/state/quality/audit-latest.md（:ci でCI gate厳格版）
npm run pages:deploy      # Cloudflare Pages に手動デプロイ
npm run admin             # 運営管理画面 Next.js 版（ローカル専用・http://127.0.0.1:3021・計測/エージェント/スキル/ギャラリー/SNS状態/記事/売上/品質/ジョブ/TODO・tools/admin-app）
npm run google-console:login   # GSC/GA4 用 Chrome プロファイルを headed で開き人間ログイン（ローカル専用・/google-search-growth の前提）
npm run search-growth:report   # GSC UI 正規化 ∪ API データを URL 突合して修正計画を再生成（オフライン・approval gate）
```

---

## リファレンス索引

詳細・手順・一覧は `.claude/knowledge/reference/` 配下と `docs/project/` 配下の各ファイルを都度 Read する。

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [.claude/knowledge/reference/content-authoring.md](.claude/knowledge/reference/content-authoring.md) | MDX コンポーネント・過去問構造・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき |
| [.claude/knowledge/reference/docs-markdown-style.md](.claude/knowledge/reference/docs-markdown-style.md) | docs/ 配下 .md ドキュメントの Obsidian callout（`> [!note]` 等）運用ルール・MDX `<Callout>` との対比・推奨 4 タイプ | docs/handoffs/ / docs/project/ / .claude/knowledge/reference/ の .md を書くとき |
| [.claude/knowledge/reference/image-policy.md](.claude/knowledge/reference/image-policy.md) | 図版種別判定フロー・CC/PD 写真ソース・出典表記・写真 SVG 化禁止ルール | 図/写真を追加・置換するとき |
| [.claude/knowledge/reference/brand-image-system.md](.claude/knowledge/reference/brand-image-system.md) | 資格別ブランド写真プールの多フォーマット展開＋サイト色スキーム統一の SSOT（wide/square の2マスター→hero/OGP/note カバー/カード/300×250 バナーへクロップ展開・色ターゲット・Codex 生成プロンプト・生成→保存→反映パイプライン） | hero/OGP/note カバー/カード/広告バナーの背景写真を新規作成・差替・統一するとき |
| [.claude/knowledge/reference/note-svg-policy.md](.claude/knowledge/reference/note-svg-policy.md) | note 記事用 図解 SVG/PNG ポリシー（キャンバス・最小フォント・余白・密度上限・失敗パターン） | `docs/note/**/img/figure-*` を作成・修正するとき |
| [.claude/knowledge/reference/figure-canvas-policy.md](.claude/knowledge/reference/figure-canvas-policy.md) | サイト図版 `figure-*.svg` の固定キャンバス標準（feed 4:5 `400×500`／landscape 16:9 `640×360` `--wide`・概念名タイトル禁止・記事+SNS両用）。機械可読は `.claude/config/figure-canvas.json`、ガード `check-figure-canvas`、整形 `svg-canvas-fitter` | `figure-*.svg` を新規作成・移行・SNS 書き出しするとき |
| [.claude/knowledge/reference/note-publish-enhancement.md](.claude/knowledge/reference/note-publish-enhancement.md) | note 記事を公開レベルに引き上げる10工程手順書（網羅性照合／過去問配置／図版／カバー／e-gov リンク／段落分割／検証） | note 記事を新規公開・大規模改善するとき |
| [.claude/knowledge/reference/note-api-verification.md](.claude/knowledge/reference/note-api-verification.md) | note 公開状態の照合（`npm run verify-note-magazines`）。public API でマガジン一覧・収録記事を取得し note-magazines.ts と突合。会社PCプロキシの `curl --ssl-no-revoke` 回避策・note API エンドポイント・Playwright フォールバック | note 公開状態を SoT と突合・価格/配線ドリフトを検出するとき |
| [.claude/knowledge/reference/note-essay-review-checklist.md](.claude/knowledge/reference/note-essay-review-checklist.md) | note 模範論文（総監記述式）レビュー手順書（字数→散文性→監理可能性→専門度→白書根拠の9ステップ、各施策600字以内が最優先） | 模範論文／R8予想問題集を新規・改修するとき |
| [.claude/knowledge/reference/note-funnel-architecture.md](.claude/knowledge/reference/note-funnel-architecture.md) | note 導線（ファネル）の資格別 3 層モデル（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）・原則・見直しサイクルの SSOT。機械可読は `.claude/config/note-funnel.json`、監査は `audit-note-funnel` スキル／`check-note-funnel` CI／`note-funnel-auditor` エージェント | note 記事・マガジンの回遊/購入導線を設計・見直し・新規 L2 もくじを追加するとき |
| [.claude/knowledge/reference/note-selling-structures.md](.claude/knowledge/reference/note-selling-structures.md) | note 記事**内部**の構成テンプレ（売れる9型＝悩み直撃/勘違い破壊/Before→After/失敗談→教訓/ロードマップ/チェックリスト/比較/ケーススタディ/販売導線）＋5ステップ骨格＋資格・記事タイプ別かき分け早見表。資格横断で共通。funnel（記事**間**導線）とは直交 | note 記事の導入・無料部分・販売導線を設計するとき／note 執筆 Generator が記事タイプに合う型を選ぶとき |
| [.claude/knowledge/reference/sns-image-policy.md](.claude/knowledge/reference/sns-image-policy.md) | SNS 投稿画像ポリシー（IG/X/Shorts のキャンバス・スワイプ方向・記号統一・wrap 算法・長文選択肢自動切替） | `docs/sns/{instagram,x,youtube}/` 配下の画像を作成・修正するとき |
| [.claude/knowledge/reference/sns-archive-policy.md](.claude/knowledge/reference/sns-archive-policy.md) | SNS バイナリ（reels wav/mp4 等）の R2+GDrive ハイブリッド退避運用。SoT/生成物の切り分け・3層モデル・`npm run upload-sns-r2`（R2 へ退避、`--purge-local` は R2 検証後にのみローカル削除）・rclone mount でのブラウズ | docs/sns のバイナリで容量が圧迫されたとき・投稿済みパックを退避するとき |
| [.claude/knowledge/reference/links-hub.md](.claude/knowledge/reference/links-hub.md) | `/links` SNS bio 用リンクハブの設計・UTM 設計・メンテ手順・KPI（Linktree 代替の自前実装） | `/links` 新 商品追加・Featured 切替・SNS bio リンク変更時 |
| [.claude/knowledge/reference/sns-repurpose-policy.md](.claude/knowledge/reference/sns-repurpose-policy.md) | 全 SNS チャネル共通の6切り口リパーパス戦略（結論/理由/体験/反論/数字/ハウツー）。チャネル別適用方法・`angle` パラメータ仕様 | SNS 投稿のネタ展開・複数切り口生成時 |
| [.claude/knowledge/reference/ig-carousel-skill.md](.claude/knowledge/reference/ig-carousel-skill.md) | IG カルーセル 2 シリーズ運用（A: 択一クイズパック・運営者作問 / B: 過去問パック・H21-R7 全 640 問）・5 管理別色テーマ・slide-data.json スキーマ・配信ロードマップ | IG カルーセル投稿準備・パック編集・SoT 再生成時 |
| [.claude/knowledge/reference/ig-publish-reconcile.md](.claude/knowledge/reference/ig-publish-reconcile.md) | IG 公開状態の照合＋未公開の予約投稿の運用 SSOT（アカウント `@dobokunotecom` の `.claude/config/ig-account.json`・posted.json/status.json 3 スキーマ・ドリフト 7 分類・プランナー月チップ読取・週次配線・develop worktree 手順）。`verify-ig-status`→`ig-reconcile` スキル→`ig-publish-auditor` で運用 | IG 投稿の公開状態を確認・SoT ドリフト是正・未公開を予約するとき |
| [.claude/knowledge/reference/ig-reels-policy.md](.claude/knowledge/reference/ig-reels-policy.md) | IG Reels の `reels/script.json` スキーマ・キャプション/ハッシュタグルール・5 軸ルーブリック・Reels モード分岐の禁忌（カルーセル流用 CTA 禁止）。戦略 v7 で新設 | IG Reels 台本作成・採点・YT 派生時 |
| [.claude/knowledge/reference/character-asset-policy.md](.claude/knowledge/reference/character-asset-policy.md) | ブランドマスコット「doboku-note 先生」素材ライブラリ運用 SSOT（アイデンティティ＝CHARACTER-SPEC.md／ポーズ機械可読＝`.claude/config/character-poses.json`／生成→抽出 `npm run character-extract`／チャネル別使用）。エージェントは作らず manifest＋スクリプトで管理 | キャラ素材を追加・抽出・SNS/リールで使うとき |
| [.claude/knowledge/reference/ig-stories-policy.md](.claude/knowledge/reference/ig-stories-policy.md) | IG Stories の 4 枚連投・stories/caption.txt + note.md スキーマ・3 軸ルーブリック（コピー力／リンク導線／ステッカー双方向性）・ハイライト戦略。戦略 v7 で新設 | IG Stories キュレーション・採点・ハイライト整備時 |
| [.claude/knowledge/reference/yt-shorts-publisher-policy.md](.claude/knowledge/reference/yt-shorts-publisher-policy.md) | YouTube Shorts（IG Reels 派生 mp4 + meta.json）の 4 軸ルーブリック・UTM 必須要素・タイトル/概要欄テンプレ。戦略 v7 で新設、yt-shorts-create --from-reels と対応 | YT Shorts 派生生成後の品質採点・概要欄テンプレ確認時 |
| [.claude/knowledge/reference/ig-highlight-design-policy.md](.claude/knowledge/reference/ig-highlight-design-policy.md) | IG ハイライト（highlights/NN_*）モダンシック意匠の slide-data.json スキーマ・6 種パレット/アイコン・タイポ階層 4 段・4 軸ルーブリック。戦略 v7.1 で新設 | IG ハイライト Stories 設計・採点・新ハイライト追加時 |
| [.claude/knowledge/reference/x-post-policy.md](.claude/knowledge/reference/x-post-policy.md) | X(旧Twitter)投稿の多資格運用ポリシー（280 weighted 文字数・試験別ベースタグ/テンプレ・投稿型・5 軸ルーブリック・偽成功検証・create-x-card 試験別色）。`x-post-writer`/`x-post-qa` の真実源 | X 投稿執筆・採点・多資格展開・create-x-card 改修時 |
| [.claude/knowledge/reference/content-angle-policy.md](.claude/knowledge/reference/content-angle-policy.md) | SNS コンテンツ角度の真実源（6 切り口=結論/理由/体験/反論/数字/ハウツー・既存 note/サイト資産マッピング・`angle` パラメータ分業設計・層別優先・Red Line・パイロット計画）。各 SNS Generator/Evaluator が共通参照 | 過去問以外の角度で SNS 投稿を企画・執筆・採点するとき／既存 note 記事を多媒体展開するとき |
| [.claude/knowledge/reference/exam-content-policy.md](.claude/knowledge/reference/exam-content-policy.md) | 試験別コンテンツ整備方針＋コンテンツ別レビュー視点＋新資格追加手順 | PDF→MDX 変換・品質レビュー時 |
| [.claude/knowledge/reference/skills-guide.md](.claude/knowledge/reference/skills-guide.md) | アクティブスキル カテゴリ別早引き＋用途別ガイド（今やること別スキル推奨組み合わせ） | 使えるスキルを素早く探すとき |
| [.claude/knowledge/reference/skills-registry.md](.claude/knowledge/reference/skills-registry.md) | スキルのガバナンス記録（退役ログ・カテゴリ変更履歴・テンプレート駆動設計） | 退役スキル確認・設計変更履歴・新スキル重複チェック |
| [.claude/knowledge/reference/agents-registry.md](.claude/knowledge/reference/agents-registry.md) | エージェント詳細表＋スキル→エージェント呼出マップ＋Generator/Evaluator 分離原則 | サブエージェント呼出時の担当範囲確認・連携設計時 |
| [.claude/knowledge/reference/skills-design-guide.md](.claude/knowledge/reference/skills-design-guide.md) | Skills 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） | 新規スキル・エージェント作成時 / 既存 description レビュー時 |
| [.claude/knowledge/reference/workflows.md](.claude/knowledge/reference/workflows.md) | 週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・ブランチ詳細・Phase 別ロードマップ | 週次 PDCA・変換作業・ブランチ運用詳細確認時 |
| [.claude/knowledge/reference/information-architecture.md](.claude/knowledge/reference/information-architecture.md) | Knowledge-first 配置モデル（knowledge / runtime / capability / content）・判断フロー。GitHub Issue 廃止の真実源 | 新しい情報の置き場に迷うとき・CI/スキル/ドキュメント設計時 |
| [.claude/knowledge/reference/measurement-incidents.md](.claude/knowledge/reference/measurement-incidents.md) | 計測データの欠損・誤報・不整合 + 外部検証アクセスの罠（2026-W16 BAILOUT、2026-04-25 Cloudflare Bot 等）+ **計測は CI/CD 供給が正・ローカル creds 不要の恒久ルール（2026-06-05）** + **PSI は field(CrUX)で実害判定・lab は診断／単発 lab 値で CRITICAL を立てない恒久ルール（2026-07-27）** | 計測スキル/エージェント設計時・外部 Validator/ボットを使う作業時・**計測やAPIをローカルで叩こうとするとき（会社 PC はプロキシで外部 API 遮断）**・**PSI/CWV の重大度を判断するとき** |
| [.claude/knowledge/reference/gsc-management.md](.claude/knowledge/reference/gsc-management.md) | GSC 継続管理 SSOT（index coverage / performance / hygiene の分業表・閾値・cadence・判断マトリクス・観測/判断ログ）。coverage=`gsc-index-auditor`＋月次 `/gsc-review`＋CI `index-coverage.yml`、performance=`metrics-analyzer`＋週次 `/weekly-improve` | サイトのインデックス率/検索流入を診断・継続管理するとき・GSC 系スキル/エージェント設計時 |
| [docs/project/04_運営/gsc-ga4-playwright-automation-spec.md](docs/project/04_運営/gsc-ga4-playwright-automation-spec.md) | GSC/GA4 Playwright UI CSV 取得＋既存 API 突合＋URL 分類の実装指示書（真実源）。`/google-search-growth`（`gsc-browser-collector`/`gsc-csv-auditor`/`seo-fix-planner`）・`scripts/{google-console-login,fetch-gsc-ui-csv,fetch-ga4-ui-csv,normalize-google-console-csv,report-search-growth}.mjs`・設定 `.claude/config/google-console-automation.json`。ローカル専用・approval gate・自動変更は内部リンク旧 URL 修正のみ | GSC UI CSV を Playwright で取得・正規化・突合して修正計画を作るとき／`/google-search-growth` 系を改修するとき |
| [.claude/knowledge/reference/data-storage-decision.md](.claude/knowledge/reference/data-storage-decision.md) | データストレージ判断 ADR（D1 不採用・frontmatter + build-time JSON 継続・再検討トリガー条件） | DB 導入を検討するとき／iOS アプリ着手時／コンテンツ規模が大きく変わるとき |
| [.claude/knowledge/reference/book-list.md](.claude/knowledge/reference/book-list.md) | Amazonアソシエイト紹介書籍リスト（手動キュレーション記録）。**書籍アフィリは2026-06-25完全廃止＝参考用の歴史資料** | 過去の書誌キュレーションを参照するとき（書籍アフィリ自体は廃止済み） |
| [.claude/knowledge/reference/affiliate-operations.md](.claude/knowledge/reference/affiliate-operations.md) | アフィリエイト運用 SSOT（3 ASP 横断＝A8/もしも/afb）。収益方針（転職一本・講座/教材/書籍は Red Line）・**サイト帰属の罠**（3 ASP とも doboku-note と stats47 が同一口座に同居し afb は既定 stats47。判定は `scripts/lib/asp-site-guard.mjs` に集約し**不一致は例外で停止**）・ASP 別のクセ・カタログスキーマ・運用フロー・配置ポリシー・計測ラベル規約・整合ゲート。機械可読は `.claude/state/ads/affiliate-catalog.json` と `.claude/config/affiliate-asp.json`、運用は `/affiliate-status`・`/affiliate-apply`・`affiliate-operator` | 提携状態を確認・提携申請・ASP を跨いで比較・アフィリの配置方針を決めるとき |
| [.claude/knowledge/reference/coconala-operations.md](.claude/knowledge/reference/coconala-operations.md) | ココナラ運用 SSOT（受注フロー・KPI 週次・3スキーマ〔カタログ `src/lib/coconala-services.ts`／`.claude/state/coconala/{orders,kpi}-log.json`〕・安全弁〔代筆NG・外部誘導NG・実操作はユーザー〕・ドリフト検知 `npm run check-coconala-wiring`）。`/coconala-order`→受注E2E、`/coconala-status`→KPI照合、`coconala-operator` で運用。戦略・出品文面は `docs/note/1級・2級土木/ココナラ展開キット.md` | ココナラの受注処理・KPI 記録・出品状態の変更・スキーマを触るとき |
| [.claude/knowledge/reference/brain-operations.md](.claude/knowledge/reference/brain-operations.md) | Brain 運用 SSOT（商品カタログ `src/lib/brain-products.ts`・listings・配布 ZIP→R2 経路・出品自動化 `scripts/brain-publish.mjs`〔draft-first＋--commit・同意モーダルは--agree gate〕・審査後 status flip・Brain UI のクセ・ドリフト検知 `npm run check-brain-wiring`）。`/brain-publish`＋`brain-operator` で運用。商品企画・検証は `docs/project/05_プロダクト/brain-*/` | Brain へ出品・修正・審査結果反映・新商品配線・配布 ZIP 更新のとき |
| [.claude/knowledge/reference/sales-tracking.md](.claude/knowledge/reference/sales-tracking.md) | note 売上管理 SSOT（販売履歴・productId 命名規則・月次集計・運用フロー）。手動転記→`/record-sales`→`sales-recorder` で正規化→`.claude/state/sales/sales-log.json` | 販売履歴を記録・集計するとき、新商品の productId を追加するとき |
| [.claude/knowledge/reference/notebooklm-cli-gotchas.md](.claude/knowledge/reference/notebooklm-cli-gotchas.md) | notebooklm CLI（Python v0.3.4）の挙動クセ集（venv exe で proxy 通らず 503・list で exit 1 false-positive・全角括弧の cmd.exe 解析破綻・source add --title 無効化 等） | notebooklm を呼ぶ新規スクリプト・skill 設計時／既存 wrapper の挙動確認時 |
| [.claude/knowledge/reference/content-principles.md](.claude/knowledge/reference/content-principles.md) | コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種使い分け等） | キーワードページ執筆・評価時 |
| [.claude/knowledge/design-system/design-system.md](.claude/knowledge/design-system/design-system.md) | サイト UI・記事タイポグラフィのデザイン**単一 SSOT**（トークン体系・レイアウト体系 PageShell/PageHeader/SectionCard・記事 prose・5 原則・禁止パターン・更新手順）。トークン値の真実源は `src/styles/globals.css`（editorial `--accent/--paper/--ink/--rule`＝ページ/prose、`--color-*`＝SVG 図版＋Tailwind semantic の二系統） | コンポーネント作成・ページ改修・SVG 図版作成・色選定時 |
| [docs/ui/callout-gallery.md](docs/ui/callout-gallery.md) | Callout 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）。GitHub 画面で視覚確認可能 | MDX で `<Callout type="...">` を選ぶとき |
| [docs/ui/speclist-gallery.md](docs/ui/speclist-gallery.md) | SpecSheetList 5 バリエーションの視覚ギャラリー（ordered / unordered × dot/dash/square） | MDX で `<SpecSheetList>` を選ぶとき |
| [src/components/ui/Callout/README.md](src/components/ui/Callout/README.md) | Callout コンポーネント直下リファレンス（12 種一覧表・デザイン仕様・旧 type 移行表） | Callout を実装・改修・MDX で使うとき |
| [src/components/ui/SpecSheetList/README.md](src/components/ui/SpecSheetList/README.md) | SpecSheetList コンポーネント直下リファレンス（仕様書調リスト、旧 CustomList 統合） | SpecSheetList を実装・改修・MDX で使うとき |
| [tools/admin-app/README.md](tools/admin-app/README.md) | 運営管理画面（ローカル専用・Next.js 版）の起動・タブ構成・設計方針。`npm run admin` で `http://127.0.0.1:3021`。計測（GA4/GSC/PSI）・エージェント/スキル・画像ギャラリー（OGP/記事図版/note/SNS）・SNS状態板・記事/note/マガジン一覧・売上・品質・投稿ジョブ・**TODO（docs/todo 統合ビュー）**を1画面で。RSC ファースト・ルート node_modules 再利用・**ビルド/デプロイなし・dev モード専用**。投稿は既存 CLI を child_process 実行しガードは CLI 側に残す（旧 zero-dep 版 tools/admin は 2026-07-16 退役） | 管理画面を起動・改修するとき／計測・SNS・画像・売上・品質・TODO を目視管理するとき |
| `.claude/config/` | ツール設定（OGP テンプレ/ルール/改行設定、PSI しきい値・URL リスト等、エージェント編集領域） | OGP・PSI・自動化ツールのルール・閾値を調整するとき |
| [docs/project/01_戦略/README.md](docs/project/01_戦略/README.md) | 戦略の入口・索引（トピック軸＝何の戦略か × 資格軸＝どの資格か の2軸ナビ、横断戦略 ↔ 各 noteコンテンツ計画.md の相互リンク） | 「この戦略はどこ？」と迷ったとき・各資格の戦略入口を辿るとき |
| `docs/project/01_戦略/01_プロダクト戦略.md` | 5問フレームワーク（顧客・問題・解決策・体験・成功指標）の one-page 北極星文書。全戦略の出発点 | 戦略の全体像を把握したいとき・意思決定の根拠を確認するとき |
| `docs/project/01_戦略/03_事業戦略.md` | v3 事業戦略 | 収益化・差別化戦略の確認時 |
| `docs/project/01_戦略/04_収益化戦略.md` | 収益化戦略（v3＋v8 注記）。note 個別価格・リリース計画の真実源は各試験の noteコンテンツ計画.md へ移譲済み | note・YouTube・PWA/iOS アプリ戦略検討時 |
| `docs/project/03_SNS/01_SNS集客戦略.md` | SNS 集客戦略 v7（Instagram を一次制作チャネルに格上げ・YouTube Shorts は IG Reels mp4 の二次展開に再定義、X＝合格者発信の信頼／note 誘導動線。X 凍結対応は x-post-policy §11、総監 YT は 05 が独立 SSOT。全体像は 00_SNS整理マップ.md） | SNS 投稿設計・YouTube/Instagram 自動化検討時 |
| `docs/note/README.md` | note 記事 SSOT 索引（試験別構造・戦略 SSOT 体系）。戦略・Red Line・価格企画の真実源は各試験の noteコンテンツ計画.md（`技術士総監/`・`技術士建設部門/`・`1級・2級土木/`）、実価格・noteUrl は `src/lib/note-magazines.ts` | note コンテンツ発売・受験期コンテンツ設計時 |
| `docs/project/03_SNS/02_チャネル動線設計.md` | 5 チャネル動線設計 v2（X / YouTube / Instagram / note / サイトの統合ファネル設計、UTM 統一フォーマット、季節 × チャネルマトリクス、4 Phase 実装ロードマップ） | チャネル間動線・UTM 設計・季節調整検討時、note ↔ サイト境界ルール確認時 |

---

## 12 原則

> Karpathy's LLM coding habits — distilled for this project.

### 1. コードを書く前に考える

- **作業開始前に `git branch --show-current` でブランチ確認**。指示と異なれば作業を止めてユーザーに報告する（勝手に `git checkout` しない）
- **同時に origin との遅れ（behind）を確認**: `git fetch -q && git log --oneline main..origin/main | head`。複数セッション・worktree 常態 + CI が deploy で main に自動マージするため、ローカルが数十コミット遅れるのは高頻度（2026-06-11、43 コミット遅れの古いツリーで作業し既存作業を重複・劣化させた事故）。遅れていれば同期してから着手し、**古いベース上のコミットを push しない**（破壊的な reset/同期はユーザー確認後、独自コミットは退避ブランチで保全）。SessionStart フック `scripts/check-git-sync.mjs` が開幕で自動警告する
- **確認を挟むのは、解釈の違いで成果物が大きく変わるときだけ**（そのときは候補を提示してユーザーに選ばせる）。それ以外の細かい判断は自分で決めて最後まで進める。依頼に誤りがありそう・もっと良い方法があるときは一言だけ指摘してから、依頼どおりに実行する（勝手に範囲を狭めない・広げない・別のものに変えない）

### 2. シンプルさを最優先する

- 依頼されていない機能・抽象化・エラーハンドリングを足さない
- **絵文字禁止**（`<Callout type="...">` で表現）
- **数式**: KaTeX 一択（`$$...$$` / `$...$`）
- **表**: 2軸比較のみ、4列以上禁止。**見出し**: H2 以下のみ（H1 は frontmatter から自動生成）
- **ブランチ**: `develop` に蓄積、「1修正 = 1 PR」禁止。コード系のみ feature ブランチ + PR（base = `develop`）

### 3. 外科的に変更する

- 触るべき箇所だけ触る。頼まれていない周辺コード・コメントを「改善」しない
- **MDX 書き込みは `lib/mdx-io.mjs` の `writeMdxFile` 経由**（直接 `writeFileSync` は CRLF 混在を引き起こし pre-commit で reject される）
- **`git add` は変更したファイルだけ明示指定**（`git add -A` / `git add .` 禁止 — 並行エージェントの変更を巻き込む）
- コンテンツ編集: 1 記事の修正が完了したら **即 commit**
- 一時ファイル（スクショ・SVG 確認等）は `.tmp/` 配下に出す

### 4. ゴール駆動で実行する

- タスク着手前に「何が通れば完了か」を定義してから始める
- **MDX 変換**: `/verify-pdf-mdx` でルーブリック ≥ 2.0
- **UI/SSR 変更**: `curl` で `<main>` + 主要キーワード（土木/技術士）を確認
- **deploy 後**: `curl` で `doboku-note.pages.dev` の HTTP 200 + `<main>` タグを確認してから「完了」と報告
- **コンテンツ編集完了条件**: MDX 追加・変更後は `npm run refresh-indexes` を実行してからコミット（バックリンク・タグインデックスの不整合を防ぐ）
- **画像追加**: `generate-webp` → webp 参照で commit → R2 は `main` push 時に CI（`r2-sync.yml`）が自動同期（対象 path = `**/img/**` と `**/ogp.png|.webp`）
- **OGP 画像**: 新規記事・**新カテゴリは `npm run ogp`**（未生成のみ生成）で `ogp.png` を作り commit。忘れると `og:image` が R2 で 404 → note/X 等の外部リンクカードが生成されない（2026-06-12 pe-construction 全114本）。CI ゲート `npm run check-ogp-coverage`（`r2-audit.yml`）が published 記事の欠落を赤落ちで検知。**OGP デザインの真実源は [.claude/knowledge/reference/ogp-prompts.md](.claude/knowledge/reference/ogp-prompts.md)**（mono-tag 全幅＋資格別テーマ色外枠、2026-06-16〜）。一括再生成 `npm run ogp -- --all --force` 後の目視 QA は `npm run ogp-gallery`（全 OGP を 1 枚の HTML で確認）
- **deploy**: `develop` → `main` は `/deploy` スキル経由（タイミングはユーザー判断）

### 5. モデルは判断が必要な場面だけに使う

- **サブエージェント**: `model: sonnet` 既定。Opus は親エージェントのみ（詳細 → [agents-registry.md](.claude/knowledge/reference/agents-registry.md)）
- **worktree 原則禁止**。2エージェント同時実行・30分以上の条件を両方満たすときのみ例外（詳細 → [workflows.md](.claude/knowledge/reference/workflows.md)）
- ルーティング・リトライ・ステータスコード処理など、コードで決定できるものはサブエージェントに委ねない
- **委任基準**: サブエージェントに任せるのは「大きく・独立・並列化できる」作業のみ（例: 複数ファイル横断の調査）。数回のツールコールで終わる作業は委任しない。**自分のインライン作業を検証させるためだけのサブエージェント起動はしない**（モデルは自律検証するので二重になる）。※商品品質の Generator/Evaluator 分離パイプライン（`*-writer` ↔ `*-qa`）は自己評価バイアスを構造で断つ設計なので別物・維持

### 6. トークン予算を守る

- 長時間作業の区切りに `/compact` を提案
- セッション引き継ぎは `docs/handoffs/YYYY-MM-DD-{context}.md`
- **応答は簡潔に**: 前置き・但し書きは最小限にして、答えそのものに文字数を使う。説明を求められたときは要点サマリを既定とし、深掘りは明示的に求められたときだけ
- **実況の頻度**: 着手前に一文で何をするか宣言 → 作業中の報告は重要な発見・方針転換のときだけ → 完了時は結論（何をしたか／何が分かったか）から書き、詳細はその後
- **書き出すドキュメント**（handoff・レポート・週次・`.md` 成果物）は必要な長さに収める。中身は省かなくてよいが、埋めるための章・同内容の要約の反復・定型の前置きで水増ししない（`/doc-declutter` で後から削る前に、書く時点で太らせない）

### 7. 矛盾するパターンを混ぜない

- **Convention A/B の共存**: Convention A（個別ファイル名）と Convention B（`article.mdx`）が並存。新規コンテンツは Convention B 推奨。既存ファイルの方式を勝手に変換しない
- **UI コンポーネント**: デザイントークン使用（`rounded-card-*` / `shadow-card-*`）。`dark:border-*` を必ず書く。インライン `borderColor` 禁止。色は `brand` / `ink-strong` / `ink-body` / `ink-muted` / `positive` / `warn` / `danger` を使う（真実源: `src/styles/globals.css` の `--color-*`）
- コードベース内に複数の書き方がある場合、平均化せず、どちらを採用するか明示してから書く

### 8. 書く前に読む

- **提案・推奨の前に現物を確認する（憶測で gap を断定しない）**: コンテンツ・導線（ファネル/CTA）・商品構成・戦略について「〜が無い／されていない／気づかれていない」と断定する前に、必ず実物（該当 `article.md`・frontmatter・既存 CTA・`note-magazines.ts`・公開状態）を Read し **file:line で裏取り**してから話す。**売上・計測データは「何が」起きたかは示すが「なぜ（原因）」は示さない**——原因・欠落は実体で確認する。裏取りできないなら結論を出さず「未確認」と明示。データ解釈→提案の間に必ず「現物照合」を 1 ステップ挟む（2026-06-18、道路の上げ導線で既存の無料プレビュー CTA を読まずに『導線が無い』と誤提案・同一セッションで 2 回反復した再発防止）
- **情報の置き場（Knowledge-first モデル）**: `.claude/knowledge/`（共有知識・ポリシー・設計規約。Admin `/knowledge` でHTML閲覧）/ `.claude/state/`・`.claude/config/`（機械データ、`.claude/state/*.md` 新規作成禁止）/ `.claude/skills/`・`.claude/agents/`（実行能力）/ `docs/`（note・SNS・教材・計画・handoff等の成果物と業務記録）。**タスク管理は `docs/todo/`**（backlog / annual / monthly / weekly の4層。backlog.md がタスクマスタ、月初に monthly.md へ pull、週初に weekly.md へ pull）。**GitHub Issue は使わない**。真実源・判断フローは [information-architecture.md](.claude/knowledge/reference/information-architecture.md)
- **スキル/エージェント更新ルール**: `.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、同一 commit で `.claude/knowledge/reference/skills-guide.md`（一覧）と `.claude/knowledge/reference/skills-registry.md`（退役ログ）または `.claude/knowledge/reference/agents-registry.md` を必ず更新する。**追加・削除・description 変更は `npm run check-doc-coupling` が pre-commit で機械検知してコミットを止める**（台帳更新もれ＝capability ドリフトの再発防止。正当に不要なら `SKIP_DOC_COUPLING=1` で回避）
- **SSOT 参照規律**: doc を移動・リネーム・統廃合したら、参照していたスキル・エージェント・他 docs の `.md` 参照を同一 commit で全更新する。検出は `npm run check-doc-refs`（pre-commit でも staged を自動検査）。例示パスはプレースホルダ、廃止台帳行は `<!-- doc-ref:ignore -->`。真実源は [information-architecture.md](.claude/knowledge/reference/information-architecture.md)「SSOT と参照規律」（2026-06-11 制定、旧体系の壊れ参照 47 件の再発防止）
- **ドキュメント同期プロトコル（意味的ズレ）**: `src/**` `scripts/**` `.claude/skills/**` `.claude/agents/**` `package.json` `src/config/**` `src/styles/**` 等「**ドキュメント化された面**」を変更したタスクは、**コミット前に `/doc-sync` を1回回す**（変更 diff × 候補 doc を `doc-sync-auditor` で突合し、prose・表・コマンド・件数・閾値の旧仕様化を検出→適用）。`check-doc-refs`/`check-doc-coupling`（機械）が拾えない陳腐化を埋める。純コンテンツ編集（`.local/r2/posts/**` MDX 記事・`docs/note,sns/**` 素材）では回さない（2026-06-12 新設）
- **ドキュメント ライフサイクル（肥大化の棚卸し）**: doc が「完了済みなのに active」「他 SSOT と重複」「完了行が混じって肥大」していくのを定期的に棚卸しする。`npm run check-doc-lifecycle`（機械 surfacer＝完了 handoff 候補を鮮度/orphan で列挙）→ **`/doc-declutter`**（`doc-curator` Evaluator が KEEP/TRIM/DELETE/CONSOLIDATE を判定→削除/trim/参照更新/memory 同期まで適用）。定期サーフェスは週次 PDCA（`/weekly-review` の Agent H＝handoff 棚卸し）が active handoff の抽出候補を毎週レビューに列挙する（surface のみ・実際の抽出/削除は次セッションで `/doc-declutter`）。**handoff は「タスク→`docs/todo/backlog.md`・手順→reference・知見→memory へ抽出→本体は削除（記録は git 履歴）」へ統一（残作業があっても KEEP しない・`handoffs/` は溜めない・`_archive/` は 2026-07-11 廃止）。真実源 → information-architecture.md「handoff のライフサイクル」**。**鉄則＝外部実体（PR merged・published:true・deploy・ファイル実在）を検証してから削除、未確認なら削除しない**。`/doc-sync`（コード変更起点の prose 陳腐化）とはトリガーが直交（2026-06-17 新設・2026-07-11 archive 廃止）
- MDX を追加・編集する前に `.claude/knowledge/reference/content-authoring.md` を Read する
- **クラウドルーティン作成ルール**: `/schedule`（RemoteTrigger）で定期エージェントを新規作成する前に、必ず `/routines`（または `RemoteTrigger {action:"list"}`）で既存を確認し、同一成果物を生成する重複・cron 衝突がないか検証する（2026-05-30 weekly-review 重複事故の再発防止）

### 9. テストは挙動だけでなく意図を検証する

- **なぜ `curl` でチェックするか**: Lighthouse スコアは SSR 破壊を捕捉できない（[measurement-incidents.md](.claude/knowledge/reference/measurement-incidents.md) 2026-W16 BAILOUT）。`<main>` タグと主要キーワードの存在確認が最短の意図検証
- **なぜ `writeMdxFile` 経由か**: 直接 `writeFileSync` は CRLF 混在を引き起こし pre-commit で reject される。検証ステップを省略するときは「なぜその検証が必要か」を自問してから判断する
- **汎用の検証指示を足さない**: 「必ず最後に検証ステップを入れる」「ダブルチェックしてから答える」「サブエージェントで検証させる」といった**汎用**の指示は、モデル自身の自律検証と重複して過剰検証になる（トークンだけ増えて品質は上がらない）。**書いてよい検証は決定的ゲートだけ**＝実行するコマンドと合格条件が特定できるもの（`curl` で `<main>`、`npm run refresh-indexes`、lint 9-11、`U+FFFD` 走査、`check-*` スクリプト）。スキル・エージェントを書くときも同じ

### 10. 重要なステップごとにチェックポイントを置く

- **複数セッションは worktree で分離する（最重要）**: 別の Claude Code セッションが同じリポジトリで並行作業するのが常態（2026-06-11 確認）。同一ワークツリーを共有すると、あるセッションの `git reset --hard`／`checkout` が他セッションの未 push コミット・作業ツリーを破壊する（**pathspec commit・push 前確認でも防げない**＝reset が HEAD・index・作業ツリーを丸ごと書き換えるため。2026-06-11 実証：commit が別セッションの reset で消失→gc 復旧不能）。各セッションは `git worktree add <別dir> -b <feature> origin/develop` で独立した HEAD／index／作業ツリーを持ち、`develop` へは PR で集約する（`.git` オブジェクトは共有）。**§5「worktree 原則禁止」は複数セッション常態下では非適用**。
- **同一ワークツリーで並行せざるを得ないとき**: reflog・`develop` 先頭・未コミットが自分の操作と無関係に動くのは正常（共有 `.git/logs/HEAD` に全プロセス混在記録）。push 前に `git log origin/develop..HEAD` で巻き込み確認。commit は `git commit -- <pathspec>`（`git add -A` 禁止）。他テリトリ不可侵。重要な変更は feature ブランチへ即 push して保全。
- **並行エージェント（同一セッション内）**: 各エージェントが編集したファイルを即 commit（`git status` で staged 確認）。
- 長いタスクでは「何を完了し・何を検証し・何が残っているか」を都度整理してから次に進む

### 11. コードベースの規約に合わせる

- **frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`
- MDX 書き込み後は `U+FFFD`（`﹖`）で文字化けチェック（既存コンテンツとの一貫性を保つため）
- 既存コードの命名規則・ファイル構成・設計思想を優先する。自分の好みで変えない
- **docs/ 内 .md ドキュメント**: Obsidian callout（`> [!note]` 等）の運用は [docs-markdown-style.md](.claude/knowledge/reference/docs-markdown-style.md) 準拠（推奨 4 タイプ限定、MDX `<Callout>` とは別系統で混同しない）

### 12. 失敗や不確実性を隠さない

- 未検証の部分やスキップした処理がある場合は「完了」と言わずに明示する
- **deploy 後**: 500 の場合は Cloudflare API token 期限切れを仮説1番に確認（GitHub Secrets で再発行）。着手前にも token の有効期限を確認する
- 計測データに異常がある場合は [measurement-incidents.md](.claude/knowledge/reference/measurement-incidents.md) を先に確認してから結論を出す

---

<tone_preference>
出力は簡潔に。実況は重要な発見・方針転換のときだけ。書き出すドキュメントは水増ししない。
</tone_preference>
