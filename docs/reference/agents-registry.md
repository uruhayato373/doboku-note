# サブエージェント詳細レジストリ

`.claude/agents/` に定義されたサブエージェント群の詳細。Generator/Evaluator 分離の原則に基づき設計。

**いつ読むか**: サブエージェントを呼び出すときに担当範囲を確認するとき、連携設計時、新規エージェント追加時の命名・責務設計時。

**モデル指定のクイックリファレンス**は CLAUDE.md 本体「ハーネス設計原則」§6 にある（判断の土台として毎ターン読めるようにするため）。このファイルには詳細な担当範囲・Phase 対応・連携パターンを集約。

---

## スキル → エージェント呼出マップ

どのスキルがどのエージェントを起動するかの早引き。

| 呼出元スキル | 起動エージェント | 役割 |
|---|---|---|
| `/pdf-to-mdx` | `content-qa` | 変換後品質評価（5軸ルーブリック） |
| `/quality-cycle --profile cem` | `cem-qa`, `keyword-rewriter` | 評価 → リライト → 再評価ループ |
| `/quality-cycle --profile civil-textbook` | `civil-construction-review`, `civil-textbook-rewriter` | 評価 → リライト → 再評価ループ |
| `/audit-exam-mapping` | `exam-keyword-mapping-auditor` | 紐づけ精度の semantic 評価 |
| `/note-prepublish-review` | `note-link-injector`, `note-figure-auditor`, `note-fact-checker` | 公開前品質チェック 3 並列 |
| `/weekly-improve` | `metrics-analyzer` | 計測データから改善機会抽出 |
| `/psi-audit` | `performance-auditor` | CWV 違反・回帰検出 |
| `/weekly-review`, `/weekly-plan` | `strategy-advisor`（オーケストレータ） | 戦略的な PDCA 統括 |

⏸️ Phase 2 で復活（着手条件: Web 月収 ¥15k 達成後）:

| 呼出元スキル | 起動エージェント |
|---|---|
| `/keyword-gap`, `/exam-demand`, `/discover-exam-season` | `content-planner` |
| `/fetch-gsc-data` + 分析 | `seo-auditor` |

---

## エージェント一覧

| エージェント                         | 役割                                                                                                   | 種別           | model   | 担当スキル                                                                 | Phase 1 対応                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------ | ------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `content-qa`                   | PDF→MDX 変換の品質評価（5軸ルーブリック、過去問・基準書）                                                                    | Evaluator    | sonnet  | check-mdx, （Phase C で削除）                                              | ✅ 運用中                                     |
| `cem-qa`                       | 技術士総合技術監理キーワードページの品質評価（5軸ルーブリック）                                                                     | Evaluator    | sonnet  | lint-mdx-mobile, check-mdx, check-links, exam-backlinks               | ✅ 運用中                                     |
| `civil-construction-qa`        | 1級土木 textbook/guide ページの視覚＋網羅率検証（PDF 原本との3モード5軸ルーブリック）                                               | Evaluator    | sonnet  | check-mdx, review-mobile, Playwright MCP                              | ✅ 運用中                                     |
| `civil-construction-review`    | 1級土木 textbook/guide の既存 MDX 校正（PDF照合なし、content-principles準拠＋モバイル視認性＋画像キャプション品質）                      | Evaluator    | inherit | lint-mdx-mobile, check-mdx, check-links                               | ✅ 運用中                                     |
| `strategy-advisor`             | 戦略・PDCA・レビュールーティング・収益化戦略を統括するオーケストレーター                                                               | Orchestrator | inherit | weekly-plan, weekly-review, critical-review, pre-mortem               | ✅ 運用中（⏸️ 競合分析・keyword-gap 等は Phase 2 で復活） |
| `seo-auditor`                  | SEO 監査（Phase 2 で復活）                                                                                  | Evaluator    | sonnet  | fetch-gsc-data, fetch-ga4-data                                        | ⏸️ Phase 2 で復活                            |
| `metrics-analyzer`             | GSC/GA4 計測データから改善機会を5パターン抽出（High-Impr-Low-CTR 等）                                                     | Evaluator    | sonnet  | weekly-improve                                                        | ✅ 運用中                                     |
| `performance-auditor`          | PSI 計測データからしきい値違反・回帰を検出し、LCP 肥大・CLS 発生等の既知パターンに改善候補をマッピング                                            | Evaluator    | sonnet  | psi-audit                                                             | ✅ 運用中                                     |
| `content-planner`              | コンテンツ企画（Phase 2 で復活）                                                                                 | Generator    | sonnet  | discover-exam-season, exam-demand, keyword-gap                        | ⏸️ Phase 2 で復活                            |
| `keyword-rewriter`             | CEM キーワードページのバルクリライト                                                                                 | Generator    | sonnet  | quality-cycle 連携                                                      | ✅ 運用中                                     |
| `civil-textbook-rewriter`      | 1級土木 textbook/guide ページのバルクリライト                                                                      | Generator    | sonnet  | civil-textbook-cycle 連携                                               | ✅ 運用中                                     |
| `civil-exampoint-restorer`     | 1級土木 primary-* (一次過去問) の壊れた `<ExamPoint>` を体言止め学習ポイントに再生成（migrate-civil-answer-style.mjs 句読点分割バグの修復） | Generator    | sonnet  | civil-textbook-cycle 連携、lint 9-11 検証                                  | ✅ 運用中（2026-05-16 起動、AdSense 再申請対応）        |
| `civil-secondary-exam-writer`  | 1級土木 secondary-r03〜r07 (二次過去問) の解答・ポイント・各設問解説を `<details>` で補完（公式解答の逐語転載禁止、著者独自表現で再構成）               | Generator    | sonnet  | civil-textbook-cycle 連携、lint 9-12 検証                                  | ✅ 運用中（2026-05-16 起動、AdSense 再申請対応）        |
| `note-link-injector`           | note ドラフトに doboku-note キーワードページへのインラインリンクを全 occurrence 注入（synonym 判断を含む semantic マッチ）                | Generator    | sonnet  | note-prepublish-review 連携、辞書 `src/config/pe-chapters.json` 参照         | ✅ 運用中（2026-04-29 起動）                      |
| `note-figure-auditor`          | note ドラフトの図版を `note-svg-policy.md` 準拠で 4 軸監査（キャンバス・フォント・ブランド・密度）                                     | Evaluator    | sonnet  | note-prepublish-review 連携                                             | ✅ 運用中（2026-04-29 起動）                      |
| `note-fact-checker`            | note ドラフトの数値・主張を A（内部整合）+ B（キーワード参照）+ C（過去問データ）でファクトチェック                                             | Evaluator    | sonnet  | note-prepublish-review 連携、辞書 `src/config/past-exam-backlinks.json` 参照 | ✅ 運用中（2026-04-29 起動）                      |
| `exam-keyword-mapping-auditor` | PE 過去問 1 問の現紐づけ slug 群を semantic 評価し、追加/削除候補を confidence 付き JSON で surface                           | Evaluator    | sonnet  | audit-exam-mapping 連携、辞書 `.claude/state/keyword-summaries.json` 参照    | ✅ 運用中（2026-05-11 起動）                      |

### 退役したエージェント（2026-04-23 Phase A）

| エージェント | 役割 | 代替 |
|---|---|---|
| `aidesigner-frontend` | AIDesigner 連携の UI 生成 | 直接 Claude 指示 or AIDesigner MCP 直接 |
| `ui-visual-qa` | UI 視覚 Evaluator（`.tsx` 視覚回帰） | `/design-review --visual`（同機能を design-review スキルに統合） |
| `cem-advisor` | CEM 試験対策 Generator（placeholder） | Generator は `keyword-rewriter`、Evaluator は `cem-qa`、orchestration は `strategy-advisor` |

## Generator と Evaluator の分離原則

> Generator と Evaluator を分離する — 自己評価バイアスは構造で解決する

同じエージェントが作成も評価も担うと、自分の出力を「良い」と判断するバイアスが生じる。Evaluator エージェントは生成・修正には一切関与せず、**完成物の品質評価のみ**を行う。

### 分離例

- **PDF→MDX 変換**: `/pdf-to-mdx`（Generator スキル）→ `content-qa`（Evaluator エージェント）
- **キーワードページ**: `/keyword-page`（Generator スキル）→ `cem-qa`（Evaluator エージェント）
- **1級土木 textbook/guide**: `/pdf-to-mdx --exam civil-construction-1`（Generator スキル）→ `civil-construction-qa`（Evaluator エージェント）

### Evaluator エージェントの区別

| エージェント | 対象ファイル | 主な軸 | 起動タイミング |
|---|---|---|---|
| **content-qa** | `.mdx`（過去問・基準書） | 静的5軸（視覚検証なし） | PDF→MDX 変換後 |
| **cem-qa** | `.mdx`（総監キーワード、`group: keyword` のみ） | 5管理体系・コンポーネント原則・参考資料 | キーワードページ執筆後 |
| **civil-construction-qa** | `.mdx`（1級土木 textbook/guide） | 視覚検証 + テキスト網羅率（3モード5軸） | 1級土木 MDX 生成後 |
| **civil-construction-review** | `.mdx`（1級土木 textbook/guide） | content-principles準拠＋モバイル視認性＋画像キャプション品質（PDF照合なし、5軸） | 既存 MDX の定期校正・編集後 |
| **metrics-analyzer** | `.claude/state/metrics/gsc/*.json`, `.claude/state/metrics/ga4/*.json` | 5パターン抽出（High-Impr-Low-CTR, Rank-Stuck, Traffic-Drop, Hidden-Winner, Orphan-Query） | `/weekly-improve` 実行時 |
| **performance-auditor** | `.claude/state/metrics/psi/*.json` | しきい値違反＋回帰検出（LCP/CLS/INP/TBT/TTFB/Scores）＋既知パターンマッピング | `/psi-audit` 実行時 / 日次 workflow 後 |
| **exam-keyword-mapping-auditor** | `.claude/state/exam-keyword-map.json` の anchor 1 件単位 | 紐づけ精度の 2 段階 semantic 評価（Stage 1=現紐づけのカバレッジ、Stage 2=候補発見）＋ 3 階層 confidence（auto_apply / needs_review / reject） | `/audit-exam-mapping audit-year` 実行時に各 anchor へ分配 |

**対象ファイル・軸・起動タイミングが全て異なる**ため、これらは統合しない（「対象ドメインの分離」原則）。

**PE ガイド記事（`group: guide`）の Evaluator は未割当**: `cem-qa` はキーワードページ専用、`group: guide` 記事の品質評価はカバー範囲外。lint-mdx-mobile.mjs カテゴリ 12（12-1 / 12-2 / 12-3）で構造違反を機械検知している。Phase 2 で `guide-qa` Evaluator 新設を検討（戦略系 Type-1 / 俯瞰系 Type-2 の使い分け評価、note CTA 整合性、サイト内回遊密度の 3 軸）。

**UI コンポーネント（`.tsx`）の視覚回帰**は `/design-review --visual` スキル（旧 `ui-visual-qa` エージェントを統合）で実施する。スキル層で完結するためサブエージェント化不要。

---

## チーム連携パターン（Phase 1）

| シナリオ | エージェント連携 |
|---|---|
| **Phase 1 開発フロー** | 1. PDF→MDX 変換 → 2. **content-qa**（品質評価） → 3. `/deploy`（本番反映） |
| 週次 PDCA（簡略版） | strategy-advisor（weekly-review → weekly-plan） |
| キーワードページ作成 | `/keyword-page`（Generator） → `cem-qa`（Evaluator）→ 不合格なら再修正 |
| キーワードページ品質サイクル | `/quality-cycle`（オーケストレータ） → `cem-qa`（評価） → `keyword-rewriter`（改訂） → 再評価 → 人間レビュー |
| 1級土木 textbook 変換 | `/pdf-to-mdx --exam civil-construction-1`（Generator） → `civil-construction-qa`（Evaluator） → `/improve-article --mode verify` |
| 1級土木 textbook/guide 品質サイクル | `/civil-textbook-cycle`（オーケストレータ） → `civil-construction-review`（評価） → `civil-textbook-rewriter`（改訂） → 再評価 → 人間レビュー |
| UI コンポーネント変更 | 親エージェント（Generator） → `/design-review --visual`（視覚検証・スキル層で完結） → `/simplify` で修正 |

**注**: 月次企画・四半期レビュー・試験シーズン対策・広告最適化は Phase 2 で再開予定。

---

## 新規エージェント追加時の手順

1. `.claude/agents/{agent-name}.md` を作成
2. frontmatter に `name` / `description` / `model` を必ず指定
   - model 選択ルールは `.claude/skills/dev/create-skill/SKILL.md` の「サブエージェント作成時の model 指定ルール」または CLAUDE.md「ハーネス設計原則」§6 を参照
3. Generator か Evaluator かを明記（混在禁止）
4. 本文に「モデル方針」欄を設け、`model: sonnet/inherit` を選んだ理由を 1-2 文で記載
5. このファイル（agents-registry.md）の一覧表に行を追加
6. CLAUDE.md の「サブエージェント `model:` クイックリファレンス」表にも行を追加
7. 関連スキル（Generator 側）があれば `skills-registry.md` も更新
