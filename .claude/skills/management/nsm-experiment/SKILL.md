---
name: nsm-experiment
description: >
  NSM（月間オーガニック検索流入ユーザー数）改善の実験ライフサイクルを管理する。
  propose（候補提案）→ start（実行開始）→ measure（前後比較）→ close（学び記録）の
  PDCA ループを回す。セッション間で継続作業を持越す場合は pending/resume で復帰可能。
  .claude/state/experiments.json を状態保存先に使い、playbook + rubric で意思決定を支援する。
  Use when user asks to [NSM 実験, 仮説検証, /nsm-experiment, 実験提案, 効果測定,
  PDCA サイクル, 作業継続, 残作業確認, pending 作業, GSC インデックスリクエスト].
user-invocable: true
---

**実行環境**: ライブ計測（baseline/current の取得）を伴う操作は **creds + 外部到達性がある環境（macOS 等）専用**。会社 PC（社内プロキシで Google API 遮断）では `metrics-reader.mjs` のライブ呼び出しは通らない。

> その場合は CI がコミットした `.claude/state/metrics/{ga4,gsc}/` のスナップショットを読んで baseline/current を比較する（既定経路）。計測は CI/CD 供給が正で、ローカル creds 未設定は「計測基盤未整備」ではない。恒久ルール: `.claude/knowledge/reference/measurement-incidents.md`（2026-06-05）。

## なぜこのスキルがあるのか

NSM データを取得・可視化する仕組みは揃った（`metrics-reader.mjs`, `/weekly-review` の NSM セクション）。しかし「見るだけ」では改善に繋がらない。継続的に仮説を立て → 実行 → 計測 → 学び → 次へ回す PDCA ループが必要。

本スキルは Anthropic "Building Skills for Claude" ガイドの **Pattern 3: Iterative refinement**（page 23）を NSM 改善に適用し、以下のサイクルを仕組み化する:

```
Plan       : propose 候補を playbook + rubric で評価 → start
Do         : ユーザーが実験を実行（コンテンツ編集・デプロイ）
Check      : measure で前後比較
Act        : close で learnings 記録 → roadmap にフィードバック
```

詳細は `.claude/skills/management/nsm-experiment/references/definition.md` と `.claude/pdfs/guide.pdf`（Chapter 3）を参照。

## サイクルが閉じたことを機械で保証する（2026-07-30 追加）

propose→start→measure→close の**仕組み**は本スキルが持つが、「期限が来たのに measure されていない」を
思い出す仕組みが無く、実際に放置が起きていた（EXP-004: next_check_date から close まで 27 日、
EXP-005: pending_user_actions が 4 日以上未消化）。改善を打っても再計測しなければ学びは台帳に入らず、
サイクルは閉じない。

そこで `npm run check-experiment-due`（オフライン surfacer）が台帳を読んで期限超過だけを surface し、
**weekly-review が毎週それを列挙する**（新しい cron は作らない）。判定:

| 種別 | 条件 | 次アクション |
|---|---|---|
| MEASURE_DUE | running かつ next_check_date 超過（未設定なら開始から 28 日） | `/nsm-experiment measure <id>` |
| CLOSE_DUE | measuring のまま 14 日 | `/nsm-experiment close <id>` |
| DECIDE_DUE | proposed のまま 14 日 | start か abandon を決める |
| PENDING | pending_user_actions が残っている | 記載のアクションを実行 |
| NO_BASELINE | running なのに baseline が無い | 前後比較が不可能＝baseline を先に確定 |

`next_check_date` は start 時に必ず入れる。未設定だとフォールバック（開始から 28 日）しか効かず、
指標の窓（GSC 28 日）とずれる。

## 引数

```
/nsm-experiment                          # 引数なしは pending の alias
/nsm-experiment pending                  # 継続作業が必要な実験を surface（セッション継続時の第 1 候補）
/nsm-experiment resume <id>              # 特定実験の残作業を step-by-step で guide
/nsm-experiment propose                  # 現状メトリクスから候補 3-5 件を提案
/nsm-experiment list [--status <s>]      # 実験一覧（status フィルタ可）
/nsm-experiment start <id>               # 実行開始（proposed → running）
/nsm-experiment measure <id>             # 前後比較（running → measuring）
/nsm-experiment close <id> [--result]    # 学び記録（measuring → done）
/nsm-experiment abandon <id>             # 中止（→ abandoned）
/nsm-experiment show <id>                # 1 件の詳細表示
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

### pending: 継続作業の surface（セッション継続時の第 1 候補）

**目的**: 新セッション or 作業再開時に、中断中の実験と残作業を即座に把握する。

0. 期限超過の一覧だけが欲しいときは `npm run check-experiments-due -- --json` が最短（決定的 surfacer。
   weekly-review もこれを転記する。measure 期限超過 / next_check_date 未設定の滞留 / proposed の滞留 /
   未処理の `pending_user_actions` を返す。判定のみで状態は書き換えない＝裁定は人）
1. `.claude/state/experiments.json` を読み、`experiments[]` から `status` が `running` と `measuring` の実験を全件抽出（兄弟スキル weekly-review/weekly-plan/weekly-improve と同じく JSON 直読み。ヘルパーモジュールは介さない）
2. 各 experiment について以下をチェック:
   - `pending_user_actions` フィールドが存在して配列が空でないか
   - `next_check_date` が今日以前か（期限超過）or 3 日以内（近接）or 未来
3. 何もなければ「継続作業なし。`/nsm-experiment propose` で次の候補を見ますか？」と返す
4. ある場合は以下のフォーマットで markdown 出力:

```
=== 継続作業が必要な実験 (N 件) ===

🔴 EXP-001 統合ハウスキーピング (running, 経過 X 日)
   次確認日: 2026-04-16 (期限超過 or 今日 or あと N 日)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   【保留中アクション】
   GSC 手動 indexing リクエスト (残 3 件)
     ・civil-construction-1-primary-r05-a
     ・civil-construction-1-textbook-construction-mgmt-overview
     ・civil-construction-1-guide-earthwork-key-points
   理由: GSC 1 日クォータ上限到達
   参照: .claude/state/metrics/notes/gsc-indexing-requests-2026-04-15.md
```

5. ユーザーに「どの action から進めるか」を問う。「EXP-001 を resume して」等の返答があれば `resume` サブモードへ遷移。

**絵文字の意味**:
- 🔴 期限超過 or 今日が next_check_date
- 🟡 3 日以内の近接
- 🟢 未来（継続作業はあるが急ぎではない）

### resume: 特定実験の継続作業を guide

**目的**: 単一実験の残 actions をステップバイステップで完了させる。

1. 指定 `id` の experiment を `getExperiment(id)` で取得
2. `pending_user_actions` が空 or 未定義なら「継続作業なし」と返す
3. 各 `pending_user_actions[]` について順に:
   a. action 名と参照ファイル（`reference`）を表示
   b. 残 URL / sub-items を 1 つずつ surface
   c. ユーザーに完了確認を取る（「完了」「スキップ」「中止」）
   d. 完了した項目を pending から削除（`updateExperiment` で書き戻す）
4. 全 action 完了後、`experiments.json` の history に以下を追加:

```json
{
  "date": "<ISO timestamp>",
  "action": "manual_action_completed",
  "summary": "GSC 手動 indexing リクエスト 残 3 件を完了、pending_user_actions からクリア"
}
```

5. 残作業がなくなれば「pending 作業はすべて完了。次は `/nsm-experiment measure` で効果計測に移れます」と誘導

### propose: 候補提案

1. `node -e "import('./.claude/scripts/lib/metrics-reader.mjs').then(async m => console.log(JSON.stringify(await m.fetchWeeklyNsmMetrics(), null, 2)))"` で現状取得
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
7. **roadmap フィードバック提案**: 成功パターンなら `docs/todo/backlog.md`（タスクマスタ）への追記提案を出力

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
- **コンテンツそのものの編集**: `/keyword-page`, `/check-mdx --rules frontmatter` など専任スキルの担当
- **週次レポート生成**: `/weekly-review` の担当（本スキルは `experiments.json` の読み書きを担う）
- **月次集計**: 別スキル（Phase 2 以降）

## 連携スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`.claude/state/experiments.json`** | 実験 state 本体（JSON 直読み書き。専用ヘルパーモジュールは無い） |
| **`.claude/scripts/lib/metrics-reader.mjs`** | baseline と current の計測 |
| **`.claude/scripts/snapshot-weekly-metrics.mjs`** | 週次スナップショット（propose 時の背景データ）|
| **`.claude/skills/management/weekly-plan/SKILL.md`** | Phase 1 Agent C で実験提案を自動化 |
| **`.claude/skills/management/weekly-review/SKILL.md`** | 実験進捗セクションで running を自動表示 |
| **`.claude/skills/management/nsm-experiment/references/playbook.md`** | 実験パターンカタログ |
| **`.claude/skills/management/nsm-experiment/references/rubric.md`** | 優先順位評価軸 |
| **`.claude/skills/management/nsm-experiment/references/definition.md`** | NSM 定義の真実源 |
| **`docs/todo/backlog.md`** | close 時の learnings フィードバック先（タスクマスタ。旧 05_コンテンツロードマップ.md はアーカイブ済み）|

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
- `.claude/skills/management/nsm-experiment/references/definition.md` ── NSM 定義と目標値
- `.claude/state/experiments.json` ── 実験 state 本体（JSON 直読み書き）
- `.claude/scripts/lib/metrics-reader.mjs` ── 計測実装
- `references/playbook.md` ── 実験パターンカタログ
- `references/rubric.md` ── 優先順位評価軸
