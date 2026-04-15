---
name: quality-cycle
description: >
  キーワードページの品質サイクル（スコアリング → リライト → 検証 → 人間レビュー）を回す統合スキル。
  Use when user asks to [品質スコア, リライト, バルク評価, /quality-cycle].
---

## 用途

技術士総合技術監理（CEM）キーワードページ全件に対して、品質サイクルを継続的に回すためのオーケストレータ。1 ページずつ手作業で評価・改善するのではなく、機械的事前ふるい → 質的詳細評価 → 弱いページのリライト → 再評価 → 人間レビュー待ちリスト出力、という一連のサイクルを統合する。

詳細アーキテクチャは `docs/project/13_quality-cycle-architecture.md` を参照。

## 設計原則

1. **cem-qa エージェントが品質ルーブリックの唯一の真実源**
2. **2 段階スコアリング**: Tier 1（機械的・全件） → Tier 2（質的・選抜）
3. **Generator/Evaluator 厳密分離**: `keyword-rewriter` ≠ `cem-qa`
4. **人間ゲート必須**: AI リライト後は `reviewStatus: needs-review` でマーク
5. **データは git 管理**: `.claude/state/*.json` をリポジトリにコミット

## サブモード一覧

| モード | 役割 | 出力 |
|---|---|---|
| `screen` | Tier 1 機械的事前ふるい（lint + 文字数 + frontmatter）| `.claude/state/mechanical-screen.json` |
| `score` | Tier 2 質的評価（cem-qa subagent 並列呼び出し）| `.claude/state/quality-scores.json` |
| `rewrite` | 弱いページを keyword-rewriter で改訂 | 改訂された article.mdx + state 更新 |
| `verify` | リライト後を cem-qa で再評価 | state 更新 |
| `review` | 人間レビュー待ちリスト出力 | `.claude/state/review-queue.md` |
| `report` | ダッシュボード出力 | コンソール |

## 引数

| 引数 | 説明 | 例 |
|---|---|---|
| `--mode <mode>` | 必須。実行モード | `--mode screen` |
| `--top <N>` | score モード時、Tier 2 評価の上限 | `--top 200` |
| `--threshold <X.X>` | rewrite モード時、リライト対象の weighted score 上限 | `--threshold 2.5` |
| `--batch <N>` | rewrite モード時、バッチサイズ（並列度）| `--batch 3` |
| `--order <weakest\|newest>` | rewrite モード時、対象選定の順序 | `--order weakest` |
| `--dry-run` | 何もせず、対象とアクションだけ表示 | `--dry-run` |
| `--slug <slug>` | 特定スラッグだけを対象にする | `--slug pdca-cycle` |

## 実行例

### 初回サイクル（AdSense 緊急対応）

```bash
# Step 1: 全ページを機械的にふるい
node scripts/quality-cycle.mjs --mode screen
# → .claude/state/mechanical-screen.json (全 700 件)

# Step 2: 上位 200 件を質的評価
node scripts/quality-cycle.mjs --mode score --top 200
# → .claude/state/quality-scores.json (200 件 × 5 軸)

# Step 3: weighted < 2.5 のページをリライト（並列 3）
node scripts/quality-cycle.mjs --mode rewrite --threshold 2.5 --batch 3
# → 50〜100 件の article.mdx に reviewStatus: needs-review

# Step 4: リライト後を再評価
node scripts/quality-cycle.mjs --mode verify
# → .claude/state/quality-cycle-state.json 更新

# Step 5: 人間向けレビュー待ちリスト
node scripts/quality-cycle.mjs --mode review
# → .claude/state/review-queue.md

# Step 6: ダッシュボード確認
node scripts/quality-cycle.mjs --mode report
```

### 継続的サイクル

```bash
# 月次 or 新規ページ追加後
node scripts/quality-cycle.mjs --mode screen
node scripts/quality-cycle.mjs --mode score --top 50  # 差分のみ
node scripts/quality-cycle.mjs --mode rewrite --threshold 2.0
node scripts/quality-cycle.mjs --mode verify
node scripts/quality-cycle.mjs --mode review
```

### 単一スラッグの再評価・再リライト

```bash
node scripts/quality-cycle.mjs --mode score --slug pdca-cycle
node scripts/quality-cycle.mjs --mode rewrite --slug pdca-cycle
node scripts/quality-cycle.mjs --mode verify --slug pdca-cycle
```

## データファイル

| ファイル | 内容 | 生成タイミング |
|---|---|---|
| `.claude/state/mechanical-screen.json` | 全 700 件の機械的指標 | `--mode screen` |
| `.claude/state/quality-scores.json` | Tier 2 評価結果 | `--mode score` |
| `.claude/state/quality-cycle-state.json` | 各ページの状態遷移履歴 | `--mode rewrite/verify` |
| `.claude/state/flagship-100.json` | スコア上位 100 件のリスト | `--mode score` |
| `.claude/state/review-queue.md` | 人間向けレビュー待ちリスト | `--mode review` |

## 状態遷移

```
unscored → scored → rewriting → needs-review → verified → approved
                                              └→ needs-rework → rewriting (loop)
                                              └→ rejected (human decision)
```

## 注意事項

- **人間レビューは必須**: AI リライト後は必ず `reviewStatus: needs-review` でマーク。`approved` への変更は人間のみ
- **バッチ分割コミット推奨**: 100 件のリライトを 1 コミットにまとめると AI 生成シグナルが強くなる。10 件ずつコミット推奨
- **拡張パターンの多様化**: `keyword-rewriter` は各ページに違うパターンを選ぶよう設計されているが、念のため目視確認推奨
- **コスト**: Tier 2 評価は LLM 呼び出しを伴う。200 件で約 5〜15 分。コスト発生
- **べき等**: 一度評価したページはキャッシュされる。再実行で重複しない

## 連携スキル・エージェント

| コンポーネント | 関係 |
|---|---|
| `cem-qa` エージェント | Tier 2 評価で subagent として呼び出し（評価のみ）|
| `keyword-rewriter` エージェント | rewrite モードで subagent として呼び出し（リライトのみ）|
| `lint-mdx-mobile.mjs` | screen モードで内部実行（機械的指標）|
| `mdx-io.mjs` | ファイル I/O（CRLF 保持）|
| `keyword-page` スキル | 個別ページ作成は別系統。quality-cycle はバルク改訂専用 |

## 参照

- `docs/project/13_quality-cycle-architecture.md` — システム全体設計（このスキルの真実源）
- `docs/project/12_adsense-resubmission-strategy.md` — このシステムが使われる文脈
- `.claude/agents/cem-qa.md` — Evaluator
- `.claude/agents/keyword-rewriter.md` — Generator
- `.claude/content-principles.md` — 品質ルールの真実源
