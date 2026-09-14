---
name: feedback_note_article_three_set_dod
description: note記事1本の完成物=article.md+img/cover.png+hashtags.txt の3点セット。着手前にDoD確定（カバー/タグ生成漏れ防止）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6d3281b6-770f-498e-8339-900f5817d44d
---

note記事（docs/note/**/{記事dir}/）1本の完成物は **3点セット**：

1. `article.md`（frontmatter の `cover:` ブロック必須＝カバー生成の入力）
2. `img/cover.png`（`node scripts/generate-note-covers.mjs "<記事dir一意部分文字列>"` で生成。dir名にスペース可）
3. `hashtags.txt`（記事固有タグ先頭5-6＋ベース群、計70-90個。note多タグ運用。級整合: 2級=`#主任技術者`／`#監理技術者`は1級用で除外）

**Why:** 2026-06-03 の2級土木集客クラスター第1バッチで、完了条件を article.md 本文だけに置き、カバー・タグの生成を漏らした（frontmatter に `cover:` を書いて「カバー済」と錯覚／既存dirが3点構成なのを見ていたのにチェックリスト化できず）。点修正でなく仕組み化すべき類（[[feedback_prevention_over_patching]]）。

**How to apply:** note記事を新規作成するときは、着手前に上記3点をその記事の成果物として宣言してから書く。検証＝U+FFFD 0・全LF・note-lint OK（太字内全角括弧は **A**（B）形式）・カバー目視（溢れ無）・有効アイコン名（pen/clock/doc/edit/calendar/chart/check/target/book/layers/bulb/flag/yen/map）。真実源は各集客クラスターSSOTの「note記事の完了定義(DoD)」節。X は別系統で1-3タグ（[[feedback_x_hashtag_count]]）。

**機械ゲート化済み（2026-06-12）**: `.claude/scripts/check-note-3set.mjs` が「公開状態（frontmatter `noteUrl` 非空 OR `noteStatus` に publish）の article.md は `img/cover.png`＋`hashtags.txt` 必須／下書きは対象外」を検査。`scripts/note-lint.mjs`（pre-commit・既定モード=公開状態のみ）と `/note-prepublish-review` Phase 1 4e（`--require`=無条件）の2モードで運用。真実源 content-principles.md §14-d。これで生成漏れの本番到達を構造防止（発覚契機=公開済194本中2本が hashtags.txt 欠落で公開されていた、2026-06-12）。関連: [[feedback_note_cta_no_price_linkcard]]（同様にnote-lint機械ゲート化した先行事例）。
