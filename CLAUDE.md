# doboku-note - 1級土木施工管理技士 特化サイト

1級土木施工管理技士の受験者向け技術ノート・試験対策サイト。Next.js + MDX + Cloudflare Pages で構築。

## 設計思想

- **サイトの焦点**: 1級土木施工管理技士に特化。ユーザーが「ここだけで合格できる」体験を提供
- **コンテンツ管理**: 
  - **ドキュメント** (exam guide など): `content/` に MDX で管理
  - **ブログ記事**: `src/content/posts/` と `drafts/writing/` に MDX で一元管理。frontmatter の `published` フラグで公開管理（`published: false` は非表示）
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
drafts/                # ブログ記事の下書き（Obsidianで編集・git管理・公開前）
  writing/             # 執筆中
  ready/               # 公開待ち（レビュー済み）
src/                   # カスタムコンポーネント・CSS・レイアウト
  content/
    posts/             # ブログ記事（MDX・公開済み）
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
  - ローカル開発: `.local/r2/content/` から API ルート（`src/app/api/content/[...path]/route.ts`）経由で配信
  - 本番: Cloudflare Pages `_redirects` で R2 にリダイレクト
  - **ダウンロード（ローカル初期化）**: `npm run download-images` または `/sync-r2-images`
  - **アップロード（R2反映）**: `node scripts/upload-images-to-r2.mjs --prefix {カテゴリ}`
  - `content/**/img/` は `.gitignore` 対象
  - `static/img/` はサイト共通素材（favicon, logo等）専用

## デプロイ

- **本番**: `main` ブランチへの push で GitHub Actions → Cloudflare Pages に自動デプロイ
- **手動**: `npm run build && npx wrangler pages deploy build --project-name=doboku-note`
- **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 頻用コマンド

```bash
npm run dev               # ローカル開発サーバー（MDX+画像をローカルR2に同期後起動）
npm run build             # 本番ビルド
npm run serve             # ビルド結果のプレビュー
node scripts/sync-r2-content.mjs   # MDXファイル + 画像を .local/r2/content/ と public/content/ に同期
node scripts/upload-images-to-r2.mjs  # MDXファイルと画像をR2にアップロード
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

### analytics — サイト分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策webサイト作成）では不要。
Phase 2（note記事展開・iOSアプリ開発）時に以下を復活：
- `/fetch-gsc-data` — Google Search Console のデータ取得
- `/fetch-ga4-data` — Google Analytics 4 のアクセスデータ取得
- `/seo-audit` — SEO 総合監査

### dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/reset-git-history` | Git 履歴リセット | `.claude/skills/dev/reset-git-history/SKILL.md` |
| `/allow-tool` | ツール許可を settings.local.json に追加 | `.claude/skills/dev/allow-tool/SKILL.md` |
| `/sync-r2-images` | R2上の画像をローカルに同期（npm run dev で画像が見えないとき） | `.claude/skills/dev/sync-r2-images/SKILL.md` |

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
| `/verify-content` | MDX内容をソースPDFと照合・検証 | `.claude/skills/content/verify-content/SKILL.md` |
| `/qa-pdf-mdx` | PDF→MDX変換の品質検証・修正（照合agent＋修正agent） | `.claude/skills/content/qa-pdf-mdx/SKILL.md` |

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
