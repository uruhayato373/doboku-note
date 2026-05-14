# HAZOP（hazop）— SNS 元素材

- 作成: 2026-04-30
- 種別: キーワード解説ライン #12（Tier 1 SVG 15 本連動）
- 元ネタ: `.local/r2/posts/pe-comprehensive-management/hazop/article.mdx`
- 関連 SVG: `.local/r2/posts/pe-comprehensive-management/hazop/img/hazop-guidewords.svg`
- 親計画: [29_SNS投稿カレンダー2026Q2.md](../../../../project/sns/calendar-2026q2.md)

## 派生媒体

- [X 用原稿（5 ツイート）](./x.md)
- [Instagram Carousel 用原稿（1 投稿 10 スライド）](./instagram-carousel.md)
- [YouTube Shorts スクリプト（1 本・40 秒）](./youtube-shorts/)

---

## 1. キーワードの核心

**HAZOP**（Hazard and Operability Study：危険・運転性検討）とは、**ガイドワード** を用いてプロセスパラメータの逸脱を網羅的に検討し、ハザードや運転上の問題を特定する手法。

1960 年代に英国 ICI 社が化学プラントの設計審査手法として開発。多分野の専門家による **チーム審査** で実施するのが原則。

**位置づけ**: 技術士総合技術監理キーワード集 2026 の **5.6 システム安全工学手法**。FMEA と並ぶ代表的ハザード分析手法。

**関連キーワードページ**: [https://doboku-note.com/docs/pe-comprehensive-management-hazop](https://doboku-note.com/docs/pe-comprehensive-management-hazop)

## 2. 7 ガイドワード

| ガイドワード | 意味 | 逸脱の例（流量） |
|---|---|---|
| No / Not | 完全な否定 | 流れない |
| More | 量的増加 | 流量が多すぎる |
| Less | 量的減少 | 流量が少なすぎる |
| As Well As | 質的増加（異物混入） | 想定外の物質混入 |
| Part Of | 質的減少（成分欠落） | 一部成分が欠落 |
| Reverse | 逆方向 | 逆流する |
| Other Than | 全く異なる | 別の物質が流れる |

ガイドワード × プロセスパラメータ（流量・圧力・温度・組成等）で網羅。

## 3. 実施手順

| ステップ | 内容 |
|---|---|
| 1. ノードの設定 | プロセスを分析単位に分割 |
| 2. 設計意図の確認 | 正常な運転条件を明確化 |
| 3. 逸脱の検討 | ガイドワードを適用して逸脱導出 |
| 4. 原因と結果の特定 | 原因と影響を評価 |
| 5. 対策の検討 | 既存対策の妥当性評価＋追加対策 |

各ノードで総当たり的に評価。

## 4. FMEA との比較

| 項目 | HAZOP | FMEA |
|---|---|---|
| 着目点 | プロセスパラメータの逸脱 | 構成要素の故障モード |
| 単位 | ノード（プロセス区間） | コンポーネント |
| 適用 | 化学プラント・連続プロセス | ハードウェアの信頼性設計 |
| 主体 | チーム審査が原則 | チーム or 個人 |

HAZOP = プロセス、FMEA = 部品。

## 5. 引っかけポイント（試験で狙われる）

1. **7 ガイドワードの暗記**: No/More/Less/As Well As/Part Of/Reverse/Other Than。「Reverse」が選択肢から抜かれることが多い。
2. **チーム審査が原則**: 個人のチェックリストとは異なる。多分野の専門家による集団検討。
3. **FMEA との違い**: HAZOP = プロセス逸脱、FMEA = 構成要素故障モード。
4. **化学プラント発祥**: 英国 ICI 社、1960 年代。土木よりプロセス産業由来。
5. **PHA との違い**: PHA は概略的、HAZOP は詳細プロセス分析。

## 6. 過去問引用

**R04 Ⅰ-1-28** で「なし／多い／少ない／逆に／他の」等のガイドワードで設計意図からの逸脱を同定する手法として HAZOP が正答。

## 7. 関連キーワード

- [FMEA](https://doboku-note.com/docs/pe-comprehensive-management-fmea)
- [FTA（フォールトツリー分析）](https://doboku-note.com/docs/pe-comprehensive-management-fta)
- [ETA（イベントツリー分析）](https://doboku-note.com/docs/pe-comprehensive-management-eta)
- [PHA（予備危険分析）](https://doboku-note.com/docs/pe-comprehensive-management-pha)
- [リスクアセスメント](https://doboku-note.com/docs/pe-comprehensive-management-risk-assessment)

## 8. 派生展開のヒント

### X（5 ツイート構成）

1. 定義 — HAZOP とは
2. 7 ガイドワード一覧
3. 実施手順 5 ステップ
4. FMEA との比較
5. 引っかけ + CTA

### Instagram Carousel（10 スライド）

1. 表紙
2. 定義（HAZOP とは）
3. 7 ガイドワード（既存 SVG `hazop-guidewords.svg` 流用）
4. ガイドワード × パラメータの掛け合わせ
5. 実施手順 5 ステップ
6. チーム審査の重要性
7. FMEA との比較
8. 引っかけポイント
9. 関連キーワード
10. CTA

### YouTube Shorts（1 本・40 秒）

- 0-5 秒: 問題提起（「HAZOP のガイドワードは何種類？」）
- 5-15 秒: ガイドワードの紹介
- 15-18 秒: 沈黙
- 18-30 秒: 解説（7 種類、化学プラント発祥）
- 30-40 秒: CTA

## 9. SVG 利用方針

**既存 SVG**: `hazop-guidewords.svg`（7 ガイドワード一覧と分析フロー図）

**SNS への転用**:
- IG Carousel Slide 3 で全面表示
- YT Shorts 中盤で挿入
