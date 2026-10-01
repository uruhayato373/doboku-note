---
name: ssot-no-hand-copies-self-verify
description: 資格の日程・受験者数は正本3ファイルだけに書き、台帳へ写さない。正本へ入れる値はサブエージェントの引用でなく主担当が原文照合してから
metadata:
  node_type: memory
  type: feedback
  originSessionId: c810297c-e3bd-4390-99c3-3cb4efdff09a
  modified: 2026-09-25T22:48:20.061Z
---

試験日程・受験者数・合格発表などの資格データは `.claude/config/qualification-registry.json`（一覧・展開状態）・`exam-calendar.json`（日程）・`exam-stats.json`（統計）だけに書く。計画書（annual.md など）や説明文へ数値を写さず、正本と管理画面「資格一覧」「商品ラインナップ」への案内にする。正本へ入れる値は、調査担当（サブエージェント）の引用をそのまま使わず、主担当が公式原文（curl＋pdftotext／cp932）で照合してから `verification.checkedBy: self` にする。

**Why:** 2026-09-26、annual.md の手書き表が主任技士の試験日・申込締切・受験者規模・合格発表見込みを4種類とも誤っていた。同日の調査では、サブエージェントの引用に暦と合わない曜日が混じり、倍率を合格率欄へ入れ、前期と後期を取り違えていた。WebFetch の要約も日付を入れ替えた。詳細は measurement-incidents.md「2026-09-26」。

**How to apply:** ユーザーが「確かめて」「正本で管理」と言ったら、未確認は null＋理由（unresolved/pending/notPublished）で残し推測で埋めない。調査を委任したときは、戻った値のうち正本を書き換えるものを自分で原文照合してから書く。月次レビューは `npm run exam-ssot-status` で要対応を読む。関連: [[factcheck-guide-facts-required]] [[no-overstate-external-specs]] [[verify-your-excuses]]
