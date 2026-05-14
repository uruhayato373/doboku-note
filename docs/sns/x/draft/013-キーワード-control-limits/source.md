# 管理限界（control-limits）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #10（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/control-limits/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/control-limits/img/control-chart.svg`
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/03_SNS/03_投稿カレンダー2026Q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**管理限界（Control Limits）** とは、**上方管理限界線（UCL）と下方管理限界線（LCL）** であり、工程が統計的管理状態にあるかどうかを判定する基準線。

通常、中心線（CL）から **±3σ**（標準偏差の 3 倍）の位置に設定される。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **2.2 品質の管理**。QC 七つ道具の管理図の中核概念。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-control-limits](https://doboku-note.com/docs/pe-comprehensive-management-control-limits)

## 2. 管理図の構成

管理図は **3 本の水平線** で構成される。

| 線 | 位置 | 意味 |
|---|---|---|
| UCL（上方管理限界線） | CL + 3σ | 上限の判定基準 |
| CL（中心線） | データの平均 | 工程の中心 |
| LCL（下方管理限界線） | CL − 3σ | 下限の判定基準 |

## 3. 管理限界 vs 規格限界

| 項目 | 管理限界 | 規格限界 |
|---|---|---|
| 算出 | 工程のばらつきから統計的（±3σ） | 設計で決定 |
| 目的 | 工程の安定性判定 | 製品の合否判定 |
| 関係 | 管理限界 < 規格限界 が望ましい | — |

混同しないこと。

## 4. 異常判定ルール

管理図において以下の場合、工程に **異常あり** と判定する。

- 点が **管理限界線を超える**
- 点が中心線の片側に **連続して並ぶ**（連の検定）
- 点が **一方向に連続して増減** する（傾向の検定）

管理限界内でも連・傾向があれば異常と判定する点に注意。

## 5. 引っかけポイント（試験で狙われる）

1. **管理限界 ≠ 規格限界**: 最頻出。管理限界は工程ばらつきから統計算出、規格限界は設計値。
2. **±3σ の根拠**: 統計的に約 99.7% が範囲内に収まる。±2σ や ±1σ ではない。
3. **管理限界内でも異常あり**: 連・傾向の検定で異常判定可。
4. **管理限界 < 規格限界が望ましい**: 工程能力指数 Cp/Cpk の議論と接続。
5. **シューハート管理図**: 1920 年代ベル研究所、JIS Z 9021。

## 6. 過去問引用

品質管理（2.2）では、管理図と管理限界、工程能力指数とのセットでの出題が頻出。

**典型出題パターン**:

> 統計的工程管理に関する次の記述のうち、最も不適切なものはどれか。

選択肢の中で「管理限界は規格限界と一致する」「管理限界内ならすべて正常」のような誤った記述が頻出。

## 7. 関連キーワード

- [品質管理](https://doboku-note.com/docs/pe-comprehensive-management-quality-control)
- [工程能力指数（Cp・Cpk）](https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index)
- [全数検査／抜取検査](https://doboku-note.com/docs/pe-comprehensive-management-inspection-methods)
- [不適合品率／適合品率](https://doboku-note.com/docs/pe-comprehensive-management-nonconformity-rate)
- [品質改善活動](https://doboku-note.com/docs/pe-comprehensive-management-quality-improvement)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. 定義 — 管理限界とは
2. 管理図の構成 — UCL・CL・LCL
3. 管理限界 vs 規格限界
4. 異常判定ルール（連・傾向）
5. 引っかけ + CTA

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（管理限界とは）
3. 管理図の図解（既存 SVG `control-chart.svg` 流用）
4. UCL・CL・LCL の意味
5. 管理限界 vs 規格限界
6. 異常判定ルール（限界超え）
7. 異常判定ルール（連・傾向）
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「管理限界 ＝ 規格限界？」）
- 5-15 秒: 構成（UCL・CL・LCL の ±3σ）
- 15-18 秒: 沈黙
- 18-30 秒: 解説（管理限界は工程、規格限界は設計）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `control-chart.svg`（UCL/CL/LCL の 3 本ライン + サンプル点）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示
- YT Shorts 中盤で挿入
