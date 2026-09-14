---
name: feedback_svg_visual_qa_before_commit
description: IG図(docs/sns)はaudit.mjs対象外＝PNG目視が唯一のQA。後付け一括スクリプトはper-slide目視ループをすり抜けるので改変後は全PNG再目視
metadata:
  node_type: memory
  type: feedback
  originSessionId: 098f95c3-7579-4ce9-893a-45e0f4a06a46
---

図版 SVG の目視 QA ルールの**真実源は `ig-figure-pack/SKILL.md` Step 0**（SVG Write → 即 PNG 生成 → Read で目視＋6点チェック）。ここに重複記述しない。このメモは「そのループをどう踏み外したか」という失敗モードと、IG 図に対する監査ツールの適用範囲の注意だけを記録する。

**Why:** 2026-06-30、working-hours-systems の IG カルーセル図に制度名 navy 帯を **後付けの一括スクリプト**（add-topic-band.mjs）で既存スライドへ足した。SKILL.md の「Write→即目視」ループは*各スライドの初回作成*しか覆っておらず、後からの一括加工は対象外。そのため全 PNG を目視せず、帯（y0–32）が見出し（y38・font16・文字上端≈25）に約6px重なって出荷し「品質低下」と指摘された。ルールは既にあった——足りなかったのは一括加工パスでの目視。

**How to apply:** ①既存スライドを後からスクリプトで改変（帯/ラベル追加・座標変更）したら、改変した全スライドの PNG を再生成して 1 枚ずつ再目視する。②帯・ボックスを足すときは「文字上端＝baseline − fontSize×0.75」を見込んで余白を取る。③**IG 図（docs/sns）の QA に `svg/audit.mjs` を使わない**——audit はサイト図（`.local/r2/posts/**`）専用で既定スコープが docs/sns を除外する設計。`--file=` で IG 図に当てると navy 帯＋白文字が `P8-dark-bg`（HIGH）で**偽陽性**になる（IG 図では navy 帯は正規仕様）。重なりの `P2-overlap` は検知できるが MEDIUM=非ブロックなので頼れない。よって**サイト図監査（audit.mjs／HIGH ブロック）と IG 図の目視 QA は別系統**として混同しない。④Downloads 等の配布コピーは図を再生成したら必ず上書きする（古い版が残る）。ツールは揃っているので新規ゲートは不要——むしろ docs/sns へ audit を広げると navy 帯が全て P8 で偽陽性になるので広げてはいけない。[[project_svg_figure_governance]]
