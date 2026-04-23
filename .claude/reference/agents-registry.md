# サブエージェント詳細レジストリ

`.claude/agents/` に定義されたサブエージェント群の詳細。Generator/Evaluator 分離の原則に基づき設計。

**いつ読むか**: サブエージェントを呼び出すときに担当範囲を確認するとき、連携設計時、新規エージェント追加時の命名・責務設計時。

**モデル指定のクイックリファレンス**は CLAUDE.md 本体「ハーネス設計原則」§6 にある（判断の土台として毎ターン読めるようにするため）。このファイルには詳細な担当範囲・Phase 対応・連携パターンを集約。

---

## エージェント一覧

| エージェント | 役割 | 種別 | model | 担当スキル | Phase 1 対応 |
|---|---|---|---|---|---|
| `content-qa` | PDF→MDX 変換の品質評価（5軸ルーブリック、過去問・基準書） | Evaluator | sonnet | check-mdx, （Phase C で削除） | ✅ 運用中 |
| `cem-qa` | 技術士総合技術監理キーワードページの品質評価（5軸ルーブリック） | Evaluator | sonnet | lint-mdx-mobile, check-mdx, check-links, exam-backlinks | ✅ 運用中 |
| `civil-construction-qa` | 1級土木 textbook/guide ページの視覚＋網羅率検証（PDF 原本との3モード5軸ルーブリック） | Evaluator | sonnet | check-mdx, review-mobile, Playwright MCP | ✅ 運用中 |
| `civil-construction-review` | 1級土木 textbook/guide の既存 MDX 校正（PDF照合なし、content-principles準拠＋モバイル視認性＋画像キャプション品質） | Evaluator | inherit | lint-mdx-mobile, check-mdx, check-links | ✅ 運用中 |
| `strategy-advisor` | 戦略・PDCA・レビュールーティング・収益化戦略を統括するオーケストレーター | Orchestrator | inherit | weekly-plan, weekly-review, critical-review, pre-mortem | ✅ 運用中（⏸️ 競合分析・keyword-gap 等は Phase 2 で復活） |
| `seo-auditor` | SEO 監査（Phase 2 で復活） | Evaluator | sonnet | fetch-gsc-data, fetch-ga4-data | ⏸️ Phase 2 で復活 |
| `metrics-analyzer` | GSC/GA4 計測データから改善機会を5パターン抽出（High-Impr-Low-CTR 等） | Evaluator | sonnet | weekly-improve | ✅ 運用中 |
| `performance-auditor` | PSI 計測データからしきい値違反・回帰を検出し、LCP 肥大・CLS 発生等の既知パターンに改善候補をマッピング | Evaluator | sonnet | psi-audit | ✅ 運用中 |
| `content-planner` | コンテンツ企画（Phase 2 で復活） | Generator | sonnet | discover-exam-season, exam-demand, keyword-gap | ⏸️ Phase 2 で復活 |
| `keyword-rewriter` | CEM キーワードページのバルクリライト | Generator | sonnet | quality-cycle 連携 | ✅ 運用中 |
| `civil-textbook-rewriter` | 1級土木 textbook/guide ページのバルクリライト | Generator | sonnet | civil-textbook-cycle 連携 | ✅ 運用中 |

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
| **cem-qa** | `.mdx`（総監キーワード） | 5管理体系・コンポーネント原則・参考資料 | キーワードページ執筆後 |
| **civil-construction-qa** | `.mdx`（1級土木 textbook/guide） | 視覚検証 + テキスト網羅率（3モード5軸） | 1級土木 MDX 生成後 |
| **civil-construction-review** | `.mdx`（1級土木 textbook/guide） | content-principles準拠＋モバイル視認性＋画像キャプション品質（PDF照合なし、5軸） | 既存 MDX の定期校正・編集後 |
| **metrics-analyzer** | `.claude/state/metrics/gsc/*.json`, `.claude/state/metrics/ga4/*.json` | 5パターン抽出（High-Impr-Low-CTR, Rank-Stuck, Traffic-Drop, Hidden-Winner, Orphan-Query） | `/weekly-improve` 実行時 |
| **performance-auditor** | `.claude/state/metrics/psi/*.json` | しきい値違反＋回帰検出（LCP/CLS/INP/TBT/TTFB/Scores）＋既知パターンマッピング | `/psi-audit` 実行時 / 日次 workflow 後 |

**対象ファイル・軸・起動タイミングが全て異なる**ため、これらは統合しない（「対象ドメインの分離」原則）。

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
