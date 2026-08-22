---
title: TODO UI × Agent実装 運用設計の批判的レビュー
---

# TODO UI × Agent実装 運用設計の批判的レビュー

## 総評

方向性は正しいが、現状は「backlogをHTMLで読める」「planを置ける」「Agentがsweepできる」という部品が並んだ段階であり、1件のタスクを安全に引き渡して完了させる運用契約にはなっていない。特に、taskとplanの結線、実行中ロック、完了時の一括処理が機械で保証されていない。このままUIに実行ボタンだけを足すと、二重実行・孤児plan・参照切れを増やす。MarkdownをSSOTに保ち、状態変更を共通スクリプトへ集約し、UIとAgentをその利用者にする構成が最小で堅い。

## 実態確認

- backlogは92件あり、monthlyとweeklyは合計16行の`DN-####`参照を持つ。ID参照化は完了している。
- Admin `/todo`はread-onlyで、優先度・種類の絞り込みとVS Codeリンクを提供するが、スケジュール、claim、handoff、完了の操作は持たない。
- `.claude/plans/`にはトップレベルで7つのplan単位があるが、backlogから実在planへ明示的に結線されているのは`DN-0092`の1件だけである。
- `DN-0029`は既に存在しない`.claude/plans/doboku-note-purrfect-mist.md`を参照している。`check-doc-refs`は`.claude/plans/**`を対象外としているため検出しない。
- `[進行中]`はパーサで`wip=true`になるが、`pickTasks()`は`wip`を除外せず、Adminの`TodoCard`にも渡していない。規約上の排他制御が実装上は効いていない。
- `dispatch-log.json`は完了・失敗を記録するが、必須のtask ID、plan、commit、検証証拠を持たず、削除後のカードと確実にjoinできない。

## 個別批判

### 🚨 課題1：UIが「管理画面」ではなく閲覧画面に留まっている

現在のUIは状況把握には使えるが、今月・今週への選択、Agentへの引き渡し、実行中の確認が別経路である。ユーザーは画面を見た後にファイルやチャットを手作業でつなぐ必要があり、運用の主導権がUIに集まっていない。

### 🚨 課題2：taskとplanの1対1契約が機械可読でない

planの命名規約は`{DN-ID}-{slug}`を要求する一方、現物は旧単体planとIDなしbundleが混在する。リンク切れや孤児planがあっても検査されず、Admin `/plans`は置かれたファイルをすべて「実行中」と表示するため、着手可能性を誤認させる。

### 🚨 課題3：同時実行防止が機能していない

`[進行中]`は存在するが、選定器が除外せず、UIにも表示されない。Claude CodeとCodex、または複数セッションが同じカードを選んでも機械的に止まらず、特にnote・移行・一括編集で競合事故につながる。

### 🚨 課題4：完了処理がトランザクションになっていない

現行はbacklogカード削除、monthly/weekly参照削除、plan削除、dispatch log追記が別操作である。途中で止まると参照切れ、完了済みplan、証拠のない削除が残る。git履歴だけではUIで直近成果を表示するにもコストが高い。

### 🚨 課題5：Agentへ渡す入力が毎回手作りである

カード本文とplanが存在しても、branch確認、claim、停止条件、検証、後始末を含む起動promptは人が組み立てている。品質がセッションごとに揺れ、「実装だけ終わってplanやカードが残る」状態を再生産しやすい。

## 処方箋

### 🔪 処方箋1：UIをcontrol plane、Markdownをdata planeにする

Adminは引き続きSSOTを持たず、`.claude/todo/*.md`を投影する。ただし、次の限定操作だけを共通CLI経由で提供する。UI自身にMarkdown編集ロジックや任意shell実行を持たせない。

| UI操作 | 共通処理 | 許可範囲 |
|---|---|---|
| 今月へ追加 | `todo:schedule --month` | monthlyのID行だけを更新 |
| 今週へ追加 | `todo:schedule --week` | weeklyのID行だけを更新 |
| Claude Codeへ渡す | prompt生成 | クリップボードへコピーするだけ |
| 実行開始 | `todo:claim` | `[進行中]`とclaim情報だけを更新 |
| 中断解除 | `todo:release` | claimだけを解除 |
| 完了 | `todo:complete` | Agentが検証証拠を渡した場合だけ実行 |

外部公開、課金、削除、deployはTODO UIから直接実行しない。既存の専用CLIとユーザー承認を維持する。

### 🔪 処方箋2：全planをtask IDに正規化する

複雑な案件だけplanを必須とし、単純な1ファイル修正はbacklog本文だけで実行可能とする。planが必要なのは、複数フェーズ、外部書込み、破壊的操作、収益影響、複数の受入ゲートのいずれかを含む場合である。

bundleのmasterに次のfrontmatterを持たせる。状態や進捗は書かない。

```yaml
---
taskId: DN-0092
type: implementation-plan
createdAt: 2026-08-18
deleteOnComplete: true
---
```

ディレクトリは`.claude/plans/DN-0092-pe-construction-subject-packs/`とし、backlogカードからmasterへ1本だけリンクする。`check-task-plan-links`で「存在、相互参照、1 task=最大1 active plan、ID重複、孤児plan」を検査する。

### 🔪 処方箋3：claimを共通コマンド化する

Agentは実装前に必ず`todo:claim DN-#### --owner claude-code`を実行する。処理はカード存在、未claim、branch、既存planの整合を確認してから`[進行中]`を付ける。選定器は`wip=true`を必ず除外し、Adminは担当・開始時刻・経過時間を表示する。

開始時刻と担当は機械可読にし、一定期間更新がないclaimを`check-todo-claims`が警告する。blocked時はclaimを解除し、ID付き実行ログへ理由と再開条件を残す。

### 🔪 処方箋4：完了を1コマンドで閉じる

`todo:complete DN-####`はdry-runを既定とし、次をすべて満たした場合だけcommitモードを許可する。

1. planの受入条件と指定検証が成功している。
2. 外部操作を含む場合はユーザー承認とライブ実体確認がある。
3. 残件は別の`DN-####`へ抽出済みである。
4. dispatch logへID、plan、commit、検証、outcomeを記録する。
5. monthly・weeklyから当該IDを削除する。
6. backlogカードを削除する。
7. 削除マニフェスト対象のplanを削除する。
8. schema、参照、差分検査を再実行する。

どこか1つでも失敗したらカードとplanを保持し、完了扱いにしない。

### 🔪 処方箋5：handoff promptをUIで決定的に生成する

「Claude Codeへ渡す」はAgentを直接起動せず、選択カードから同じpromptを生成する。

```text
DN-0092を実装してください。
backlogカードと紐づくplanをSSOTとして全文を読み、todo:claim後に着手してください。
無関係な変更を戻さず、停止条件では書込み前に止めてください。
受入条件と検証を満たした後、todo:completeのdry-run結果を確認して完了処理してください。
外部公開・課金・削除はユーザー承認なしに実行しないでください。
```

promptにはcard ID、backlog path、plan master、branch、実行者、検証、停止条件を機械的に埋め込む。人が毎回長い指示を再作成しない。

## 推奨する状態モデル

状態は新しい台帳へ複製せず、既存SSOTから導出する。

```text
BACKLOG
  └─ planあり ────────────── PLANNED
       └─ monthly参照あり ── THIS_MONTH
            └─ weekly参照あり ─ THIS_WEEK
                 └─ claimあり ─ IN_PROGRESS
                      ├─ blocked log ─ BLOCKED
                      └─ verify成功 + complete ─ DONE
```

表示の優先順位は`IN_PROGRESS > BLOCKED > THIS_WEEK > THIS_MONTH > PLANNED > BACKLOG`とする。`[実行:sweep|ユーザー|対話]`は状態ではなく、誰が出口まで持てるかを表すrouteとして維持する。

## 責任分界

| 主体 | 責任 | 持たない責任 |
|---|---|---|
| ユーザー | 月・週の優先順位、重要方針、外部・課金・破壊操作の承認 | 実装手順の再記述、完了ファイルの手掃除 |
| Codex | 調査、選択肢比較、設計、受入条件、plan作成、実装後レビュー | 承認なしの外部変更、進捗台帳の二重作成 |
| Claude Code | claim、実装、検証、残件抽出、完了処理 | 仕様の独断変更、停止条件の迂回 |
| Admin UI | 可視化、選択、限定状態遷移、handoff prompt生成 | 独自DB、任意shell、公開操作 |
| 共通CLI | Markdownの整合した更新、排他、検査、完了transaction | 優先順位や事業判断 |

## 最小実装順

1. `wip`を選定器から除外し、Adminへ表示する。現在ある安全契約の実装修復なので最優先。
2. plan masterのfrontmatterと`check-task-plan-links`を導入し、既存7単位をKEEP・統合・削除へ分類する。
3. `todo:claim`、`todo:release`、`todo:complete --dry-run`を実装する。
4. dispatch logをID必須へ拡張し、完了処理でmonthly・weekly・backlog・planを一括更新する。
5. Adminへ状態列、planリンク、claim表示、Claude Code promptコピーを追加する。
6. 安定後にだけ、月・週への追加ボタンを共通CLI経由で有効化する。

> [!warning] 先に実行ボタンを作らない
> task-plan結線、claim、完了transactionが揃う前にAgent起動をUIへ足すと、現在の不整合を高速化する。最初のUIアクションは副作用のない「promptをコピー」に限定する。

## 受入条件

- 同じ`DN-####`を2セッションがclaimすると、後から来た側が変更前に停止する。
- `[進行中]`カードはsweep候補から除外され、Adminで明示される。
- planを持つカードはAdminから1クリックでplanとhandoff promptへ到達できる。
- 存在しないplan参照、孤児plan、1 task複数planを機械検出できる。
- 完了後にbacklog、monthly、weekly、planのどこにも対象IDが残らない。
- dispatch logから対象ID、実装commit、検証結果、完了またはblocked理由を追跡できる。
- UI、CLI、Agentが同じparserと状態遷移関数を利用し、同じルールを再実装していない。

## 他に検出した課題

- `backlog-sweep`と`plan-weekly`のSKILL本文に旧`.Codex/`パスが残り、現行`.claude/`と不一致である。
- `check-doc-refs`がplanを対象外にしているため、backlogからplanへの現行リンクだけは専用checkが必要である。
- `[Codex候補]`はバルク適性であり、Claude Codeへの自動dispatch契約ではないが、UI上では誤解されやすい。
- Adminのbacklogカードはexecutor、due、plan、wipを表示せず、実行判断に必要な属性が詳細本文へ埋もれている。
- `repository-information-architecture` bundle自体がbacklog IDに結線されておらず、現行規約の移行対象になっている。
