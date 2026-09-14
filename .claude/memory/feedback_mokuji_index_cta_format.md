---
name: feedback_mokuji_index_cta_format
description: もくじindex(noteSeries:総合案内)は主力誌=導入文+bareURLカード/ロングテール=列挙温存・¥禁止。2026-07-06に羅列→ハイブリッドへ刷新
metadata: 
  node_type: memory
  type: feedback
  originSessionId: baf1017a-fcea-4d45-b832-4dff86ceae6d
---

note もくじ index ページ(L1総合案内・各資格L2もくじ。共通frontmatter `noteSeries: 総合案内`)のマガジン導線書式ルール。

**規約（2026-07-06 刷新）**: サイトCTA刷新で全送客がもくじに集約されたため、生リンク羅列（CTR取りこぼし）を廃し「診断→導入文＋カード」へ。①**主力5-6誌＝〈太字見出し＋2-4文の導入＋bare URL単独行（カード化）〉**でCTRを取る。②**ロングテール（総監14ペルソナ・建設11科目等）＝markdownリンクの列挙を温存**（全部カード化すると冗長＋D2スラッグ保持のため）。③冒頭に「状況別・まず1冊」診断（太字＋箇条書き。**表はnote-lint BLOCK**）。④価格(¥)=index でも**禁止**（noteカードが実価格表示・重複回避）。⑤L1は各L2の重複列挙をやめ「資格分岐＋主力1誌＋L2送客」の**ルーターに薄型化**（D3=L1に各L2 noteId保持が唯一の制約。D2はL2のみ対象でL1は非対象）。

**Why**: 競合(gijyutsushi等)は導入文＋カードが標準で、doboku-noteの生リンク羅列は標準以下だった(09_note競合分析2026 §6)。太字内全角括弧は`**A**（B）`形式(§14-b)。

**How to apply**: `check-note-magazine-cta.mjs` が `noteSeries:総合案内` で¥禁止＋markdownリンク列挙を免除(2026-06-17 b072c4561)。D2は `audit-note-funnel.mjs:141-147` がL2本文に/m/スラッグ在るかを書式不問で見る→カード化・列挙どちらでもgreen(リライト前後で `grep -o 'note.com/dobokunote/m/[a-z0-9]*'|sort -u` のスラッグ集合diffを必ず取る)。「もくじ」呼称はnote-funnel.json bottomCtaと結合→H1【○○もくじ】接頭辞は温存し後半のみ便益化。リライト後は note-reflow→note-lint→audit-note-funnel。live反映は無料記事のため `note-update-body.mjs --pause`(手動でタイトル変更＋更新確定)。真実源=content-principles §14-c・note-selling-structures §99。[[feedback_note_cta_no_price_linkcard]] [[project_pe_construction_note_funnel]]
