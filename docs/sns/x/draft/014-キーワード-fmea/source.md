# FMEA（fmea）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #11（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/fmea/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/fmea/img/fmea-rpn-flow.svg`
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../project/29_SNS投稿カレンダー2026Q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**FMEA**（Failure Mode and Effects Analysis：故障モード影響分析）とは、システムの構成要素ごとに想定される **故障モードとその影響** を体系的に分析する手法。

**帰納的・ボトムアップ型** の分析手法であり、構成要素レベルからシステムレベルへ影響を積み上げて評価する。設計段階での潜在的な故障の洗い出しに広く活用される。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **5.6 システム安全工学手法**。FTA とともにシステム安全工学の代表的手法。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-fmea](https://doboku-note.com/docs/pe-comprehensive-management-fmea)

## 2. 分析手順（6 ステップ）

| ステップ | 内容 |
|---|---|
| 1. 対象の分解 | システムを構成要素に分解 |
| 2. 故障モードの列挙 | 想定される故障モード（断線・腐食・固着等）を列挙 |
| 3. 影響の分析 | 各故障モードがサブシステム・全体に及ぼす影響を評価 |
| 4. 原因の特定 | 各故障モードの発生原因を特定 |
| 5. リスクの評価 | RPN（リスク優先数）を算出 |
| 6. 対策の立案 | RPN が高い順に対策を講じる |

ボトムアップ型 = 部品 → サブシステム → 全体 へ積み上げ。

## 3. リスク優先数（RPN）

$$
\text{RPN} = \text{発生頻度（O）} \times \text{影響度（S）} \times \text{検出難易度（D）}
$$

各 1〜10 の 10 段階。値が大きいほど優先対策。

## 4. FTA との比較

| 項目 | FMEA | FTA |
|---|---|---|
| 方向 | ボトムアップ（帰納的） | トップダウン（演繹的） |
| 起点 | 構成要素の故障モード | トップ事象（最終事故） |
| 用途 | 設計段階の故障洗い出し | 既知事故の原因解析 |

FMEA = 故障モードから上、FTA = 事故から下。

## 5. 引っかけポイント（試験で狙われる）

1. **ボトムアップ vs トップダウン**: 最頻出。FMEA = ボトムアップ、FTA = トップダウン。
2. **RPN の構成要素**: 発生頻度 × 影響度 × 検出難易度の 3 因子の積。
3. **HAZOP との違い**: HAZOP はプロセス逸脱、FMEA は構成要素の故障モード。
4. **設計段階での予防**: 既知事故の解析（FTA）ではなく、設計段階での潜在故障の洗い出し。
5. **VTA・ETA・THERP との混同**: 過去問 R04 Ⅰ-1-28、R02 Ⅰ-1-25 で各手法の識別が問われた。

## 6. 過去問引用

**R02 Ⅰ-1-25** では FMEA の定義として「システムの構成要素ごとに固有の故障モードを同定し、それらの故障モードが発生したときのシステムに及ぼす影響を分析する」が正答。

**R04 Ⅰ-1-28** では VTA・ETA・HAZOP・THERP と並べて各手法の定義が問われた。

## 7. 関連キーワード

- [FTA（フォールトツリー分析）](https://doboku-note.com/docs/pe-comprehensive-management-fta)
- [ETA（イベントツリー分析）](https://doboku-note.com/docs/pe-comprehensive-management-eta)
- [HAZOP](https://doboku-note.com/docs/pe-comprehensive-management-hazop)
- [根本原因分析（RCA）](https://doboku-note.com/docs/pe-comprehensive-management-root-cause-analysis)
- [THERP](https://doboku-note.com/docs/pe-comprehensive-management-therp)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. 定義 — FMEA とは（ボトムアップ）
2. 分析手順 6 ステップ
3. RPN（リスク優先数）の式
4. FTA との比較（方向・起点）
5. 引っかけ + CTA

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（FMEA とは）
3. 手順フロー（既存 SVG `fmea-rpn-flow.svg` 流用）
4. ボトムアップ型の解説
5. 6 ステップ詳細
6. RPN の算出式
7. FTA との比較表
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「FMEA はトップダウン？ボトムアップ？」）
- 5-15 秒: 6 ステップの紹介
- 15-18 秒: 沈黙
- 18-30 秒: 解説（ボトムアップ、RPN = O×S×D）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `fmea-rpn-flow.svg`（FMEA 手順フロー + RPN 算出式の図解）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示
- YT Shorts 中盤で挿入
