---
name: feedback_note_paragraph_length
description: note記事の本文段落は1〜2文・~120字以下に短く。長段落はreflowツール(文境界分割・語句不変)で是正、prepublish-reviewがWARN
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3e295220-31a3-4a7b-acd0-c620c94c9501
---

note 記事（docs/note/**/article.md）の本文段落は **1〜2 文・~120 字以下**に短く保つ。note はモバイル閲覧主体で、1 段落 150〜300 字の塊は読まれない。論点の切れ目で改行（空行）し余白をつくる。

**Why:** 2026-06-12、建設部門入口16本で402段落中185段落（46%）が120字超・最長254〜321字だった。長い段落はnoteで離脱を招く。

**How to apply:**
- 自動是正: `npm run note-reflow -- [--target N] <file|dir>`（`scripts/reflow-note-paragraphs.mjs`）。長段落を**文（。）境界**で再パッキングする決定論ツール。**語句・文意は一切変えず改行だけ足す**（空白除去後の本文一致で検証可能）。見出し/箇条書き/URL単独行/太字見出し/frontmatterは対象外。`--dry`で点検のみ。CRLF保持（writeMdxFile経由）。
- 単文で120字超（`。`が無く割れない）は機械分割不能→手動で2文に分けるか許容を人が判断。
- 機械検知: `/note-prepublish-review` Phase1 4f が `reflow --dry` を WARN（情報提供のみ・GO判定に影響しない）で surface。BLOCKにしないのは段落の切り方が編集判断のため。
- 真実源: content-principles.md §14-e。関連: [[feedback_note_cta_no_price_linkcard]]（CTAも段落短く）/ [[feedback_note_article_three_set_dod]]（同じくnote-lint/prepublish機械ゲート化の系譜）/ [[feedback_prevention_over_patching]]。
