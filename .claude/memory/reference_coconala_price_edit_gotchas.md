---
name: coconala-price-edit-gotchas
description: "ココナラ価格編集の罠=固定¥500刻みselect/¥7,980不可/option値は×1.1買い手価格/coconala-editは価格select失敗でもok:true偽成功"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8d9ca99c-eaab-4581-8871-6676ed4fc66a
  modified: 2026-07-22T21:02:50.074Z
---

`scripts/coconala-edit.mjs --fields price --commit`（Playwright）でココナラ出品価格を反映する際の罠（2026-07-22 実測）。

- **価格は固定候補の select**（`#ServicePrice`・option text "N,NNN円"）。¥500刻み（…7,000/7,500/8,000/8,500…）で、**任意額不可**。例: ¥7,980 は選択肢に無く `selectOption` が Timeout。近い額（¥8,000 等）へ丸める。
- **偽成功に注意**: 価格 select が失敗しても coconala-edit は warning を出すだけで**中断せず、旧価格のまま再公開して `ok:true`／`RESULT ok:true` を返す**。ログの `price: "N円" → selected "N円"`（成功）or `価格 select 失敗`（失敗）を必ず確認。[[no-confirmation]] でも成功report前に検証。
- **option の value 属性 = 出品価格 × 1.10（買い手が見る手数料込み価格）**。ライブ値確認で `#ServicePrice` の value が 8800 なら出品価格は ¥8,000（8800/1.1）。3300→¥3,000。**value をそのまま出品価格と誤読しない**。
- ライブ値の読み取り: 編集ページ `/mypage/services/{id}` を開き `#ServicePrice` の option/value を取得（ログイン済みプロファイルは初回ログイン後に永続）。
- 真実源は `src/lib/coconala-services.ts`（priceYen）。SoT を直す→スクリプトを回す運用。[[reference-note-status-reconciler]] と同じ流儀。
