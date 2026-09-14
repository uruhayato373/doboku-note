---
name: feedback_note_price_three_layer_drift
description: note単品価格は doc散文/frontmatter/live の3層。値上げは全層に当てないとドリフトし、frontmatter↔live照合だけでは両方誤りを検出できない
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4c910f6f-53db-44d0-8b1b-65894f94ebfe
  modified: 2026-07-28T02:02:12.760Z
---

note の単品価格は **①設計 doc の散文 / ②記事 frontmatter `price:` / ③note ライブ** の3層に分散する。一括の値上げは3層すべてに当てる。当て漏れが2件の実害になった（2026-07-28 に両方是正）。

- **07-24 完全攻略パック**: 前日に ¥1,280→¥1,980 へ改定したのに、`price` 欄欠落21本の緊急是正が **doc に残っていた古い「¥500」を既定値として一律付与**し、18本だけ値崩れして公開された。
- **07-28 建設部門 BK**: `note-magazines.ts` の表記だけを ¥500→¥780 に更新した commit があり、frontmatter の追随が BK-08〜11 で止まって **116本が live と不一致**のまま残っていた。

**Why:** doc の陳腐化がそのまま次の作業の入力になる（古い数値を既定値として信じる）。また `check-note-structure` の frontmatter↔live 突合は、**両方とも同じ誤価格なら原理的に検出できない**——07-24 はまさにそれで、両方 ¥500 で「一致」していた。

**How to apply:**
- 価格欠落や値崩れを是正するとき、**doc の数値を信じず、同一マガジンの現行価格を note API（`curl --ssl-no-revoke`）で実測してから**揃える。
- 値上げ commit では frontmatter（`note-price-sweep`）と live（`note-article-price-sweep`）の両方を回し、doc 側の数値も同一 commit で更新する。
- ソース内部の一貫性は `npm run check-note-price-consistency` が pre-commit で見る（L1=マガジン内／L2=`uniformSeries` 宣言シリーズ。意図的な差は `.claude/config/note-price-consistency.json` に理由つきで免除）。**ただし live は見ない**ので、frontmatter↔live のドリフトは curl 実測でしか捕まらない。
- 価格を doc の散文に数値で書かない（書くなら SSOT へのリンク）。[[feedback_no_price_in_mdx_body]] の原則は MDX 本文だけでなく reference doc にも及ぶ。

関連: [[feedback_no_price_in_mdx_body]] / [[feedback_prevention_over_patching]] / [[feedback_metrics_cicd_supplied]]
