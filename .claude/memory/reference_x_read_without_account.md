---
name: reference-x-read-without-account
description: X の話題を調べるときは、アカウントを使わない Yahoo!リアルタイム検索を先に使う。twitter CLI の認証先は投稿用アカウントだった
metadata:
  type: reference
---

X の投稿を読むだけなら、Yahoo!リアルタイム検索（`search.yahoo.co.jp/realtime/search?p=`）が X にログインせず使える。`ID:doboku373 語句` で自アカウントの投稿も絞れる。

2026-11-06 時点で `twitter` CLI の認証先は投稿用の @doboku373 だった（x-post-policy §11.7 の「個人アカウント」と違う）。CLI を使う前に `twitter status` で認証先を確かめる。内蔵ブラウザの X も同じアカウントでログイン済み。

X の検索画面の `article [role=group]` の aria-label に、返信・いいね・表示の件数が文章で入っている。`filter:replies` の最新タブは無関係な投稿が混じって使えなかった。関連: [[feedback_x_suspension_guardrail]]

**2026-11-10 実測**: Yahoo!リアルタイム検索は 1 ページ目が約 40 件で止まる（「技術士」だけで 8 時間分）。続きは `search.yahoo.co.jp/realtime/api/v1/pagination?p=<語>&oldestTweetId=<最古の id>` で 10 件ずつ取れ、120 時間分（約 800 件）までたどれる。応答の entry に表示名 `name` もある。X の検索（最新）は本文だけでなく表示名にも当たるので、「技術士」検索の多くは表示名に技術士がある人の無関係な投稿になる（本文の語で絞る必要がある一方、表示名で受験者を拾う手がかりにもなる）。実装は `paginateRealtime`・`npm run x-reply-screens`（PR #1519）。
