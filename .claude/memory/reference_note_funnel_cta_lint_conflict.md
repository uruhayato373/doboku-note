---
name: reference-note-funnel-cta-lint-conflict
description: 【解消済み 2026-09-22】note-funnel の cta:pack-top と note-lint §14-c の衝突は check-note-magazine-cta.mjs の免除で解決済み。53本ブロックはもう起きない
metadata:
  node_type: memory
  type: reference
  originSessionId: dd035073-c925-42f5-8b9a-a214fe16c7c9
  modified: 2026-09-22T07:32:25.245Z
---

**この衝突は解消済み（2026-09-22 に実コードで確認）。以下は経緯の記録。**

かつて `.claude/config/note-funnel.json` の `topCta.text`（`cta:pack-top` マーカー）が markdown リンク形式で書かれており、`content-principles.md §14-c` / `note-lint`（`check-note-magazine-cta.mjs`）の「マガジン CTA は bare URL 単独行」と衝突して、`cta:pack-top` を含む記事の編集がブロックされる状態だった（[[feedback_note_lint_quotepath_bypass]] の staged-gate バイパス修正でゲートが有効化されたため顕在化）。

**現在の実装**: `.claude/scripts/check-note-magazine-cta.mjs:21-26,73-80` が `<!-- cta:pack-top -->` / `<!-- cta:pack-top-light -->` ブロック内を**明示的に免除**する（`inPackTop` フラグで markdown リンクを許可）。`content-principles.md §14-c`（:530 付近）にも同じ免除が明記されている。**¥価格の直書きだけは引き続き禁止**（価格の真実源は `src/lib/note-magazines.ts`）。

**2026-09-22 実測**: `cta:pack-top` 224 本 / `cta:pack-top-light` 3 本 / `cta:*-mokuji` 875 本がすべて `check-note-funnel` と pre-commit を通過（ドリフト 0）。つまり「53 本がブロックされる」は**もう起きない**。

**How to apply:** 総監・建設部門の note 記事を編集するとき、この衝突を理由に作業を止めない。`cta:pack-top` ブロック内に markdown リンクがあっても正常。ただし**同一行に ¥ を書くと今も落ちる**。`cta:pack-top-light` は config に無く 3 本の手書きなので、`wire-note-funnel-cta --sync-managed` では保守されない（触るときは手で直す）。関連 [[project_tankan_chokuzen_funnel_2026_06]]
