---
name: feedback_x_reply_peer_tone
description: X の返信は同じ受験者として横に並ぶ言い方。評価（お見事・心強い・良いペース）と指図（〜してください）を書かない
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62979ff6-a2bc-4558-a19d-9e97d598d6c7
  modified: 2026-11-08T22:15:20.045Z
---

X の返信の下書きは、相手を評価する言い方（お見事・素晴らしい・心強い・良いペース・強みですね・要点だ）と指図の「〜してください」を使わず、「おめでとうございます」「〜できますように」「〜という手もあります」にする。

**Why:** 2026-11-09 に運営者が「総監を受けた身として…心強く思います」を上から目線すぎると指摘。合格者が受験者を採点しているように読める。過去に送った 45 件のうち 8 件が該当していた。

**How to apply:** 下書きを書くとき・運営者に出す前に自分でも読み直す。機械の止め方は config/x-reply-trial.json の toneWords と x-reply-sheet（PR #1464）。新しい評価語に気づいたら toneWords に足す。関連: [[project_x_reply_trial]]
