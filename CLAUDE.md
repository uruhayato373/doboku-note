# doboku-note - 土木工学ドキュメントサイト

土木工学・施工管理・河川・道路・法律の技術ノートを提供するドキュメントサイト。Next.js + MDX + Cloudflare Pages で構築。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 + next-mdx-remote |
| 言語 | JavaScript (ESM), MDX |
| 数式 | KaTeX (remark-math + rehype-katex) |
| 図表 | Mermaid |
| 検索 | Algolia DocSearch |
| 分析 | Google Analytics (gtag: G-8VXJ1RL1HG) |
| 広告 | Google AdSense (ca-pub-7995274743017484) |
| 画像配信 | Cloudflare R2 (`storage.doboku-note.com`) |
| ホスティング | Cloudflare Pages |
| CI/CD | GitHub Actions → Cloudflare Pages |

## ディレクトリ構成

```
docs/                  # コンテンツ（MDX）
  general/             # 一般（土木工学、施工管理、アセットマネジメント、空間情報）
  road/                # 道路
  river/               # 河川（水理学、防災計画）
  low/                 # 法律（憲法、国家賠償法、行政事件訴訟法）
  erosion-control/     # 砂防（非公開）
sidebars/              # サイドバー定義
src/                   # カスタムコンポーネント・CSS・レイアウト
static/                # 静的ファイル（画像、favicon）
.github/workflows/     # CI/CD
```

## サイト構成（ナビバー）

| カテゴリ | Sidebar ID | パス |
|---|---|---|
| 一般 | generalSidebar | docs/general/ |
| 道路 | roadSidebar | docs/road/ |
| 河川 | riverSidebar | docs/river/ |
| 法律 | lowSidebar | docs/low/ |

## コンテンツ作成規約

- ファイル形式: MDX
- 日本語で記述
- 数式: `$$...$$` (ブロック) / `$...$` (インライン) + KaTeX
- 図表: Mermaid コードブロック
- 画像: Cloudflare R2 から配信。Gitには含めない
  - R2 URL（本番）: `https://storage.doboku-note.com/content/{カテゴリ}/img/{ファイル名}`
  - MDXでの参照: `<img src="/content/{カテゴリ}/img/{ファイル名}" />`（相対パス）
  - ローカル開発: `.local/r2/content/` から配信（`scripts/serve-local-r2.mjs`）
  - 本番: Cloudflare Pages `_redirects` で R2 にリダイレクト
  - アップロード: `node scripts/upload-images-to-r2.mjs --prefix {カテゴリ}`
  - `content/**/img/` は `.gitignore` 対象
  - `static/img/` はサイト共通素材（favicon, logo等）専用

## デプロイ

- **本番**: `main` ブランチへの push で GitHub Actions → Cloudflare Pages に自動デプロイ
- **手動**: `npm run build && npx wrangler pages deploy build --project-name=doboku-note`
- **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 頻用コマンド

```bash
npm start              # ローカル開発サーバー
npm run build          # 本番ビルド
npm run serve          # ビルド結果のプレビュー
```

## スキル一覧

### management — 計画・分析・戦略

| スキル | 用途 | 定義 |
|---|---|---|
| `/weekly-plan` | 週次計画を生成 | `.claude/skills/management/weekly-plan/SKILL.md` |
| `/weekly-review` | 週次レビューを生成 | `.claude/skills/management/weekly-review/SKILL.md` |
| `/north-star-metric` | NSM と Input Metrics を定義 | `.claude/skills/management/north-star-metric/SKILL.md` |
| `/growth-loops` | 成長ループの設計・評価 | `.claude/skills/management/growth-loops/SKILL.md` |
| `/monetization-strategy` | 収益化戦略のブレインストーム | `.claude/skills/management/monetization-strategy/SKILL.md` |
| `/critical-review` | 批判的レビュー | `.claude/skills/management/critical-review/SKILL.md` |
| `/knowledge` | 過去の失敗と学びを参照・追記 | `.claude/skills/management/knowledge/SKILL.md` |
| `/pre-mortem` | Pre-Mortem の実施 | `.claude/skills/management/pre-mortem/SKILL.md` |

### analytics — サイト分析

| スキル | 用途 | 定義 |
|---|---|---|
| `/fetch-gsc-data` | GSC から検索パフォーマンスデータを取得 | `.claude/skills/analytics/fetch-gsc-data/SKILL.md` |
| `/fetch-ga4-data` | GA4 からアクセスデータを取得 | `.claude/skills/analytics/fetch-ga4-data/SKILL.md` |
| `/seo-audit` | SEO 総合監査 | `.claude/skills/analytics/seo-audit/SKILL.md` |

### dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/reset-git-history` | Git 履歴リセット | `.claude/skills/dev/reset-git-history/SKILL.md` |
| `/allow-tool` | ツール許可を settings.local.json に追加 | `.claude/skills/dev/allow-tool/SKILL.md` |

### content — コンテンツ作成

| スキル | 用途 | 定義 |
|---|---|---|
| `/pdf-to-mdx` | PDF/画像からテキスト抽出→MDX変換 | `.claude/skills/content/pdf-to-mdx/SKILL.md` |
| `/clean-pdf-artifacts` | PDF変換残骸の自動検出・除去 | `.claude/skills/content/clean-pdf-artifacts/SKILL.md` |
| `/check-mdx` | MDX構文チェック | `.claude/skills/content/check-mdx/SKILL.md` |
| `/verify-content` | MDX内容をソースPDFと照合・検証 | `.claude/skills/content/verify-content/SKILL.md` |
| `/fishery-port-import` | 漁港設計参考図書PDF→MDX変換 | `.claude/skills/content/fishery-port-import/SKILL.md` |
| `/noise-manual-import` | 騒音評価マニュアルPDF→MDX変換 | `.claude/skills/content/noise-manual-import/SKILL.md` |
| `/river-design-import` | 河川砂防技術基準（設計編）技術資料PDF→MDX変換 | `.claude/skills/content/river-design-import/SKILL.md` |
| `/common-specs-import` | 土木工事共通仕様書PDF→MDX変換 | `.claude/skills/content/common-specs-import/SKILL.md` |
| `/civil-law-import` | 民法テキストPDF→MDX変換 | `.claude/skills/content/civil-law-import/SKILL.md` |
| `/qa-pdf-mdx` | PDF→MDX変換の品質検証・修正（照合agent＋修正agent） | `.claude/skills/content/qa-pdf-mdx/SKILL.md` |
| `/fix-design-manual-figures` | 設計便覧の図品質修正（テキスト映り込み・出典欠落） | `.claude/skills/content/fix-design-manual-figures/SKILL.md` |
| `/design-manual-import` | 近畿地方整備局 設計便覧PDF→MDX変換 | `.claude/skills/content/design-manual-import/SKILL.md` |
| `/tech-management-import` | 土木技術管理規定集PDF→MDX変換 | `.claude/skills/content/tech-management-import/SKILL.md` |

### ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7カテゴリ・重大度判定） | `.claude/skills/ui/design-review/SKILL.md` |
| `/ui-panel-review` | 10人の専門家パネルによるUI/UX評価 | `.claude/skills/ui/ui-panel-review/SKILL.md` |

### ads — 広告

| スキル | 用途 | 定義 |
|---|---|---|
| `/register-affiliate-banner` | アフィリエイトバナーの登録 | `.claude/skills/ads/register-affiliate-banner/SKILL.md` |

## コンテキスト管理

- 長時間の作業（PDF→MDX変換、大量ファイル編集など）では、自然な区切り（1節完了、1ファイル完了など）ごとにユーザーへ `/compact` の実行を提案すること
- コンテキストが逼迫していると判断した場合も同様に提案する

## 推奨ワークフロー

### 初回セットアップ

```
1. /north-star-metric     <- 最重要指標を決める
2. /growth-loops           <- 成長メカニズムを設計
3. /monetization-strategy  <- 収益化手段を検討
```

### 週次運用

```
日曜〜月曜:
1. /weekly-review   <- 実績を振り返る
2. /weekly-plan     <- 来週の計画を立てる
```
