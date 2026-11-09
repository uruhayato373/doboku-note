---
name: weekly-review
description: >
  前週の成果・KPI・学びを振り返るレビューを生成する。Use when user asks to [週次レビュー, 先週の振り返り, /weekly-review].
domain: strategy
---

# 週次レビュー（骨子）

対象週の実績を調べ、成果・課題・学びを `docs/reviews/weekly/YYYY-Www-review.md` に保存する。この骨子は毎回読む。各段の詳細・コマンド・雛形は `references/` にあり、**その節を書くときだけ**読む。

```
/weekly-review [YYYY-Www]    # 省略時は前の完了した週（ISO 8601 週番号）
```

## 読む量の規律

- 最初に読むのは**下書き `.claude/state/weekly-review/draft.json` の `markdown`**（`week` が今週・`generatedAt` が今日）と、`npm run backlog-gate -- --weekly` の出力。**`backlog.md` を全部読まない**（約 330KB。カードは ID で引くか `backlog-gate` の対象だけ読む）。
- 下書きが無い・古いときは `node scripts/build-weekly-review-draft.mjs --print` で作り直す。数字は写し、転記し直さない。
- 下書きに無い節と、下書きで欠け・失敗になった材料だけ、references のコマンドを回す。機械で決まる点検（CI の quality-audit・週次の点検）は先に回っているので、その結果を読み、二重に叩かない。

## 事業の週次判断（最初と最後）

`docs/strategy/01_プロダクト戦略.md` と `config/business-direction.json` が基準。**読む順は KPI ツリー（`docs/strategy/15_KPIツリー.md`）に従う**: 頂点の月の受取額（`netReceipts`）と目標の差を先に確認し、週次では直近の完了月を参照するだけにして、原因の候補は前週から落ちた段・目標を割っている段（チャネル → 入口）に絞る。`npm run business-review -- report --json` で資格別 KPI・欠測・レビュー期日を確認する。収集後は `.claude/knowledge/reference/business-review.md` の手順で snapshot と weekly の review を追記する（資格別に「実測／未確認／判断／次の一手」・実験 ID と次回日。欠測は provisional、同じ期間の書き直しは supersedes。機械履歴は削除しない。JSON を明示して commit）。月次の方針・目標の変更は `/monthly-review` へ渡す。

**配線の正本**: このスキル（本ファイルと `references/`）が実行するコマンドは `.claude/config/review-wiring.json` の weekly に段（KPI ツリー）と役割（判断／点検）付きで載せる（check-review-wiring が食い違いを止める）。**起票したカードの本文の起点は「週次レビュー（開始日〜終了日）」で始める**（管理画面がレビュー由来のカードを数える）。

## 実行主体（2026-11-08〜）

1. **土曜 9:30・Mac の launchd**（`scripts/scheduled/weekly-review.sh`・`npm run weekly-review:install`）が、ログインが要る取得を土曜の収集（`scripts/weekly-collect.mjs --phase pre`／`post`）で回し、GSC の記録層を回す。レビューは回さない。
2. **運営者の指示で対話セッションが**本スキルと `/plan-weekly` を実行する（土曜以降いつでも。抜けた週は後日まとめて回してよい）。未作成の週は SessionStart の `check-weekly-review-due` が知らせる。
3. 実行の最初に `npm run weekly-review:draft` で機械の節（`draft.json`）を作り直す。Claude の中ではログインしない（直前の収集の記録と `runs.json`・`npm run check-weekly-collect` を読み、失敗・skipped の段は理由とともに未取得と書く）。外部への公開・投稿・送信・購入はしない。運用の詳細 → [operations.md](references/operations.md)。

## 手順と読む reference

出力は **md ファイル保存**（GitHub Issue は使わない）。サブエージェントは Bash 不可のため、データ収集は親が Bash で実行する。保持方針: `docs/reviews/weekly/` は最新レビュー＋次週計画だけを保持し、新しい週を確定したら旧週の未完タスクを backlog、恒久知見を `.claude/knowledge/` へ抽出済みか確かめて旧週ファイルを削除する。

| 段 | やること | 書くときに読む |
|---|---|---|
| Phase 1 Agent A・B | 開発活動／コンテンツ実績・note 同期・競合・GSC/GA4 自動化・ココナラ・検索改善・実験期限・目視確認 | [collect-activity-content.md](references/collect-activity-content.md) |
| Phase 1 Agent D・E・H・I | 計画との差分／校正学習の蒸留／handoff 棚卸し・デッドコード／X 予約キュー | 同上 |
| Phase 1 Agent C・C2・C3・F・G | NSM と実験進捗／PSI／収益カバレッジ／SNS 流入／計測ダイジェスト | [collect-metrics.md](references/collect-metrics.md) |
| Phase 2 | 達成率・成果・課題・学び・backlog 消化サマリ・「点検と Issue」（全件に行き先） | [analysis-triage.md](references/analysis-triage.md) |
| Phase 2.5 | 計測ダイジェストの `OPP-…` を 1 件残らず処分して起票（`growth-triage`） | 同上 |
| Phase 3 | 下の節一覧で `docs/reviews/weekly/YYYY-Www-review.md` に保存 | [output-and-handoff.md](references/output-and-handoff.md) |
| Phase 3.5 | バックログの関門（🟣 判断待ち・期日切れ・直近 7 日の起票・7 日超の Issue） | 同上 |
| Phase 4 | 申し送りの各項目末尾に振り分け先 → `/plan-weekly` で翌週計画 | 同上 |

運用ルールと関連スクリプトの一覧 → [operations.md](references/operations.md)。

### Phase 3.5・4 の要点（毎回の完了条件）

- **関門**: `npm run backlog-gate -- --weekly` の対象を片付け、結果を「## バックログの関門」に書く。管理画面の手順チェックリストがこの節で実施を確かめる。
- **申し送りの振り分け**: 「来週への申し送り」の各項目末尾に `→ 振り分け: DN-#### ／ 定常 ／ #Issue ／ EXP-###` を書く（先に backlog へ起票してから ID を書く）。`check-handoff-extraction` が pre-commit で止める。
- **点検と Issue**: `npm run review-checks -- --cadence weekly --run YYYY-Www --write` の結果、失敗・検査不成立の点検と開いている Issue・Dependabot の全件に行き先を書く。
- **イシューマップ**: `npm run check-issue-map -- --due` の「更新の番の判定」（カードが閉じた・時期を過ぎた）を全件処分する。実測があれば `config/issue-map.json` の該当サブイシューの `state` と `evidence` を直し、終えた判定の行は消すか次の判定に書き換える。実測が無ければ `state` を変えず、判定の行を残して「## イシューマップ」に `- overall A1・A2: 未確認の理由 → 振り分け: DN-#### ／ 定常` と書く（見出しは `--due` の出力のまま）。節は 0 件の週も置く（「更新の番 0 件」）。日付や値はマップへ写さない（カードの `[時期:]`・指標が正本）。節の欠け・行き先の無い判定は `check-weekly-review` が未完にする。
- **計測トリアージ**: `npm run growth-triage -- list` の未処分を 0 件にしてから終える（月曜の `check-growth-triage` が検査）。
- 最後に `npm run check-weekly-review -- --week YYYY-Www` を回し、欠けを補う（exit 0 で完了）。

## 出力フォーマット（節の一覧）

ファイル名は `docs/reviews/weekly/YYYY-Www-review.md`。先頭は H1 `# 週次レビュー YYYY-Www`・作成日・対象期間。以降の節を順に置く（各節の中身・雛形は [output-and-handoff.md](references/output-and-handoff.md)）。サマリーは数行、表は判断に要る行＋「他 N 件」、該当ゼロは「なし」の 1 行。載せきれない分は件数と参照先を書き、黙って落とさない。

```markdown
## サマリー
## 計画 vs 実績
## 成果ハイライト
## 開発活動
## コンテンツ実績
## NSM（オーガニック検索流入）
## 計測ダイジェスト
## 計測→改善トリアージ
## 実験の進捗
## PSI パフォーマンス推移
## 収益カバレッジ ダッシュボード
## SNS 流入と投稿実績
## 校正学習の蒸留
## SNS 予約キュー投入（X）
## その他パフォーマンス（必要に応じて）
## 点検と Issue
## イシューマップ
## 課題・ブロッカー
## 学び
## バックログの関門
## 来週への申し送り
```
