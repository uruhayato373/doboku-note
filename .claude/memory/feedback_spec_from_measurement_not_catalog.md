---
name: feedback_spec_from_measurement_not_catalog
description: 商品仕様はカタログのdescription等の自己申告でなく既存成果物の実測から取る。DN-0095で上位商品が入口商品より4割薄くなった(2026-08-20)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 796d1baa-5ecc-4615-a5d4-32a5c362fd70
  modified: 2026-08-21T01:27:24.567Z
---

新しい商品・記事の仕様（字数・本数・構成）を決めるときは、**既存の同系商品の実物を実測**してから発注する。カタログや doc に書かれた自己申告値を仕様の真実源にしない。

**2026-08-20 の事故（DN-0095）**: コンクリート主任技士「実務立場別小論文集」16本を発注する際、`src/lib/note-magazines.ts` の既存商品 `cce-essay-magazine` の description にあった「1200〜1700字級フル模範小論文」をそのまま仕様として渡した。ところが**その記述自体が実物より過少**で、既存記事の実測は 1,793〜2,864 字だった。結果、**¥3,980 の上位商品が ¥2,480 の入口商品より4割薄い**という商品設計欠陥が生まれ、16本全部を 2,200〜2,500 字へ増補し直す羽目になった。

**QA も検出できない**: Generator/Evaluator を分離していたが、Evaluator には親が渡した誤った基準（1200〜1700字）で採点させたため「範囲内＝PASS」と判定された。**発注時の仕様が誤っていると、分離していても検出されない**。

**How to apply**: 発注プロンプトに字数・構成の数値を書く前に、参照元の実物を測る。例:
```
awk '/^### 序論/{f=1} /^## 採点者視点/{f=0} f' <article.md> | sed 's/^\*\*.*\*\*$//; s/^###.*$//' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log([...s.replace(/\s/g,"")].length)})'
```
実測と doc の記述がずれていたら、**doc の側を実測値へ直す**（今回は description を「1800字級以上」へ修正済み）。上位商品を作るときは「既存商品の実測値を上回るか」を受入条件に入れる。

関連 [[feedback_gate_zero_coverage_false_pass]]（自己申告を検査結果と読み違える同型の罠）、[[feedback_note_prepublish_verify_not_proxy]]（代理指標でなく実条件を見る）。
