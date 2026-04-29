# doboku-note - 土木・建設系試験対策ハブ

土木・建設系の実務資格受験者向け技術ノート・試験対策サイト。現在は1級土木施工管理技士と技術士（総合技術監理部門）を整備中、将来的に技術士（建設部門）・コンクリート主任技師・コンクリート診断士・行政書士へ段階的に拡張。Next.js + MDX + Cloudflare Pages で構築。

## リファレンス索引

プロジェクトの判断に必要な情報は本ファイルに集約。詳細・手順・一覧は `.claude/reference/` 配下と `docs/project/` 配下の各ファイルを都度 Read する。

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [.claude/reference/content-authoring.md](.claude/reference/content-authoring.md) | MDX コンポーネント・過去問構造・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき |
| [.claude/reference/image-policy.md](.claude/reference/image-policy.md) | 図版種別判定フロー・CC/PD 写真ソース・出典表記・写真 SVG 化禁止ルール | 図/写真を追加・置換するとき |
| [.claude/reference/note-svg-policy.md](.claude/reference/note-svg-policy.md) | note 記事用 図解 SVG/PNG ポリシー（キャンバス・最小フォント・余白・密度上限・失敗パターン） | `docs/note-drafts/**/img/figure-*` を作成・修正するとき |
| [.claude/reference/sns-image-policy.md](.claude/reference/sns-image-policy.md) | SNS 投稿画像ポリシー（IG/X/Shorts のキャンバス・スワイプ方向・記号統一・wrap 算法・長文選択肢自動切替） | `docs/sns-drafts/**/{instagram-carousel,x,youtube-shorts}/img/` を作成・修正するとき |
| [.claude/reference/exam-content-policy.md](.claude/reference/exam-content-policy.md) | 試験別コンテンツ整備方針＋コンテンツ別レビュー視点＋新資格追加手順 | PDF→MDX 変換・品質レビュー時 |
| [.claude/reference/skills-registry.md](.claude/reference/skills-registry.md) | 全スキル一覧（management / dev / content / ui / marketing / analytics / strategy / ads）＋Phase 別運用メモ | 利用可能なスキル探索・新スキル重複チェック |
| [.claude/reference/agents-registry.md](.claude/reference/agents-registry.md) | エージェント詳細表＋チーム連携パターン＋Generator/Evaluator 分離原則 | サブエージェント呼出時の担当範囲確認 |
| [.claude/reference/skills-design-guide.md](.claude/reference/skills-design-guide.md) | Skills 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） | 新規スキル・エージェント作成時 / 既存 description レビュー時 |
| [.claude/reference/workflows.md](.claude/reference/workflows.md) | 週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・Phase 別ロードマップ | 週次 PDCA・変換作業・キーワードページ作成時 |
| [.claude/reference/docs-issue-separation.md](.claude/reference/docs-issue-separation.md) | `docs/project/` md（Why/戦略）と GitHub Umbrella Issue（実行タスク）の役割分離ルール | ロードマップ md 作成・更新時／Umbrella Issue 作成時 |
| [.claude/reference/measurement-incidents.md](.claude/reference/measurement-incidents.md) | 計測データの欠損・誤報・不整合 + 外部検証アクセスの罠（2026-W16 BAILOUT、2026-04-25 Cloudflare Bot 等） | 計測スキル/エージェント設計時・自動起票 Issue 評価時・外部 Validator/ボットを使う作業時 |
| [.claude/reference/data-storage-decision.md](.claude/reference/data-storage-decision.md) | データストレージ判断 ADR（D1 不採用・frontmatter + build-time JSON 継続・再検討トリガー条件） | DB 導入を検討するとき／iOS アプリ着手時／コンテンツ規模が大きく変わるとき |
| [.claude/content-principles.md](.claude/content-principles.md) | コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種使い分け等） | キーワードページ執筆・評価時 |
| [.claude/design-system/principles.md](.claude/design-system/principles.md) | UI・SVG 共通のデザイン原則（レイヤー・コントラスト・カラー）。カラートークンは `src/styles/globals.css` の `--color-*` が真実源 | コンポーネント作成・SVG 図版作成・色選定時 |
| [docs/ui/callout-gallery.md](docs/ui/callout-gallery.md) | Callout 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）。GitHub 画面で視覚確認可能 | MDX で `<Callout type="...">` を選ぶとき |
| [docs/ui/speclist-gallery.md](docs/ui/speclist-gallery.md) | SpecSheetList 5 バリエーションの視覚ギャラリー（ordered / unordered × dot/dash/square） | MDX で `<SpecSheetList>` を選ぶとき |
| [src/components/ui/Callout/README.md](src/components/ui/Callout/README.md) | Callout コンポーネント直下リファレンス（12 種一覧表・デザイン仕様・旧 type 移行表） | Callout を実装・改修・MDX で使うとき |
| [src/components/ui/SpecSheetList/README.md](src/components/ui/SpecSheetList/README.md) | SpecSheetList コンポーネント直下リファレンス（仕様書調リスト、旧 CustomList 統合） | SpecSheetList を実装・改修・MDX で使うとき |
| `.claude/config/` | ツール設定（OGP テンプレ/ルール/改行設定、PSI しきい値・URL リスト等、エージェント編集領域） | OGP・PSI・自動化ツールのルール・閾値を調整するとき |
| `docs/project/01_設計思想.md` | プロジェクトの設計思想の詳細 | 長期方針・コンテンツ戦略検討時 |
| `docs/project/02_事業戦略.md` | v3 事業戦略 | 収益化・差別化戦略の確認時 |
| `docs/project/05_収益化戦略.md` | 収益化戦略（v3） | note・YouTube・iOS アプリ戦略検討時 |
| `docs/project/07_SNS集客戦略.md` | SNS 集客戦略 v5（X / YouTube / Instagram 統合、TTS 完全自動・SNS 量産・共通基盤 sns-common 依存、IG は Carousel + Reels 両軸） | SNS 投稿設計・YouTube/Instagram 自動化検討時 |
| `docs/project/19_note段階投下プラン.md` | note 段階投下プラン（無料＋有料ラインナップ、記事単位の runway） | note コンテンツ発売・受験期コンテンツ設計時 |
| `docs/project/26_Instagram投稿自動化アーキテクチャ.md` | Instagram 投稿自動化アーキテクチャ v3（Carousel + Reels 両軸、YT Shorts mp4 を IG Reels に流用、API 自動投稿、共通基盤 sns-common 依存） | Instagram 投稿設計・SNS 自動化検討時 |
| `docs/project/27_5チャネル動線設計.md` | 5 チャネル動線設計 v1（X / YouTube / Instagram / note / サイトの統合ファネル設計、UTM 統一フォーマット、季節 × チャネルマトリクス、4 Phase 実装ロードマップ） | チャネル間動線・UTM 設計・季節調整検討時、note ↔ サイト境界ルール確認時 |

## 設計思想

- **サイトの焦点**: **土木・建設系の実務資格試験対策ハブ**。現在は **1級土木施工管理技士** と **技術士（総合技術監理部門）** を整備中。将来的に **技術士（建設部門）** / **コンクリート主任技師** / **コンクリート診断士** / **行政書士**（建設業許可等の法務系）へ段階的に拡張。ユーザーが「ここだけで合格できる」体験を軸資格ごとに提供
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
    {keyword}/article.mdx           #   キーワード（649トピック）

src/                                # カスタムコンポーネント・CSS・レイアウト
  lib/docs.ts                       # getDoc(), getAllDocSlugs() 等
  app/docs/[...slug]/page.tsx       # 全ドキュメントページの動的ルート（フラット）

docs/project/                       # プロジェクト管理ドキュメント
docs/textbook/                      # 教材PDF・変換済みMarkdown（試験種別ごと）
.claude/reference/                  # 作業マニュアル（詳細・一覧・手順）
.claude/skills/                     # スキル定義（43 スキル、8 カテゴリ）
  authoring/                        #   記事を作る（6）
  conversion/                       #   外部形式から MDX への変換（3）
  quality/                          #   MDX・note 公開前品質検査（8）
  management/                       #   計画・分析・戦略（11）
  dev/                              #   開発・CI/CD（11）
  analytics/                        #   サイト分析（2）
  social/                           #   SNS 投稿（1）
  ui/                               #   UI/UX デザイン（1）
.claude/agents/                     # サブエージェント定義（14）
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
title: "ページタイトル"              # 表示用（概念名のみ、SEOサフィックスなし）
seoTitle: "ページタイトル | doboku-note"  # <title>タグに出力する完全なSEOタイトル
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
- スクリプトで MDX ファイルを書き込む場合は **必ず `.claude/scripts/lib/mdx-io.mjs` の `readMdxFile` / `writeMdxFile` / `transformMdxFile` を使用すること**
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

- **frontmatter 必須項目**: `title`, `seoTitle`, `description`, `category`, `tags`, `published`
- **絵文字禁止**: 装飾絵文字（❌✅💡🔑📌⚠️ 等）は本文に使わない。`<Callout type="...">` で表現する
- **数式**: KaTeX 一択（`$$...$$` / `$...$`）
- **表は 2 軸比較のみ**: 4 列以上禁止、キーバリュー表は散文化、計算手順は番号付きリスト
- **見出し階層**: H1 = ページタイトル（frontmatter から自動生成）、本文は H2 以下

### UI コンポーネントの必須ルール

- **カードのスタイルはデザイントークンを使う**: `rounded-lg` / `rounded-xl` 等の生の Tailwind 値ではなく、以下のトークンを使用する
  | 用途 | border-radius | box-shadow | hover |
  |---|---|---|---|
  | インライン（Badge 等） | `rounded-card-inline` | なし | - |
  | コンテンツカード（Callout, LinkCard 等） | `rounded-card-content` | `shadow-card-content` | `hover:shadow-card-hover` |
  | セクションカード（RelatedTextbooks 等） | `rounded-card-section` | `shadow-card-section` | - |
  | ヒーロー（CategoryHeader） | `rounded-card-hero` | なし | - |
  - トークンの値は `src/styles/globals.css` の `:root` で定義。変更は CSS 変数のみで全カードに反映される
- **ダークモードのボーダー色を必ず書く**: `border-gray-*` を使う場合、必ず `dark:border-gray-*` を同じ className に含めること。インラインの `borderColor` は dark クラスを上書きするため使用禁止
  - 良い例: `border border-gray-200 dark:border-gray-700`
  - 悪い例: `border border-gray-200`（dark 指定なし）
  - 悪い例: `style={{ borderColor: '#e4edf4' }}`（dark クラスを上書き）
- **pre-commit フック**（`scripts/lint-ui.mjs`）がステージされた `.tsx` ファイルのダークモード未指定ボーダーを検出し、コミットをブロックする
- **色はセマンティックトークンを使う**（UI・SVG 共通）。新規コードは `brand` / `ink-strong` / `ink-body` / `ink-muted` / `positive` / `warn` / `danger` / `surface` を使用する
  | トークン | UI 使用例 | SVG 使用例（リテラル hex） |
  |---|---|---|
  | `brand` | `bg-brand`、`text-brand-deep`、`bg-brand-fill` | `#2e6da4` / `#e8f0fe` / `#1a3a5c` |
  | `ink-strong` | `text-ink-strong` | `#222` |
  | `ink-body` | `text-ink-body` | `#555` |
  | `ink-muted` | `text-ink-muted` | `#8a8a8a` |
  | `positive` / `warn` / `danger` | `bg-positive-fill text-positive` 等 | `#3a7d44`/`#d4a017`/`#b22234` + fill |
  - 真実源は `src/styles/globals.css` の `--color-*` CSS 変数。SVG は `<img src>` で配信されるため CSS 変数は効かず、リテラル hex を書いてコメントでトークン名を併記する（例: `<rect fill="#e8f0fe" />  <!-- brand-fill -->`）
  - 既存の `primary-*` / `accent-*` / `neutral-*` は互換性のため残すが、**新規コードでは使わない**
  - SVG 作成の詳細ルールは [.claude/skills/authoring/create-svg/SKILL.md](.claude/skills/authoring/create-svg/SKILL.md)、デザイン原則は [.claude/design-system/principles.md](.claude/design-system/principles.md) 参照

## 一時ファイルの置き場所

- 視覚検証・図版確認・アドホックな出力（Playwright スクショ、SVG→PNG レンダー、PDF 抽出の中間ファイル等）は **必ず `.tmp/` 配下に出す**
- リポジトリ直下に `*.png` / `*.jpg` / `*.svg` 等を直接出さない（散らかる原因）
- `Stop` フック（`.claude/hooks/check-stray-files.sh`）がリポジトリ直下の untracked 画像ファイルを検知して警告する（ブロックはしない）
- `.tmp/` 配下は gitignore 済み。不要になったら `rm -rf .tmp/*` で一掃してよい
- 詳細: `.tmp/README.md`

## デプロイ

- **本番**: `main` ブランチへの push で GitHub Actions → Cloudflare Pages に自動デプロイ
- **手動**: `npm run build && npx wrangler pages deploy build --project-name=doboku-note`
- **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## ブランチ運用ルール

単独作業（1 ユーザー + 1 エージェント）を既定とし、以下を**常に**守る。

### 基本ルール

- **メイン working tree を直接使う**。worktree は原則使わない（後述の「worktree は例外」参照）
- **`main` は常にデプロイ済みの安定版**。`develop` → `main` への merge は `/deploy` スキル経由でユーザーがタイミングを判断（= deploy の発火）
- **例外: 本番障害の hotfix のみ `--base main` 直 PR を認める**。merge 後は必ず `main` → `develop` へ逆 merge して差分を解消する
- **小修正のたびに main へ push しない**。`develop` に蓄積し、機能まとまり or 週次の単位でまとめて main merge
- **`develop` は週 1 回 `main` から rebase/merge して追従**（`git checkout develop && git merge origin/main`）

### 性質別運用ガイド（粒度の真実源）

変更の性質により PR 要否と粒度を切り替える。「revert 可能性 5% 以上」または「他人/他エージェントとの衝突可能性あり」のいずれかが Yes なら PR、両方とも No なら直 push。

| 性質 | 例 | 運用 |
|---|---|---|
| **ドキュメント系** | `.claude/`, `docs/project/`, `CLAUDE.md`, `content-principles.md`, MDX の小修正 | `develop` 直 commit & push（PR 不要） |
| **バルク content** | `/exam-keyword-cycle` のキーワード群校正、10-15 件規模 | `develop` 直 push を既定。複数サイクルをまとめて視覚確認したい場合のみ週次 1 PR |
| **コード系** | `src/`, `scripts/`, `package.json`, CI 設定、新規スキル、スキーマ変更 | feature ブランチ + PR（base = `develop`） |
| **hotfix** | 本番障害対応 | feature ブランチ + PR（base = `main`、merge 後 main→develop 逆 merge） |

**禁止**: 「キーワード 1 件 = 1 PR」のような過小粒度 PR。PR/ブランチ作成の overhead が作業本体を上回り、worktree 増殖・review 疲弊・自己承認化を招く。

スキル側の扱い: `/pr-create` の `--base` 省略時は `develop`、`/deploy` は `develop` → `main` 経路を担当、`/exam-keyword-cycle` は既定で develop 直 push（PR は `--pr` オプション指定時のみ）。

### エージェントのブランチ取り扱い

- **作業開始時に `git branch --show-current` で現在ブランチを確認する**。ユーザー指示のブランチと異なれば、作業を止めて状況をユーザーに報告する（勝手に `git checkout` で戻さない）
- **feature ブランチでの作業完了（最終コミット完了）後、必ず `develop` に戻る**。未コミット変更が残る場合は戻らず、その旨をユーザーに報告してから判断を仰ぐ
- **`develop` に戻ることは「変更確認」ではなく「ブランチ状態のリセット」が目的**。変更の目視確認は feature ブランチ上（localhost）または PR プレビューで行う

### worktree は例外（原則使わない）

worktree は **ローカル I/O を数倍に膨らませる**（AV スキャナの scan 対象ファイル数が `.next` + `node_modules` の複製分だけ倍増する）。過去、worktree 多発時に Kernel-Power 41 / BugCheck=0 クラスの OS フリーズが発生した実績がある。

**既定: worktree を使わない**。単独作業では `git switch -c claude/<task> develop` でブランチだけ切って作業、merge 後 `git switch develop && git branch -d claude/<task>`。これで HEAD 競合は発生しない（直列作業なので）。

**例外で worktree を使う条件**（すべて満たすときのみ）:

1. 2 エージェント以上が **物理的に同時実行** する（単に「並行っぽい」ではなく、同じ瞬間に 2 プロセスが git 操作する）
2. 同時実行の継続時間が 30 分以上（短時間なら直列化の方が安い）
3. 本当に wall-clock 短縮が必要（量産バッチなど）

上記を満たさないなら worktree は作らない。「念のため」「なんとなく」での作成は禁止。

**例外時の運用**:

- 新規: `git worktree add C:/tmp/doboku-note-wt/<task-name> -b claude/<task-name> develop`
- 完了時（**必須・即時**）: `git worktree remove C:/tmp/doboku-note-wt/<task-name>`
- 同時 worktree 数の上限 = **2**（メイン + 例外 1 つ）。超えるなら古い方を先に片付ける
- node_modules 共有: `cmd //c "mklink /J C:\tmp\doboku-note-wt\<task-name>\node_modules C:\Users\m004195\doboku-note\node_modules"`
- dev server ポート分離: メイン 3020、worktree は 3021 以降

**量産バッチ（多数キーワードの並列校正など）は remote agent を使う**。`/schedule` で Cloud 側に投げれば、ローカル I/O はゼロ。これが worktree 多発の正しい代替策。

### 週次チェック（worktree 孤児防止）

週次 PDCA で `git worktree list` を確認し、使っていない worktree があれば即 `git worktree remove` する。`C:/tmp/doboku-note-wt/` の物理ディレクトリも同時に掃除する（`git worktree prune` では物理削除されない）。

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
npm run generate-webp     # 全 png/jpg を webp 化（skip-exists、新規のみ処理）
npm run update-image-refs # MDX の <img src="...png"> を .webp 参照へ一括置換

# 静的インデックス再生成（build に含まれるが、開発中にオンデマンドでも実行可）
npm run refresh-indexes   # 全静的インデックス一括再生成（backlinks + cross-exam + tags）
npm run build-backlinks   # 過去問⇔キーワード紐付けJSON再生成
npm run build-indexes     # 試験横断キーワード + タグ辞書の再生成

# その他
npm run lint              # ESLint チェック
npm run pages:deploy      # Cloudflare Pages に手動デプロイ
```

**Note**: `npm run dev` 実行時、`predev` スクリプトがポート 3020 のクリーンアップのみ実行する（高速起動）。静的インデックス（backlinks・cross-exam・tags）は `npm run build` 時に自動再生成されるため、本番デプロイ時は常に最新。開発中に過去問やタグを変更した場合は `npm run refresh-indexes` で手動再生成。

### 画像追加時のワークフロー

新しい画像（png / jpg）を追加したとき:

1. `.local/r2/posts/{category}/{slug}/img/foo.png` を配置
2. MDX に `<img src="/posts/{category}/{slug}/img/foo.webp">` で参照（png ではなく **webp を直接指定**）
3. `npm run generate-webp` で webp を生成（または `npm run build` を走らせると `prebuild` が自動実行する）
4. commit + push

**忘れ防止**: `prebuild` が `generate-webp` + `update-image-refs` を自動実行するため、誤って MDX に `.png` 参照を書いても次回 build 時に自動修正される（local build も CI build も同じ動作）。

**R2 アップロード**: `.github/workflows/r2-sync.yml` が main push 時に `.local/r2/posts/**/img/**` の変更を自動で R2 に同期する。手動アップロードは不要。

**OGP 画像は例外**: `ogp.png` は `r2-image-loader.ts` が明示的に `.png` を参照するので webp に書き換えない（`update-image-refs` は `<img src>` のみ対象なので安全）。

## 実装時の行動原則

Andrej Karpathy が指摘した LLM コーディングの典型的失敗（勝手な仮定・過剰設計・無関係な編集・曖昧なゴール）を避けるための 4 原則。本プロジェクト（MDX・スクリプト・エージェント設計）すべてに適用する。

### 1. 考えてから書く（Think Before Coding）

**仮定せず、混乱を隠さず、トレードオフを表に出す。**

- 仮定は明示する。不確かなら勝手に進めず質問する
- 解釈が複数あるときは 1 つを黙って選ばず、候補を提示してユーザーに選ばせる
- よりシンプルな方法があるなら提案する。必要なら押し返す
- 不明点があるときは止まる。何が不明かを言語化してから聞く

**悪い例**: 「MDX の frontmatter を直す」と言われて、勝手に `category` を推測して上書きする
**良い例**: 「`category` の候補は `civil-construction-1` と `civil-general` の 2 つがあります。このページは過去問なのでどちらを選びますか」と確認する

### 2. シンプルさを最優先（Simplicity First）

**問題を解く最小のコード。将来のための仕込みは一切しない。**

- 依頼されていない機能は足さない
- 1 回しか使わないコードに抽象化を入れない
- 要求されていない「柔軟性」「設定可能性」を持ち込まない
- 起こり得ないエラーのハンドリングを書かない
- 200 行書いて 50 行で済むなら書き直す

自問: 「シニアエンジニアがこれを見て『過剰』と言わないか？」答えが Yes なら単純化する。

### 3. 外科的に編集する（Surgical Changes）

**触るべき箇所だけ触る。後片付けは自分が散らかした分だけ。**

既存コード編集時:
- 頼まれていない周辺コード・コメント・フォーマットを「改善」しない
- 壊れていない部分をリファクタリングしない
- 既存スタイルに合わせる（自分の流儀と違っても従う）
- 無関係な dead code に気づいたら **指摘する** — 勝手に消さない

変更が孤児（未使用）を生むとき:
- 自分の変更によって使われなくなった import・変数・関数は消す
- 依頼前から存在していた dead code は消さない（指示があれば別）

テスト: 変更した行すべてがユーザーの依頼に直接紐づくか？

並行エージェント作業時:
- 別のエージェント（別ターミナル・別セッション）が同じリポジトリで同時に作業している可能性がある
- `git diff` で想定外のファイルが出ても、**自分の作業に無関係なファイルは一切触らない**（`git checkout` で復元しない、ステージしない）
- コミット時は `git add` で自分が変更したファイルだけを明示的に指定する（`git add .` や `git add -A` は禁止）
- 他エージェントの変更を誤って破棄すると復旧コストが高い（過去事例: `git checkout` で別エージェントのスキル変更を消失）

### 4. 検証可能なゴールで実行する（Goal-Driven Execution）

**成功条件を定義し、検証が通るまでループする。**

タスクを検証可能な形に翻訳する:
- 「バリデーションを追加」→「不正入力のテストを書き、それを通す」
- 「バグを直す」→「バグを再現するテストを書き、それを通す」
- 「X をリファクタリング」→「リファクタ前後でテストが通ることを確認」
- 「MDX を PDF から変換」→「`/verify-pdf-mdx` でルーブリック ≥ 2.0 に到達」
- 「UI / SSR 構造を大規模に変更」→「deploy 後に `curl https://doboku-note.com/` で body が 10KB 以上 + `<main>` + 主要キーワード（土木/技術士 等）を含むことを確認。Lighthouse の Performance スコアだけでは SSR 壊れを捕捉できない」（出典: [計測事故記録](.claude/reference/measurement-incidents.md) 2026-W16 BAILOUT 事件）

複数ステップのタスクはプランを先に提示する:
```
1. [ステップ] → verify: [チェック]
2. [ステップ] → verify: [チェック]
```

強い成功条件があれば独立してループできる。「動くようにして」のような弱い条件は後から修正を招く。

### この 4 原則が機能している兆候

- 差分の中に不要な変更が混ざらない
- 過剰実装で書き直しが発生しない
- 質問が実装後ではなく実装前に出る

出典: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)（Karpathy の LLM コーディング観察を元にした 4 原則）

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
| cem-qa | sonnet | Evaluator |
| civil-construction-qa | sonnet | Evaluator |
| civil-construction-review | inherit | Evaluator |
| content-planner | sonnet | Generator |
| content-qa | sonnet | Evaluator |
| keyword-rewriter | sonnet | Generator |
| civil-textbook-rewriter | sonnet | Generator |
| metrics-analyzer | sonnet | Evaluator |
| note-link-injector | sonnet | Generator |
| note-figure-auditor | sonnet | Evaluator |
| note-fact-checker | sonnet | Evaluator |
| performance-auditor | sonnet | Evaluator |
| seo-auditor | sonnet | Evaluator |
| strategy-advisor | inherit | Orchestrator |

エージェント詳細（担当範囲・連携パターン・Phase 対応）は [.claude/reference/agents-registry.md](.claude/reference/agents-registry.md) を参照。

**2026-04-23 Phase A で退役**:
- `cem-advisor`（placeholder・未実装スキル）→ Generator は `keyword-rewriter`、Evaluator は `cem-qa`、orchestration は `strategy-advisor`
- `ui-visual-qa` → `/design-review --visual` スキルに統合（視覚回帰をスキル層で完結）
- `aidesigner-frontend` → 直接 Claude 指示 or AIDesigner MCP 直接

## コンテンツ編集時のコミット運用

- `.local/r2/posts/` 配下の MDX を編集したら、**その記事の修正が一区切りついた時点で即コミットする**
- 複数記事をまとめて編集する場合でも、1記事の修正が完了するたびにコミットする
- 理由: 未コミットの変更は git merge / stash / checkout で失われるリスクがある（過去事例: exam-index の修正を複数回行ったが未コミットのまま失われた）
- コミットメッセージ例: `content(pe): exam-index 試験ガイド記事の改善`

## コンテキスト管理

- 長時間の作業（PDF→MDX 変換、大量ファイル編集など）では、自然な区切り（1 節完了、1 ファイル完了など）ごとにユーザーへ `/compact` の実行を提案すること
- コンテキストが逼迫していると判断した場合も同様に提案する
- セッション終了時に状態を引き継ぐ必要があれば、**md ファイルを作らず GitHub Issue** `[Handoff] YYYY-MM-DD <context>`（label: `session-handoff`）を作成する。運用ルールは [.claude/reference/docs-issue-separation.md](.claude/reference/docs-issue-separation.md#session-handoff-issue-運用) 参照

## 情報蓄積の 3 層モデル

状態を持つ情報（open/close したい・誰かが完了判定する）は **GitHub Issue** に一本化する。詳細は [.claude/reference/docs-issue-separation.md](.claude/reference/docs-issue-separation.md) 参照。

| Tier | 置き場 | 例 |
|---|---|---|
| 1. 状態あり | GitHub Issue（`weekly-pdca`, `session-handoff`, `queue`, `task`, `umbrella` 等のラベル） | 週次 PDCA、引き継ぎ、レビュー待ち |
| 2. 固定的知識 | `docs/project/` `.claude/reference/` `.claude/skills/**/SKILL.md` | 戦略、ADR、作業マニュアル、スキル定義 |
| 3. 機械可読データ | `.claude/state/*.json` `.claude/config/*.json` | 計測結果、品質スコア、実験状態 |

**禁止**: `.claude/state/*.md` の新規作成（README.md を除く）
