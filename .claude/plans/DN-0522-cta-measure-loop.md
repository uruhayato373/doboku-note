---
taskId: DN-0522
type: implementation-plan
createdAt: 2026-10-03
deleteOnComplete: true
---

# 収益導線レポートの集計漏れを直す

- 正規URL解決・描画と共有のCTA判定を再利用する。GA4の生記録を変更しない。
- 現行URLと旧URLを個別に集計し、GA4のURL別usersを独自に足して重複利用者を作らない。
- 集計対象・突合できた対象・対象外を記録する。
- 回帰検査、レポート再生成、check-review-wiring、build-growth-digest --checkが受入条件。
- doc-sync後にコードPRをdevelopへ反映し、記録が残ったら完了カードとplanを削除する。
