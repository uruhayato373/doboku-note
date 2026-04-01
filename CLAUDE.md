# doboku-note - 1級土木施工管理技士 特化サイト

1級土木施工管理技士の受験者向け技術ノート・試験対策サイト。Next.js + MDX + Cloudflare Pages で構築。

## 設計思想

- **サイトの焦点**: 1級土木施工管理技士に特化。ユーザーが「ここだけで合格できる」体験を提供
- **コンテンツ管理**: Obsidian（~/obsidian）で全分野を下書き・品質管理し、品質保証済みコンテンツのみ本リポジトリに配置
- **コンテンツの流れ**: Obsidian（ステージング）→ doboku-note（プロダクション）→ iOSアプリ（過去問演習）
- **収益モデル**: AdSense + アフィリエイト + note有料記事 + iOSアプリ（サブスク）
- **詳細**: `docs/00_プロジェクト管理/00_設計思想.md`

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
content/               # コンテンツ（MDX）
  general/             # 共通技術コンテンツ（複数資格で共用）
    civil-general/     # 土木一般（土工・コンクリート・基礎工・測量・建設機械・解体工事）
    construction-management/  # 施工管理（品質・安全・工程・法規等）
  exam/                # 試験特化コンテンツ
    civil-construction-1/  # 1級土木施工管理技士（guide/, primary/, secondary/）
    pe/                # 技術士（建設部門）（primary-guide/, 選択科目別フォルダ等）
    rccm/              # RCCM
src/                   # カスタムコンポーネント・CSS・レイアウト
  lib/
    content.ts         # DocMeta 型定義・ファイルスキャン
    sidebar.ts         # サイドバー定義・ナビ生成
  app/docs/[...slug]/  # 全ドキュメントページの動的ルート
docs/00_プロジェクト管理/  # プロジェクト管理ドキュメント
.github/workflows/     # CI/CD
```

## サイト構成（ナビバー）

| カテゴリ | sidebarId | URL パス | 現状 |
|---|---|---|---|
| **試験ガイド（1級土木）** | examSidebar | /docs/exam/civil-construction-1 | ✅ 運用中 |
| **土木一般** | generalSidebar | /docs/general/civil-general | ✅ 運用中 |
| **施工管理** | generalSidebar | /docs/general/construction-management | ✅ 運用中 |
| **過去問（1級土木）** | examSidebar | /docs/exam/civil-construction-1/primary | ✅ 運用中 |
| コンクリート技士 | concreteEngineerSidebar | /docs/exam/concrete-engineer | ⏳ 未実装 |
| 測量士 | surveyingSidebar | /docs/exam/surveying | ⏳ 未実装 |
| 技術士（建設部門）* | examSidebar | /docs/exam/pe | ✅ 運用中（ナビ外） |

\* 技術士は現在ナビバーに表示されていません。コンテンツは実装済み。

## URL設計ルール

複数資格対応を実現するため、以下のURL設計を採用しています（詳細: `docs/00_プロジェクト管理/07_URL設計ガイドライン.md`）。

- **共通コンテンツ**: `content/general/{分野}/` → URL: `/docs/general/{分野}/`
- **試験特化コンテンツ**: `content/exam/{exam-id}/` → URL: `/docs/exam/{exam-id}/`
- **複数資格対応記事**: ファイルを複製せず、frontmatter の `exams: string[]` で関連を宣言

このルールにより、新資格対応時の重複排除とSEO効率を両立します。

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
| `/audit-staging` | Obsidianステージングの公開準備度監査 | `.claude/skills/content/audit-staging/SKILL.md` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `.claude/skills/content/promote-to-site/SKILL.md` |
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
| `/civil-general-import` | 土木施工管理技術テキスト（土木一般編）PDF→MDX変換 | `.claude/skills/content/civil-general-import/SKILL.md` |
| `/construction-management-import` | 土木施工管理技術テキスト（施工管理・法規編）PDF→MDX変換 | `.claude/skills/content/construction-management-import/SKILL.md` |
| `/create-import-skill` | PDFインポートスキルの自動生成 | `.claude/skills/content/create-import-skill/SKILL.md` |
| `/exam-questions-import` | 1級土木施工管理 第1次試験問題集PDF→MDX変換 | `.claude/skills/content/exam-questions-import/SKILL.md` |
| `/exam-questions-2-import` | 1級土木施工管理 第2次試験問題集PDF→MDX変換 | `.claude/skills/content/exam-questions-2-import/SKILL.md` |
| `/civil-planning-import` | 土木計画学PDF→MDX変換（20章677P） | `.claude/skills/content/civil-planning-import/SKILL.md` |
| `/exam-guide` | 1級土木施工管理 試験対策ガイド生成（既存資産再構成） | `.claude/skills/content/exam-guide/SKILL.md` |
| `/pe-exam-guide` | 技術士試験対策ガイド生成（既存資産＋公開情報） | `.claude/skills/content/pe-exam-guide/SKILL.md` |

### ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7カテゴリ・重大度判定） | `.claude/skills/ui/design-review/SKILL.md` |
| `/ui-panel-review` | 10人の専門家パネルによるUI/UX評価 | `.claude/skills/ui/ui-panel-review/SKILL.md` |

### strategy — 競合調査・市場分析

| スキル | 用途 | 定義 |
|---|---|---|
| `/competitor-audit` | 競合サイト調査（コンテンツ・SEO・収益モデル比較） | `.claude/skills/strategy/competitor-audit/SKILL.md` |
| `/keyword-gap` | GSC + 競合比較でコンテンツギャップを特定 | `.claude/skills/strategy/keyword-gap/SKILL.md` |
| `/exam-demand` | 資格試験の検索需要調査・不足コンテンツ提案 | `.claude/skills/strategy/exam-demand/SKILL.md` |
| `/discover-trends-civil` | 土木系ニュース・業界動向からトレンド発見 | `.claude/skills/strategy/discover-trends-civil/SKILL.md` |
| `/discover-exam-season` | 試験日程に基づく季節性コンテンツ戦略 | `.claude/skills/strategy/discover-exam-season/SKILL.md` |
| `/content-roadmap` | コンテンツ拡充ロードマップの生成（全データ統合） | `.claude/skills/strategy/content-roadmap/SKILL.md` |

### ads — 広告・アフィリエイト

| スキル | 用途 | 定義 |
|---|---|---|
| `/register-affiliate-banner` | アフィリエイトバナーの登録 | `.claude/skills/ads/register-affiliate-banner/SKILL.md` |
| `/plan-affiliate` | 書籍・教材・通信講座のアフィリエイト記事企画 | `.claude/skills/ads/plan-affiliate/SKILL.md` |
| `/audit-ads` | AdSense・アフィリエイトの現状監査と最適化提案 | `.claude/skills/ads/audit-ads/SKILL.md` |

## エージェント

`.claude/agents/` に定義されたサブエージェント群。Generator/Evaluator分離の原則に基づき設計。

| エージェント | 役割 | 種別 | 担当スキル |
|---|---|---|---|
| `strategy-advisor` | 戦略・PDCA・レビュールーティング | Generator | weekly-plan/review, growth-loops, monetization-strategy, competitor-audit, keyword-gap |
| `seo-auditor` | SEO 監査・アナリティクス収集 | Evaluator | seo-audit, fetch-gsc-data, fetch-ga4-data, keyword-gap |
| `content-planner` | コンテンツ企画の統括 | Generator | discover-trends-civil, discover-exam-season, exam-demand, keyword-gap, plan-affiliate |
| `content-qa` | コンテンツ品質評価（5軸ルーブリック） | Evaluator | check-mdx, verify-content, qa-pdf-mdx, clean-pdf-artifacts |

### チーム連携パターン

| シナリオ | エージェント連携 |
|---|---|
| PDF→MDX変換 | Generator（変換実行）→ **content-qa**（品質評価）→ 不合格時はGeneratorに差し戻し |
| 月次コンテンツ企画 | content-planner → seo-auditor（データ）→ strategy-advisor（レビュー） |
| 試験シーズン対策 | content-planner（exam-demand + discover-exam-season）→ plan-affiliate |
| 四半期戦略レビュー | strategy-advisor（competitor-audit → keyword-gap → monetization-strategy → pre-mortem） |
| 週次 PDCA | strategy-advisor（weekly-review → discover-exam-season → weekly-plan） |
| 広告最適化 | strategy-advisor → audit-ads → plan-affiliate |

## ハーネス設計原則

エージェント・スキルの設計・改修時に従う5原則:

1. **GeneratorとEvaluatorを分離する** — 作る役と評価する役を同じエージェントに担わせない。PDF→MDX変換後の品質評価は `content-qa` エージェントが行う
2. **「何を作るか」を先に合意する** — SKILL.mdの変換ルール（frontmatter、見出し構造、表・図の形式）が完成の定義。曖昧なまま変換を始めない
3. **主観をルーブリック化する** — 品質は `content-qa` の5軸ルーブリック（構造正確性30%・テキスト忠実度25%・表図数式20%・MDX互換性15%・メタデータ品質10%）で定量評価
4. **ハーネスはできるだけシンプルに保つ** — スキルを増やすより既存スキルのパラメータ化を優先。部品を増やすより削る
5. **新モデルが出たらハーネスを見直す** — モデル能力の変化でスキル設計の前提が変わる。Opus 4.6ではコンテキスト1Mにより大規模PDF一括処理が可能になった

## コンテキスト管理

- 長時間の作業（PDF→MDX変換、大量ファイル編集など）では、自然な区切り（1節完了、1ファイル完了など）ごとにユーザーへ `/compact` の実行を提案すること
- コンテキストが逼迫していると判断した場合も同様に提案する

## 推奨ワークフロー

### 初回セットアップ

```
1. /north-star-metric     <- 最重要指標を決める
2. /growth-loops           <- 成長メカニズムを設計
3. /monetization-strategy  <- 収益化手段を検討
4. /competitor-audit       <- 競合を把握
5. /plan-affiliate         <- アフィリエイト商材を調査
```

### 週次運用

```
日曜〜月曜:
1. /weekly-review          <- 実績を振り返る
2. /discover-trends-civil  <- 土木系トレンドを確認
3. /weekly-plan            <- 来週の計画を立てる
```

### 四半期レビュー

```
1. /competitor-audit       <- 競合状況の変化を調査
2. /keyword-gap            <- コンテンツギャップの更新
3. /exam-demand            <- 資格試験需要の再調査
4. /monetization-strategy  <- 収益戦略の見直し
5. /audit-ads              <- 広告・アフィリエイトの効果検証
6. /pre-mortem             <- リスクの再評価
```

### 試験シーズン対応

```
試験2-3ヶ月前:
1. /discover-exam-season   <- 季節性戦略を立案
2. /exam-demand --exam XX  <- 該当試験の需要調査
3. /plan-affiliate         <- 教材アフィリエイト企画
```
