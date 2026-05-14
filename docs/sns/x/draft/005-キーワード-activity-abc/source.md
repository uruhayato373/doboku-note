# 活動基準原価計算（activity-abc）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #2（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/activity-abc/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/activity-abc/img/abc-two-stage-allocation.svg`（既存）
- 用途: x.md / instagram-carousel.md / youtube-shorts/ の派生元（真実源）
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/03_SNS/03_投稿カレンダー2026Q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**活動基準原価計算（ABC: Activity Based Costing）** とは、製品やサービスが消費する **アクティビティ（活動）を基準に間接費を配賦する原価計算手法**。

従来の配賦基準（直接作業時間等）では製品間の原価が歪むという問題を解消する。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **2.4 原価管理・管理会計**。経済性管理ピラーのうち、原価精度向上と間接費可視化を担うキーワード。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-activity-abc](https://doboku-note.com/docs/pe-comprehensive-management-activity-abc)

## 2. 手順（4 ステップ）

1. **アクティビティを識別** — 検査・段取替え・運搬等
2. **コストプールを設定** — 各アクティビティの費用集計単位
3. **コストドライバーを選定** — 検査回数・段取回数等
4. **コストドライバー量に応じて製品にコスト配賦**

## 3. コストドライバーの 2 種類（2 段階配賦）

ABC の精度を支える核心は **2 段階配賦** にある。

- **リソースドライバー（資源ドライバー）**: 各 **活動** が消費した **資源コスト** を活動ごとに割り当てる基準。例: 人件費 → 作業時間で活動に配賦
- **アクティビティドライバー（活動ドライバー）**: 各 **製品・サービス** が消費した **活動量** を製品ごとに割り当てる基準。例: 検査回数 → 製品ごとに配賦

```
資源 ──[リソースドライバー]──> 活動 ──[アクティビティドライバー]──> 製品
```

## 4. 特徴

| 利点 | 限界 |
|---|---|
| 製品別原価の精度が向上 | 活動の識別・測定に手間 |
| 間接費の発生原因が可視化 | 少品種大量生産では効果限定的 |

## 5. 引っかけポイント（試験で狙われる）

1. **2 段階配賦を 1 段階と混同**: ABC は **資源 → 活動 → 製品** の 2 段階。リソースとアクティビティのドライバーを区別する。
2. **適用範囲の誤解**: 多品種少量生産・間接費比率が高い場合に有効。少品種大量生産では従来法で十分。
3. **ABC ≠ ABM**: ABC は計算手法、**ABM（Activity Based Management）** は ABC の結果を活用してコスト削減・業務改善を行う管理手法。
4. **MFCA との違い**: MFCA は **物質・エネルギーの流れ単位** で集計（ISO 14051）。ABC は **活動単位**。MFCA は経済性管理 × 社会環境管理の接点。

## 6. 過去問引用

**ABC 関連の頻出論点**:
- ABC は多品種少量生産・サービス業など間接費比率が高い場面で精度向上効果が大きい
- 2 段階配賦の論理（資源 → 活動 → 製品）の理解
- ABM（活動基準管理）との関係（ABC は計算、ABM はそれを使った管理）

**MFCA 関連（H21・H26・R01 出題）**:
- MFCA は ISO 14051（2011 年）として国際規格化
- 廃棄物・ロス・端材を「**負の製品**」として可視化
- 経済性管理 × 社会環境管理の 5 管理トレードオフの典型例

**典型計算例（オリジナル）**:

> 製品 A・B の検査時間: A=100 時間、B=200 時間。検査費総額 = 60,000 円。製品 A の検査費配賦額は？

ABC（コストドライバー = 検査時間）で配賦すると:
- 配賦率 = 60,000 / (100 + 200) = 200 円 / 時間
- 製品 A 配賦額 = 200 × 100 = **20,000 円**

## 7. 関連キーワード

- [コストドライバー](https://doboku-note.com/docs/pe-comprehensive-management-cost-driver)
- [製造間接費](https://doboku-note.com/docs/pe-comprehensive-management-indirect-manufacturing-cost)
- [原価差異分析](https://doboku-note.com/docs/pe-comprehensive-management-cost-variance-analysis)
- [直接原価計算](https://doboku-note.com/docs/pe-comprehensive-management-direct-costing)
- [品質原価計算](https://doboku-note.com/docs/pe-comprehensive-management-quality-costing)
- [経済性管理ピラー](https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. **定義** — ABC とは何か（活動基準・配賦の歪み解消）
2. **手順** — 4 ステップを箇条書きで
3. **2 段階配賦** — リソースドライバー × アクティビティドライバーの違い
4. **引っかけ** — ABC vs ABM、ABC vs MFCA の区別
5. **CTA** — 関連キーワードページへ誘導

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（ABC とは）
3. 従来法の問題点（原価が歪む例）
4. 4 ステップの手順
5. 2 段階配賦の図解（SVG `abc-two-stage-allocation.svg` 流用）
6. リソースドライバー詳細
7. アクティビティドライバー詳細
8. 利点と限界（比較表）
9. 引っかけポイント（ABC vs ABM vs MFCA）
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「ABC の 2 段階配賦、説明できますか」）
- 5-15 秒: 用語紹介（リソースドライバー / アクティビティドライバー）
- 15-18 秒: 沈黙
- 18-30 秒: 解説（資源 → 活動 → 製品の 2 段階）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `abc-two-stage-allocation.svg`（資源 → 活動 → 製品の 2 段階配賦図）

**SNS への転用**:
- IG Carousel Slide 5 で中央配置（4:5 portrait に合わせて余白調整）
- YT Shorts 中盤（18-30 秒）で静止画スライドとして挿入
- ナレーションでの参照: 「左から資源、中央が活動、右が製品」の流れに合わせる
