---
name: guide-min-3000-chars
description: "ガイド記事(group:guide)は本文3,000字以上が必須下限。下回ると薄い記事。過去問/キーワード/textbookは対象外"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b8972bc6-05e5-41a6-8185-402cd9789004
---

ガイド記事（`group: guide`）は **本文（frontmatter 除外・空白除去後）3,000 字以上** が必須下限。下回るものは「薄い記事（thin content）」として公開品質を満たさない（ユーザー方針、2026-06-21）。

**Why:** ガイドは検索流入の入口かつ note 有料へのコンバージョン地点。各 H2 が散文 200〜400 字（§17）を満たせば標準構成で自然に 3,000 字を超える。下回るのは散文が箇条書き・表・Callout に逃げて痩せている兆候。

**How to apply:** 新規・改修ガイドは公開前に `npm run check-guide-length`（published 全件・赤落ち）で確認。加筆は字数水増しでなく具体（数値・体験・選択基準）を足す。**過去問(primary/secondary)・キーワード・textbook には適用しない**（content-principles §5 §188 の図表中心ページ例外を侵さない）。真実源は content-principles.md §25、ゲートは scripts/check-guide-length.mjs。既存31本の加筆バーンダウンは docs/todo/backlog.md。31本完了後に pre-commit/CI へ配線予定（それまで未配線）。関連: [[no-new-keyword-pages]]
