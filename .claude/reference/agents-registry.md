# サブエージェント詳細レジストリ

`.claude/agents/` に定義されたサブエージェント群の詳細。Generator/Evaluator 分離の原則に基づき設計。

**いつ読むか**: サブエージェントを呼び出すときに担当範囲を確認するとき、連携設計時、新規エージェント追加時の命名・責務設計時。

**モデル指定のクイックリファレンス**は CLAUDE.md 本体「ハーネス設計原則」§6 にある（判断の土台として毎ターン読めるようにするため）。このファイルには詳細な担当範囲・Phase 対応・連携パターンを集約。

---

## エージェント一覧

| エージェント | 役割 | 種別 | model | 担当スキル | Phase 1 対応 |
|---|---|---|---|---|---|
| `content-qa` | PDF→MDX 変換の品質評価（5軸ルーブリック、過去問・基準書） | Evaluator | sonnet | check-mdx, qa-pdf-mdx, clean-pdf-artifacts | ✅ 運用中 |
| `cem-qa` | 技術士総合技術監理キーワードページの品質評価（5軸ルーブリック） | Evaluator | sonnet | lint-mdx-mobile, check-mdx, check-links, exam-backlinks | ✅ 運用中 |
| `civil-construction-qa` | 1級土木 textbook/guide ページの視覚＋網羅率検証（PDF 原本との3モード5軸ルーブリック） | Evaluator | sonnet | verify-pdf-mdx, check-mdx, review-mobile, Playwright MCP | ✅ 運用中 |
| `ui-visual-qa` | `src/components/ui/**/*.tsx` 変更時の視覚回帰（lint-ui + light/dark × desktop/mobile スクショ） | Evaluator | sonnet | lint-ui, Playwright MCP | ✅ 運用中 |
| `strategy-advisor` | 戦略・PDCA・レビュールーティング・収益化戦略を統括するオーケストレーター | Orchestrator | inherit | weekly-plan, weekly-review, critical-review, pre-mortem | ✅ 運用中（⏸️ 競合分析・keyword-gap 等は Phase 2 で復活） |
| `seo-auditor` | SEO 監査（Phase 2 で復活） | Evaluator | sonnet | seo-audit, fetch-gsc-data, fetch-ga4-data | ⏸️ Phase 2 で復活 |
| `content-planner` | コンテンツ企画（Phase 2 で復活） | Generator | sonnet | discover-exam-season, exam-demand, keyword-gap | ⏸️ Phase 2 で復活 |
| `cem-advisor` | CEM 試験対策（総合技術監理） | Generator | sonnet | cem-content-generate, cem-study-plan（実装予定） | 🚧 計画段階 |
| `keyword-rewriter` | CEM キーワードページのバルクリライト | Generator | sonnet | quality-cycle 連携 | ✅ 運用中 |
| `aidesigner-frontend` | AIDesigner を使った UI 生成（ランディング・ダッシュボード等） | Generator | sonnet | AIDesigner MCP + CLI | ✅ 運用中 |

## Generator と Evaluator の分離原則

> Generator と Evaluator を分離する — 自己評価バイアスは構造で解決する

同じエージェントが作成も評価も担うと、自分の出力を「良い」と判断するバイアスが生じる。Evaluator エージェントは生成・修正には一切関与せず、**完成物の品質評価のみ**を行う。

### 分離例

- **PDF→MDX 変換**: `/pdf-to-mdx`（Generator スキル）→ `content-qa`（Evaluator エージェント）
- **キーワードページ**: `/keyword-page`（Generator スキル）→ `cem-qa`（Evaluator エージェント）
- **1級土木 textbook/guide**: `/civil-construction-1-pdf-to-mdx`（Generator スキル）→ `civil-construction-qa`（Evaluator エージェント）

### Evaluator エージェントの区別

| エージェント | 対象ファイル | 主な軸 | 起動タイミング |
|---|---|---|---|
| **content-qa** | `.mdx`（過去問・基準書） | 静的5軸（視覚検証なし） | PDF→MDX 変換後 |
| **cem-qa** | `.mdx`（総監キーワード） | 5管理体系・コンポーネント原則・参考資料 | キーワードページ執筆後 |
| **civil-construction-qa** | `.mdx`（1級土木 textbook/guide） | 視覚検証 + テキスト網羅率（3モード5軸） | 1級土木 MDX 生成後 |
| **ui-visual-qa** | `.tsx`（`src/components/ui/**`）+ `globals.css` | 静的 lint + light/dark × desktop/mobile 視覚回帰 | UI コンポーネント変更後 |

**対象ファイル・軸・起動タイミングが全て異なる**ため、これらは統合しない（「対象ドメインの分離」原則）。

---

## チーム連携パターン（Phase 1）

| シナリオ | エージェント連携 |
|---|---|
| **Phase 1 開発フロー** | 1. PDF→MDX 変換 → 2. **content-qa**（品質評価） → 3. `/deploy`（本番反映） |
| 週次 PDCA（簡略版） | strategy-advisor（weekly-review → weekly-plan） |
| CEM 試験対策 | cem-advisor（cem-content-generate → cem-study-plan） |
| キーワードページ作成 | `/keyword-page`（Generator） → `cem-qa`（Evaluator）→ 不合格なら再修正 |
| 1級土木 textbook 変換 | `/civil-construction-1-pdf-to-mdx`（Generator） → `civil-construction-qa`（Evaluator） → `/verify-pdf-mdx` |
| UI コンポーネント変更 | 親エージェント or `/aidesigner-frontend`（Generator） → `ui-visual-qa`（Evaluator） → `/simplify` で修正 |

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
