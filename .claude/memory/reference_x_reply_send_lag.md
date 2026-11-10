---
name: reference-x-reply-send-lag
description: 内蔵ブラウザで X に返信を送ると、送信済みでも数十秒は返信タブ・元投稿に出ないことがある。押し直すと二重送信の危険
metadata:
  node_type: memory
  type: reference
  originSessionId: a5c09043-ff96-47ba-bd06-d04ecd7e05e2
  modified: 2026-11-09T12:51:34.153Z
---

2026-11-09 の /x-reply で、返信ボタンを押して 3〜4 秒後に自分の返信タブと元の投稿を見ても出ず「未送信」と誤認し、押し直した。実際は 1 回目で送れていて（36 秒後に表示）、X が同文の再送を受け付けなかったので二重送信にはならなかった。

**How to apply:** 押したら 8 秒以上待ち、入力欄が空（`"\n"`）になったかを先に見る。空なら送れている。欄に文が残っていて返信も見えないときだけ、元の投稿を開き直して確かめてから押し直す。座標は screenshot の 800 幅フレームで取る（innerWidth 1024 の値をそのまま使わない）。関連: [[feedback_publish_x_false_success]]
