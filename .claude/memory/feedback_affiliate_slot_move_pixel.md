---
name: affiliate-slot-move-pixel
description: アフィリエイト creative を新スロットへ昇格させる時は同一 mat の既存ピクセルを必ず監査（1ページ1発火）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dd04b373-88f9-49fb-8256-eac127630a32
---

A8.net アフィリの creative を別スロット（記事末→サイドバー等）へ移動/昇格させる時は、**同一 mat のピクセルが他の場所で既に発火していないか**を必ず監査する。同一 mat のピクセルが1ページで2回発火すると「1ページ1発火」規律違反＝無効インプレッション扱いのリスク。

**Why:** 2026-06-02、GKS転職バナー(mat `4B3VR8+F0LMU2+4R40+TSBE9`)を土木サイドバーへ昇格した際、(1)記事末 `CivilCareerCTA` が同 mat バナーで重複→該当 docGroup で撤去、(2)civil-1 secondary 9ページ(r03〜r07 + theme past-problems)の本文インライン `CareerAffiliate` が同 mat の `trackingPixelUrl`(www10)を持っていた→ href のみ化（サイドバーを唯一のピクセル源に）。pixel URL の www 番号が違っても **mat が同じなら同一 creative 扱い**。

**How to apply:** 配置変更前に `grep -rl "trackingPixelUrl\|<対象mat>" .local/r2/posts/<vertical>/<docGroup>-*` で既存ピクセルを洗い出し、新スロット追加後に各ページ種別で「同 mat ピクセルが1個だけ」になるよう調整。真実源は `docs/project/04_運営/02_アフィリエイト提携状況.md`。配置ロジックは `src/app/docs/[...slug]/page.tsx`、テキストリンクカードは [[related-keywords-prefix]] と同じ component-loader 系ではなく page.tsx 直書き or `SchoolAffiliate`/`CareerAffiliate`/`CourseAffiliate`。
