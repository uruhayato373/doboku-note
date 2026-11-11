---
name: feedback-x-reply-parallel-session-send
description: X 返信を送る前に、別セッションが同時に送っていないかを自分の返信タブの時刻で確かめる（x-reply-log --check だけでは防げない）
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2a8aecd7-a264-4eec-9b92-ac4ed44bc9e1
  modified: 2026-11-11T22:38:02.943Z
---

X の返信を送る直前は、`npm run x-reply-log -- --check` に加えて `https://x.com/doboku373/with_replies` の先頭の返信の時刻を読み、5 分以内なら送らない。`.tmp/x-outreach/` の `round.json`・`pending-skips.json`・`screen.json` は読む直前に更新時刻と中身を確かめ、自分が書いたものと違えば使わない。

**Why:** 2026-11-12 朝、定期タスク `x-reply-morning-list` と `x-reply-morning-list-2` が同時に動き、両方で運営者の承認が出た。別セッションが 07:35:55 に送って 07:36:16 に記録するまでの間に、こちらの `--check` が OK を返し、07:36:18 に送って 23 秒差の連投になった（5 分の間隔に違反）。`--check` は記録済みの送信しか見ない。さらに別セッションが `.tmp/x-outreach/pending-skips.json` を上書きしていて、中身を読み直さずに `--skip` を回したため、返信したばかりの相手と、別セッションの見送り案を記録した。「別セッションの残りは 3 件」という見立ても、古い `queue.json` から数えた推測だった。

**How to apply:** 承認を受けて送る手順（x-reply の手順 8）の最初に、返信タブの直近の時刻と `data/x/reply-log.json` の末尾を照らす。直近 10 分に自分以外の送信が続いていれば、別セッションが送信中とみなし、運営者に伝えて止まる（終わる時刻を推測して待たない）。見送りの記録は、自分の見送り一覧を会話の中の内容から作り直して渡す。関連: [[feedback_multi_session_concurrent_git]]・[[feedback_x_suspension_guardrail]]・[[project_x_reply_trial]]
