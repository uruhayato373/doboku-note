---
name: feedback_note_cta_no_price_linkcard
description: "note原稿の書式規約: マガジンCTAは価格を書かずURL単独行でリンクカード化・段落は短く(reflow)・もくじindexは導入文+カード・HTML非対応。note-lint/prepublishで機械化"
metadata:
  type: feedback
---

## マガジン導線 CTA の3原則（note 記事 docs/note/**/article.md）
1. **価格を本文に書かない**。マガジンは価格改訂するので `¥1,980` 等はすぐ陳腐化して事実誤記になる（建設部門入口記事16本が旧¥1,980のまま、SoT は¥2,480だった事例 2026-06-12）。SoT（src/lib/note-magazines.ts）との二重管理になり追従漏れで誤記化する。価格は note の販売ページに任せ、本文では訴求価値だけ。
2. **リンクカード化**: マガジン URL は `[テキスト](url)` でなく適切な導入文の後に **URL を単独行**で貼る（note がリンクカード表示にし CTR が高い）。冒頭バナー・末尾 CTA の magazine／他 note 記事誘導は URL 単独行（前後に空行）。本文中の自然な文脈に紛れさせるインライン参照は markdown リンクで OK。既存の `> **…→ [...](url)**` の blockquote+markdown リンクは新規追加時にリンクカード形式へ置換を検討。doboku-note サイトへの誘導は markdown リンクでも可（UTM 維持）。
3. **段落は短く切る**（モバイル閲覧主体）。

**How to apply:** CTA は「適切な導入文（マガジンの現行仕様・訴求価値、価格なし）→空行→URL単独行→空行→短い締め」。内容は公開済みマガジンの現行仕様に合わせる（旧版の年度範囲・字数を残さない）。
**機械ゲート化済み（2026-06-12）**: `.claude/scripts/check-note-magazine-cta.mjs` が ①markdown リンク形式のマガジン URL ②マガジン URL 同一行の¥ を検出し `scripts/note-lint.mjs`（pre-commit）と `/note-prepublish-review` Phase 1 から BLOCK（Generator=執筆と Evaluator=機械ゲートの分離）。真実源 content-principles.md §14-c。価格が別段落の旧来パターンは近接判定外。関連: [[feedback_prevention_over_patching]]

## 本文段落は1〜2文・~120字以下（content-principles §14-e）
note はモバイル主体で1段落150〜300字の塊は読まれない。2026-06-12、建設部門入口16本で402段落中185段落（46%）が120字超・最長254〜321字だった。
- 自動是正: `npm run note-reflow -- [--target N] <file|dir>`（`scripts/reflow-note-paragraphs.mjs`）。長段落を文（。）境界で再パッキングする決定論ツールで**語句・文意は変えず改行だけ足す**（空白除去後の本文一致で検証可能）。見出し/箇条書き/URL単独行/太字見出し/frontmatter は対象外。`--dry` で点検のみ。CRLF 保持（writeMdxFile 経由）。単文で120字超（`。`が無く割れない）は手動で2文に分けるか人が許容判断。
- 機械検知: `/note-prepublish-review` Phase1 4f が `reflow --dry` を WARN で surface（GO 判定に影響しない＝段落の切り方が編集判断のため BLOCK にしない）。
- **reflow の alt text 誤分割バグ（2026-06-23 修正 d2c8c3837）**: `isPlainPara` が `![alt](img/...)` 先頭を対象外にしておらず、alt に `。` があると分割されて `![alt\nmore](img/...)` になり画像参照が壊れた（集客記事13本公開時に発覚し fix-alt-text.mjs で事後修正）。`isPlainPara` に `|!\[` を追加済み。reflow 適用後は `git diff` で `![` 行が壊れていないか確認。旧版で実行したファイルは `.tmp/fix-alt-text.mjs` で事後修正可。
- **公開前に `/note-prepublish-review` を省略しない**: 同日、集客記事を速く公開しようと skill を飛ばして直接 `note-publish-magazine.mjs` を実行し段落長 WARN が未検知のまま公開した。4f WARN が出たら `npm run note-reflow -- "{dir}"` → `git diff` 確認 → commit → publish の順（SKILL.md に追記済み d2c8c3837）。

## もくじ index ページ（`noteSeries: 総合案内`）のマガジン導線書式（2026-07-06 刷新）
L1総合案内・各資格L2もくじ。全送客がもくじに集約されたため生リンク羅列（CTR 取りこぼし）を廃し「診断→導入文＋カード」へ。
- ①**主力5-6誌＝〈太字見出し＋2-4文の導入＋bare URL 単独行（カード化）〉**で CTR を取る。②**ロングテール（総監14ペルソナ・建設11科目等）＝markdown リンクの列挙を温存**（全部カード化すると冗長＋D2スラッグ保持）。③冒頭に「状況別・まず1冊」診断（太字＋箇条書き。**表は note-lint BLOCK**）。④価格(¥)は index でも**禁止**（note カードが実価格表示）。⑤L1は各L2の重複列挙をやめ「資格分岐＋主力1誌＋L2送客」のルーターに薄型化（D3=L1に各L2 noteId 保持が唯一の制約・D2はL2のみ対象）。
- **Why:** 競合（gijyutsushi 等）は導入文＋カードが標準で doboku-note の生リンク羅列は標準以下だった（09_note競合分析2026 §6）。太字内全角括弧は `**A**（B）` 形式（§14-b）。
- **How to apply:** `check-note-magazine-cta.mjs` が `noteSeries:総合案内` で¥禁止＋markdown リンク列挙を免除（2026-06-17 b072c4561）。D2 は `audit-note-funnel.mjs:141-147` が L2本文に /m/スラッグがあるかを書式不問で見る→カード化・列挙どちらでも green（リライト前後で `grep -o 'note.com/dobokunote/m/[a-z0-9]*'|sort -u` のスラッグ集合 diff を必ず取る）。「もくじ」呼称は note-funnel.json bottomCtaと結合→H1【○○もくじ】接頭辞は温存し後半のみ便益化。リライト後は note-reflow→note-lint→audit-note-funnel。live 反映は無料記事のため `note-update-body.mjs --pause`（手動でタイトル変更＋更新確定）。真実源 content-principles §14-c・note-selling-structures §99。関連 [[project_pe_construction_secondary]]

## note は HTML 完全非対応
markdown のサブセットのみ。`<details>`/`<summary>`（タグそのまま表示 or 常時展開）・`<table>` 拡張・`<div>`/`<span>`/`<style>`・カラム/タブ/アコーディオンは全て不可。
- **Why:** 1問1答チェックリスト（問題を見せて答えは隠す→操作で答え合わせ）は note で成立しない。04ドラフト（1問1答20問）で `<details>` 20個を実装したが投稿時の機能破綻が確定し SNS 媒体（X / IG カルーセル / YouTube Shorts）へ全面移行（2026-04-29）。
- **How to apply:** 企画時点で「読者操作で要素を切り替える」「答えを隠す」「動画埋め込み」が必要なら note でなく SNS／サイト本体（Next.js）。1問1答・クイズ・診断系→SNS（IG カルーセルは「Q→スワイプで A」と好相性、YouTube Shorts は「3秒考えて→答え」）。インタラクティブな診断・検索・フィルタ→サイト本体。note は「腰を据えて読む長文」「ストーリー」「テンプレート提供」「合格体験」に特化。SNS 用 draft は `docs/sns-drafts/`。markdown テーブルも非対応なので表は箇条書き（[[feedback_note_lint_quotepath_bypass]]）。
