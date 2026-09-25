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

## 資格別の事業改善との接続

方針・指標の正典は `docs/strategy/01_プロダクト戦略.md` と `.claude/config/business-direction.json`。新たな事業レビュー起点の提案には `businessContext` として qualification（重点資格IDまたはall）、readerNeed、verifiedGap、metricId、reviewRecord（`.claude/state/metrics/business/` のreview参照）を付け、既存のbaseline/next_check_dateに基準期間・再測定日を持たせる。状態台帳はexperiments.jsonを継続する。集客以外の学習・販売・運営負担も評価対象だが、SEO Rank Watchには以下の専用契約を適用する。

**実行環境**: ライブ計測（baseline/current の取得）を伴う操作は **creds + 外部到達性がある環境（macOS 等）専用**。会社 PC（社内プロキシで Google API 遮断）では `metrics-reader.mjs` のライブ呼び出しは通らない。

> その場合は CI がコミットした `.claude/state/metrics/{ga4,gsc}/` のスナップショットを読んで baseline/current を比較する（既定経路）。計測は CI/CD 供給が正で、ローカル creds 未設定は「計測基盤未整備」ではない。恒久ルール: `.claude/knowledge/reference/measurement-incidents.md`（2026-06-05）。

## SEO Rank Watch の専用経路

`kind: seo-rank-watch` の実験は [seo-rank-watch.md](../../../knowledge/reference/seo-rank-watch.md) のCLIで記録・本番照合・reviewする。以下の汎用10日/28日基準や直接JSON編集を適用しない。状態は同じexperiments.jsonを使い、proposed→本番反映待ち→running（observing）→proposed/done/abandonedへ移す。検索意図に応える1件改善の入口は `/weekly-improve --rank-watch`。


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

## GSC インデックス登録リクエストの実行と記録

送信と記録はスクリプトで行う:

```bash
npm run gsc-indexing:check -- --from-ssot --category civil-construction-1 --group textbook   # 診断のみ
npm run gsc-indexing:request -- --from-ssot --category civil-construction-1 --group textbook --limit 10
```

- 対象は GSC UI SSOT（`crawledNotIndexed--allKnownPages.json`）から category / group で絞る。
  published:false は自動的に除外。
- **既定 dry-run**。送信は `--commit`（`:request`）のみ。1 回の送信上限は既定 10 件（日次クォータ配慮）。
  上限やクォータで送れなかった分は `limit-reached` / `quota-exceeded` として記録され、次回に回る。
- 送信後に受理文言を確認し、読めなければ `unconfirmed`＝成功にカウントしない。
- **記録の SSOT は `.claude/state/metrics/gsc-indexing/{requests-latest,history}.json`**（追跡）。
  手書きノートは作らない（`.claude/state/*.md` 新規作成禁止）。
- pending 表示（上の resume 画面）は history.json の `limit-reached` / `quota-exceeded` から組む。

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
/nsm-experiment resume <id>              # 特定実験の残作業を guide
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

0. 期限超過の一覧だけが欲しいときは `npm run check-experiment-due -- --json` が最短（決定的 surfacer。
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
   参照: .claude/state/metrics/gsc-indexing/history.json（機械記録・SSOT）
```

5. ユーザーに「どの action から進めるか」を問う。「EXP-001 を resume して」等の返答があれば `resume` サブモードへ遷移。

**絵文字の意味**:
- 🔴 期限超過 or 今日が next_check_date
- 🟡 3 日以内の近接
- 🟢 未来（継続作業はあるが急ぎではない）

### resume: 特定実験の継続作業を guide

**目的**: 単一実験の残 actions を完了させる。

1. experiments.jsonから指定idの実験を取得
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
7. 依頼済みの改善範囲なら根拠を示して候補を採用する。方針の大きな変更など依頼範囲を超える判断だけ確認する
8. 既存experiments.jsonを読み、重複しないIDでstatus=proposedの候補を配列に追加する。businessContextと基準・次回日を保存し、他の実験や過去履歴を変更しない（専用ヘルパーモジュールは無い）。

**候補の出力**: 対象資格、読者の課題、現物で確認した不足、基準値と出典・期間、変更案、評価指標、再計測日を示す。順位やCTRの改善を予測で断定しない。

### start: 実行開始

1. experiments.jsonから指定IDを取得し、存在を確認する
2. status が `proposed` であることを確認
3. **baseline を確定**: この時点のメトリクス（target_metric に対応する値）を取得して experiment.baseline に保存
4. SEOの本番反映待ちを含め既存の同時実験上限を確認し、空きがある場合だけstatusをrunningへ変更する。日付・根拠を履歴へ残す
5. 実行アクションリスト（experiment.actions）を表示
6. 担当の実装スキルで依頼範囲の変更を実装・検証し、実際に行った内容と再計測日を記録する。実装前を改善済みにしない

### measure: 前後比較

1. experiments.jsonから指定IDを取得
2. status が `running` または `measuring` であることを確認
3. **ガード: started_at から 10 日未満なら警告**（GSC 3 日遅延 + 初期データのブレを考慮）
4. 現在のメトリクスを取得
5. baseline と比較し、target_metric の delta を計算
6. 効果サマリを表示（改善/悪化/変わらず）
7. statusをmeasuringへ変更して履歴へ記録（既に measuring なら再計測）

### measure 仕様（CI の自動計測・2026-09-24〜）

propose / start のときに、前後比較できる実験には `measure` を付ける。付けた実験は毎週 CI（`fetch-metrics.yml` の publish 内 `scripts/measure-experiments.mjs`）が前後の窓で測り、`measurements[]` に `source: "auto"` で追記する（history は触らない）。事後窓が完了すると `check-experiment-due` が **VERDICT_DUE** を出し、週次レビューのトリアージで裁定（close）する。

```json
"measure": { "specVersion": 1, "metric": "gsc.clicks", "scope": { "pagePrefix": "/exam/rccm/" },
  "anchor": "2026-09-16", "preDays": 28, "postDays": 28, "lagDays": 3,
  "direction": "increase", "minEffect": 0.1, "minVolume": 20 }
```

- metric: `gsc.clicks` / `gsc.impressions` / `gsc.position` / `ga4.sessions`（scope.source=`google` で自然検索 google のみ）/ `ga4.event:<イベント名>` / `sales.revenue` / `sales.count`（scope.productPrefix か productIds）
- 新商品の売上など前後比が意味を持たない実験は `target`（事後窓の絶対目標）を付ける → 目安は `target-met` / `target-missed`
- 目安（`verdictHint`）は improved / no-effect / worse / insufficient-data / in-progress。**裁定ではない**（季節性・同時施策は人が見る）
- 売上は台帳（sales-log）の最終日が事後窓の終わりに届くまで確定扱いにしない
- 仕様と判定の実装: `scripts/lib/experiment-measure.mjs`。表現できない指標（note ダッシュボード・複合ファネル）は付けず、従来どおり手で measure する

### close: 学び記録

1. experiments.jsonから指定IDを取得
2. status が `measuring` であることを確認
3. 比較期間・実測と判定条件から効果を評価する: `success` / `partial` / `no-effect` / `negative`
4. learningsを実測に基づき記述する（何が分かったか、他に転用可能か）
5. 当該実験へresultとlearningsを保存
6. 測定・判断が済んだ当該実験だけdoneへ変更し、日時と根拠を履歴に追記
7. **roadmap フィードバック提案**: 成功パターンなら `.claude/todo/backlog.md`（タスクマスタ）への追記提案を出力

### abandon: 中止

1. experiments.jsonから指定IDを取得
2. 依頼範囲と根拠から中止理由を明記する。根拠のない枠空け目的では中止しない
3. 当該実験のstatusをabandonedへ変更し、理由と日時を履歴に追記

### list / show

- `list`: 全実験を status 別に表形式で表示
- `show`: 1 件の詳細（history 含む）を表示

## 制約事項

- **同時 active 実験 ≤ 2 件**（rubric 原則）: running/measuringとSEOの本番反映待ちを数え、2件以上なら新規startを止める
- **started_at + 10 日未満の measure は警告**: GSC 3 日遅延 + 短期ノイズを除外
- **実行（実ファイル編集）は担当外**: 本スキルは lifecycle 管理専任、実コンテンツ編集は `/keyword-page revise` 等の Generator スキルに委譲
- **自己評価の禁止**: 本スキルは Evaluator 役も兼ねるが、「この learning で roadmap を直接書き換える」ような Generator 行為はしない。提案までが責務

## 担当外

- **NSM 定義の変更**: `/north-star-metric` スキルの担当
- **コンテンツそのものの編集**: `/keyword-page`, `/check-mdx --rules frontmatter` など専任スキルの担当
- **週次レポート生成**: `/weekly-review` の担当（本スキルは `experiments.json` の読み書きを担う）
- **月次の事業判断**: `/monthly-review` の担当

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
| **`.claude/todo/backlog.md`** | close 時の learnings フィードバック先（タスクマスタ。旧 05_コンテンツロードマップ.md は 2026-08-18 削除）|

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
