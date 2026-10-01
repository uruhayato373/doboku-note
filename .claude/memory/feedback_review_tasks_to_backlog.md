---
name: review-tasks-to-backlog
description: "週次レビューの申し送りは backlog へ DN-#### で起票するまでが完了。レビュー内だけの Must は毎週流れる"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e7521836-f06f-4ef4-8c3b-342fca978e89
  modified: 2026-08-24T21:37:57.949Z
---

週次レビューを書いただけでは終わっていない。**「来週への申し送り」は `.claude/todo/backlog.md` に `DN-####` で起票し、レビュー本文にも ID を併記するまでが完了**。今週分は `.claude/todo/weekly.md` へ載せる。

**Why**: 2026-08-25 に実査したところ、R8択一ページへの note 導線配線が W33・W34・W35 と 3 週連続で Must に挙がりながら backlog に 1 枚も無く、毎週レビューの中だけで流れていた。CLAUDE.md §8 は「タスクは backlog.md がマスタ」と決めているのに、レビューの申し送りだけがその経路を通っていなかった。

**How to apply**:
- レビュー確定後、申し送りの各項目に対応するカードが backlog にあるか grep で確認する（既存があれば追記、無ければ新規）
- `[種類:定期]` に当たるもの（月次の A8 取得・四半期の競合スキャン・ココナラ実体の採り直し・校正学習の蒸留）は **backlog へ置かない**。決定規則 1 のとおり weekly.md か `check-*-due` の担当
- `[検証:]` には surfacer を書かない。報告するだけのコマンドを指すとそのカードは永久に完了判定できない（`check-backlog-verify` の「常時緑」）
- 起票後に `check-backlog-schema` と `check-backlog-health` を回す（S2/S3/S4/S9 が 0 か）

関連: [[weekly-review-automation]] [[accumulation-find-the-producer]]
