---
name: figure-provenance-system
description: 図の出所/品質/次アクションを恒久記録する土台。npm run audit-figures→ギャラリー「対応」フィルタで作業。手辿り不要
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8c5fb26b-8a0f-4830-9dd0-a5e0361619d1
---

記事図クロップの品質改善を「毎回手で辿らず」継続するための土台（2026-07-08 構築）。真実源 `docs/reference/figure-provenance.md`。

**3層**:
- `.claude/config/figure-sources.json` … 資格別ソース台帳（元素材の所在・種別・品質・再スキャン要否）。**手動SSOT**。
- `.claude/state/figure-text-audit.json` … 機械監査＝**写り込み**(OCR: leak/prose/maybe/clean)＋**画質**(ラプラシアン分散 sharp/soft/blurry)。`npm run audit-figure-text`。
- `.claude/state/figure-provenance.json` … 上2つ＋命名年度＋公開/掲載を join し各図の **needs** を算出。`npm run build-figure-provenance`。

**一括**: `npm run audit-figures`（図を直したら実行して更新）。

**needs（次アクション）**: recrop-urgent(答え漏らし)／recrop(写り込み・画質OK)／rescan(ボケ＋再スキャン可)／rescan-need-source／rescan-or-svg／ok。

**manual_needs（machine-blind 欠陥の per-figure 上書き・2026-07-09 追加）**: OCR/sharpnessで検出不能な欠陥は `figure-sources.json` の `manual_needs` 配列（`{figure:baseRel末尾, needs, reason, verified}`）に書く→build-figure-provenanceが末尾一致で needs 上書き＋`manualReason`出力→ギャラリー対応バッジ tooltip に理由表示。用途は**双方向**: ①見切れ図の upgrade（例 civil-1 工程表 r04-b/r05-b/r01-b/r07-b/r06-b-fig-02＝作業/ノード/ラベル欠落で鮮明clean判定だが `rescan-need-source`）②writein/prose 誤検出の ok 下押し（例 pe cost-variance図の(1)(2)下位図キャプション・化学式OCRノイズ・図の●凡例）。見切れは再クロップ不可＝要元スキャン。

**運用**: `npm run admin`→記事図版タブ→フィルタ「対応」で needs 別に絞る。カードに needs バッジ＋再スキャン図は source_dir ツールチップ。MDXリンクで開いて修正。

**重要な判断（この土台で確定した方針）**:
- ボケ図＝ラプラシアン分散で機械検出可（digital 800+/スキャン 18-118）。**rescan33は全てconcrete-chief**（PDF無し・書籍スキャン低品質）。civil/pe はゼロ（鮮明）。
- **過去問のデータグラフはSVG化禁止**＝図の幾何が答えそのもの・ボケ元から誤答を誘発。→再スキャンが正。SVGは構造が本文確定できる模式図のみ。
- 写り込み(recrop)は既存から再クロップで直る。答え漏らしの公開×掲載は既に0化済み [[project_civil1_figure_answer_leak]]。

**未実装の拡張**: クロップpipeline(civil-figure-rework/pdf-to-mdx)が切る時にsource PDF/page/bboxをprovenanceに書けば完全決定化。今は資格レベルのsource_dirのみ。
