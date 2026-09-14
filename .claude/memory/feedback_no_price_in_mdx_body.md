---
name: feedback-no-price-in-mdx-body
description: note マガジン価格と内部 ID は MDX 本文に直書きしない。SoT は note-magazines.ts 1 箇所のみ
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fa4b5385-9e6e-46b1-9793-1ebcab09d992
---

`.local/r2/posts/` 配下の MDX 本文に note マガジン価格（`¥X,XXX`）と内部 ID（`M3`, `M4` 等）を直書きしない。価格表示は `src/lib/note-magazines.ts` の `price` フィールドから `<MagazineInlineCard>` / `<MagazineSidebarCard>` 経由でのみ行う。

**Why:** 2026-05-19 に MDX 本文 56 箇所のハードコード価格を 14 ファイルから一括削除（commit `40c76549a`）。料金改定時に grep して全本文を書き換える運用は現実的でなく、`note-magazines.ts` 1 箇所更新で全 spoke / hub のカード表示に伝播するアーキテクチャを維持する。詳細: [[handoff-2026-05-19-r8-hub-spoke-ux-refactor]]

**How to apply:**
- 新規 MDX 執筆時は note マガジンの **タイトル** と **公開予定日** までを本文に書き、価格と ID は書かない
- 既存 MDX 編集時に価格表記を見つけたら削除し、カード表示に頼る
- 検証: `grep -rn '¥' .local/r2/posts/pe-comprehensive-management/` で 0 件を維持
- 例外: `docs/note/**/article.md`（note ドラフト原稿）は note 公開時の媒体表記なので価格表記 OK

白書 URL も同じパターン: `src/lib/whitepapers.ts` が SoT、`<SourceBadges>` が registry 経由でリンク化する。
