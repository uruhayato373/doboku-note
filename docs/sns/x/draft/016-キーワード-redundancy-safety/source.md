# 冗長性（redundancy-safety）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #13（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/redundancy-safety/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/redundancy-safety/img/redundancy-types.svg`
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/03_SNS/03_投稿カレンダー2026Q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**冗長性（Redundancy）** とは、システムの構成要素を **多重化** し、一部が故障しても他の要素が機能を代替することで、システム全体の信頼性を向上させる設計手法。

安全設計においては、**単一故障による安全機能喪失を防止** する基盤概念。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **5.4 事故・災害の未然防止活動・技術**。フォールトトレランス・安全計装システムの基盤。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-redundancy-safety](https://doboku-note.com/docs/pe-comprehensive-management-redundancy-safety)

## 2. 冗長化の 3 種類

| 種類 | 内容 | 例 |
|---|---|---|
| 待機冗長 | 通常は待機、主系故障時に切替 | UPS（無停電電源装置） |
| 並列冗長 | 常時並列稼働、一方の故障でも機能維持 | 二重化センサー |
| 多数決冗長 | 複数出力を多数決で判定 | 航空機 3 重化フライトコンピュータ |

## 3. フォールトトレランスとの関係

冗長性 = フォールトトレランス（故障許容設計）の **主要な実現手段**。

冗長化によって単一故障でもシステムの機能を維持し、安全性と可用性を両立する。

## 4. 関連規格・概念

- **IEC 61508**（機能安全）: 安全度水準 SIL1〜SIL4。SIL3 達成には HFT≧1（1 つの故障でも安全機能保持）。
- **単一故障基準**（Single Failure Criterion）: 任意の一系統故障でも安全機能維持（原子力 ECCS）。
- **並列システム信頼度**: 1−(1−R)ⁿ で計算。冗長数 n を増やせば信頼度向上。

## 5. 引っかけポイント（試験で狙われる）

1. **3 種類の暗記**: 待機冗長・並列冗長・多数決冗長。「常時待機/常時並列/多数決」の動作の違い。
2. **フォールトトレランスの実現手段**: 冗長性は手段、フォールトトレランスは特性。
3. **単一故障基準**: 任意の一故障でも機能維持が安全設計の基本要件。
4. **SIL と HFT の関係**: SIL3 → HFT≧1 が原則。
5. **R02 Ⅰ-1-28**: 電源システムの冗長構成（主要 3 系統並列 + 予備緊急 2 台）の信頼性計算が出題。

## 6. 過去問引用

**R02 Ⅰ-1-28** で電源システムの冗長構成（主要 3 系統並列 + 予備緊急 2 台）の信頼性計算が出題された。

並列システム信頼度: 1−(1−R)ⁿ で評価可能。

## 7. 関連キーワード

- [フォールトトレランス](https://doboku-note.com/docs/pe-comprehensive-management-fault-tolerance)
- [フェールソフト](https://doboku-note.com/docs/pe-comprehensive-management-fail-soft)
- [安全計装システム（SIS）](https://doboku-note.com/docs/pe-comprehensive-management-safety-instrumented-system)
- [機能安全](https://doboku-note.com/docs/pe-comprehensive-management-functional-safety)
- [並列システム](https://doboku-note.com/docs/pe-comprehensive-management-parallel-system)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. 定義 — 冗長性とは
2. 3 種類（待機・並列・多数決）
3. フォールトトレランスとの関係
4. SIL・単一故障基準
5. 引っかけ + CTA

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（冗長性とは）
3. 3 種類比較図（既存 SVG `redundancy-types.svg` 流用）
4. 待機冗長
5. 並列冗長
6. 多数決冗長
7. フォールトトレランスとの関係
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「冗長化は何種類？」）
- 5-15 秒: 3 種類の紹介
- 15-18 秒: 沈黙
- 18-30 秒: 解説（待機・並列・多数決の違い、SIL）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `redundancy-types.svg`（待機・並列・多数決の 3 種類比較図）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示
- YT Shorts 中盤で挿入
