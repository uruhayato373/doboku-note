# 過去問起点の校正サイクル — 次の実装ロードマップ

**策定日**: 2026-04-20
**ステータス**: MVP 実装済み、Phase 2/3 未着手
**関連**:
- 元プラン: `C:\Users\m004195\.claude\plans\starry-enchanting-crown.md`
- 実装スキル: `.claude/skills/content/exam-keyword-cycle/SKILL.md`
- 継続改善ループ全体図: `.claude/reference/workflows.md`
- 類似参考（ADR）: `24_performance-monitoring-architecture.md`（PSI 日次監査）

## 1. 現状（MVP 実装済み）

2026-04-20 時点で以下が動作する:

| 機能 | 実装 | 状態 |
|---|---|---|
| 手動起動 `/exam-keyword-cycle` | `.claude/skills/content/exam-keyword-cycle/SKILL.md` | ✅ 完了 |
| 6 Phase オーケストレーション | 同上 | ✅ 完了 |
| サイクルログ永続化 | `docs/reviews/exam-keyword-cycle/YYYY-MM-DD-*.md` | ✅ フォーマット定義済み |
| 進捗状態管理 | `.claude/state/exam-keyword-cycles/progress.json` | ✅ スキーマ定義済み |
| PR 作成経路 | 既存 `/pr-create` を再利用 | ✅ 完了 |
| スキル索引登録 | `skills-registry.md` | ✅ 完了 |

**未実施**: 実サイクルの試運転。いつでも手動実行可能。

## 2. Phase 2 — 定期実行と weekly-review 統合

**目的**: 手動起動の手間を無くし、運用を定常化する。

### 2-1. `--auto` 自動選択ロジック

`/exam-keyword-cycle --auto` で次に扱う過去問を自動決定する:

**選択アルゴリズム**:
1. `.claude/state/exam-keyword-cycles/progress.json` の `covered` を走査
2. 優先順位:
   - 最新年度（R07 → R06 → R05 …）で未カバーの設問から若番順
   - 全年度カバー済みなら、`date` が 6 ヶ月以上前の設問を再訪候補
3. 選択結果をユーザーに確認してから Phase 1 へ進む

**実装**:
- `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` 新規
- 入力: `progress.json` + `src/config/exam-question-keywords.json`
- 出力: `{ exam, question, reason }`

### 2-2. weekly-review への Agent F 組込み

`/weekly-review` の Phase 1 に **Agent F: 校正サイクル進捗** を追加する:

**調査項目**:
- 今週実施したサイクル数・対象キーワード数
- 年度別カバレッジ（例: R07: 5/40、R06: 12/40）
- 未カバー過去問のバックログ
- 次週の推奨 3 件

**出力セクション**（`docs/reviews/weekly/YYYY-Www-review.md` に埋込）:

```markdown
## 過去問起点の校正サイクル

### 今週のサイクル実施
| 日付 | 過去問 | 対象キーワード | PR |
|---|---|---|---|

### カバレッジ
- 令和 7 年: N/40 問
- 令和 6 年: N/40 問
- ...

### 次週の候補
- 優先: R07 Ⅰ-1-X（未カバー）
```

### 2-3. `/distill-proofread-learnings --since "1cycle"` 連動

サイクル完了時に学習抽出を自動呼出し、視点タグ別の新パターンを捕捉する。

現状の `/distill-proofread-learnings` は `--since` に期間（`7d` など）を受ける。`1cycle` サポートを追加:
- 最新サイクルの開始コミットから HEAD までを対象に絞る
- サイクルログ（`docs/reviews/exam-keyword-cycle/*.md`）の視点タグを入力ヒントにする

## 3. Phase 3 — GitHub Actions スケジュール化

**目的**: 完全自動化。受験前（2026-06 以降）の品質上げピーク時に稼働させる。

### 3-1. Workflow 定義

**`.github/workflows/exam-keyword-cycle.yml`** を新設:

```yaml
name: Exam keyword cycle (weekly)

on:
  schedule:
    - cron: "0 13 * * 1,4"  # JST 22:00 Mon / Thu
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  cycle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --legacy-peer-deps
      - run: npm run build-backlinks
      # 以下は /exam-keyword-cycle --auto を remote trigger で実行する想定
      # （具体的な呼出方法は Phase 3 着手時に remote trigger 仕様を確認）
```

**課題**: GitHub Actions 内から `/exam-keyword-cycle` スキルを呼び出す仕組みが必要。既存の weekly-pdca 自動化と同じ仕組み（Claude Code remote trigger）を再利用できるか要確認。

### 3-2. 実行頻度

- 週 2 回（月・木）= 月 8-9 サイクル
- 年度（R07〜R01・H21〜H30）各 40 問 × 14 年 = 約 560 問
- 現実的には **最新 3 年分（R05/R06/R07）= 120 問**を優先カバー → 約 14 ヶ月でカバレッジ 100%
- 受験日（2026-07）までに R07/R06 の主要問題（80 問）をカバーするには、4 ヶ月で 80 サイクル ≒ 週 5 回ペース必要
- **現実案**: 週 2 回 × 優先度高い問題のみ（網羅性を犠牲にして深度優先）

### 3-3. 失敗時の扱い

PSI 日次監査と同パターン:
- サイクル中に重大エラー（MDX パース失敗・PR 作成失敗等）→ Issue 自動起票
- ラベル: `content-quality`, `auto-generated`
- Body: エラーログ＋関連コミット

## 4. 記録（recording）の現状と補強

### 4-1. 現状の記録経路（すでにある）

| 記録先 | 対象 | 生成タイミング |
|---|---|---|
| Git コミット | キーワード MDX の実変更 | 各キーワード修正時 |
| `docs/reviews/exam-keyword-cycle/YYYY-MM-DD-*.md` | 視点タグ・Before/After・スコア推移 | Phase 5 |
| `docs/reviews/exam-keyword-cycle/index.json` | サイクルメタ情報（日付・対象・PR 番号） | Phase 5 |
| `.claude/state/exam-keyword-cycles/progress.json` | カバー状況 | Phase 5 |
| GitHub PR | 差分とレビューコメント | Phase 6 |

### 4-2. 補強候補（Phase 2 以降で検討）

- **サイクル横断ダッシュボード**: `docs/project/` 配下に「サイクル実施状況」ページを置き、月次集計・視点タグ分布・スコア改善ヒストグラムを可視化
- **キーワード個別の履歴**: キーワードページ frontmatter に `cycleHistory: [{date, pr, score}]` を追加し、改善履歴を内在化
- **ユーザーレビューコメントの学習化**: PR レビューコメントを `/distill-proofread-learnings` の入力に追加し、ユーザー嗜好の抽出精度を上げる

## 5. 優先順位

| # | 項目 | 所要 | 前提 |
|---|---|---|---|
| 1 | MVP の実サイクル試運転（R06 Ⅰ-1-35 等） | 1 時間 | 現状で可能 |
| 2 | `--auto` 選択ロジック（select-next-question.mjs） | 2 時間 | 試運転で MVP 動作確認後 |
| 3 | weekly-review Agent F 組込み | 1 時間 | `--auto` 完成後 |
| 4 | `/distill-proofread-learnings --since "1cycle"` | 1 時間 | Agent F と並行可 |
| 5 | GitHub Actions Workflow | 2-3 時間 | Claude Code remote trigger の仕組み調査要 |
| 6 | サイクル横断ダッシュボード | 3-4 時間 | 数サイクル蓄積後に着手 |

## 6. 中止判定基準

Phase 2 以降への進行は以下で判定:
- **続行**: MVP 試運転で「視点タグ付き校正 → PR」の流れが実際に価値を生んだ場合
- **中止**: 試運転で「手動校正の方が早い」「視点タグが形骸化した」と判定した場合 → MVP のまま手動運用で継続

## 7. 関連

- 元プラン: `C:\Users\m004195\.claude\plans\starry-enchanting-crown.md`
- 実装スキル: `.claude/skills/content/exam-keyword-cycle/SKILL.md`
- 校正学習メタスキル: `.claude/skills/management/distill-proofread-learnings/SKILL.md`
- 週次 PDCA: `.claude/skills/management/weekly-review/SKILL.md`
- PR 作成: `.claude/skills/dev/pr-create/SKILL.md`
- 継続改善ループ図: `.claude/reference/workflows.md`
- PSI 監視 ADR（類似自動化事例）: `docs/project/24_performance-monitoring-architecture.md`
