# X 用原稿 — 工程能力指数（5 ツイート構成）

- 投稿頻度: 5 連続日（または週内分散）
- ハッシュタグ: #技術士 #総合技術監理部門 #技術士総監 #品質管理 #工程能力指数
- UTM: `utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index`
- 元素材: [source.md](./source.md)

---

## Tweet 01: 定義編

【総監キーワード解説】工程能力指数 #1

工程能力指数とは、工程が規格の範囲内で製品を生産する能力を定量的に評価する指標。

ばらつきと規格幅の比で表され、値が大きいほど工程能力が高い。

技術士総監キーワード集 2.2 品質の管理の中核キーワード。

詳しい解説 → https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index

#技術士 #総合技術監理部門 #品質管理 #工程能力指数

---

## Tweet 02: 計算式編

【総監キーワード解説】工程能力指数 #2

計算式は 2 種類:

▼ Cp（中心が規格中央にある場合）
Cp = (USL - LSL) ÷ 6σ

▼ Cpk（中心がずれている場合）
Cpk = min((USL - x̄) ÷ 3σ, (x̄ - LSL) ÷ 3σ)

必ず Cp ≧ Cpk。中心ずれが大きいほど Cpk < Cp になる。

解説 → https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index

#技術士 #総合技術監理部門 #品質管理 #工程能力指数

---

## Tweet 03: 判定基準編

【総監キーワード解説】工程能力指数 #3

Cp 値による判定基準

| Cp 値 | 判定 |
|---|---|
| 1.67 以上 | 十分すぎる能力 |
| 1.33〜1.67 | 十分な能力 |
| 1.00〜1.33 | やや不足 |
| 1.00 未満 | 能力不足 |

管理目標は Cp ≧ 1.33 が一般的。

解説 → https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index

#技術士 #総合技術監理部門 #品質管理 #工程能力指数

---

## Tweet 04: 引っかけポイント編

【総監キーワード解説】工程能力指数 #4

試験で狙われる引っかけ 3 つ

1. Cp と Cpk の違いを混同（Cp は中心ずれを考慮しない）
2. 分母を σ と 6σ で混同（正解は 6σ = ±3σ の幅）
3. 工程能力改善 = 規格幅の拡大ではなく σ の低減が本質

3σ 則（±3σ で 99.7%）が Cp 計算の根拠。

解説 → https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index

#技術士 #総合技術監理部門 #品質管理 #工程能力指数

---

## Tweet 05: 計算例 + CTA

【総監キーワード解説】工程能力指数 #5（最終回）

計算例: USL=50, LSL=30, x̄=40, σ=2

▼ Cp = (50 - 30) / (6 × 2) = 20 / 12 ≈ 1.67
▼ Cpk = min(10/6, 10/6) = 1.67（中心一致のため Cp = Cpk）

中心が x̄=42 にずれると Cpk は 1.33 に低下。Cp は同じ。

工程能力指数 5 連投これにて終了。doboku-note で全解説。

→ https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=x&utm_medium=organic&utm_campaign=keyword-process-capability-index

#技術士 #総合技術監理部門 #品質管理 #工程能力指数

---
