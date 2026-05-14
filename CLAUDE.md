# doboku-note - 土木・建設系試験対策ハブ

土木・建設系の実務資格受験者向け試験対策サイト。現在は1級土木施工管理技士と技術士（総合技術監理部門）を整備中。Next.js + MDX + Cloudflare Pages で構築。

## プロジェクトコンテキスト

**設計思想** — ユーザーが「ここだけで合格できる」体験を軸資格ごとに提供する試験対策ハブ。Obsidian（ステージング）→ doboku-note（プロダクション）→ iOS アプリ（過去問演習）の流れでコンテンツを管理。収益モデルは AdSense + note 有料記事 + YouTube + iOS アプリ。詳細: `docs/project/01_戦略/02_設計思想.md`、`docs/project/01_戦略/03_事業戦略.md`

**技術スタック**

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

**ディレクトリ**

```
.local/r2/posts/               # すべてのコンテンツ（git 追跡下）
  civil-construction-1/        # 1級土木施工管理技士（Convention A: 個別ファイル名）
  pe-comprehensive-management/ # 技術士・総合技術監理（Convention B: article.mdx）
src/                           # コンポーネント・CSS・レイアウト
docs/project/                  # プロジェクト管理ドキュメント
docs/reference/             # 作業マニュアル（詳細・手順）
.claude/skills/                # スキル定義（44スキル、8カテゴリ）
.claude/agents/                # サブエージェント定義（14）
```

**URL**: すべて `/docs/{slug}` フラット。Convention A（個別ファイル名）と Convention B（`article.mdx`）が共存。新規コンテンツは Convention B 推奨。詳細・frontmatter テンプレ → [content-authoring.md](docs/reference/content-authoring.md)

**frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`

**デプロイ**: `main` push で GitHub Actions → Cloudflare Pages 自動デプロイ。`develop` → `main` は `/deploy` スキル経由でユーザーが判断。

**頻用コマンド**

```bash
npm run dev               # 開発サーバー（ポート 3020）
npm run build             # 本番ビルド
npm run serve             # ビルド結果プレビュー
npm run type-check        # TypeScript チェック
npm run refresh-indexes   # 静的インデックス再生成（backlinks + cross-exam + tags）
npm run generate-webp     # png/jpg → webp 変換
npm run upload-images-r2  # 画像を R2 にアップロード
npm run lint              # ESLint チェック
npm run pages:deploy      # Cloudflare Pages に手動デプロイ
```

---

## リファレンス索引

詳細・手順・一覧は `docs/reference/` 配下と `docs/project/` 配下の各ファイルを都度 Read する。

| 参照先 | 内容 | いつ読むか |
|---|---|---|
| [docs/reference/content-authoring.md](docs/reference/content-authoring.md) | MDX コンポーネント・過去問構造・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき |
| [docs/reference/image-policy.md](docs/reference/image-policy.md) | 図版種別判定フロー・CC/PD 写真ソース・出典表記・写真 SVG 化禁止ルール | 図/写真を追加・置換するとき |
| [docs/reference/note-svg-policy.md](docs/reference/note-svg-policy.md) | note 記事用 図解 SVG/PNG ポリシー（キャンバス・最小フォント・余白・密度上限・失敗パターン） | `docs/note/**/img/figure-*` を作成・修正するとき |
| [docs/reference/note-publish-enhancement.md](docs/reference/note-publish-enhancement.md) | note 記事を公開レベルに引き上げる10工程手順書（網羅性照合／過去問配置／図版／カバー／e-gov リンク／段落分割／検証） | note 記事を新規公開・大規模改善するとき |
| [docs/reference/sns-image-policy.md](docs/reference/sns-image-policy.md) | SNS 投稿画像ポリシー（IG/X/Shorts のキャンバス・スワイプ方向・記号統一・wrap 算法・長文選択肢自動切替） | `docs/sns/{instagram,x,youtube}/` 配下の画像を作成・修正するとき |
| [docs/reference/exam-content-policy.md](docs/reference/exam-content-policy.md) | 試験別コンテンツ整備方針＋コンテンツ別レビュー視点＋新資格追加手順 | PDF→MDX 変換・品質レビュー時 |
| [docs/reference/skills-guide.md](docs/reference/skills-guide.md) | アクティブスキル カテゴリ別早引き＋用途別ガイド（今やること別スキル推奨組み合わせ） | 使えるスキルを素早く探すとき |
| [docs/reference/skills-registry.md](docs/reference/skills-registry.md) | スキルのガバナンス記録（退役ログ・カテゴリ変更履歴・テンプレート駆動設計） | 退役スキル確認・設計変更履歴・新スキル重複チェック |
| [docs/reference/agents-registry.md](docs/reference/agents-registry.md) | エージェント詳細表＋スキル→エージェント呼出マップ＋Generator/Evaluator 分離原則 | サブエージェント呼出時の担当範囲確認・連携設計時 |
| [docs/reference/skills-design-guide.md](docs/reference/skills-design-guide.md) | Skills 設計チェックリスト（frontmatter 必須要件・description 形式・progressive disclosure・`.claude/pdfs/guide.pdf` 準拠） | 新規スキル・エージェント作成時 / 既存 description レビュー時 |
| [docs/reference/workflows.md](docs/reference/workflows.md) | 週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・ブランチ詳細・Phase 別ロードマップ | 週次 PDCA・変換作業・ブランチ運用詳細確認時 |
| [docs/reference/information-architecture.md](docs/reference/information-architecture.md) | 情報の 4 ゾーンモデル（docs / reference / state / skills）・判断フロー・task-queue 仕様。GitHub Issue 廃止の真実源 | 新しい情報の置き場に迷うとき・CI/スキル/ドキュメント設計時 |
| [docs/reference/measurement-incidents.md](docs/reference/measurement-incidents.md) | 計測データの欠損・誤報・不整合 + 外部検証アクセスの罠（2026-W16 BAILOUT、2026-04-25 Cloudflare Bot 等） | 計測スキル/エージェント設計時・外部 Validator/ボットを使う作業時 |
| [docs/reference/data-storage-decision.md](docs/reference/data-storage-decision.md) | データストレージ判断 ADR（D1 不採用・frontmatter + build-time JSON 継続・再検討トリガー条件） | DB 導入を検討するとき／iOS アプリ着手時／コンテンツ規模が大きく変わるとき |
| [docs/reference/notebooklm-cli-gotchas.md](docs/reference/notebooklm-cli-gotchas.md) | notebooklm CLI（Python v0.3.4）の挙動クセ集（venv exe で proxy 通らず 503・list で exit 1 false-positive・全角括弧の cmd.exe 解析破綻・source add --title 無効化 等） | notebooklm を呼ぶ新規スクリプト・skill 設計時／既存 wrapper の挙動確認時 |
| [docs/reference/content-principles.md](docs/reference/content-principles.md) | コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種使い分け等） | キーワードページ執筆・評価時 |
| [docs/design-system/principles.md](docs/design-system/principles.md) | UI・SVG 共通のデザイン原則（レイヤー・コントラスト・カラー）。カラートークンは `src/styles/globals.css` の `--color-*` が真実源 | コンポーネント作成・SVG 図版作成・色選定時 |
| [docs/ui/callout-gallery.md](docs/ui/callout-gallery.md) | Callout 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）。GitHub 画面で視覚確認可能 | MDX で `<Callout type="...">` を選ぶとき |
| [docs/ui/speclist-gallery.md](docs/ui/speclist-gallery.md) | SpecSheetList 5 バリエーションの視覚ギャラリー（ordered / unordered × dot/dash/square） | MDX で `<SpecSheetList>` を選ぶとき |
| [src/components/ui/Callout/README.md](src/components/ui/Callout/README.md) | Callout コンポーネント直下リファレンス（12 種一覧表・デザイン仕様・旧 type 移行表） | Callout を実装・改修・MDX で使うとき |
| [src/components/ui/SpecSheetList/README.md](src/components/ui/SpecSheetList/README.md) | SpecSheetList コンポーネント直下リファレンス（仕様書調リスト、旧 CustomList 統合） | SpecSheetList を実装・改修・MDX で使うとき |
| `.claude/config/` | ツール設定（OGP テンプレ/ルール/改行設定、PSI しきい値・URL リスト等、エージェント編集領域） | OGP・PSI・自動化ツールのルール・閾値を調整するとき |
| `docs/project/01_戦略/01_プロダクト戦略.md` | 5問フレームワーク（顧客・問題・解決策・体験・成功指標）の one-page 北極星文書。全戦略の出発点 | 戦略の全体像を把握したいとき・意思決定の根拠を確認するとき |
| `docs/project/01_戦略/03_事業戦略.md` | v3 事業戦略 | 収益化・差別化戦略の確認時 |
| `docs/project/01_戦略/04_収益化戦略.md` | 収益化戦略（v3） | note・YouTube・iOS アプリ戦略検討時 |
| `docs/project/03_SNS/01_SNS集客戦略.md` | SNS 集客戦略 v5（X / YouTube / Instagram 統合、TTS 完全自動・SNS 量産・共通基盤 sns-common 依存、IG は Carousel + Reels 両軸） | SNS 投稿設計・YouTube/Instagram 自動化検討時 |
| `docs/note/19_note段階投下プラン.md` | note 段階投下プラン（無料＋有料ラインナップ、記事単位の runway） | note コンテンツ発売・受験期コンテンツ設計時 |
| `docs/project/03_SNS/02_チャネル動線設計.md` | 5 チャネル動線設計 v1（X / YouTube / Instagram / note / サイトの統合ファネル設計、UTM 統一フォーマット、季節 × チャネルマトリクス、4 Phase 実装ロードマップ） | チャネル間動線・UTM 設計・季節調整検討時、note ↔ サイト境界ルール確認時 |

---

## 12 原則

> Karpathy's LLM coding habits — distilled for this project.

### 1. コードを書く前に考える

- **作業開始前に `git branch --show-current` でブランチ確認**。指示と異なれば作業を止めてユーザーに報告する（勝手に `git checkout` しない）
- 解釈が複数あれば、黙って選ばず候補を提示してユーザーに選ばせる

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
- **画像追加**: `generate-webp` → webp 参照で commit → R2 は `main` push 時に CI が自動同期
- **deploy**: `develop` → `main` は `/deploy` スキル経由（タイミングはユーザー判断）

### 5. モデルは判断が必要な場面だけに使う

- **サブエージェント**: `model: sonnet` 既定。Opus は親エージェントのみ（詳細 → [agents-registry.md](docs/reference/agents-registry.md)）
- **worktree 原則禁止**。2エージェント同時実行・30分以上の条件を両方満たすときのみ例外（詳細 → [workflows.md](docs/reference/workflows.md)）
- ルーティング・リトライ・ステータスコード処理など、コードで決定できるものはサブエージェントに委ねない

### 6. トークン予算を守る

- 長時間作業の区切りに `/compact` を提案
- セッション引き継ぎは `docs/handoffs/YYYY-MM-DD-{context}.md`

### 7. 矛盾するパターンを混ぜない

- **Convention A/B の共存**: Convention A（個別ファイル名）と Convention B（`article.mdx`）が並存。新規コンテンツは Convention B 推奨。既存ファイルの方式を勝手に変換しない
- **UI コンポーネント**: デザイントークン使用（`rounded-card-*` / `shadow-card-*`）。`dark:border-*` を必ず書く。インライン `borderColor` 禁止。色は `brand` / `ink-strong` / `ink-body` / `ink-muted` / `positive` / `warn` / `danger` を使う（真実源: `src/styles/globals.css` の `--color-*`）
- コードベース内に複数の書き方がある場合、平均化せず、どちらを採用するか明示してから書く

### 8. 書く前に読む

- **情報の置き場（4 ゾーンモデル）**: A=`docs/`（戦略・設計・進捗・週次 PDCA・引き継ぎ）/ B=`docs/reference/`（運用手順・ポリシー）/ C=`.claude/state/`・`.claude/config/`（機械データ・`task-queue.json`、`.claude/state/*.md` 新規作成禁止）/ D=`.claude/skills/`・`.claude/agents/`（実行能力）。**GitHub Issue は使わない**（廃止、タスクは `task-queue.json` に集約）。真実源・判断フローは [information-architecture.md](docs/reference/information-architecture.md)
- **スキル/エージェント更新ルール**: `.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、同一 commit で `docs/reference/skills-guide.md`（一覧）と `docs/reference/skills-registry.md`（退役ログ）または `docs/reference/agents-registry.md` を必ず更新する
- MDX を追加・編集する前に `docs/reference/content-authoring.md` を Read する

### 9. テストは挙動だけでなく意図を検証する

- **なぜ `curl` でチェックするか**: Lighthouse スコアは SSR 破壊を捕捉できない（[measurement-incidents.md](docs/reference/measurement-incidents.md) 2026-W16 BAILOUT）。`<main>` タグと主要キーワードの存在確認が最短の意図検証
- **なぜ `writeMdxFile` 経由か**: 直接 `writeFileSync` は CRLF 混在を引き起こし pre-commit で reject される。検証ステップを省略するときは「なぜその検証が必要か」を自問してから判断する

### 10. 重要なステップごとにチェックポイントを置く

- **並行エージェント**: 複数エージェントを同時に動かすときは、各エージェントが編集したファイルを即 commit する（`git status` で staged 内容を確認してから commit — 他エージェントの変更を巻き込まないため）
- 長いタスクでは「何を完了し・何を検証し・何が残っているか」を都度整理してから次に進む

### 11. コードベースの規約に合わせる

- **frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`
- MDX 書き込み後は `U+FFFD`（`﹖`）で文字化けチェック（既存コンテンツとの一貫性を保つため）
- 既存コードの命名規則・ファイル構成・設計思想を優先する。自分の好みで変えない

### 12. 失敗や不確実性を隠さない

- 未検証の部分やスキップした処理がある場合は「完了」と言わずに明示する
- **deploy 後**: 500 の場合は Cloudflare API token 期限切れを仮説1番に確認（GitHub Secrets で再発行）。着手前にも token の有効期限を確認する
- 計測データに異常がある場合は [measurement-incidents.md](docs/reference/measurement-incidents.md) を先に確認してから結論を出す
