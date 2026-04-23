# スキル一覧レジストリ

`.claude/skills/` 配下に定義されたスキル全量のインデックス。

**いつ読むか**: 利用可能なスキルを探すとき、新スキル作成時に重複がないか確認するとき、Phase 別の運用スコープを確認するとき。

個別スキルの詳細仕様・引数・手順は各 `SKILL.md` 本体を参照。このファイルは「どんなスキルがあるか」を俯瞰するためのインデックス。

---

## 最終カテゴリ構造（Phase D 完了時）

```
.claude/skills/
├── authoring/       # 6 — 記事を作る
├── conversion/      # 3 — 外部形式から MDX への変換
├── quality/         # 7 — MDX 品質検査・改善サイクル
├── management/      # 11 — 計画・分析・戦略
├── dev/             # 11 — 開発・CI/CD
├── analytics/       # 2 — サイト分析
├── social/          # 1 — SNS 投稿
└── ui/              # 1 — UI/UX デザイン
```

合計 **42 スキル**（Phase A 開始時の 66 から −36%）。

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
| `/nsm-experiment` | NSM 改善の実験ライフサイクル管理 | `.claude/skills/management/nsm-experiment/SKILL.md` |
| `/distill-proofread-learnings` | 校正作業から新規ルール・ユーザー嗜好を抽出するメタスキル | `.claude/skills/management/distill-proofread-learnings/SKILL.md` |

## analytics — サイト分析

| スキル | 用途 | 定義 |
|---|---|---|
| `/fetch-gsc-data` | Google Search Console データ取得 | `.claude/skills/analytics/fetch-gsc-data/SKILL.md` |
| `/psi-audit` | PSI で代表ページを日次計測、CWV のしきい値違反を surface | `.claude/skills/analytics/psi-audit/SKILL.md` |

## dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/review` | 対象ファイル種別を自動判定し、適切なレビュースキルを実行 | `.claude/skills/dev/review/SKILL.md` |
| `/dev-start` | ポート 3020 をクリーンアップして開発サーバー起動 | `.claude/skills/dev/dev-start/SKILL.md` |
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/sync-r2-images` | R2 画像のローカル同期 | `.claude/skills/dev/sync-r2-images/SKILL.md` |
| `/diff-r2` | ローカル ↔ R2 の双方向差分検出 | `.claude/skills/dev/diff-r2/SKILL.md` |
| `/code-review` | Next.js コード品質レビュー | `.claude/skills/dev/code-review/SKILL.md` |
| `/simplify` | 変更 diff を点検し、最小差分で修正→lint→PR までチェーン | `.claude/skills/dev/simplify/SKILL.md` |
| `/pr-create` | 現ブランチから GitHub PR を作成 | `.claude/skills/dev/pr-create/SKILL.md` |
| `/monitor` | バックグラウンド監視 | `.claude/skills/dev/monitor/SKILL.md` |
| `/zenn-audit` | Zenn 本番 CSS との差分検出 | `.claude/skills/dev/zenn-audit/SKILL.md` |

## authoring — 記事を作る

| スキル | 用途 | 定義 |
|---|---|---|
| `/exam-guide --exam {exam-id}` | 試験対策ガイド生成（テンプレート駆動） | `.claude/skills/authoring/exam-guide/SKILL.md` |
| `/keyword-page` | 総合技術監理キーワードページの作成・校正 | `.claude/skills/authoring/keyword-page/SKILL.md` |
| `/create-svg` | MDX 記事用 SVG 図版の作成 | `.claude/skills/authoring/create-svg/SKILL.md` |
| `/illustrate-concept` | Web 画像検索→SVG 一括生成→MDX 挿入 | `.claude/skills/authoring/illustrate-concept/SKILL.md` |
| `/improve-article` | 単一記事の対話的改善（`--mode verify` で PDF 照合 QA） | `.claude/skills/authoring/improve-article/SKILL.md` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `.claude/skills/authoring/promote-to-site/SKILL.md` |

**テンプレート**: `.claude/skills/authoring/templates/exam-guide/`

## conversion — 外部形式から MDX への変換

| スキル | 用途 | 定義 |
|---|---|---|
| `/pdf-to-mdx --exam {general\|cem\|civil-construction-1}` | PDF/画像 → MDX 変換（テンプレート駆動、PDF 残骸除去内蔵） | `.claude/skills/conversion/pdf-to-mdx/SKILL.md` |
| `/exam-questions-import --exam {civil-primary\|civil-secondary\|pe-primary}` | 過去問集 PDF→MDX（`--mode add-answers` で未解答追加） | `.claude/skills/conversion/exam-questions-import/SKILL.md` |
| `/ogp-create` | カテゴリ別テンプレートで OGP 画像を生成 | `.claude/skills/conversion/ogp-create/SKILL.md` |

## quality — MDX 品質検査・改善サイクル

| スキル | 用途 | 定義 |
|---|---|---|
| `/check-mdx --rules <rule>` | MDX 品質検査の統合 Evaluator（8 ルール） | `.claude/skills/quality/check-mdx/SKILL.md` |
| `/quality-cycle --profile {cem\|civil-textbook}` | 品質サイクル（スコア→リライト→検証→人間レビュー）統合 | `.claude/skills/quality/quality-cycle/SKILL.md` |
| `/exam-keyword-cycle` | 過去問起点の関連キーワード横断校正 Orchestrator | `.claude/skills/quality/exam-keyword-cycle/SKILL.md` |
| `/exam-backlinks` | 過去問⇔キーワード紐付けの確認・再生成 | `.claude/skills/quality/exam-backlinks/SKILL.md` |
| `/verify-exam-coverage` | キーワードページが過去問論点を十分カバーしているか検証 | `.claude/skills/quality/verify-exam-coverage/SKILL.md` |
| `/review-mobile` | モバイル視認性・可読性レビュー | `.claude/skills/quality/review-mobile/SKILL.md` |
| `/consolidate-duplicate-keyword` | 総監キーワード集の重複スラグ統合 | `.claude/skills/quality/consolidate-duplicate-keyword/SKILL.md` |

## social — SNS 投稿

| スキル | 用途 | 定義 |
|---|---|---|
| `/social-post --platform {note\|x}` | note / X 投稿テキスト生成の統合スキル | `.claude/skills/social/social-post/SKILL.md` |

## ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7 カテゴリ）＋ `--visual` で Playwright 視覚検証 | `.claude/skills/ui/design-review/SKILL.md` |

## strategy — 競合調査・市場分析（Phase 2 で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 で復活:

- `/keyword-gap` — GSC + 競合比較でコンテンツギャップを特定
- `/exam-demand` — 資格試験の検索需要調査
- `/discover-exam-season` — 試験日程に基づく季節性コンテンツ戦略
- `/plan-affiliate` — 書籍・教材・通信講座のアフィリエイト記事企画

## ads — 広告・アフィリエイト（Phase 2 で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 で復活:

- `/register-affiliate-banner`
- `/audit-ads`

---

## 複数資格対応のテンプレート駆動化

**核心原則**: 新試験追加時はスキル本体を変更せず、`templates/{exam-id}.md` を追加するのみ。

| テンプレート管理ディレクトリ | 用途 | 対応試験 |
|---|---|---|
| `authoring/templates/exam-guide/` | 試験ガイド生成 | civil-construction-1 / pe |
| `conversion/pdf-to-mdx/templates/` | PDF→MDX 試験別ルール | general / cem / civil-construction-1 |
| `conversion/exam-questions-import/templates/` | 過去問取込 | civil-primary / civil-secondary / pe-primary |
| `quality/quality-cycle/templates/` | 品質サイクル プロファイル | cem / civil-textbook |

新試験追加時の手順:
1. 該当テンプレートディレクトリに `{new-exam}.md` を新規作成
2. スキル側は変更なし
3. 動作確認 → PR

---

## 退役記録

削除したスキルのログ。代替コマンドがある場合は明記。

| 退役日 | スキル | カテゴリ | 代替 |
|---|---|---|---|
| 2026-04-15 | `/pe-exam-guide` | content | `/exam-guide --exam pe` |
| 2026-04-23 | `/allow-tool` | dev | ユーザー直接指示 |
| 2026-04-23 | `/reset-git-history` | dev | ランブック移譲 |
| 2026-04-23 | `/find-x-accounts` | marketing | Playwright MCP 直接指示 |
| 2026-04-23 | `/related-articles` | ui | `docs/ui/related-articles.md` に移動 |
| 2026-04-23 | `/seo-audit` | analytics | `/check-mdx --rules seo` + `/fetch-gsc-data` 連携 |
| 2026-04-23 | `/add-exam-answers` | content | `/exam-questions-import --mode add-answers` |
| 2026-04-23 | `/fix-design-manual-figures` | content | `/improve-article` に吸収 |
| 2026-04-23 | `/note-desumasu` | content | `/social-post note desumasu {path}` |
| 2026-04-23 | `/x-post` | marketing | `/social-post x {question\|keyword} ...` |
| 2026-04-23 | `/note-post` | marketing | `/social-post note {analysis\|guide\|keywords} ...` |
| 2026-04-23 | `/aidesigner-frontend`（トップレベル孤立） | — | ui/ に移動（Phase A） |
| 2026-04-24 | `/check-mdx`（旧 content 配下） | content | `/check-mdx --rules syntax`（Phase B で quality/ へ） |
| 2026-04-24 | `/check-frontmatter` | content | `/check-mdx --rules frontmatter` |
| 2026-04-24 | `/check-links` | content | `/check-mdx --rules links` |
| 2026-04-24 | `/audit-staging` | content | `/check-mdx --rules staging` |
| 2026-04-24 | `/audit-exam-explanations` | content | `/check-mdx --rules explanations` |
| 2026-04-24 | `/audit-svg` | content | `/check-mdx --rules svg` |
| 2026-04-24 | `/check-related-keyword-inline` | content | `/check-mdx --rules related-keyword` |
| 2026-04-24 | `/check-legal-citations` | content | `/check-mdx --rules legal-citations` |
| 2026-04-24 | `/pdf-to-mdx`（旧 content 配下） | content | `/pdf-to-mdx --exam general`（Phase C で conversion/ へ） |
| 2026-04-24 | `/cem-pdf-to-mdx` | content | `/pdf-to-mdx --exam cem` |
| 2026-04-24 | `/civil-construction-1-pdf-to-mdx` | content | `/pdf-to-mdx --exam civil-construction-1` |
| 2026-04-24 | `/clean-pdf-artifacts` | content | `/pdf-to-mdx` Step 6 自動実行 |
| 2026-04-24 | `/exam-questions-import`（旧 content 配下） | content | `/exam-questions-import --exam civil-primary --year <year>` |
| 2026-04-24 | `/exam-questions-2-import` | content | `/exam-questions-import --exam civil-secondary --year <year>` |
| 2026-04-24 | `/qa-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/verify-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/ogp-create`（旧 content 配下） | — | `/ogp-create`（Phase C で conversion/ へ移動） |
| 2026-04-24 | `/civil-textbook-cycle` | content | `/quality-cycle --profile civil-textbook`（Phase D で統合） |
| 2026-04-24 | `/quality-cycle`（旧 content 配下） | content | `/quality-cycle --profile cem`（Phase D で quality/ へ） |

### エージェント退役

| 退役日 | エージェント | 代替 |
|---|---|---|
| 2026-04-23 | `aidesigner-frontend` | 直接 Claude 指示 or AIDesigner MCP 直接 |
| 2026-04-23 | `ui-visual-qa` | `/design-review --visual`（スキル層に統合） |
| 2026-04-23 | `cem-advisor` | Generator は `keyword-rewriter`、Evaluator は `cem-qa` |

### カテゴリ変更履歴

| カテゴリ | 変更 | 日付 |
|---|---|---|
| `marketing` | 廃止 → `social/` に統合 | 2026-04-23（Phase A） |
| `quality` | 新設 | 2026-04-24（Phase B） |
| `conversion` | 新設 | 2026-04-24（Phase C） |
| `authoring` | 新設 | 2026-04-24（Phase D） |
| `content` | 廃止（解体） | 2026-04-24（Phase D） |
