# doboku-note - 1級土木施工管理技士 特化サイト

1級土木施工管理技士の受験者向け技術ノート・試験対策サイト。Next.js + MDX + Cloudflare Pages で構築。

## 設計思想

- **サイトの焦点**: **1級土木施工管理技士** と **技術士（総合監理技術部門）** に特化。ユーザーが「ここだけで合格できる」体験を提供
- **コンテンツ管理**: 
  - すべてのコンテンツ（試験対策・過去問・キーワード）を `.local/r2/posts/{slug}/article.mdx` で一元管理
  - frontmatter の `published: true/false` フラグで公開・下書き管理
  - frontmatter の `category` と `tags` で分類・検索対応
  - 画像は `.local/r2/posts/{slug}/img/` に集約
- **URL構造**: `/docs/{slug}` の完全フラット設計。category + tags でグループ化を実現
- **コンテンツの流れ**: Obsidian（ステージング）→ doboku-note（プロダクション）→ iOSアプリ（過去問演習）
- **収益モデル**: AdSense + アフィリエイト + note有料記事 + iOSアプリ（サブスク）
- **詳細**: `docs/project/01_設計思想.md`

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 + next-mdx-remote |
| 言語 | JavaScript (ESM), MDX |
| 数式 | KaTeX (remark-math + rehype-katex) |
| 図表 | Mermaid |
| 検索 | MiniSearch (クライアントサイド全文検索) |
| 分析 | Google Analytics (gtag: G-8VXJ1RL1HG) |
| 広告 | Google AdSense (ca-pub-7995274743017484) |
| 画像配信 | Cloudflare R2 (`storage.doboku-note.com`) |
| ホスティング | Cloudflare Pages |
| CI/CD | GitHub Actions → Cloudflare Pages |

## ディレクトリ構成

```
.local/r2/posts/                    # すべてのコンテンツ（dev環境）
  civil-construction-1/             # 1級土木施工管理技士（個別ファイル名）
    guide/                          #   試験ガイド（6ファイル）
      strategy.mdx
      four-management.mdx
      concrete-key-points.mdx
      earthwork-key-points.mdx
      law-key-points.mdx
      concrete-maintenance.mdx
    primary/                        #   第1次試験・過去問（24ファイル: H26〜R07）
      h26-a.mdx, h26-b.mdx, ...
      r01-a.mdx, r01-b.mdx, ...
      img/                          #   過去問の図版
    secondary/                      #   第2次試験（5分野×2ファイル + R03〜R07過去問5ファイル）
      concrete/basics.mdx, past-problems.mdx
      earthwork/basics.mdx, past-problems.mdx
      construction-plan/basics.mdx, past-problems.mdx
      quality-management/basics.mdx, past-problems.mdx
      experience-writing/guide.mdx, examples.mdx
      r03.mdx, r04.mdx, ... r07.mdx
    textbook/                       #   テキスト教科書MDX変換（Convention B: article.mdx）
      construction-mgmt-overview/article.mdx
      demolition/article.mdx
      schedule-management/article.mdx
      surveying/article.mdx
  pe-comprehensive-management/      # 技術士・総合技術監理（article.mdx 規約）
    exam-index/article.mdx          #   試験インデックス
    section-3-1-human-behavior/article.mdx  # 出題セクション
    [... 他の出題セクション ...]
    r01-primary/article.mdx         #   過去問
    [... 他の過去問 ...]
    followership/article.mdx        #   キーワード（100トピック）
    [... 他のキーワード ...]

src/                                # カスタムコンポーネント・CSS・レイアウト
  lib/
    docs.ts                         # getDoc(), getAllDocSlugs()等
  app/
    docs/[...slug]/page.tsx         # 全ドキュメントページの動的ルート（フラット）
    category/[slug]/page.tsx        # カテゴリ一覧ページ

docs/project/            # プロジェクト管理ドキュメント
.github/workflows/     # CI/CD
```

**注**: `.local/r2/posts/` は `.gitignore` 対象。R2（Cloudflare）またはローカルで初期化。

## サイト構成（ナビバー）

**フラット URL 設計** — すべてのコンテンツは `/docs/{slug}` でアクセス可能。カテゴリ・タグは frontmatter で管理。

### 主要コンテンツ（フォーカス試験）

| 試験名 | category | 主要 slug 例 | 現状 |
|---|---|---|---|
| **1級土木施工管理技士** | `civil-construction-1` | `civil-construction-1-guide`, `civil-construction-1-primary-2024` | ✅ 実装中 |
| **技術士（総合技術監理技術部門）** | `pe-comprehensive-management` | `cem-study-guide`, `section-3-1-human-behavior`, `r01-primary` | ✅ 実装中 |

### 補助コンテンツ（土木知識）

| 分野 | category 例 | 主要 slug 例 | 用途 |
|---|---|---|---|
| 土木一般 | `civil-general` | `concrete-types`, `surveying-basics` | 両試験で共用 |
| 施工管理 | `construction-management` | `quality-control`, `safety-management` | 両試験で共用 |
| キーワード・法規 | `keywords-law` | `civil-engineering-law`, `construction-standards` | 受験知識 |

**参考**: すべてのコンテンツは `/docs/{slug}` でアクセス。ナビゲーションは `category` 値でグループ化し、タグで検索可能。

## URL設計ルール

**フラット URL 戦略** — 階層的なカテゴリナビゲーションを廃止し、すべてのコンテンツを `/docs/{slug}` で直接アクセス可能に。

### ディレクトリ → URL マッピング

2つのファイル命名規約が共存する。どちらも `src/lib/docs.ts` の `findMdxFiles()` が自動処理する。

#### Convention A: 個別ファイル名（civil-construction-1 で使用）
1つのディレクトリに複数ファイルがある場合。ファイル名がスラッグに含まれる。
```
.local/r2/posts/civil-construction-1/guide/strategy.mdx
  → /docs/civil-construction-1-guide-strategy

.local/r2/posts/civil-construction-1/primary/h26-a.mdx
  → /docs/civil-construction-1-primary-h26-a

.local/r2/posts/civil-construction-1/secondary/concrete/basics.mdx
  → /docs/civil-construction-1-secondary-concrete-basics
```

#### Convention B: article.mdx（pe-comprehensive-management で使用、新規コンテンツ推奨）
1トピック1ディレクトリの場合。`article.mdx` はスラッグから除外される。
```
.local/r2/posts/pe-comprehensive-management/followership/article.mdx
  → /docs/pe-comprehensive-management-followership

.local/r2/posts/pe-comprehensive-management/r01-primary/article.mdx
  → /docs/pe-comprehensive-management-r01-primary
```

**新規コンテンツは Convention B（article.mdx）を推奨。** 1ディレクトリに複数ファイルが必要な場合のみ Convention A を使用。

### frontmatter による分類（カテゴリ + タグ）

全コンテンツの frontmatter に以下を必須記載：

```yaml
---
title: "1級土木施工管理技士 試験ガイド"
description: "試験概要、勉強方法、過去問傾向"
category: "civil-construction-1"           # 主要カテゴリ（試験名など）
tags: ["guide", "exam-preparation"]        # 分類・検索用タグ
published: true                            # 公開フラグ（false=下書き）
---
```

**category の選択肢**:
- `civil-construction-1` — 1級土木施工管理技士
- `pe-comprehensive-management` — 技術士総合技術監理技術部門
- `civil-general` — 土木一般知識（両試験共用）
- `construction-management` — 施工管理知識（両試験共用）
- `keywords-law` — キーワード・法規（補助）

**tags の例**:
- `guide` — 試験ガイド・勉強方法
- `primary` — 第1次試験対策
- `secondary` — 第2次試験対策
- `past-questions` — 過去問
- `keyword` — キーワード解説

### 複数試験対応コンテンツ

frontmatter に複数カテゴリを参照する方法（要検討）:
```yaml
# パターン1: category は主要試験、tags に補助試験を列挙
category: "civil-construction-1"
tags: ["shared-with-pe"]

# パターン2: exams 配列で明示（実装に応じて）
exams: ["civil-construction-1", "pe-comprehensive-management"]
```

このルールにより、新試験対応時の重複排除と SEO 効率を両立します。

## コンテンツ作成規約

### ペルソナ・コンテンツ原則

- 詳細は `.claude/content-principles.md` を参照
- すべてのコンテンツは「実務経験10年以上の総監部門受験者」がスマホで読むことを前提に作成する
- 定義や公式の前に「なぜ重要か」を1〜2文で示す
- 表・箇条書きの前に必ず文脈を示す導入文を置く
- ベンチマーク: BCP（事業継続計画）ページの構成を品質基準とする

### ファイル・メタデータ

- ファイル形式: MDX
- 日本語で記述
- slug は英数字 + ハイフン（URL にするため）
- frontmatter には `title`, `description`, `category`, `tags`, `published` を必須記載

### 日本語テキストの品質管理

- MDXファイルに日本語テキストを書き込んだ後、必ず Grep で `��`（Unicode置換文字 U+FFFD）を検索し、文字化けがないことを確認すること
- LLM出力時にマルチバイト文字が破損する場合がある（例: `バック��ップ` → `バックアップ`、`キ���ワード` → `キーワード`）
- 文字化けが見つかった場合は即座に修正すること

### MDXコンポーネント

MDX内で使える主要コンポーネント（`src/lib/component-loader/index.ts` で登録済み）:

- `<Callout type="info|warning|tip|error" title="...">children</Callout>` — 補足・注意ボックス
- `<ExamPoint summary="要約文" items={["項目1", "項目2"]} />` — 試験対策ポイント専用ボックス（青タイトル + マーカー付き要約 + 箇条書き）
- `<CustomUnorderedList title="..." style="modern|elegant|checklist|summary" items={[...]} />` — スタイル付きリスト
- `<RelatedKeywords items={[{ label: "名前", slug: "slug" }]} />` — 関連キーワードリンクタグ（slugでキーワードページへリンク、slug省略で灰色テキスト）
- `<details><summary>解答・解説</summary>...</details>` — 開閉式セクション（過去問で使用）

### 過去問MDXの構造ルール

択一式過去問は以下を遵守:
- 設問番号は **H2**（`## Ⅰ-1-1` / `## 問題 No.1`）— TOCに表示される唯一の見出し
- `toc_max_heading_level: 2` を frontmatter に設定
- 回答・解説は `<details>/<summary>` で開閉式にする
- details内に **H2/H3見出しを使わない**（`**太字**` で代替）
- 関連キーワードは `<RelatedKeywords>` コンポーネントを使用（slug指定でキーワードページへリンク）
- キーワードページ側の「過去問での出題」セクションにバックリンクを追加する（双方向リンク）
- 試験対策ポイントは `<ExamPoint>` コンポーネントを使用
- 詳細テンプレートは `.claude/skills/content/cem-pdf-to-mdx/SKILL.md` を参照

### 数式・図表

- 数式: `$$...$$` (ブロック) / `$...$` (インライン) + KaTeX
- 図表: Mermaid コードブロック
- スクリーンショット・図版: `.local/r2/posts/{slug}/img/` に配置

### モバイル視認性

- **計算手順を表（Markdown table）で表現しない** — モバイルで横スクロールが発生し、計算式が途中で折り返されて読みにくくなる。番号付きリストで1行1ステップに記述する
- **表が適切な場面**: 情報の比較・一覧（選択肢の対比、分類表、財務三表の構成など）。データに「計算→結果」の流れがない静的な情報
- 3列以上の表を作る場合、モバイルでの横スクロールを意識し、各セルの文字数を短く保つ

### 画像配信

画像は R2（Cloudflare）から配信。Git には含めない。

- **R2 URL（本番）**: `https://storage.doboku-note.com/posts/{slug}/img/{ファイル名}`
- **MDX での参照**: `<img src="/posts/{slug}/img/{ファイル名}" />`
- **ローカル開発**: `public/posts` → `.local/r2/posts` のシンボリックリンク経由で配信
- **本番**: Cloudflare Pages `_redirects` で R2 にリダイレクト
- **ダウンロード（ローカル初期化）**: `/sync-r2-images` または `npm run download-images`
- **アップロード（R2反映）**: `node scripts/upload-images-to-r2.mjs` （実装予定）
- `.local/r2/posts/**/img/` は `.gitignore` 対象
- `static/img/` はサイト共通素材（favicon, logo等）専用

### frontmatter テンプレート

```yaml
---
title: "ページタイトル"
description: "50〜160文字の説明"
category: "civil-construction-1"     # 試験または分野
tags: ["guide", "primary"]           # 分類タグ（複数可）
published: true                      # false なら下書き・非表示
---
```

## デプロイ

- **本番**: `main` ブランチへの push で GitHub Actions → Cloudflare Pages に自動デプロイ
- **手動**: `npm run build && npx wrangler pages deploy build --project-name=doboku-note`
- **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 頻用コマンド

```bash
npm run dev               # ローカル開発サーバー起動（ポート3020、自動ポートクリーンアップ込み）
/dev-start                # 上記と同じ（スキルから起動する場合）
npm run build             # 本番ビルド（generateStaticParams で /docs/{slug} を生成）
npm run serve             # ビルド結果のプレビュー
npm run type-check        # TypeScript チェック

# 画像・コンテンツ管理
/sync-r2-images           # R2 上の画像をローカルに同期（初回・追加時）
npm run upload-images-r2  # .local/r2/posts/**/img/ を R2 にアップロード

# その他
npm run lint              # ESLint チェック
npm run pages:deploy      # Cloudflare Pages に手動デプロイ
```

**Note**: `npm run dev` 実行時、`predev` スクリプトが自動的に実行され、ポート3020が使用中の場合は強制終了（`taskkill /F /T`）してからサーバーを起動します。毎回ポート番号が変わることはなくなりました。

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

### analytics — サイト分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策webサイト作成）では不要。
Phase 2（note記事展開・iOSアプリ開発）時に以下を復活：
- `/fetch-gsc-data` — Google Search Console のデータ取得
- `/fetch-ga4-data` — Google Analytics 4 のアクセスデータ取得
- `/seo-audit` — SEO 総合監査

### dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/dev-start` | ポート3020をクリーンアップして開発サーバー起動 | `.claude/skills/dev/dev-start/SKILL.md` |
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/reset-git-history` | Git 履歴リセット | `.claude/skills/dev/reset-git-history/SKILL.md` |
| `/allow-tool` | ツール許可を settings.local.json に追加 | `.claude/skills/dev/allow-tool/SKILL.md` |
| `/sync-r2-images` | R2上の画像をローカルに同期（npm run dev で画像が見えないとき） | `.claude/skills/dev/sync-r2-images/SKILL.md` |
| `/code-review` | Next.jsコード品質レビュー（セキュリティ・パフォーマンス・保守性・a11y） | `.claude/skills/dev/code-review/SKILL.md` |

### content — コンテンツ作成

#### 試験対策ガイド生成（複数資格対応・テンプレート駆動）

| スキル | 用途 | 対応試験 | 汎用化 | 定義 |
|---|---|---|---|---|
| `/exam-guide` | 試験対策ガイド生成（既存資産再構成） | civil-construction-1 | Phase 2で `--exam {id}` パラメータ化予定 | `.claude/skills/content/exam-guide/SKILL.md` |
| `/pe-exam-guide` | 技術士試験対策ガイド生成（既存資産＋公開情報） | pe | Phase 2で統合予定 | `.claude/skills/content/pe-exam-guide/SKILL.md` |

**テンプレート管理**: `.claude/skills/content/templates/exam-guide/` （新資格追加時は設定ファイル追加のみ）

#### 試験問題集インポート（複数資格対応予定）

| スキル | 用途 | 対応試験 | 汎用化 | 定義 |
|---|---|---|---|---|
| `/exam-questions-import` | 試験第1次問題集PDF→MDX変換 | civil-construction-1 | Phase 2で汎用化検討 | `.claude/skills/content/exam-questions-import/SKILL.md` |
| `/exam-questions-2-import` | 試験第2次問題集PDF→MDX変換 | civil-construction-1 | Phase 2で汎用化検討 | `.claude/skills/content/exam-questions-2-import/SKILL.md` |

#### 汎用的なコンテンツ作成スキル

| スキル | 用途 | 定義 |
|---|---|---|
| `/audit-staging` | Obsidianステージングの公開準備度監査 | `.claude/skills/content/audit-staging/SKILL.md` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `.claude/skills/content/promote-to-site/SKILL.md` |
| `/pdf-to-mdx` | PDF/画像からテキスト抽出→MDX変換 | `.claude/skills/content/pdf-to-mdx/SKILL.md` |
| `/clean-pdf-artifacts` | PDF変換残骸の自動検出・除去 | `.claude/skills/content/clean-pdf-artifacts/SKILL.md` |
| `/check-mdx` | MDX構文チェック | `.claude/skills/content/check-mdx/SKILL.md` |
| `/check-links` | 外部リンク切れ検出（HTTP HEAD検証） | `.claude/skills/content/check-links/SKILL.md` |
| `/verify-content` | MDX内容をソースPDFと照合・検証 | `.claude/skills/content/verify-content/SKILL.md` |
| `/qa-pdf-mdx` | PDF→MDX変換の品質検証・修正（照合agent＋修正agent） | `.claude/skills/content/qa-pdf-mdx/SKILL.md` |
| `/add-exam-answers` | 択一式過去問MDXの未解答設問に正答PDF準拠の解答・解説を追加 | `.claude/skills/content/add-exam-answers/SKILL.md` |
| `/keyword-page` | 総合技術監理キーワードページの作成・校正 | `.claude/skills/content/keyword-page/SKILL.md` |
| `/review-mobile` | モバイル視認性・可読性レビュー（表の適切性・数式・簡潔性） | `.claude/skills/content/review-mobile/SKILL.md` |

#### PDF→MDX 試験特化スキル

| スキル | 用途 | 定義 |
|---|---|---|
| `/cem-pdf-to-mdx` | 技術士CEM用PDF→MDX変換（論文・事例特化） | `.claude/skills/content/cem-pdf-to-mdx/SKILL.md` |
| `/civil-construction-1-pdf-to-mdx` | 1級土木用PDF→MDX変換（過去問・基準特化） | `.claude/skills/content/civil-construction-1-pdf-to-mdx/SKILL.md` |

### ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7カテゴリ・重大度判定） | `.claude/skills/ui/design-review/SKILL.md` |

### strategy — 競合調査・市場分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策webサイト作成）では不要。
Phase 2（note記事展開・iOSアプリ開発）時に以下を復活：
- `/keyword-gap` — GSC + 競合比較でコンテンツギャップを特定
- `/exam-demand` — 資格試験の検索需要調査・不足コンテンツ提案
- `/discover-exam-season` — 試験日程に基づく季節性コンテンツ戦略
- `/plan-affiliate` — 書籍・教材・通信講座のアフィリエイト記事企画

**その他のスキル** （competitor-audit, discover-trends-civil, content-roadmap）は Phase 3 で復活予定。

### 複数資格対応の進め方（Phase別）

複数の土木系資格試験（1級土木・技術士・コンクリート技士・測量士等）に対応するため、以下の段階的アプローチを採用しています。

#### Phase 1（現在 2026-04-01）：テンプレート外部化

スキル本体は試験特化のまま。**試験固有の設定をテンプレートフォルダで管理**し、新資格追加時はスキル追加を不要に。

```
/exam-guide (1級土木施工管理技士)
  → 設定参照: .claude/skills/content/templates/exam-guide/civil-construction-1.md

/pe-exam-guide (技術士建設部門)
  → 設定参照: .claude/skills/content/templates/exam-guide/pe.md
```

**新資格追加時の作業**:
1. `templates/exam-guide/{exam-id}.md` を新規作成（テンプレートのコピー＋設定入力）
2. スキル側は変更なし

#### Phase 2（2026年秋予定）：スキル汎用化へリファクタリング

スキル側でパラメータ化。複数試験を1つのスキルで処理。

```
/exam-guide --exam {exam-id} --topic {topic}
  ↓ 内部で templates/exam-guide/{exam-id}.md を読み込み

/pe-exam-guide → 廃止（/exam-guide に統合）
```

**メリット**: スキル数削減。ハーネス設計原則4「スキルを増やすより既存スキルのパラメータ化を優先」に完全準拠。

#### Phase 3（2027年以降）：医師・弁護士など他分野対応

同じテンプレート駆動アプローチで、医療系・法律系資格にも対応可能。スキル追加ゼロ。

### ads — 広告・アフィリエイト（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策webサイト作成）では不要。
Phase 2（note記事展開・iOSアプリ開発）時に以下を復活：
- `/register-affiliate-banner` — アフィリエイトバナーの登録
- `/audit-ads` — AdSense・アフィリエイトの現状監査と最適化提案

## エージェント

`.claude/agents/` に定義されたサブエージェント群。Generator/Evaluator分離の原則に基づき設計。

| エージェント | 役割 | 種別 | 担当スキル | Phase 1対応 |
|---|---|---|---|---|
| `content-qa` | コンテンツ品質評価（5軸ルーブリック） | Evaluator | check-mdx, verify-content, qa-pdf-mdx, clean-pdf-artifacts | ✅ 運用中 |
| `strategy-advisor` | 戦略・PDCA | Generator | weekly-plan, weekly-review, critical-review, pre-mortem | ✅ 運用中（⏸️ 競合分析・keyword-gap等はPhase 2で復活） |
| `seo-auditor` | SEO 監査（Phase 2で復活） | Evaluator | seo-audit, fetch-gsc-data, fetch-ga4-data | ⏸️ Phase 2で復活 |
| `content-planner` | コンテンツ企画（Phase 2で復活） | Generator | discover-exam-season, exam-demand, keyword-gap | ⏸️ Phase 2で復活 |
| `cem-advisor` | CEM試験対策（総合技術監理） | Generator | cem-content-generate, cem-study-plan（実装予定） | 🚧 計画段階 |

### チーム連携パターン（Phase 1）

| シナリオ | エージェント連携 |
|---|---|
| **Phase 1 開発フロー** | 1. PDF→MDX変換 → 2. **content-qa**（品質評価）→ 3. `/deploy`（本番反映） |
| 週次 PDCA（簡略版） | strategy-advisor（weekly-review → weekly-plan） |
| CEM試験対策 | cem-advisor（cem-content-generate → cem-study-plan） |

**注**: 月次企画・四半期レビュー・試験シーズン対策・広告最適化は Phase 2 で再開予定。

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

## 推奨ワークフロー（Phase 1）

### 週次運用

```
日曜〜月曜:
1. /weekly-review          <- 実績を振り返る（進捗・コンテンツ品質）
2. /weekly-plan            <- 来週の計画を立てる（PDF→MDX変換・デプロイスケジュール）
```

### PDF→MDX変換フロー

```
1. PDF をスキル（/pdf-to-mdx, /civil-construction-1-pdf-to-mdx等）で MDX に変換
2. /check-mdx で構文チェック
3. content-qa エージェントで品質評価（5軸ルーブリック）
4. 改善・修正（必要に応じて /verify-content で PDF と照合）
5. /deploy で Cloudflare Pages に本番反映
```

### リスク評価

```
必要に応じて:
1. /critical-review        <- 重大なリスクを批判的に評価
2. /pre-mortem             <- 失敗シナリオをシミュレーション
```

**注**: 月次企画・四半期レビュー・競合調査・試験シーズン対策は Phase 2 で開始予定。
