# Instagram Carousel 用原稿 — 工程能力指数（1 投稿 10 スライド）

- 構成: 1 投稿 = 10 スライド（表紙 1 + 解説 8 + CTA 1）
- 解像度: 1080×1350 (4:5 portrait)
- 投稿頻度: 1 投稿（金 07:00）
- UTM: `utm_source=instagram&utm_medium=carousel&utm_campaign=keyword-process-capability-index`
- 元素材: [source.md](./source.md)
- 利用 SVG: `.local/r2/posts/pe-comprehensive-management/process-capability-index/img/normal-distribution-3sigma.svg`

---

## Carousel 01: 工程能力指数 完全解説

**公開予定**: 2026-05-08 金 07:00

### Slide 1: 表紙

- メイン: 「工程能力指数 完全解説」
- サブ: 「Cp と Cpk の違いがわかる」
- 図解指定: タイトル + 正規分布のシルエット（normal-distribution-3sigma.svg のミニチュア）
- 背景: brand-fill (#e8f0fe) / タイトル: ink-strong (#222) / サブ: ink-body (#555)
- バッジ: 「総監 2.2 品質の管理」(brand #2e6da4)

### Slide 2: 工程能力指数とは

- 上部ラベル: 「定義」(brand)
- メインテキスト:
  - 「工程が規格の範囲内で製品を生産する能力を定量的に評価する指標」
- 補足: 「ばらつきと規格幅の比で表す」「値が大きいほど工程能力が高い」
- 図解指定: 規格上限・下限の枠 + ベル曲線 + 「OK 範囲」のハッチング

### Slide 3: 前提となる 3σ 則

- 上部ラベル: 「前提知識」(brand)
- 図解: 既存 SVG `normal-distribution-3sigma.svg` を中央配置
- 注記:
  - μ ± σ → 約 68.3%
  - μ ± 2σ → 約 95.4%
  - μ ± 3σ → 約 99.7%
- 強調: 「±3σ（合計 6σ）が Cp 計算式の根拠」(positive #3a7d44)

### Slide 4: Cp の計算式

- 上部ラベル: 「両側規格・中心一致」(brand)
- 計算式（大きく中央配置）:
  - **Cp = (USL - LSL) ÷ 6σ**
- 凡例:
  - USL = 規格上限
  - LSL = 規格下限
  - σ = 標準偏差
- 補足: 「中心がずれていない前提の指標」

### Slide 5: Cpk の計算式

- 上部ラベル: 「片寄り考慮」(brand)
- 計算式:
  - **Cpk = min((USL - x̄) ÷ 3σ, (x̄ - LSL) ÷ 3σ)**
- 凡例:
  - x̄ = 工程平均
  - 上限側・下限側それぞれの距離を 3σ で割って小さい方を採用
- 強調: 「実質的な工程能力指数」(positive)

### Slide 6: Cp と Cpk の違い

- 上部ラベル: 「中心ずれの影響」(warn #d4a017)
- 図解指定: 2 つのベル曲線を並べる
  - 左: 規格中央に中心一致 → Cp = Cpk
  - 右: 中心が右にずれている → Cpk < Cp
- 強調メッセージ: 「必ず Cp ≧ Cpk」(positive)
- 注記: 「中心ずれが大きいほど Cpk が小さくなる」

### Slide 7: 判定基準と計算例

- 上部ラベル: 「判定基準」(brand)
- 表（左半分）:
  - Cp ≧ 1.67: 十分すぎる
  - 1.33〜1.67: 十分
  - 1.00〜1.33: やや不足
  - < 1.00: 能力不足
- 計算例（右半分）:
  - USL=50, LSL=30, x̄=40, σ=2
  - **Cp = 20 / 12 ≈ 1.67**
  - **Cpk = 10 / 6 ≈ 1.67**（中心一致）
- 強調: 「管理目標 Cp ≧ 1.33」(positive)

### Slide 8: 引っかけポイント

- 上部ラベル: 「試験で狙われる」(warn)
- 番号付きリスト:
  1. **Cp と Cpk を混同** — Cp は中心ずれを考慮しない
  2. **分母 σ と 6σ の混同** — 正解は **6σ（±3σ の幅）**
  3. **改善 = ばらつき低減** — 規格幅の拡大ではなく σ の低減が本質
- 各項目に warn 系アイコン

### Slide 9: 関連キーワード

- 上部ラベル: 「セットで覚える」(brand)
- リスト:
  - 品質管理（QC 七つ道具・新 QC 七つ道具）
  - 管理限界（工程の安定性評価）
  - 製造品質
  - 全数検査／抜取検査
  - 品質保証
- 補足: 「過去問 R02 Ⅰ-1-1 で関連出題」

### Slide 10: CTA

- メイン: 「全解説 + 過去問演習は」
- CTA テキスト: 「doboku-note で全文を見る」
- リンク: `https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=instagram&utm_medium=carousel&utm_campaign=keyword-process-capability-index`
- サブ: 「プロフィールのリンクから」
- 「保存ボタンを押して試験前日に見返そう」
- 過去問追加 CTA: `https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar?utm_source=instagram&utm_medium=carousel&utm_campaign=keyword-process-capability-index`

**キャプション（投稿本文）**:
```
【総監キーワード解説】工程能力指数 完全解説

Cp と Cpk の違い・3σ 則の根拠・引っかけポイントまで 10 スライドで整理。

✓ 計算式（Cp / Cpk）
✓ 判定基準（管理目標 Cp ≧ 1.33）
✓ 試験で狙われる引っかけ 3 つ
✓ 計算例（USL=50, LSL=30, σ=2 のケース）

保存して試験前日に見返そう。

解説 + 過去問はプロフィールのリンク（doboku-note）から

#技術士 #総合技術監理部門 #技術士総監 #品質管理 #工程能力指数 #Cp #Cpk #正規分布 #3シグマ #統計的品質管理 #SQC #QC七つ道具 #管理限界 #製造品質 #品質保証 #技術士試験 #技術士受験 #国家資格 #資格試験 #土木 #建設
```
