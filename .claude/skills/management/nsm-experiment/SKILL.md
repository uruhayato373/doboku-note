---
name: nsm-experiment
description: >
  NSM（月間オーガニック検索流入ユーザー数）改善の実験ライフサイクルを管理する。
  propose（候補提案）→ start（実行開始）→ measure（前後比較）→ close（学び記録）の
  PDCA ループを回す。data/experiments.json を状態保存先に使い、playbook + rubric で
  意思決定を支援する。
  Use when user asks to [NSM 実験, 仮説検証, /nsm-experiment, 実験提案, 効果測定, PDCA サイクル].
user-invocable: true
---

**実行環境**: macOS only。GA4/GSC の計測基盤（Step 1-3 で構築済み）が前提。

## なぜこのスキルがあるのか

NSM データを取得・可視化する仕組みは揃った（`metrics-reader.mjs`, `/weekly-review` の NSM セクション）。しかし「見るだけ」では改善に繋がらない。継続的に仮説を立て → 実行 → 計測 → 学び → 次へ回す PDCA ループが必要。

本スキルは Anthropic "Building Skills for Claude" ガイドの **Pattern 3: Iterative refinement**（page 23）を NSM 改善に適用し、以下のサイクルを仕組み化する:

```
Plan       : propose 候補を playbook + rubric で評価 → start
Do         : ユーザーが実験を実行（コンテンツ編集・デプロイ）
Check      : measure で前後比較
Act        : close で learnings 記録 → roadmap にフィードバック
```

詳細は `docs/project/03_NSMと計測指標.md` と `docs/pdfs/guide.pdf`（Chapter 3）を参照。

## 引数

```
/nsm-experiment propose                 # 現状メトリクスから候補 3-5 件を提案
/nsm-experiment list [--status <s>]     # 実験一覧（status フィルタ可）
/nsm-experiment start <id>              # 実行開始（proposed → running）
/nsm-experiment measure <id>            # 前後比較（running → measuring）
/nsm-experiment close <id> [--result]   # 学び記録（measuring → done）
/nsm-experiment abandon <id>            # 中止（→ abandoned）
/nsm-experiment show <id>               # 1 件の詳細表示
```

## 状態遷移

```
proposed → running → measuring → done
    ↓         ↓          ↓
abandoned  abandoned  running (re-measure)
```

- **proposed**: 候補として作成済み、まだ実行していない
- **running**: 実行中（started_at 記録）
- **measuring**: 計測中（baseline と比較可能）
- **done**: 学びを記録して完了
- **abandoned**: 中止（理由を history に記録）

## サブモードの実行手順

### propose: 候補提案

1. `node -e "import('./scripts/lib/metrics-reader.mjs').then(async m => console.log(JSON.stringify(await m.fetchWeeklyNsmMetrics(), null, 2)))"` で現状取得
2. `references/playbook.md` を Read してパターンカタログを読み込む
3. `references/rubric.md` を Read して評価軸を読み込む
4. 現状メトリクスと playbook を突き合わせ、適用可能な実験を洗い出す
5. 各候補を rubric で採点（インパクト 40% / 工数 30% / 学習価値 20% / 確実性 10%）
6. 加重合計降順で上位 3-5 件を表示
7. ユーザーに「どれを experiments.json に追加するか」尋ねる
8. 採用する候補を `addExperiment()` で追加

**出力例**:
```
=== NSM 実験候補 (propose) ===
現状: Organic Search 27 UU/週、GSC clicks 2/週、top 10 queries の平均 position 8.3

1. [EXP-??? 加重 2.4]「総合技術監理 キーワード集 2026」title 改善
   hypothesis: position 7.4 → 3 位以内で CTR 3x 見込み
   rubric: impact 3 / effort 3 / learning 2 / certainty 2 → 2.4
   actions: title に「2026 年度試験対応」追記 → デプロイ → 10 日待機

2. ...

どの候補を experiments.json に追加しますか？ (例: "1,3")
```

### start: 実行開始

1. `getExperiment(id)` で取得、存在確認
2. status が `proposed` であることを確認
3. **baseline を確定**: この時点のメトリクス（target_metric に対応する値）を取得して experiment.baseline に保存
4. `transitionStatus(id, 'running')` で遷移
5. 実行アクションリスト（experiment.actions）を表示
6. ユーザーに「実際の編集作業」を促す

### measure: 前後比較

1. `getExperiment(id)` で取得
2. status が `running` または `measuring` であることを確認
3. **ガード: started_at から 10 日未満なら警告**（GSC 3 日遅延 + 初期データのブレを考慮）
4. 現在のメトリクスを取得
5. baseline と比較し、target_metric の delta を計算
6. 効果サマリを表示（改善/悪化/変わらず）
7. `transitionStatus(id, 'measuring')` で遷移（既に measuring なら再計測）

### close: 学び記録

1. `getExperiment(id)` で取得
2. status が `measuring` であることを確認
3. 効果判定をユーザーに問う: `success` / `partial` / `no-effect` / `negative`
4. learnings をユーザーに記述してもらう（何が分かったか、他に転用可能か）
5. `updateExperiment(id, { result, learnings })`
6. `transitionStatus(id, 'done')`
7. **roadmap フィードバック提案**: 成功パターンなら `docs/project/04_コンテンツロードマップ.md` への追記提案を出力

### abandon: 中止

1. `getExperiment(id)` で取得
2. 中止理由をユーザーから聞く
3. `transitionStatus(id, 'abandoned', { reason })`

### list / show

- `list`: 全実験を status 別に表形式で表示
- `show`: 1 件の詳細（history 含む）を表示

## 制約事項

- **同時 active 実験 ≤ 2 件**（rubric 原則）: `listActive()` が 2 件以上返す場合、新規 start 時に警告
- **started_at + 10 日未満の measure は警告**: GSC 3 日遅延 + 短期ノイズを除外
- **実行（実ファイル編集）は担当外**: 本スキルは lifecycle 管理専任、実コンテンツ編集は `/keyword-page revise` 等の Generator スキルに委譲
- **自己評価の禁止**: 本スキルは Evaluator 役も兼ねるが、「この learning で roadmap を直接書き換える」ような Generator 行為はしない。提案までが責務

## 担当外

- **NSM 定義の変更**: `/north-star-metric` スキル（既存、未実装）の担当
- **コンテンツそのものの編集**: `/keyword-page`, `/check-frontmatter` など専任スキルの担当
- **週次レポート生成**: `/weekly-review` の担当（本スキルは experiments-state を提供するのみ）
- **月次集計**: 別スキル（Phase 2 以降）

## 連携スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`scripts/lib/experiments-state.mjs`** | state I/O 本体 |
| **`scripts/lib/metrics-reader.mjs`** | baseline と current の計測 |
| **`scripts/snapshot-weekly-metrics.mjs`** | 週次スナップショット（propose 時の背景データ）|
| **`.claude/skills/management/weekly-plan/SKILL.md`** | Phase 1 Agent C で実験提案を自動化 |
| **`.claude/skills/management/weekly-review/SKILL.md`** | 実験進捗セクションで running を自動表示 |
| **`.claude/skills/management/nsm-experiment/references/playbook.md`** | 実験パターンカタログ |
| **`.claude/skills/management/nsm-experiment/references/rubric.md`** | 優先順位評価軸 |
| **`docs/project/03_NSMと計測指標.md`** | NSM 定義の真実源 |
| **`docs/project/04_コンテンツロードマップ.md`** | close 時の learnings フィードバック先 |

## 使い方の例

```bash
# 初回: 現状把握から候補提案
/nsm-experiment propose

# 採用した 1-2 件を開始
/nsm-experiment start EXP-001
# ← baseline が固定され、実行アクション一覧が表示される

# ユーザーが実際のコンテンツ編集・デプロイを実施（skill 対象外）

# 10 日経過後
/nsm-experiment measure EXP-001
# ← 前後比較サマリ表示

# 効果を判定して close
/nsm-experiment close EXP-001
# ← 効果判定と learnings を対話入力 → done へ遷移

# 次週の /weekly-plan で自動的に次の候補提案へループ
```

## 参照

- `.claude/pdfs/guide.pdf` Chapter 3 (Testing and iteration) ── Pattern 3 Iterative refinement の出典
- `docs/project/03_NSMと計測指標.md` ── NSM 定義と目標値
- `scripts/lib/experiments-state.mjs` ── state 実装
- `scripts/lib/metrics-reader.mjs` ── 計測実装
- `references/playbook.md` ── 実験パターンカタログ
- `references/rubric.md` ── 優先順位評価軸
