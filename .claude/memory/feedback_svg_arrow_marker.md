---
name: feedback_svg_arrow_marker
description: "SVG/画像生成の罠: 矢印マーカーは右向き三角形(orient=autoが90度崩れの原因)・後付け一括改変は全PNG再目視(IG図はaudit.mjs対象外)・大型タイトルは段階フォントauto-fit"
metadata:
  type: feedback
---

## 矢印マーカーは右向き三角形で定義する
SVG の矢印マーカーは必ず **右向き三角形（+x 方向）** で定義する: `<polygon points="0,0 W,H/2 0,H">`、`refX` はほぼ先端、`refY` は中央。`orient="auto"` はマーカーをパスの進行方向＝+x 軸として回転させるため、上向き/下向き三角形として描くと上向き線・下向き線で90度ずれて矢じりが横向きに崩れる。
- **Why:** 2026-05-20 の IT トレンド図版整備で iot・edge-computing・rpa・zero-trust・blockchain-crypto の5本がこのバグで崩れ修正コミットが必要になった。
- **How to apply:** `create-svg` スキルのマーカーテンプレ（`points="0,0 8,3 0,6"` 等）をそのまま使い再設計しない。短い接続線で矢じりが過大なら `markerUnits="userSpaceOnUse"` で固定サイズ化（例: markerWidth=10 markerHeight=9 refX=9 refY=4.5）。SVG 監査（audit.mjs）は向き崩れを検出しないので `@resvg/resvg-js` でレンダリングし矢印部分を拡大目視。関連 [[project_svg_figure_governance]]

## 後付け一括スクリプトで既存図を改変したら全 PNG を再目視（2026-06-30）
図版 SVG の目視 QA ルールの真実源は **`ig-figure-pack/SKILL.md` Step 0**（SVG Write→即 PNG 生成→Read で目視＋6点チェック）。ここは「そのループの踏み外し方」と IG 図に対する監査ツールの適用範囲の注意だけ。
- **Why:** working-hours-systems の IG カルーセル図に制度名 navy 帯を**後付けの一括スクリプト**（add-topic-band.mjs）で既存スライドへ足した。SKILL の「Write→即目視」ループは各スライドの初回作成しか覆わず、後からの一括加工は対象外。全 PNG を目視せず、帯（y0–32）が見出し（y38・font16・文字上端≈25）に約6px重なって出荷し「品質低下」と指摘された。ルールは既にあった——足りなかったのは一括加工パスでの目視。
- **How to apply:** ①既存スライドを後からスクリプトで改変（帯/ラベル追加・座標変更）したら改変した全スライドの PNG を再生成して1枚ずつ再目視。②帯・ボックスを足すときは「文字上端＝baseline − fontSize×0.75」を見込んで余白を取る。③**IG 図（docs/sns）の QA に `svg/audit.mjs` を使わない**（audit はサイト図 `.local/r2/posts/**` 専用で既定スコープが docs/sns を除外。`--file=` で当てると navy 帯＋白文字が `P8-dark-bg`（HIGH）で偽陽性。`P2-overlap` は検知できるが MEDIUM=非ブロックで頼れない）。サイト図監査（audit.mjs／HIGH ブロック）と IG 図の目視 QA は別系統。④Downloads 等の配布コピーは図を再生成したら必ず上書き（古い版が残る）。docs/sns へ audit を広げない（navy 帯が全て P8 で偽陽性になる）。[[project_svg_figure_governance]]

## 大型タイトルの不適切改行は段階フォント auto-fit で構造的に解消
PNG/SVG の大型タイトル（過去問 cover 156px、Stories ハイライト hero 132px）で文字数超過による不適切な改行（「ここでわかるこ／と」）が頻発する課題の確定対策。文字数制限は意味が希薄化（「ここでわかること」→「わかること」）、フォント縮小は視覚バランスが崩れるジレンマを段階分けで吸収する。
- 共通 util `.claude/scripts/lib/sns-common/fit-title.mjs`（`visualLength`: 全角=1.0/半角=0.55、`pickTitleSize`: 3階層自動選択、`classifyTitle`: OK/WARN/NOTICE/ERROR）。tokens.json に hero/heroMid/heroSm（132/100/80）＋coverTitle/Mid/Sm（120/90/72）の3階層を `_maxLen` 付きで定義。builder（highlight-stories-slides.mjs / quiz-slides.mjs）が title の visualLength で自動選択。字数判定4段階: OK(<=7) / WARN(8-11) / NOTICE(12-16) / ERROR(17+)。機械検証 `.claude/scripts/lint-stories-titles.mjs` で全 slide-data.json をスキャン。
- エージェント分業: Generator は推奨字数（4-7）を目指すが8-11も許容（意味が崩れない短縮を優先）。Evaluator（ig-highlight-qa / ig-carousel-qa）は lint 出力を Read して採点に引用（自己判定でなく機械結果）。ERROR のみ -2 重大減点、WARN/NOTICE は減点なし（auto-fit で折り返しは構造的に発生しない）。
- 将来: notebook-slides.mjs / キーワードページ SVG で同課題が出たら fit-title.mjs を再利用（SVG は PNG と fit ロジックが異なるため要調整）。関連 [[project_sns_v7_pivot]]
