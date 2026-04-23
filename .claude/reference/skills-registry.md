# スキル一覧レジストリ

`.claude/skills/` 配下に定義されたスキル全量のインデックス。

**いつ読むか**: 利用可能なスキルを探すとき、新スキル作成時に重複がないか確認するとき、Phase 別の運用スコープを確認するとき。

個別スキルの詳細仕様・引数・手順は各 `SKILL.md` 本体を参照。このファイルは「どんなスキルがあるか」を俯瞰するためのインデックス。

---

## management — 計画・分析・戦略

| スキル | 用途 | 定義 |
|---|---|---|
| `/weekly-plan` | 週次計画を生成 | `.claude/skills/management/weekly-plan/SKILL.md` |
| `/weekly-review` | 週次レビューを生成 | `.claude/skills/management/weekly-review/SKILL.md` |
| `/weekly-improve` | 週次 計測→改善候補抽出→実験登録の軽量オーケストレータ | `.claude/skills/management/weekly-improve/SKILL.md` |
| `/north-star-metric` | NSM と Input Metrics を定義 | `.claude/skills/management/north-star-metric/SKILL.md` |
| `/growth-loops` | 成長ループの設計・評価 | `.claude/skills/management/growth-loops/SKILL.md` |
| `/monetization-strategy` | 収益化戦略のブレインストーム | `.claude/skills/management/monetization-strategy/SKILL.md` |
| `/critical-review` | 批判的レビュー | `.claude/skills/management/critical-review/SKILL.md` |
| `/knowledge` | 過去の失敗と学びを参照・追記 | `.claude/skills/management/knowledge/SKILL.md` |
| `/pre-mortem` | Pre-Mortem の実施 | `.claude/skills/management/pre-mortem/SKILL.md` |
| `/nsm-experiment` | NSM 改善の実験ライフサイクル管理（propose → start → measure → close、state: `.claude/state/experiments.json`） | `.claude/skills/management/nsm-experiment/SKILL.md` |
| `/distill-proofread-learnings` | 直近の校正作業（git 差分＋ユーザー指示）から新規ルール・既存原則精緻化・ユーザー嗜好を抽出し、content-principles.md / memory / 関連スキルに反映するメタスキル | `.claude/skills/management/distill-proofread-learnings/SKILL.md` |

## analytics — サイト分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策 web サイト作成）では不要。
Phase 2（note 記事展開・iOS アプリ開発）時に以下を復活:

- `/fetch-gsc-data` — Google Search Console のデータ取得
- `/fetch-ga4-data` — Google Analytics 4 のアクセスデータ取得

**運用中（Phase 1）**:

- `/psi-audit` — PageSpeed Insights で代表ページを日次計測し、Core Web Vitals のしきい値違反と改善候補を出力（performance-auditor エージェント連携）

## dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/review` | 対象ファイルの種類を自動判定し、適切なレビュースキル（review-mobile/check-mdx/code-review/design-review/critical-review 等）を実行して結果を集約する統一エントリーポイント | `.claude/skills/dev/review/SKILL.md` |
| `/dev-start` | ポート3020をクリーンアップして開発サーバー起動 | `.claude/skills/dev/dev-start/SKILL.md` |
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/sync-r2-images` | R2 上の画像をローカルに同期（npm run dev で画像が見えないとき） | `.claude/skills/dev/sync-r2-images/SKILL.md` |
| `/diff-r2` | ローカル `.local/r2/posts/` と R2 バケットの双方向差分を検出（only-local/only-remote/size-mismatch） | `.claude/skills/dev/diff-r2/SKILL.md` |
| `/code-review` | Next.js コード品質レビュー（セキュリティ・パフォーマンス・保守性・a11y） | `.claude/skills/dev/code-review/SKILL.md` |
| `/simplify` | 変更 diff を再利用/品質/効率の3観点で点検し、ユーザ承認後に最小差分で修正→lint→/pr-create までのチェーン | `.claude/skills/dev/simplify/SKILL.md` |
| `/pr-create` | 現ブランチから GitHub PR を作成（title/body 自動生成、HEREDOC body、Co-Authored-By 付与、git add 明示指定） | `.claude/skills/dev/pr-create/SKILL.md` |
| `/monitor` | Monitor tool でバックグラウンド監視（dev/mojibake/ci/build/r2/frontmatter/health/mdx-validation） | `.claude/skills/dev/monitor/SKILL.md` |
| `/zenn-audit` | Zenn 本番 CSS と記事ページのタイポグラフィ＋レイアウトを比較し差分を Critical/Warning/Matches/Intentional で報告 | `.claude/skills/dev/zenn-audit/SKILL.md` |

## content — コンテンツ作成

### 試験対策ガイド生成（複数資格対応・テンプレート駆動）

| スキル | 用途 | 対応試験 | 汎用化 | 定義 |
|---|---|---|---|---|
| `/exam-guide --exam {exam-id}` | 試験対策ガイド生成（既存資産再構成、試験別設定ファイルでパラメタライズ） | civil-construction-1 / pe | 対応済み | `.claude/skills/content/exam-guide/SKILL.md` |

**テンプレート管理**: `.claude/skills/content/templates/exam-guide/` （新資格追加時は設定ファイル追加のみ）

### 汎用的なコンテンツ作成スキル

| スキル | 用途 | 定義 |
|---|---|---|
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `.claude/skills/content/promote-to-site/SKILL.md` |
| `/verify-exam-coverage` | キーワードページが過去問論点をカバーできているか検証し、未カバー論点と補強方針を提示（Evaluator+Generator） | `.claude/skills/content/verify-exam-coverage/SKILL.md` |
| `/keyword-page` | 総合技術監理キーワードページの作成・校正 | `.claude/skills/content/keyword-page/SKILL.md` |
| `/exam-backlinks` | 過去問⇔キーワード紐付けの確認・再生成・品質改善 | `.claude/skills/content/exam-backlinks/SKILL.md` |
| `/review-mobile` | モバイル視認性・可読性レビュー（表の適切性・数式・簡潔性） | `.claude/skills/content/review-mobile/SKILL.md` |
| `/create-svg` | MDX 記事用 SVG 図版の作成（モバイル視認性・デザイントークン準拠） | `.claude/skills/content/create-svg/SKILL.md` |
| `/illustrate-concept` | Discovery First 方式で Web 画像検索を並行実行し、標準視覚パターンのある概念のみトリアージして複数 SVG を一括生成・MDX 挿入する | `.claude/skills/content/illustrate-concept/SKILL.md` |
| `/improve-article` | 単一記事を対話的に継続改善する Orchestrator。`--mode verify` で PDF 照合 QA（旧 /verify-pdf-mdx, /qa-pdf-mdx 吸収） | `.claude/skills/content/improve-article/SKILL.md` |
| `/exam-keyword-cycle` | 過去問 1 問を起点に関連キーワード群を横断校正し、視点タグ（網羅性/正確性/わかりやすさ/試験適合/関連付け）付きの 1 PR にまとめる Orchestrator。.claude/state/exam-keyword-cycles/logs/ にログ蓄積 | `.claude/skills/content/exam-keyword-cycle/SKILL.md` |
| `/consolidate-duplicate-keyword` | 総監キーワード集の重複スラグ 1 ページ統合（7 フェーズ・redirects 込み） | `.claude/skills/content/consolidate-duplicate-keyword/SKILL.md` |
| `/quality-cycle` | キーワードページの品質サイクル（スコア → リライト → 検証 → 人間レビュー）を統合 | `.claude/skills/content/quality-cycle/SKILL.md` |
| `/civil-textbook-cycle` | 1級土木 textbook/guide の品質サイクル（評価 → リライト → 再評価 → 人間レビュー）を統合。40件前提で CEM 版から screen/flagship を省略した4モード＋report 構成 | `.claude/skills/content/civil-textbook-cycle/SKILL.md` |

## conversion — 外部形式から MDX への変換

| スキル | 用途 | 定義 |
|---|---|---|
| `/pdf-to-mdx --exam {general\|cem\|civil-construction-1}` | PDF/画像 → MDX 変換の統合スキル。試験別ルールは `templates/{exam}.md` で管理。旧 `/pdf-to-mdx` `/cem-pdf-to-mdx` `/civil-construction-1-pdf-to-mdx` `/clean-pdf-artifacts` を統合 | `.claude/skills/conversion/pdf-to-mdx/SKILL.md` |
| `/exam-questions-import --exam {civil-primary\|civil-secondary\|pe-primary} --year <year>` | 過去問集 PDF→MDX の統合スキル。`--mode add-answers` で既存 MDX の未解答追加（旧 `/add-exam-answers` 吸収）。旧 `/exam-questions-import` `/exam-questions-2-import` を統合 | `.claude/skills/conversion/exam-questions-import/SKILL.md` |
| `/ogp-create` | カテゴリ別テンプレートで OGP 画像を生成（セーフティゾーン対応・日本語改行戦略） | `.claude/skills/conversion/ogp-create/SKILL.md` |

**テンプレート管理**:
- `conversion/pdf-to-mdx/templates/{general,cem,civil-construction-1}.md` — PDF→MDX 試験別ルール
- `conversion/exam-questions-import/templates/{civil-primary,civil-secondary,pe-primary}.md` — 過去問取込ルール

新試験を追加する場合は該当テンプレートを新規作成するのみ（スキル本体は変更不要）。

## quality — MDX 品質検査

| スキル | 用途 | 定義 |
|---|---|---|
| `/check-mdx --rules <rule>` | MDX 品質検査の統合 Evaluator。8 ルール（syntax / frontmatter / links / svg / staging / explanations / related-keyword / legal-citations）を `--rules` で選択。pre-commit hook からも利用される | `.claude/skills/quality/check-mdx/SKILL.md` |

**内蔵ルール**:
- `syntax` — MDX 構文（Docusaurus 3.x / MDX v3 互換性、JSX エスケープ、見出し階層、テーブル、数式）
- `frontmatter` — zod スキーマ + 内容検証（description 長・publishedAt・tags allowlist）
- `links` — 外部リンク（HTTP HEAD）+ 内部リンク存在確認（旧 `/check-links`）
- `svg` — SVG 静的解析（文字クリップ・必須属性・viewBox 幅・font-size・色トークン、旧 `/audit-svg`）
- `staging` — Obsidian ステージング公開準備度（5 軸ルーブリック、旧 `/audit-staging`）
- `explanations` — 過去問破損解説（P1-headless / P2-examPoint-empty、旧 `/audit-exam-explanations`）
- `related-keyword` — 関連キーワード末尾列挙（lint-mdx-mobile ルール 8-1、旧 `/check-related-keyword-inline`）
- `legal-citations` — e-Gov 法令リンク化（ルール 8-2、旧 `/check-legal-citations`）

## ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7カテゴリ・重大度判定）＋ `--visual` で Playwright 視覚検証（light/dark × desktop/mobile、旧 `ui-visual-qa` エージェント統合） | `.claude/skills/ui/design-review/SKILL.md` |

## social — SNS 投稿

| スキル | 用途 | 定義 |
|---|---|---|
| `/social-post` | note / X 投稿テキスト生成の統合スキル。`note {analysis\|guide\|keywords\|desumasu}` / `x {question\|keyword}` のタイプ別。旧 `/note-post` `/x-post` `/note-desumasu` を一本化 | `.claude/skills/social/social-post/SKILL.md` |

## strategy — 競合調査・市場分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 時に以下を復活:

- `/keyword-gap` — GSC + 競合比較でコンテンツギャップを特定
- `/exam-demand` — 資格試験の検索需要調査・不足コンテンツ提案
- `/discover-exam-season` — 試験日程に基づく季節性コンテンツ戦略
- `/plan-affiliate` — 書籍・教材・通信講座のアフィリエイト記事企画

**その他のスキル** （competitor-audit, discover-trends-civil, content-roadmap）は Phase 3 で復活予定。

## ads — 広告・アフィリエイト（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 時に以下を復活:

- `/register-affiliate-banner` — アフィリエイトバナーの登録
- `/audit-ads` — AdSense・アフィリエイトの現状監査と最適化提案

---

## 複数資格対応の進め方（Phase別）

複数の土木系資格試験（1級土木・技術士・コンクリート技士・測量士等）に対応するため、以下の段階的アプローチを採用している。

### Phase 1（2026-04-01〜）: テンプレート外部化

スキル本体は汎用のまま。**試験固有の設定をテンプレートフォルダで管理**し、新資格追加時はスキル追加を不要に。

```
/exam-guide --exam {exam-id}
  → 設定参照: .claude/skills/content/templates/exam-guide/{exam-id}.md

対応済み:
  - civil-construction-1.md（1級土木施工管理技士）
  - pe.md（技術士建設部門 / pe-comprehensive-management）
```

**新資格追加時の作業**:
1. `templates/exam-guide/{exam-id}.md` を新規作成（テンプレートのコピー＋設定入力）
2. スキル側は変更なし

**メリット**: スキル数削減。ハーネス設計原則4「スキルを増やすより既存スキルのパラメータ化を優先」に完全準拠。

### Phase C（2026-Q2 計画中・`.claude/` 最適化）: PDF→MDX / 品質サイクルのテンプレ駆動化

- `/pdf-to-mdx --exam {general|cem|civil-construction-1}` で 4 スキル統合予定（Phase C で実施）
- `/check-mdx --rules {syntax|frontmatter|links|svg|staging|explanations|related-keyword|legal-citations}` で 8 スキル統合**済み**（Phase B で実施、2026-04-24）
- `/quality-cycle --profile {cem|civil-textbook}` で 2 スキル統合予定（Phase D で実施）

### Phase 3（2027年以降）: 医師・弁護士など他分野対応

同じテンプレート駆動アプローチで、医療系・法律系資格にも対応可能。スキル追加ゼロ。

---

## 退役記録

削除したスキルの最小ログ。代替コマンドがある場合は明記。

| 退役日 | スキル | カテゴリ | 理由 | 代替 |
|---|---|---|---|---|
| 2026-04-15 | `/pe-exam-guide` | content | 試験別個別スキル廃止 | `/exam-guide --exam pe` |
| 2026-04-23 | `/allow-tool` | dev | ワンライナー指示で十分、スキル化不要 | ユーザー直接指示「この Bash パターンを `.claude/settings.local.json` に追加して」 |
| 2026-04-23 | `/reset-git-history` | dev | 年 1 回未満の緊急用途、スキル化不要 | `docs/project/` のランブック移譲予定 |
| 2026-04-23 | `/find-x-accounts` | marketing | 参照 2 回・実運用なし。Playwright 半自動で重い設計 | Playwright MCP 直接指示 or ChatGPT 等で手動調査 |
| 2026-04-23 | `/related-articles` | ui | スキルではなく UI 設計リファレンス | `docs/ui/related-articles.md` に移動 |
| 2026-04-23 | `/seo-audit` | analytics | Phase 2 復活待ちだったが、より具体的な機能に分解 | Phase C の `/check-mdx --rules seo` + `/fetch-gsc-data` 連携へ統合予定 |
| 2026-04-23 | `/add-exam-answers` | content | Phase C で `/exam-questions-import --mode add-answers` に統合予定 | （Phase C で復活、暫定で直接 Claude 指示） |
| 2026-04-23 | `/fix-design-manual-figures` | content | 設計便覧専用、`/improve-article` の category 分岐に吸収予定 | （Phase C で復活、暫定で直接 Claude 指示） |
| 2026-04-23 | `/note-desumasu` | content | 新 `/social-post note desumasu` に吸収 | `/social-post note desumasu {path}` |
| 2026-04-23 | `/x-post` | marketing | 新 `/social-post` に統合 | `/social-post x {question\|keyword} ...` |
| 2026-04-23 | `/note-post` | marketing | 新 `/social-post` に統合 | `/social-post note {analysis\|guide\|keywords} ...` |
| 2026-04-23 | `/aidesigner-frontend` | — (カテゴリ外) | 参照 2 回・実運用なし | （UI 生成は直接 Claude 指示または AIDesigner MCP 直接） |
| 2026-04-24 | `/check-mdx`（旧 content 配下） | content | Phase B で quality/ に移動・統合 | `/check-mdx --rules syntax`（新 `.claude/skills/quality/check-mdx/`） |
| 2026-04-24 | `/check-frontmatter` | content | Phase B で `/check-mdx --rules frontmatter` に統合 | `/check-mdx <target> --rules frontmatter` |
| 2026-04-24 | `/check-links` | content | Phase B で `/check-mdx --rules links` に統合 | `/check-mdx --rules links` |
| 2026-04-24 | `/audit-staging` | content | Phase B で `/check-mdx --rules staging` に統合 | `/check-mdx [path] --rules staging` |
| 2026-04-24 | `/audit-exam-explanations` | content | Phase B で `/check-mdx --rules explanations` に統合 | `/check-mdx --rules explanations` |
| 2026-04-24 | `/audit-svg` | content | Phase B で `/check-mdx --rules svg` に統合 | `/check-mdx --rules svg` |
| 2026-04-24 | `/check-related-keyword-inline` | content | Phase B で `/check-mdx --rules related-keyword` に統合 | `/check-mdx --rules related-keyword` |
| 2026-04-24 | `/check-legal-citations` | content | Phase B で `/check-mdx --rules legal-citations` に統合 | `/check-mdx --rules legal-citations` |
| 2026-04-24 | `/pdf-to-mdx`（旧 content 配下） | content | Phase C で conversion/ に移動・統合 | `/pdf-to-mdx --exam general`（新 `.claude/skills/conversion/pdf-to-mdx/`） |
| 2026-04-24 | `/cem-pdf-to-mdx` | content | Phase C で `/pdf-to-mdx --exam cem` に統合 | `/pdf-to-mdx --exam cem` |
| 2026-04-24 | `/civil-construction-1-pdf-to-mdx` | content | Phase C で `/pdf-to-mdx --exam civil-construction-1` に統合 | `/pdf-to-mdx --exam civil-construction-1` |
| 2026-04-24 | `/clean-pdf-artifacts` | content | Phase C で `/pdf-to-mdx` の Step 6 に吸収 | `/pdf-to-mdx` 自動実行、または `references/clean-pdf-artifacts.md` の手順を手動適用 |
| 2026-04-24 | `/exam-questions-import`（旧 content 配下） | content | Phase C で conversion/ に移動・統合 | `/exam-questions-import --exam civil-primary --year <year>`（新 `.claude/skills/conversion/exam-questions-import/`） |
| 2026-04-24 | `/exam-questions-2-import` | content | Phase C で `/exam-questions-import --exam civil-secondary` に統合 | `/exam-questions-import --exam civil-secondary --year <year>` |
| 2026-04-24 | `/qa-pdf-mdx` | content | Phase C で `/improve-article --mode verify` に吸収 | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/verify-pdf-mdx` | content | Phase C で `/improve-article --mode verify` に吸収 | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/ogp-create`（旧 content 配下） | content | Phase C で conversion/ に移動（機能は維持） | `/ogp-create`（新 `.claude/skills/conversion/ogp-create/`） |

エージェントの退役も同時に記録。

| 退役日 | エージェント | 役割 | 代替 |
|---|---|---|---|
| 2026-04-23 | `aidesigner-frontend` | AIDesigner 連携 | （同上） |
| 2026-04-23 | `ui-visual-qa` | UI 視覚 Evaluator | `/design-review --visual` （旧エージェント機能を design-review スキルに統合） |
| 2026-04-23 | `cem-advisor` | CEM 試験対策 Generator（placeholder） | Generator は `keyword-rewriter`、Evaluator は `cem-qa`。orchestration は `strategy-advisor` |
