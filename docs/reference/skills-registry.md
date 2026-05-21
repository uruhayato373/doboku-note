---
title: スキル ガバナンス記録
---

# スキル ガバナンス記録

`.claude/skills/` の設計変更・退役ログ・カテゴリ変更履歴の唯一の真実源。

**スキルの一覧・用途・トリガー** は `docs/reference/skills-guide.md` を参照。
**スキル設計原則・作成手順** は `docs/reference/skills-design-guide.md` を参照。

---

## カテゴリ構造（Phase D 完了時）

```
.claude/skills/
├── authoring/       # 8 — 記事を作る
├── conversion/      # 3 — 外部形式から MDX への変換
├── quality/         # 12 — MDX・note 公開前品質検査
├── management/      # 11 — 計画・分析・戦略
├── dev/             # 11 — 開発・CI/CD
├── analytics/       # 2 — サイト分析
├── social/          # 6 — SNS 投稿
└── ui/              # 1 — UI/UX デザイン
```

合計 **54 スキル**（Phase 2 待機を除く）。

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
| 2026-05-09 | `sns/publish-x`（caption-file 形式） | sns（廃止） | `social/publish-x`（tweets.md 形式の現行版） |
| 2026-05-15 | `/exam-keyword-cycle` | quality | `/quality-cycle --mode auto-loop`（過去問起点 → キーワード起点に方針転換、サイクルを一本化） |

### エージェント退役

| 退役日 | エージェント | 代替 |
|---|---|---|
| 2026-04-23 | `aidesigner-frontend` | 直接 Claude 指示 or AIDesigner MCP 直接 |
| 2026-04-23 | `ui-visual-qa` | `/design-review --visual`（スキル層に統合） |
| 2026-04-23 | `cem-advisor` | Generator は `keyword-rewriter`、Evaluator は `cem-qa` |

### スキルバージョン更新履歴

| 更新日 | スキル | バージョン | 変更概要 |
|---|---|---|---|
| 2026-05-20 | `pe-essay-draft` | v1.1 → v1.2 | 設問制約リスト作成ステップ新設・施策数厳守・5管理正式名と禁止語・施策間トレードオフ多様性・年度固有数値生成を必須ルール化（20本評価結果から5つの欠陥を修正） |
| 2026-05-20 | `pe-essay-review` | v1.1 → v1.2 | 横断チェック観点（数値一致・フレーム語句・施策構造）を追記 |
| 2026-05-20 | `pe-essay-draft` | v1.2 → v1.3 | 必須ルール「設問3はペルソナ一貫性の例外＝国家スケール」を追加（R07 模範論文の設問3が業界内に閉じていた欠陥を修正）。設問制約リストにスコープ／視点要件の抽出を追加 |
| 2026-05-20 | `pe-essay-review` | v1.2 → v1.3 | 視点1「視点の広さ」を「設問3 が事業・組織・業界の枠を超え国家スケールか」を含む形に再定義（同欠陥の見逃しを修正）。設問チェックリストにスコープ要件を追加 |
| 2026-05-20 | `pe-essay-draft` | v1.3 → v1.4 | 必須ルール「文体は である調 で統一する」を追加（設問3 revise 時に ですます調 が混入し設問1・2 と割れた欠陥を修正） |
| 2026-05-20 | `pe-essay-draft` | v1.4 → v1.5 | 「トレードオフと解決フレームの整理」節をテンプレートから削除（設問本文と重複する再掲節のため） |
| 2026-05-21 | `pe-essay-review` | v1.3 → v1.4 | 評価対象に note マガジン論文（`docs/note/magazines/`）を追加。Phase 1 ターゲット解決を サイト模範論文 slug / note マガジンパス の2系統に拡張 |
| 2026-05-21 | `note-prepublish-review` | （バグ修正） | 図版存在チェックの正規表現を `../img/`（マガジン共用図）対応に拡張。従来 `./img/` のみで マガジン論文の共用図を素通りしていた問題を修正 |
| 2026-05-21 | `note-prepublish-review` | （判定緩和） | blockquote を BLOCK 対象から WARN へ緩和。note.com は `>` を引用ブロックとして正しく描画するため、マガジン論文（pe-essay-draft テンプレ由来で `>` を使用）を誤 BLOCK していた |
| 2026-05-21 | `note-prepublish-review` | （機能追加） | マガジン模範論文 専用 inline チェックを追加（試験問題セクション存在・トレードオフ再掲節の不在・設問別解答字数）。新スクリプト `note-essay-charcount.mjs` を Phase 1 で実行 |
| 2026-05-21 | `pe-essay-review` | v1.4 → v1.5 | 解答字数の充足率評価を追加（健全帯 85〜105%・過少も過多も欠陥として扱う）。Phase 1 で `note-essay-charcount.mjs` を実行、設問チェックリスト・視点3・出力フォーマットに反映 |

### カテゴリ変更履歴

| カテゴリ | 変更 | 日付 |
|---|---|---|
| `marketing` | 廃止 → `social/` に統合 | 2026-04-23（Phase A） |
| `quality` | 新設 | 2026-04-24（Phase B） |
| `conversion` | 新設 | 2026-04-24（Phase C） |
| `authoring` | 新設 | 2026-04-24（Phase D） |
| `content` | 廃止（解体） | 2026-04-24（Phase D） |
