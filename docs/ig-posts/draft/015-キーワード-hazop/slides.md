# Instagram Carousel 用原稿 — HAZOP（1 投稿 10 スライド）

- 構成: 1 投稿 = 10 スライド（表紙 1 + 解説 8 + CTA 1）
- 解像度: 1080×1350 (4:5 portrait)
- UTM: `utm_source=instagram&utm_medium=carousel&utm_campaign=keyword-hazop`
- 元素材: [source.md](./source.md)
- 利用 SVG: `.local/r2/posts/pe-comprehensive-management/hazop/img/hazop-guidewords.svg`

---

## Carousel 01: HAZOP 完全解説

**公開予定**: 2026-07-11 土 07:00

### Slide 1: 表紙

- メイン: 「HAZOP」
- サブ: 「ガイドワードで逸脱を網羅的検討」
- 図解: タイトル + ガイドワードアイコン
- 背景: brand-fill (#e8f0fe)
- バッジ: 「総監 5.6 システム安全工学手法」(brand)

### Slide 2: HAZOP とは

- 上部ラベル: 「定義」(brand)
- メインテキスト: 「ガイドワードを用いてプロセスパラメータの逸脱を網羅的に検討し、ハザードや運転上の問題を特定する手法」
- 補足: 「英国 ICI 社が 1960 年代に化学プラント設計審査手法として開発」

### Slide 3: 7 ガイドワード（メインビジュアル）

- 上部ラベル: 「核心の図解」(positive)
- 図解: 既存 SVG `hazop-guidewords.svg` 全面表示
- 強調: 「ガイドワード × パラメータで網羅」(brand)

### Slide 4: 7 ガイドワード詳細

- 上部ラベル: 「7 種類」(brand)
- リスト:
  - No / Not — 完全否定（流れない）
  - More — 量的増加
  - Less — 量的減少
  - As Well As — 質的増加（異物混入）
  - Part Of — 質的減少（成分欠落）
  - Reverse — 逆方向
  - Other Than — 全く異なる

### Slide 5: ガイドワード × パラメータ

- 上部ラベル: 「掛け合わせの仕組み」(brand)
- メインテキスト: 「7 ガイドワード × プロセスパラメータ（流量・圧力・温度・組成等）」
- 説明:
  - 流量 × No → 流れない
  - 流量 × More → 流量過大
  - 流量 × Reverse → 逆流
- 強調: 「総当たりで逸脱シナリオを網羅」

### Slide 6: 実施手順 5 ステップ

- 上部ラベル: 「分析プロセス」(brand)
- 番号付きリスト:
  1. ノードの設定
  2. 設計意図の確認
  3. 逸脱の検討（ガイドワード適用）
  4. 原因と結果の特定
  5. 対策の検討
- 強調: 「ノードごとに繰り返し」

### Slide 7: チーム審査の原則

- 上部ラベル: 「実施体制」(brand)
- メインテキスト: 「多分野の専門家によるチーム審査が原則」
- 説明:
  - プロセスエンジニア
  - 安全担当
  - 運転員
  - 設計者
- 強調: 「個人のチェックリストでは抜け漏れる」

### Slide 8: FMEA との比較

- 上部ラベル: 「2 大手法の対比」(brand)
- 比較表:
  | 項目 | HAZOP | FMEA |
  |---|---|---|
  | 着目点 | プロセス逸脱 | 構成要素故障 |
  | 単位 | ノード | コンポーネント |
  | 適用 | 化学プラント | ハードウェア |

### Slide 9: 引っかけポイント

- 上部ラベル: 「試験で狙われる」(warn)
- 番号付きリスト:
  1. **7 ガイドワード暗記** — Reverse 抜けに注意
  2. **チーム審査が原則** — 個人ではない
  3. **FMEA との違い** — プロセス vs 構成要素
  4. **化学プラント発祥** — 1960 年代英国 ICI

### Slide 10: CTA

- メイン: 「全解説 + 関連キーワードは」
- CTA テキスト: 「doboku-note で全文を見る」
- リンク: `https://doboku-note.com/docs/pe-comprehensive-management-hazop?utm_source=instagram&utm_medium=carousel&utm_campaign=keyword-hazop`

**キャプション（投稿本文）**:
```
【総監キーワード解説】HAZOP 完全解説

化学プラント発祥の安全分析手法 HAZOP を 10 スライドで整理。

✓ 7 ガイドワード（No/More/Less/As Well As/Part Of/Reverse/Other Than）
✓ ガイドワード × プロセスパラメータの掛け合わせ
✓ 実施手順 5 ステップ
✓ FMEA との対比（プロセス vs 構成要素）

R04 Ⅰ-1-28 で正答。チーム審査が原則。
保存して試験前日に見返そう。

#技術士 #総合技術監理部門 #技術士総監 #安全管理 #HAZOP #FMEA #システム安全工学 #リスクアセスメント #ガイドワード #プロセス安全 #化学プラント #技術士試験 #技術士受験 #国家資格 #資格試験 #土木 #建設
```
