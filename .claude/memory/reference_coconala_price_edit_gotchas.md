---
name: reference_coconala_price_edit_gotchas
description: "ココナラ価格編集の履歴と現行フォーム=固定価格候補・旧selectの偽成功事故・現行comboboxと警告時中止"
metadata:
  type: reference
---
`scripts/coconala-edit.mjs --fields price --commit`（Playwright）でココナラ出品価格を反映する際の罠。下の `#ServicePrice` は 2026-07-22 時点の旧フォームの記録。

2026-11-01 の現行フォームでは「サービス価格」combobox の固定価格候補を選ぶ。`coconala-edit` は入力警告があれば更新を中止する。保存後は公開ページの価格を照合する。

- **価格は固定候補の select**（`#ServicePrice`・option text "N,NNN円"）。¥500刻み（…7,000/7,500/8,000/8,500…）で、**任意額不可**。例: ¥7,980 は選択肢に無く `selectOption` が Timeout。近い額（¥8,000 等）へ丸める。
- **旧実装の偽成功事故**: 当時は価格 select が失敗しても warning のみで、旧価格のまま再公開して `ok:true` を返した。現行の既存出品編集は warning 時に更新を中止する。[[feedback_no_confirmation]] でも成功報告前に公開価格を照合する。
- **option の value 属性 = 出品価格 × 1.10（買い手が見る手数料込み価格）**。ライブ値確認で `#ServicePrice` の value が 8800 なら出品価格は ¥8,000（8800/1.1）。3300→¥3,000。**value をそのまま出品価格と誤読しない**。
- ライブ値の読み取り: 現行の編集ページ `/mypage/services/{id}` では「サービス価格」combobox の表示を読む。旧フォームの `#ServicePrice` は使わない。
- 真実源は `config/products.json` の `catalog.priceYen`（`src/lib/coconala-services.ts` は生成物）。正本を直す→スクリプトを回す運用。[[reference_note_status_reconciler]] と同じ流儀。
