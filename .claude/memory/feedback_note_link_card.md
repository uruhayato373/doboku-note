---
name: feedback-note-link-card
description: "note記事内でリンクを貼るときは `[text](url)` 形式より URL を単独行で貼ってリンクカード表示にする方が効果的"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c25be8a3-fa91-489c-8640-a7e3a4f4fb3a
---

note 記事（`docs/note/**/article.md`）で URL を挿入するときは、`[テキスト](URL)` の markdown リンク形式ではなく、**URL をそのまま単独行で貼る**ことを優先する。

**Why**: note は URL 単独行を自動的にリンクカード（タイトル・サムネイル・説明文付きの大きなカード）として展開する。テキストリンクより視覚的に強く、クリック率が高いので、magazine／他記事への導線目的では特に有効。

**How to apply**:
- 冒頭バナーや末尾 CTA で magazine／他 note 記事へ誘導する場合 → URL 単独行（前後に空行）
- 本文中の自然な文脈に紛れさせるリンク（インライン参照）→ markdown リンク形式でOK
- 既存の `> **このシリーズはマガジンでまとめ購入するとお得です → [...](url)**` のような blockquote + markdownリンクは、新規追加時はリンクカード形式に置き換え検討
- doboku-note サイトへの誘導は markdown リンク（カード化されないので UTM 維持しつつ自然リンク）でも可

[[project_strategy_docs]]
