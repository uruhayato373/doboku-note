---
name: feedback_note_cta_no_price_linkcard
description: note記事のマガジン導線CTAは価格を書かない＋URL単独行でリンクカード化＋段落は短く。価格改訂に追従不能なため
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3e295220-31a3-4a7b-acd0-c620c94c9501
---

note 記事（docs/note/**/article.md）内の有料マガジン導線 CTA は次の3原則で書く。

1. **価格を本文に書かない**。マガジンは価格改訂することがあり、本文の `¥1,980` 等はすぐ陳腐化して事実誤記になる（建設部門入口記事16本が旧¥1,980のまま、SoT は¥2,480だった事例 2026-06-12）。価格は note 側の販売ページに任せ、本文では訴求価値だけ書く。
2. **リンクカード化**。マガジンURLは `[テキスト](url)` の markdown リンクではなく、適切な導入文のあとに **URL を単独行**で貼る（note がリンクカード表示にしCTRが高い）。[[feedback_note_link_card]] と同根。
3. **段落は短く切る**。note 可読性のため、長い段落は論点単位で改行して区切る。

**Why:** 価格直書きは SoT（src/lib/note-magazines.ts）と二重管理になり追従漏れで誤記化。リンクカードは視覚的に強くCTRが高い。note は1段落が長いと読まれない。

**How to apply:** CTA は「適切な導入文（マガジンの現行仕様・訴求価値、価格なし）→ 空行 → URL単独行 → 空行 → 短い締め」。内容フレーミングは公開済みマガジンの現行仕様に合わせる（旧版の年度範囲・字数を残さない）。関連: [[feedback_no_price_in_mdx_body]]（こちらはサイトMDX、本件はnote原稿で別系統だが思想は同じ）。

**機械ゲート化済み（2026-06-12）**: `.claude/scripts/check-note-magazine-cta.mjs` が ① markdown リンク形式のマガジンURL ② マガジンURL同一行の¥ を検出し、`scripts/note-lint.mjs`（pre-commit）と `/note-prepublish-review` Phase 1 の両方から BLOCK する。真実源は content-principles.md §14-c。今後は手動レビュー不要で、誤形式コミットは自動で止まる（Generator=執筆 と Evaluator=機械ゲート の分離で再発防止）。価格が別段落にある旧来パターンは近接判定外（既存マガジン記事の誤検知回避）。関連: [[feedback_prevention_over_patching]] [[feedback_content_deprecation_cross_lineage]]。
