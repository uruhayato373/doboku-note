---
title: スキル ナビゲーションガイド
---

# スキル ナビゲーションガイド

アクティブなスキルを **用途別** に素早く探すための早引き。  
設計原則・退役ログ → `skills-registry.md` / 作成手順 → `skills-design-guide.md`

---

## カテゴリ別クイックリファレンス

### コンテンツ制作（authoring）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/keyword-page` | 総合技術監理キーワードページ作成・校正 | `キーワード作成`, `ページ更新`, `/keyword-page` |
| `/create-svg` | MDX 記事用 SVG 図版作成 | `図版を作りたい`, `SVG 作成`, `/create-svg` |
| `/illustrate-concept` | Web 画像検索→SVG 一括生成→MDX 挿入 | `コンセプト図`, `イラスト挿入`, `/illustrate-concept` |
| `/improve-article` | 単一記事の対話的改善（PDF 照合 QA も可） | `記事を改善`, `校正して`, `/improve-article` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `Obsidian記事を公開`, `MDX変換`, `.md→.mdx`, `promote` |
| `/notebooklm-research` | NotebookLM で総監キーワードを深掘り調査 | `NotebookLM調査`, `引用付き根拠強化`, `/notebooklm-research` |
| `/visual-research` | NotebookLM×参照URL → SVG 概念図生成 | `概念図をSVGで`, `URL直接渡す図版`, `/visual-research` |
| `/exam-guide` | 試験対策ガイド生成（テンプレート駆動） | `試験ガイドを作りたい`, `/exam-guide` |
| `/civil-keiken-magazine` | 1級・2級土木 施工経験記述 note有料マガジンのフル模範答案を生成・採点（Generator→Evaluator、過去問年度別/テーマ別/予想の3種） | `施工経験記述マガジン`, `模範答案を作成`, `予想問題集を作る`, `/civil-keiken-magazine` |
| `pe-secondary-exam-writer` エージェント | 技術士建設部門 2次試験 note有料マガジン用 模範解答を生成（全11専門分野・科目種別I/II-1/II-2/III。元公務員発注者視点注入、合格3科目=合格者訴求・残8科目=発注者監修訴求） | `建設部門note模範解答`, `技術士2次マガジン`, `pe-secondary-exam-writer` |

### 変換（conversion）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/pdf-to-mdx` | PDF/画像 → MDX 変換（試験別テンプレート） | `PDF変換`, `MDX化`, `/pdf-to-mdx --exam {cem\|civil-construction-1\|general}` |
| `/exam-questions-import` | 過去問集 PDF → MDX（解答追加も可） | `過去問取込`, `/exam-questions-import --exam {civil-primary\|civil-secondary\|pe-primary\|pe-first-stage}` |
| `/ogp-create` | サイト OGP（mono-tag）＋ note 記事カバー（G2・試験色分け）生成 | `OGP画像`, `noteカバー`, `/ogp-create` |
| `/magazine-to-pdf` | note マガジンの article.md →「問題文＋解答」中心の紙用 PDF（spec 駆動・A/B案両収録） | `マガジンをPDF`, `記事を紙で`, `模範論文PDF`, `/magazine-to-pdf --spec scripts/pdf-specs/{name}.json [--desktop]` |

### 品質管理（quality）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/check-mdx` | MDX 品質検査の統合 Evaluator（10 ルール） | `MDX検査`, `lint`, `構文チェック`, `/check-mdx --rules <rule>` |
| `/quality-cycle` | 品質サイクル（スコア→リライト→検証→レビュー） | `品質サイクル`, `cem品質上げ`, `/quality-cycle --profile {cem\|civil-textbook}` |
| `/exam-backlinks` | 過去問⇔キーワード紐付け確認・再生成 | `バックリンク確認`, `/exam-backlinks` |
| `/audit-exam-mapping` | 過去問⇔キーワード紐づけマップの精度監査 | `紐づけ監査`, `/audit-exam-mapping` |
| `/build-exam-notebook` | 過去問 MDX を NotebookLM notebook に投入 | `NotebookLM投入`, `/build-exam-notebook` |
| `/verify-exam-coverage` | キーワードが過去問論点をカバーしているか検証 | `論点カバレッジ確認`, `/verify-exam-coverage` |
| `/review-mobile` | モバイル視認性・可読性レビュー | `モバイルチェック`, `スマホで見て`, `/review-mobile` |
| `/consolidate-duplicate-keyword` | 総監キーワード集の重複スラグ統合 | `重複スラグ統合`, `/consolidate-duplicate-keyword` |
| `/note-prepublish-review` | note 公開前の統合品質ゲート | `note公開前チェック`, `公開準備`, `/note-prepublish-review` |
| `/check-seo-meta` | title/description/OGP/canonical の検査 | `SEOメタ検査`, `OGP確認`, `/check-seo-meta` |
| `/pe-essay-review` | 総監記述式模範論文を 3 視点で採点 | `記述式採点`, `模範論文レビュー`, `/pe-essay-review` |
| `/keiken-charcount` | 1級・2級土木 施工経験記述マガジン答案を解答欄しきい値で字数チェック（決定論的・暫定値） | `経験記述の字数確認`, `答案の字数オーバー検出`, `/keiken-charcount` |
| `/civil-figure-rework` | 1級土木 過去問1次の図クロップ品質ループ（extractor → auditor 最大3反復、1ページ単位 commit） | `過去問図再抽出`, `テキスト写り込み修正`, `/civil-figure-rework {exam-slug\|--all}` |

### SNS 運用（social）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/social-post` | note / X 投稿テキスト生成の統合スキル | `note投稿文`, `X投稿テキスト`, `/social-post --platform {note\|x}` |
| `/note-hashtags` | note 公開用ハッシュタグ 99 個を生成 | `ハッシュタグ生成`, `/note-hashtags` |
| `/ig-post-create` | Instagram カルーセル PNG 生成（過去問パック・KW 解説の単発） | `Instagram投稿作成`, `IG スライド`, `/ig-post-create --slug {kw}` |
| `/ig-carousel-restyle` | tokens.json 更新後に過去問パック PNG を 3 フォーマット（Carousel/Reels/Stories）統一再生成 | `IGデザイン再適用`, `カルーセル再生成`, `/ig-carousel-restyle --year r07` |
| `/ig-reel-create` | 過去問パックのカルーセル PNG から 1080×1920 Reels mp4 を生成（VOICEVOX TTS + ffmpeg） | `IG リール作成`, `動画化`, `/ig-reel-create --exam r07-pack-01` |
| `/create-x-card` | tweets.md から X 投稿用サマリカード PNG 生成（多資格＝総監/1級/2級の試験別色・ヘッダに自動切替） | `Xカード作成`, `X投稿カード`, `/create-x-card` |
| `/publish-x` | Playwright で X 投稿を自動化（即時・予約） | `X投稿`, `自動投稿`, `/publish-x` |
| `/publish-ig-bs` | Playwright × Meta Business Suite で IG **カルーセル/リール**を**予約投稿**（`--reel` で reels/video.mp4・IG 単独化・spinbutton 時刻・dry-run 必須）。即時は `scripts/publish-ig.mjs`（Graph API） | `IG予約投稿`, `インスタ予約`, `リール予約`, `Business Suite 投稿`, `/publish-ig-bs` |
| `/x-repost` | 高エンゲージな技術士総監/1級・2級土木ツイートを検索 → `x-repost-curator` で選別＋引用コメント生成 → Playwright で引用RP（ローカル `/loop` 運用・dry-run 必須） | `Xリポスト`, `引用リポスト`, `/x-repost` |
| `/yt-shorts-create` | **v7: IG Reels mp4 から YouTube Shorts を派生**（**≤60秒**トリム〔60秒超は通常動画扱い〕+ 概要欄差替、`--from-reels`。投稿は3本/日・JST07:30/12:30/20:00、真実源 policy §5-7。MDX 直結 `--slug` は廃止） | `YouTube Shorts`, `YT 派生`, `/yt-shorts-create --from-reels r03-pack-01` |

### 開発（dev）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/dev-start` | ポート 3020 をクリーンアップして開発サーバー起動 | `開発サーバー`, `dev start`, `/dev-start` |
| `/deploy` | Cloudflare Pages へデプロイ | `デプロイ`, `本番反映`, `/deploy` |
| `/code-review` | Next.js コード品質レビュー | `コードレビュー`, `/code-review` |
| `/review` | 対象ファイル種別を自動判定しレビュースキルを実行 | `レビューして`, `/review` |
| `/pr-create` | 現ブランチから GitHub PR を作成 | `PR作成`, `/pr-create` |
| `/simplify` | 変更 diff を点検し最小差分で修正→lint→PR チェーン | `diff確認`, `最小修正`, `/simplify` |
| `/create-skill` | スキル作成ガイド | `スキルを作りたい`, `/create-skill` |
| `/sync-r2-images` | R2 画像のローカル同期 | `R2同期`, `/sync-r2-images` |
| `/diff-r2` | ローカル ↔ R2 の双方向差分検出 | `R2差分`, `/diff-r2` |
| `/monitor` | バックグラウンド監視 | `監視`, `/monitor` |
| `/zenn-audit` | Zenn 本番 CSS との差分検出 | `Zenn差分`, `/zenn-audit` |

### 分析（analytics）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/fetch-gsc-data` | Google Search Console データ取得 | `GSCデータ`, `検索データ取得`, `/fetch-gsc-data` |
| `/psi-audit` | PSI で代表ページ日次計測、CWV しきい値違反を surface | `PSI計測`, `Core Web Vitals`, `/psi-audit` |

### 戦略・管理（management）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/weekly-improve` | 計測→改善候補抽出→実験登録の軽量オーケストレータ | `今週の改善`, `PDCA`, `/weekly-improve` |
| `/weekly-review` | 週次レビューを生成 | `週次レビュー`, `今週の振り返り`, `/weekly-review` |
| `/weekly-plan` | 週次計画を生成 | `週次計画`, `今週の計画`, `/weekly-plan` |
| `/nsm-experiment` | NSM 改善の実験ライフサイクル管理 | `実験登録`, `NSM実験`, `/nsm-experiment` |
| `/north-star-metric` | NSM と Input Metrics を定義 | `NSM定義`, `北極星指標`, `/north-star-metric` |
| `/growth-loops` | 成長ループの設計・評価 | `成長ループ`, `フライホイール設計`, `/growth-loops` |
| `/monetization-strategy` | 収益化戦略のブレインストーム | `収益化`, `月X万円達成するには`, `/monetization-strategy` |
| `/knowledge` | 過去の失敗・教訓を参照・追記 | `ナレッジ参照`, `失敗から学ぶ`, `/knowledge` |
| `/critical-review` | 批判的レビュー | `批判的に見て`, `/critical-review` |
| `/pre-mortem` | Pre-Mortem の実施 | `Pre-Mortem`, `リスク洗い出し`, `/pre-mortem` |
| `/distill-proofread-learnings` | 校正作業から新規ルール・ユーザー嗜好を抽出 | `校正から学ぶ`, `新ルール抽出`, `/distill-proofread-learnings` |
| `/routines` | クラウドルーティン（/schedule）を一覧・監査（重複・残骸・平文トークン・cron 衝突検出）。**新規作成前の重複チェック必須** | `ルーティン一覧`, `ルーティン監査`, `/routines` |

### UI/UX（ui）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7 カテゴリ）＋ `--visual` で視覚検証 | `デザインレビュー`, `/design-review` |

---

## 用途別ガイド（今やること別）

### note 記事を公開前に仕上げたい

1. `/note-prepublish-review` — 公開前チェックゲート（inline + 3 エージェント並列）
2. `/note-hashtags {NN-...}` — ハッシュタグ 99 個を生成

### キーワード品質を上げたい

1. `/quality-cycle --profile cem --mode auto-loop` — 全件スコアリング → 低スコア自動リライト → 再評価（閉ループ）
2. `/audit-exam-mapping` — 紐づけ精度の一括 semantic 監査

### SNS 投稿を量産したい（v7: IG 一次 → YT 派生）

1. `/ig-post-create --exam {pack-id}` — Instagram カルーセル/Reels PNG（一次制作）
2. `/ig-reel-create --exam {pack-id}` — カルーセル PNG → Reels mp4（VOICEVOX + ffmpeg）
3. `/yt-shorts-create --from-reels {pack-id}` — IG Reels mp4 → YouTube Shorts 派生
4. `/create-x-card` + `/publish-x` — X 投稿カード作成 → 自動投稿

**IG ハイライト整備**（戦略 v7.1、`node` スクリプト）:
- `node .claude/scripts/instagram/build-highlight-materials.mjs --all` — 6 ハイライト × 32 PNG 一括生成（モダンシック意匠、ジャンル別カラー）
- `node .claude/scripts/lint-stories-titles.mjs` — title 字数 lint（auto-fit 4 段階判定）
- エージェント: `ig-highlight-designer`（slide-data 執筆）→ `ig-highlight-qa`（4 軸採点）
- 詳細: `docs/reference/ig-highlight-design-policy.md`

### PDF を MDX に変換したい

1. `/pdf-to-mdx --exam {cem|civil-construction-1|general}` — テキスト・図版含む変換
2. `/exam-questions-import --exam {civil-primary|civil-secondary|pe-primary}` — 過去問集

### 建設部門 2次 note 模範解答を生成したい

1. `pe-secondary-exam-writer` エージェントに `year` / `subject` / `exam_type` / `magazine_id` を渡す
2. 運営者が article.md をレビューして note 投稿（noteUrl を frontmatter に記入）
3. 詳細: `docs/note/技術士建設部門/noteコンテンツ計画.md`、エージェント: `.claude/agents/pe-secondary-exam-writer.md`

### マガジン記事を紙用 PDF にしたい

1. `/magazine-to-pdf --spec scripts/pdf-specs/{name}.json [--desktop]` — spec 済みマガジンを「問題文＋解答」PDF に再生成
2. 新規マガジン（spec 無し）は `magazine-pdf-builder` エージェントに spec 作成から委譲（A/B案など複数解答は両方収録）

### 週次 PDCA を回したい

1. `/weekly-improve` — 計測データから改善候補を自動抽出・実験登録
2. `/weekly-review` → `/weekly-plan` — 振り返りと翌週計画の作成

### 記事を Obsidian から本番サイトに上げたい

1. `/promote-to-site` — Obsidian MD → MDX 変換・配置
2. `/check-mdx --rules all` — 変換後の品質検査
3. `/deploy` — Cloudflare Pages に反映

### コードを変更してデプロイしたい

1. `/dev-start` — 開発サーバー起動
2. `/code-review` — コードレビュー
3. `/deploy` — Cloudflare Pages デプロイ

---

## Phase 2 待機スキル（現在未稼働）

| スキル | 着手条件 |
|---|---|
| `/keyword-gap` | Web 月収 ¥15k 達成後 |
| `/exam-demand` | Web 月収 ¥15k 達成後 |
| `/discover-exam-season` | Web 月収 ¥15k 達成後 |
| `/plan-affiliate` | Web 月収 ¥15k 達成後 |
| `/register-affiliate-banner` | Web 月収 ¥15k 達成後 |
| `/audit-ads` | Web 月収 ¥15k 達成後 |
