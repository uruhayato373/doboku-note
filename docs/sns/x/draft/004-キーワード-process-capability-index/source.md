# 工程能力指数（process-capability-index）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #1（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/process-capability-index/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/process-capability-index/img/normal-distribution-3sigma.svg`（既存）
- 用途: x.md / instagram-carousel.md / youtube-shorts/ の派生元（真実源）
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/sns/calendar-2026q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**工程能力指数（Process Capability Index）** とは、**工程が規格の範囲内で製品を生産する能力を定量的に評価する指標**。ばらつきと規格幅の比で表され、値が大きいほど工程能力が高い。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **2.2 品質の管理**。経済性管理ピラーの中核キーワードのひとつで、品質管理における統計的手法の核となる。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index](https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index)

## 2. 計算式（核心）

### Cp（両側規格・中心が規格中央にある場合）

$$
C_p = \frac{USL - LSL}{6\sigma}
$$

### Cpk（片寄り考慮・中心がずれている場合）

$$
C_{pk} = \min\left(\frac{USL - \bar{x}}{3\sigma},\ \frac{\bar{x} - LSL}{3\sigma}\right)
$$

- $USL$：規格上限、$LSL$：規格下限、$\sigma$：標準偏差、$\bar{x}$：工程平均
- 必ず **Cp ≧ Cpk**（中心がずれている分、Cpk の方が小さくなる）

## 3. 判定基準

| Cp 値 | 判定 | 対応 |
|---|---|---|
| 1.67 以上 | 十分すぎる能力 | 検査の簡略化を検討 |
| 1.33〜1.67 | 十分な能力 | 工程管理を継続 |
| 1.00〜1.33 | やや不足 | 工程改善を検討 |
| 1.00 未満 | 能力不足 | 即座に改善が必要 |

**管理目標値**: 一般に **Cp ≧ 1.33** が採用される。

## 4. 前提知識（3σ 則）

工程能力指数は品質特性値が **正規分布 $N(\mu, \sigma^2)$** に従うことを前提とする。

- $\mu \pm \sigma$: 約 68.3%
- $\mu \pm 2\sigma$: 約 95.4%
- $\mu \pm 3\sigma$: 約 99.7%

→ $\pm 3\sigma$（合計 $6\sigma$）の範囲が規格内に収まれば不良率は約 0.3% に抑えられる。これが **Cp 計算式の分母 $6\sigma$ の根拠**。

## 5. 引っかけポイント（試験で狙われる）

1. **Cp と Cpk の違いを混同**: Cp は中心のずれを考慮しない。Cpk が「実質的な工程能力」。
2. **σ と 6σ の混同**: Cp の分母は **6σ（±3σ の合計幅）** であって σ ではない。
3. **工程能力改善 = ばらつき低減**: 規格幅の拡大ではなく **σ の低減** が本質。
4. **Cp ≧ Cpk が常に成り立つ**: 中心がずれていないとき Cp = Cpk。中心がずれているほど Cpk < Cp。

## 6. 過去問引用

**R02 Ⅰ-1-1**（[/docs/pe-comprehensive-management-r02-primary#1-1](https://doboku-note.com/docs/pe-comprehensive-management-r02-primary)）

QC 七つ道具と新 QC 七つ道具の使い分けが問われた問題。工程能力指数はヒストグラム・管理図で観察された工程状態を **定量化する位置** にある。

**典型的な計算問題（オリジナル）**:

> ある工程の規格は USL = 50.0、LSL = 30.0、工程平均 $\bar{x} = 40.0$、標準偏差 σ = 2.0 のとき、Cp と Cpk の値はそれぞれいくつか。

**解答**:
- Cp = (50 - 30) / (6 × 2) = 20 / 12 ≈ **1.67**
- Cpk = min((50 - 40) / (3 × 2), (40 - 30) / (3 × 2)) = min(1.67, 1.67) = **1.67**
- 中心が規格中央（40.0）に一致しているため Cp = Cpk

**中心がずれている場合**: $\bar{x} = 42.0$、σ = 2.0 のとき
- Cpk = min((50 - 42) / 6, (42 - 30) / 6) = min(1.33, 2.00) = **1.33**
- Cp は同じ 1.67 だが、Cpk は中心ずれの影響で 1.33 に低下

## 7. 関連キーワード

- [品質管理](https://doboku-note.com/docs/pe-comprehensive-management-quality-control)（QC 七つ道具・新 QC 七つ道具と一体）
- [管理限界](https://doboku-note.com/docs/pe-comprehensive-management-control-limits)（工程の安定性評価）
- [製造品質](https://doboku-note.com/docs/pe-comprehensive-management-manufacturing-quality)
- [全数検査／抜取検査](https://doboku-note.com/docs/pe-comprehensive-management-inspection-methods)
- [品質保証](https://doboku-note.com/docs/pe-comprehensive-management-quality-assurance)
- [経済性管理ピラー](https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. **定義** — 工程能力指数とは何か（140 字以内）
2. **計算式** — Cp / Cpk の式と違い（画像化推奨）
3. **判定基準** — Cp 値による工程能力の評価表
4. **引っかけ** — 試験で狙われるポイント 3 つ
5. **CTA** — 関連キーワードページへ誘導

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（工程能力指数とは）
3. Cp の計算式（画像 + 例）
4. Cpk の計算式（画像 + 例）
5. Cp と Cpk の違い（中心ずれの図解 = SVG 流用）
6. 判定基準表
7. 計算例（USL=50, LSL=30, σ=2 のケース）
8. 引っかけポイント 3 つ
9. 関連キーワード一覧
10. CTA（doboku-note へ誘導）

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「Cp と Cpk の違いは？」）
- 5-15 秒: 計算式の紹介
- 15-20 秒: 沈黙（考える時間）
- 20-30 秒: 解説（中心ずれが Cpk を下げる）
- 30-40 秒: CTA（doboku-note 誘導）

## 9. SVG 利用方針

**既存 SVG**: `normal-distribution-3sigma.svg`（正規分布 ±σ・±2σ・±3σ の包含確率）

**SNS への転用**:
- IG Carousel Slide 5「Cp と Cpk の違い」: 既存 SVG を背景にして規格上下限線を重畳。Satori テンプレで再生成
- YT Shorts 中盤（15-30 秒）: 既存 SVG を静止画スライドとして挿入し、ナレーションで解説
- 1080×1350 (4:5) と 1080×1920 (9:16) の両比率に合わせてレイアウト調整必要

**新規 SVG 候補**（後続タスク）: 中心ずれ可視化（ベル曲線が右にずれて Cpk 計算が変わる図）。05-018 の SVG ランウェイで検討。
