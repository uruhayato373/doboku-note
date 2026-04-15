# doboku-note - 1級土木施工管理技士 特化サイト

1級土木施工管理技士の受験者向け技術ノート・試験対策サイト。Next.js + MDX + Cloudflare Pages で構築。

## リファレンス索引

プロジェクトの判断に必要な情報は本ファイルに集約。詳細・手順・一覧は `.claude/reference/` 配下と `docs/project/` 配下の各ファイルを都度 Read する。

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [.claude/reference/content-authoring.md](.claude/reference/content-authoring.md) | MDX コンポーネント・過去問構造・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき |
| [.claude/reference/exam-content-policy.md](.claude/reference/exam-content-policy.md) | 試験別コンテンツ整備方針＋コンテンツ別レビュー視点＋新資格追加手順 | PDF→MDX 変換・品質レビュー時 |
| [.claude/reference/skills-registry.md](.claude/reference/skills-registry.md) | 全スキル一覧（management / dev / content / ui / marketing / analytics / strategy / ads）＋Phase 別運用メモ | 利用可能なスキル探索・新スキル重複チェック |
| [.claude/reference/agents-registry.md](.claude/reference/agents-registry.md) | エージェント詳細表＋チーム連携パターン＋Generator/Evaluator 分離原則 | サブエージェント呼出時の担当範囲確認 |
| [.claude/reference/workflows.md](.claude/reference/workflows.md) | 週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・Phase 別ロードマップ | 週次 PDCA・変換作業・キーワードページ作成時 |
| [.claude/content-principles.md](.claude/content-principles.md) | コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成等） | キーワードページ執筆・評価時 |
| `docs/project/01_設計思想.md` | プロジェクトの設計思想の詳細 | 長期方針・コンテンツ戦略検討時 |
| `docs/project/02_事業戦略.md` | v3 事業戦略 | 収益化・差別化戦略の確認時 |
| `docs/project/05_収益化戦略.md` | 収益化戦略（v3） | note・YouTube・iOS アプリ戦略検討時 |

## 設計思想

- **サイトの焦点**: **1級土木施工管理技士** と **技術士（総合監理技術部門）** に特化。ユーザーが「ここだけで合格できる」体験を提供
- **コンテンツ管理**: すべてのコンテンツを `.local/r2/posts/{slug}/article.mdx`（または Convention A の個別ファイル）で一元管理。frontmatter の `published` で公開管理、`category`/`tags` で分類
- **URL 構造**: `/docs/{slug}` の完全フラット設計。category + tags でグループ化
- **コンテンツの流れ**: Obsidian（ステージング）→ doboku-note（プロダクション）→ iOS アプリ（過去問演習）
- **収益モデル**: AdSense + アフィリエイト + note 有料記事 + **YouTube** + iOS アプリ（サブスク）
- **中核差別化（v3・2026-04-13）**: 運営者本人が 2026-07 に技術士総監 2 次筆記を受験。**合格体験を note 高単価商品・YouTube・iOS アプリの3本柱で活用**
- **詳細**: `docs/project/01_設計思想.md`, `docs/project/02_事業戦略.md`（v3）, `docs/project/05_収益化戦略.md`（v3）

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
.local/r2/posts/                    # すべてのコンテンツ（git 追跡下）
  civil-construction-1/             # 1級土木施工管理技士（Convention A: 個別ファイル名）
    guide/                          #   試験ガイド
    primary/                        #   第1次試験・過去問（H26〜R07）
    secondary/                      #   第2次試験（5分野 + R03〜R07）
    textbook/                       #   教科書 MDX（Convention B: article.mdx）
  pe-comprehensive-management/      # 技術士・総合技術監理（Convention B: article.mdx）
    exam-index/article.mdx          #   試験インデックス
    section-*/article.mdx           #   出題セクション
    r**-primary/article.mdx         #   過去問
    {keyword}/article.mdx           #   キーワード（100トピック）

src/                                # カスタムコンポーネント・CSS・レイアウト
  lib/docs.ts                       # getDoc(), getAllDocSlugs() 等
  app/docs/[...slug]/page.tsx       # 全ドキュメントページの動的ルート（フラット）

docs/project/                       # プロジェクト管理ドキュメント
.claude/reference/                  # 作業マニュアル（詳細・一覧・手順）
.claude/skills/                     # スキル定義
.claude/agents/                     # サブエージェント定義
.github/workflows/                  # CI/CD
```

**注**: `.local/r2/posts/` は git 追跡下（MDX・画像ともに）。複数 PC 間の同期を git 経由で行う。R2 は本番配信用ミラー。

## URL 設計ルール

**フラット URL 戦略** — すべてのコンテンツを `/docs/{slug}` で直接アクセス可能に。

### ディレクトリ → URL マッピング

2 つのファイル命名規約が共存する。どちらも `src/lib/docs.ts` の `findMdxFiles()` が自動処理する。

**Convention A: 個別ファイル名**（civil-construction-1 で使用）
```
.local/r2/posts/civil-construction-1/guide/strategy.mdx
  → /docs/civil-construction-1-guide-strategy

.local/r2/posts/civil-construction-1/primary/h26-a.mdx
  → /docs/civil-construction-1-primary-h26-a
```

**Convention B: article.mdx**（pe-comprehensive-management で使用、新規コンテンツ推奨）
```
.local/r2/posts/pe-comprehensive-management/followership/article.mdx
  → /docs/pe-comprehensive-management-followership
```

**新規コンテンツは Convention B（article.mdx）を推奨。** 1 ディレクトリに複数ファイルが必要な場合のみ Convention A を使用。

### frontmatter（必須項目）

```yaml
---
title: "ページタイトル"
description: "50〜160文字の説明"
category: "civil-construction-1"     # civil-construction-1 | pe-comprehensive-management | civil-general | construction-management | keywords-law
tags: ["guide", "primary"]           # guide | primary | secondary | past-questions | keyword 等
published: true                      # false なら下書き・非表示
---
```

テンプレート詳細・複数試験対応パターン・MDX コンポーネント仕様は [.claude/reference/content-authoring.md](.claude/reference/content-authoring.md) を参照。

## コンテンツ作成の必須ルール

MDX を書くときに **毎回守るべき最低限** のルール。詳細な規約（ペルソナ・コンポーネント仕様・過去問構造・モバイル視認性詳細）は [.claude/reference/content-authoring.md](.claude/reference/content-authoring.md)、品質ルールの真実源は [.claude/content-principles.md](.claude/content-principles.md)。

### 日本語テキストの品質管理

- MDX ファイルに日本語テキストを書き込んだ後、必ず Grep で `��`（Unicode 置換文字 U+FFFD）を検索し、文字化けがないことを確認すること
- LLM 出力時にマルチバイト文字が破損する場合がある（例: `バック��ップ` → `バックアップ`）
- 文字化けが見つかった場合は即座に修正すること

### MDX ファイル書き込みの規約

- `.local/r2/posts/` 配下の MDX は **CRLF（Windows 改行）** が事実上の標準（691 ファイル中 99.9%）
- `pre-commit` フック（`scripts/pre-commit-mdx.mjs`）が改行コード混在（CRLF + LF）を検出して reject する
- スクリプトで MDX ファイルを書き込む場合は **必ず `scripts/lib/mdx-io.mjs` の `readMdxFile` / `writeMdxFile` / `transformMdxFile` を使用すること**
  - 直接 `readFileSync` / `writeFileSync` を使うと改行コード混在が発生し、pre-commit で 100 ファイル単位で reject される（過去事例あり）
  - `gray-matter` の `matter.stringify` や文字列連結は LF のみを出力するため、必ず `writeMdxFile` を経由すること
- 推奨パターン:
  ```javascript
  import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';
  const { raw, eol } = readMdxFile(filePath);
  const newRaw = doSomething(raw);
  writeMdxFile(filePath, newRaw, eol); // 元の改行コードを維持
  ```

### その他の必須ルール

- **frontmatter 必須項目**: `title`, `description`, `category`, `tags`, `published`
- **絵文字禁止**: 装飾絵文字（❌✅💡🔑📌⚠️ 等）は本文に使わない。`<Callout type="...">` で表現する
- **数式**: KaTeX 一択（`$$...$$` / `$...$`）
- **表は 2 軸比較のみ**: 4 列以上禁止、キーバリュー表は散文化、計算手順は番号付きリスト
- **見出し階層**: H1 = ページタイトル（frontmatter から自動生成）、本文は H2 以下

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

**Note**: `npm run dev` 実行時、`predev` スクリプトが自動的に実行され、ポート 3020 が使用中の場合は強制終了してからサーバーを起動する。

## ハーネス設計原則

エージェント・スキルの設計・改修時に従う 6 原則:

1. **Generator と Evaluator を分離する** — 作る役と評価する役を同じエージェントに担わせない。PDF→MDX 変換後の品質評価は `content-qa` エージェントが行う
2. **「何を作るか」を先に合意する** — SKILL.md の変換ルール（frontmatter、見出し構造、表・図の形式）が完成の定義。曖昧なまま変換を始めない
3. **主観をルーブリック化する** — 品質は `content-qa` の5軸ルーブリック（構造正確性 30%・テキスト忠実度 25%・表図数式 20%・MDX 互換性 15%・メタデータ品質 10%）で定量評価
4. **ハーネスはできるだけシンプルに保つ** — スキルを増やすより既存スキルのパラメータ化を優先。部品を増やすより削る
5. **新モデルが出たらハーネスを見直す** — モデル能力の変化でスキル設計の前提が変わる。Opus 4.6 ではコンテキスト 1M により大規模 PDF 一括処理が可能になった
6. **Opus で考え、Sonnet で実行する** — 親エージェント（Claude Code 本体）は Opus で計画・判断・統合を行い、サブエージェントは **原則 Sonnet** で高速・低コストに実行する。新規エージェントの `model:` 指定ルール:
   - **`model: sonnet`（デフォルト）** — Generator（コンテンツ生成・リライト・データ収集）および手順化されたルーブリック評価を行う Evaluator。ほぼ全てのサブエージェントはここに該当する
   - **`model: inherit`** — 深い戦略判断・批判的レビュー・事前検死など、親の思考力を借りる必要があるオーケストレーター（例: `strategy-advisor`）。親が Opus のとき Opus で動く
   - **`model: opus` を直接指定しない** — Opus で走らせたいなら親が直接やればよい。サブエージェントに Opus を固定するのは、親が Sonnet のときでも Opus を使いたい特殊ケースのみ
   - **例外を作るときは frontmatter の description と本文「モデル方針」欄に理由を明記する**

### サブエージェント `model:` クイックリファレンス

| エージェント | model | 種別 |
|---|---|---|
| cem-advisor | sonnet | Generator |
| cem-qa | sonnet | Evaluator |
| civil-construction-qa | sonnet | Evaluator |
| content-planner | sonnet | Generator |
| content-qa | sonnet | Evaluator |
| keyword-rewriter | sonnet | Generator |
| seo-auditor | sonnet | Evaluator |
| aidesigner-frontend | sonnet | Generator |
| strategy-advisor | inherit | Orchestrator |

エージェント詳細（担当範囲・連携パターン・Phase 対応）は [.claude/reference/agents-registry.md](.claude/reference/agents-registry.md) を参照。

## コンテキスト管理

- 長時間の作業（PDF→MDX 変換、大量ファイル編集など）では、自然な区切り（1 節完了、1 ファイル完了など）ごとにユーザーへ `/compact` の実行を提案すること
- コンテキストが逼迫していると判断した場合も同様に提案する
