---
name: reference-x-read-without-account
description: X の話題を調べるときは、アカウントを使わない Yahoo!リアルタイム検索を先に使う。twitter CLI の認証先は投稿用アカウントだった
metadata:
  type: reference
---

X の投稿を読むだけなら、Yahoo!リアルタイム検索（`search.yahoo.co.jp/realtime/search?p=`）が X にログインせず使える。`ID:doboku373 語句` で自アカウントの投稿も絞れる。

2026-11-06 時点で `twitter` CLI の認証先は投稿用の @doboku373 だった（x-post-policy §11.7 の「個人アカウント」と違う）。CLI を使う前に `twitter status` で認証先を確かめる。内蔵ブラウザの X も同じアカウントでログイン済み。

X の検索画面の `article [role=group]` の aria-label に、返信・いいね・表示の件数が文章で入っている。`filter:replies` の最新タブは無関係な投稿が混じって使えなかった。関連: [[feedback_x_suspension_guardrail]]
