---
name: feedback_proofread_learnings_auto_apply
description: 校正学習の蒸留は承認待ちにせず、2 回以上の学びをその場で規約・スキルへ入れて commit する
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62979ff6-a2bc-4558-a19d-9e97d598d6c7
  modified: 2026-11-07T23:01:06.335Z
---

校正学習（/distill-proofread-learnings・週次レビューの「校正学習の蒸留」）で 2 回以上くり返した学びは、承認を待たずにその場で反映先（content-principles.md・content-authoring.md・該当 SKILL.md・memory）へ入れて commit する。週次レビューには「適用した変更」として載せ、戻したいときは git で戻す。

**Why:** 2026-11-08、W45 の積み残しで 404 リンクの直し方を「承認待ち」として出したところ、運営者に「校正学習は自動的に入れないと意味がない」と言われた。承認待ちにすると規約に入らないまま、次の校正で同じ指摘をくり返す。

**How to apply:** 既存の原則とぶつかる学びは、新ルールとして足さず既存の節の中で境界・例外を書き分ける（例: §12 の「出典名だけ残すのも不可」は新規 URL の決まり、後から 404 になった出典は別の直し方）。1 回だけのパターンはログに「次回再観察」として残すだけにする。スキル側の手順は distill-proofread-learnings の Phase 4。関連: [[feedback_no_confirmation]]
