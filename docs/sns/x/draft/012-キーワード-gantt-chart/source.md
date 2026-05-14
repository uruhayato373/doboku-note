# ガントチャート（gantt-chart）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #9（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/gantt-chart/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/gantt-chart/img/gantt-chart-example.svg`
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/03_SNS/03_投稿カレンダー2026Q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**ガントチャート（Gantt Chart）** とは、横軸に時間・縦軸に作業項目を配置し、各作業の期間と進捗を **横棒（バー）で表す工程管理図**。

直感的に工程全体を把握でき、小日程計画や進捗管理に広く用いられる。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **2.3 工程管理**。経済性管理ピラーの工程可視化の標準ツール。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-gantt-chart](https://doboku-note.com/docs/pe-comprehensive-management-gantt-chart)

## 2. 構成要素

| 要素 | 内容 |
|---|---|
| 横軸 | 時間（日・週・月） |
| 縦軸 | 作業項目（タスク） |
| バー（横棒） | 各作業の期間と進捗 |
| マイルストーン | 重要な節目・完了時点 |

## 3. 進捗表示

- **計画線（ベースライン）**: 当初計画の期間・進捗をバーで表示
- **実績線**: 各作業の実際の開始・完了・現在進捗率をバーで上書き
- **現在時刻ライン**: 今日の日付を縦線で表示し、計画と実績の差を一目で把握
- **進捗率の色分け**: 完了（濃色）・進行中（中間色）・未着手（淡色）

## 4. PERT/CPM との比較

| 項目 | ガントチャート | PERT/CPM |
|---|---|---|
| 視認性 | 直感的で分かりやすい | 複雑だが論理的 |
| 作業間の依存関係 | 表現しにくい | 明確に表現できる |
| クリティカルパス | 識別できない | 識別できる |
| 適用場面 | 小日程計画・進捗報告 | 中〜大日程計画 |

ガントチャートと PERT/CPM の **併用** が実務の標準。

## 5. 引っかけポイント（試験で狙われる）

1. **依存関係の表現が苦手**: ガントチャートは **作業間の先行・後続関係を明示できない** のが最大の限界。
2. **クリティカルパスは識別不可**: PERT/CPM の機能。ガントチャートだけでは工期短縮検討に不十分。
3. **PERT/CPM との併用が実務標準**: PERT/CPM でクリティカルパスを識別し、ガントチャートで進捗を可視化。
4. **アローダイアグラムとの混同**: アローダイアグラム（PERT/CPM の表記）はネットワーク図、ガントチャートはバーチャート。
5. **小日程 vs 中〜大日程**: ガントチャートは小日程計画向き。複雑なプロジェクトには PERT/CPM。

## 6. 過去問引用

工程管理（2.3）では、ガントチャート と PERT/CPM の使い分けが頻出。両者の **限界と併用** がキーポイント。

**典型出題パターン**:

> 工程管理手法に関する次の記述のうち、最も不適切なものはどれか。

選択肢の中で「ガントチャートで作業間の依存関係が明示される」「ガントチャートでクリティカルパスが識別できる」のような誤った記述が頻出。

## 7. 関連キーワード

- [PERT/CPM](https://doboku-note.com/docs/pe-comprehensive-management-pert-cpm)
- [アローダイアグラム](https://doboku-note.com/docs/pe-comprehensive-management-arrow-diagram)
- [工程計画](https://doboku-note.com/docs/pe-comprehensive-management-process-planning-construction)
- [スケジューリング](https://doboku-note.com/docs/pe-comprehensive-management-scheduling)
- [経済性管理ピラー](https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. 定義 — ガントチャートとは
2. 構成要素 — 横軸・縦軸・バー・マイルストーン
3. 進捗表示 — 計画線・実績線・現在時刻ライン
4. PERT/CPM との比較・引っかけ
5. 併用が標準 + CTA

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（ガントチャートとは）
3. ガントチャート例（既存 SVG `gantt-chart-example.svg` 流用）
4. 構成要素詳細
5. 進捗表示の方法
6. PERT/CPM との比較表
7. 限界（依存関係表現不可）
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「ガントチャートでクリティカルパスは識別できる？」）
- 5-15 秒: 構成要素の紹介
- 15-18 秒: 沈黙
- 18-30 秒: 解説（依存関係表現が苦手、PERT/CPM との併用）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `gantt-chart-example.svg`（5 週間 × 5 作業のガント例、計画 vs 実績バー、現在日ライン）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示
- YT Shorts 中盤で挿入
