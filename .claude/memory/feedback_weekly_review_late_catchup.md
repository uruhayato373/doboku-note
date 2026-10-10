---
name: feedback_weekly_review_late_catchup
description: 週次レビューの遅れ取り戻し・旧週削除の罠（他文書のリンク切れ・weekly.md の対応済み照合・fetch-metrics の型停止）
metadata:
  node_type: memory
  type: feedback
  originSessionId: 14332f01-201f-4d57-b63d-622fdbf1b0de
  modified: 2026-10-10T02:20:14.653Z
---

2026-10-10 に W40・W41 の週次レビューを同日に作ったときの誤りと手順。

- **旧週のレビューを消す前に `git grep -n "<週>-review"` で他文書からのリンクを探す**。W39 を消したら docs/marketing/07c のリンクが切れ、develop の Pre-merge が赤になった（#960）。pre-commit の check-relative-links は staged ファイルから出るリンクしか見ない（DN-0654 で機械化予定）。
- **トリアージ前に `.claude/todo/weekly.md` と対象ページの直近コミットを照合する**。ダイジェストだけを見て起票したら、10/6 に対応済みの 2 件（57bd3f43d・cfd04f598）を重複起票した。
- **W のレビューの材料（digest W−1・事業窓）が欠けていたら fetch-metrics の publish 失敗を疑う**。型（dataset-schemas）が書き手の新しい欄を知らないと ci-data が止め、パック・ダイジェスト・自動計測がまとめて develop に入らない。直して `gh workflow run fetch-metrics.yml --ref develop` で再実行し、run ログの ✗ を全部読む（1 か所直すと次が出た: #958・#959）。
- business-review の record は nextReviewDate が今日より後、note 確定前の月を含むスナップショットなら確定日（翌月 2 日）以降が必須。
- 2 週分を同日に作るときも保持は最新週だけ。前の週は申し送りを次の週へ同文転記するか DN に振ってから消す（check-handoff-extraction）。完了済みで dispatch-log に無い DN は SKIP_HANDOFF_EXTRACT=1 と理由をコミットに書く。

**Why:** 遅れた週次を急いで回すと、削除・起票・計測の確認を飛ばしやすい。どれも develop を赤くするか台帳を汚す。
**How to apply:** 遅れた /weekly-review を回すときはこの順で確認する。関連: [[feedback_gate_zero_coverage_false_pass]] [[feedback_review_tasks_to_backlog]]
