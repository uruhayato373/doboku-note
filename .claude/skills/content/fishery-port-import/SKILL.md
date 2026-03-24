# /fishery-port-import — 漁港設計参考図書PDF→MDX変換

## 概要

水産庁「漁港・漁場の施設の設計参考図書（2015年版）」の本編PDFをダウンロードし、MDXに変換してdoboku-noteに取り込むスキル。

## 使い方

```
/fishery-port-import          # 未変換の次のPDFを1件変換
/fishery-port-import all      # 未変換の全PDFを順次変換
/fishery-port-import 5        # 第5編を変換
/fishery-port-import status   # 変換状況を確認（下記の進捗管理セクション + 実ファイル数を表示）
```

## ソースURL

https://www.jfa.maff.go.jp/j/gyoko_gyozyo/g_thema/sekkei_kaitei.html

## 本編PDFリスト（37件）

| # | 編 | ファイル名 | URL |
|---|---|---|---|
| 0 | 表紙と目次 | 00-cover.mdx | sekkei_kaitei-99.pdf |
| 1 | 基本方針（抜粋） | 00-basic-policy.mdx | sekkei_kaitei-93.pdf |
| 2 | 技術的指針の細目 | 00-technical-guidelines.mdx | sekkei_kaitei-100.pdf |
| 3 | 第1編 総論 | 01-overview.mdx | sekkei_kaitei-95.pdf |
| 4 | 第2編 設計条件（1〜6章） | 02-design-conditions-01.mdx | sekkei_kaitei-96.pdf |
| 5 | 第2編 設計条件（7〜15章） | 02-design-conditions-02.mdx | sekkei_kaitei-66.pdf |
| 6 | 第3編 材料及び諸係数 | 03-materials.mdx | sekkei_kaitei-97.pdf |
| 7 | 第4編 基礎（1〜5章） | 04-foundation-01.mdx | sekkei_kaitei-98.pdf |
| 8 | 第4編 基礎（6章） | 04-foundation-02.mdx | sekkei_kaitei-67.pdf |
| 9 | 第5編 外郭施設（1〜2章） | 05-outer-facilities-01.mdx | sekkei_kaitei-68.pdf |
| 10 | 第5編 外郭施設（3〜12章） | 05-outer-facilities-02.mdx | sekkei_kaitei-69.pdf |
| 11 | 第6編 係留施設（1〜3章） | 06-mooring-01.mdx | sekkei_kaitei-70.pdf |
| 12 | 第6編 係留施設（4〜10章） | 06-mooring-02.mdx | sekkei_kaitei-71.pdf |
| 13 | 第7編 水域施設 | 07-water-area.mdx | sekkei_kaitei-101.pdf |
| 14 | 第8編 輸送施設 | 08-transport.mdx | sekkei_kaitei-102.pdf |
| 15 | 第9編 漁港施設用地 | 09-port-land.mdx | sekkei_kaitei-103.pdf |
| 16 | 第10編 水産種苗生産施設 | 10-seedling.mdx | sekkei_kaitei-104.pdf |
| 17 | 第11編 陸上養殖施設 | 11-land-aquaculture.mdx | sekkei_kaitei-105.pdf |
| 18 | 第12編 養殖用作業施設 | 12-aquaculture-work.mdx | sekkei_kaitei-106.pdf |
| 19 | 第13編 荷さばき所 | 13-sorting.mdx | sekkei_kaitei-107.pdf |
| 20 | 第14編 配送用作業施設 | 14-distribution.mdx | sekkei_kaitei-108.pdf |
| 21 | 第15編 水産倉庫 | 15-warehouse.mdx | sekkei_kaitei-109.pdf |
| 22 | 第16編 製氷、冷凍及び冷蔵施設 | 16-ice-cold.mdx | sekkei_kaitei-110.pdf |
| 23 | 第17編 加工場 | 17-processing.mdx | sekkei_kaitei-111.pdf |
| 24 | 第18編 仲卸施設 | 18-wholesale.mdx | sekkei_kaitei-112.pdf |
| 25 | 第19編 直売所 | 19-direct-sales.mdx | sekkei_kaitei-113.pdf |
| 26 | 第20編 発電施設 | 20-power-generation.mdx | sekkei_kaitei-114.pdf |
| 27 | 第21編 漁港浄化施設 | 21-purification.mdx | sekkei_kaitei-115.pdf |
| 28 | 第22編 漁港環境整備施設 | 22-environment.mdx | sekkei_kaitei-116.pdf |
| 29 | 第23編 防風施設 | 23-windbreak.mdx | sekkei_kaitei-117.pdf |
| 30 | 第24編 漁業集落環境整備施設（1〜3章） | 24-settlement-01.mdx | sekkei_kaitei-118.pdf |
| 31 | 第24編 漁業集落環境整備施設（4章） | 24-settlement-02.mdx | sekkei_kaitei-119.pdf |
| 32 | 第25編 魚礁 | 25-fish-reef.mdx | sekkei_kaitei-120.pdf |
| 33 | 第26編 増殖礁 | 26-propagation-reef.mdx | sekkei_kaitei-121.pdf |
| 34 | 第27編 養殖礁 | 27-aquaculture-reef.mdx | sekkei_kaitei-122.pdf |
| 35 | 第28編 増殖及び養殖を推進するための施設 | 28-promotion.mdx | sekkei_kaitei-123.pdf |
| 36 | 第29編 漁港環境保全施設 | 29-conservation.mdx | sekkei_kaitei-124.pdf |

## PDF URL ベース

```
https://www.jfa.maff.go.jp/j/gyoko_gyozyo/g_thema/attach/pdf/
```

## 変換手順

各PDFに対して以下を実行：

### Step 1: PDFダウンロード

```bash
mkdir -p _sources/fishery-port
curl -o _sources/fishery-port/{filename}.pdf "{base_url}{filename}.pdf"
```

### Step 2: 図を含むページの特定とスクリーンショット

PDFを Read ツールで読み取り、図（図表・構造図・断面図・フロー図など）を含むページを特定する。

**コンテキスト節約のため、図の抽出はサブエージェント（Agent tool）に委任する。**

メインコンテキストでは：
1. PDFを読んで図のリスト（ページ番号・図番号・内容の説明）を作成
2. 図リストを **3〜6枚ずつのグループに分割** し、グループごとにサブエージェントを起動
3. サブエージェントが画像の変換・目視確認・トリミング・保存を完結させる
4. メインには結果（保存先パス一覧）のみが返る

#### サブエージェント運用ガイド

| 項目 | 推奨値 | 理由 |
|---|---|---|
| 1エージェントあたりの図数 | **3〜6枚** | 多すぎるとコンテキスト圧迫・エラー時の損失大 |
| 解像度 | **150 dpi** | 200dpiだとA4→1240×1754pxで安全。200dpiだと1654×2339pxで複数画像閲覧時に2000px制限に抵触 |
| /tmp名 | グループ番号を付与 | `/tmp/fp{編番号}g{グループ番号}-` で衝突回避 |
| 並列実行 | 全グループ同時起動 | Agent tool を1メッセージに複数含めて並列化 |
| mode | `bypassPermissions` | サブエージェントの権限確認を省略して高速化 |

サブエージェントへのプロンプトには以下を含めること：
- PDFファイルパス
- 抽出対象の図リスト（ページ番号、図番号、おおまかな内容）
- 出力先ディレクトリ（content/port/fishery-port/img/）
- 命名規則（{編番号}-fig-{連番}.png）
- 解像度は **150 dpi** を指定（200dpiは使わない）
- /tmp 名にグループ番号を含めること
- トリミング手順（下記参照）
- public/content/ への複製指示

**図の抽出方法（pdftoppm使用）：**

```bash
# imgディレクトリ作成
mkdir -p content/port/fishery-port/img

# 図を含むページをPNGに変換（ページ番号は1始まり）
# -f: 開始ページ, -l: 終了ページ, -r: 解像度(dpi), -png: PNG形式
# ★ サブエージェントでは必ず 150dpi を使用（200dpiだと画像確認時にエラー）
pdftoppm -png -r 150 -f {ページ番号} -l {ページ番号} \
  _sources/fishery-port/{filename}.pdf \
  /tmp/fp{編番号}g{グループ番号}

# 例: 第1編のp.5を図として抽出（グループ1）
pdftoppm -png -r 150 -f 5 -l 5 \
  _sources/fishery-port/sekkei_kaitei-95.pdf \
  /tmp/fp01g1
# → /tmp/fp01g1-05.png が生成される
```

**図が部分的な場合（ページの一部だけが図）：**

必ず以下の手順で行う。座標を推測でトリミングしない。

```bash
# 1. まず全ページをPNGに変換（150dpi）
pdftoppm -png -r 150 -f {ページ} -l {ページ} \
  _sources/fishery-port/{filename}.pdf /tmp/fp{編番号}g{グループ番号}

# 2. Read ツールでPNG画像を目視確認し、図の範囲を特定
#    → 画像の縦横サイズ(magick identify)と図の位置を確認

# 3. 確認した座標でトリミング
magick /tmp/fp{編番号}g{グループ番号}-{ページ}.png \
  -crop {幅}x{高さ}+{x}+{y} +repage /tmp/fp{編番号}g{グループ番号}-crop.png

# 4. 再度 Read ツールで切り出し結果を目視確認
#    → テキストが混入していないか、図が切れていないか確認
#    → 問題があれば座標を調整して再トリミング

# 5. 確認OKなら正式保存（content/ と public/content/ の両方）
cp /tmp/fp{編番号}g{グループ番号}-crop.png content/port/fishery-port/img/{出力名}.png
mkdir -p public/content/port/fishery-port/img/
cp /tmp/fp{編番号}g{グループ番号}-crop.png public/content/port/fishery-port/img/{出力名}.png
```

**図の命名規則：**
- `{編番号}-fig-{連番}.png` 例: `01-fig-01.png`, `02-fig-03.png`
- 表のキャプション画像: `{編番号}-tbl-{連番}.png`

### Step 3: テキスト抽出・MDX変換

**コンテキスト節約のため、MDX変換もサブエージェント（Agent tool）に委任する。**

メインコンテキストでは：
1. PDFを読んで全体構造を把握（章立て・ページ範囲・図の参照箇所）
2. 変換計画を作成（どのページ範囲 → どのMDXファイル）
3. Agent toolでサブエージェントを起動し、以下を渡す：
   - PDFファイルパス + 対象ページ範囲
   - 出力MDXファイルパス
   - Step 2で抽出済みの図ファイル一覧（パスと図番号の対応）
   - 下記の変換ルール（表・数式・見出し・図埋め込みルール）
   - frontmatter の内容
4. サブエージェントがPDF読み取り → MDX生成 → ファイル書き出しを完結させる
5. メインには結果（成功/失敗、生成行数、注意点）のみが返る

**複数章がある場合は並列でサブエージェントを起動する。**

サブエージェントへのプロンプトには以下の変換ルールを含めること：

#### 表の変換ルール
- **必ずMarkdownテーブル記法に変換する**
- 複雑な結合セルがある場合は `<table>` HTMLタグを使用
- 表タイトルは `<p className="table-title">表-X.X タイトル</p>` で記述
- 表を `<div className="table-wrapper">` で囲む

```mdx
<p className="table-title">表-1.1 漁港の種類</p>

<div className="table-wrapper">

| 種類 | 定義 | 利用範囲 |
|------|------|----------|
| 第1種漁港 | その利用範囲が地元の漁業を主とするもの | 地元 |
| 第2種漁港 | その利用範囲が第1種漁港よりも広く... | 広域 |

</div>
```

#### 図の埋め込みルール
- **図はStep 2で抽出したPNGスクリーンショットを埋め込む**
- テキストで再現できる図（簡単なフロー図等）以外は全て画像として埋め込む
- **PNG画像にはキャプション（図番号・タイトル）を含めない** — 図の枠・内容のみにする
- **キャプションはMDX側のみに記述する**（重複禁止）
- **余白を最小限にトリミングする**

```mdx
<img src="./img/01-fig-01.png" width="600" className="center-image" />
<p className="text-center">図 1-1-1 漁港施設の分類</p>
```

#### 数式の変換ルール
- ブロック数式: `<div className="scroll-equation">` + `$$...$$`
- インライン数式: `$...$`
- 数式番号がある場合: `\tag{番号}`

#### 見出し
- 編タイトル → `# 見出し`（h1、ページタイトル）
- 章 → `## 見出し`（h2）
- 節 → `### 見出し`（h3）
- 項 → `#### 見出し`（h4）

### Step 4: frontmatter付与

```yaml
---
title: "{編タイトル}"
description: "漁港・漁場の施設の設計参考図書（2015年版）{編タイトル}"
sidebar_label: "{短縮ラベル}"
---
```

### Step 5: 品質チェック

1. **図の確認**: 全ての図が PNG として抽出され、MDX から正しく参照されているか
2. **表の確認**: Markdown テーブルとして正しく構造化されているか
3. **数式の確認**: KaTeX 記法が正しいか
4. **構文チェック**: `/check-mdx` で MDX 構文エラーがないか
5. **残骸除去**: `/clean-pdf-artifacts` でPDF変換残骸を除去

## 変換の判断基準

### テキストとして変換するもの
- 本文テキスト
- 箇条書き
- 表（→ Markdownテーブル）
- 数式（→ KaTeX）

### PNGスクリーンショットにするもの
- 構造図・断面図・配置図
- グラフ・チャート
- 写真
- 複雑な図表（Markdownテーブルでは再現困難なもの）
- フローチャート（Mermaidで再現困難なもの）

### 判断に迷う場合
- Markdownで正確に再現できるか？ → Yes: テキスト変換 / No: PNG
- 原則: **情報の正確性を最優先**。無理にテキスト化して情報が欠落するよりPNGの方が良い

## 進捗管理

変換済みファイルの有無で進捗を判断する:

```bash
# 変換済みファイル数
ls content/port/fishery-port/*.mdx 2>/dev/null | wc -l
# 抽出済み画像数
ls content/port/fishery-port/img/*.png 2>/dev/null | wc -l
```

### 変換・QA検証状況（2026-03-24時点）

全37 PDF → 47 MDXファイル変換済み。全ファイルQA検証完了。

| 編 | PDF | MDXファイル | QA結果 | 主な修正 |
|---|---|---|---|---|
| 第1編 総論 | -95 | `01-overview.mdx` | 100% | — |
| 第2編 Ch1-6 | -96 | `02-ch01`〜`02-ch06` (7files) | 95→99% | Ch4,5ほぼ再変換、数式+39、表+3 |
| 第2編 Ch7-15 | -66 | `02-ch07`〜`02-ch15` (9files) | 15→99% | Ch9-12ほぼ再変換、数式+76、表+14 |
| 第3編 材料 | -97 | `03-materials.mdx` | 95→99% | 参考文献4セクション追加 |
| 第4編 基礎前半 | -98 | `04-foundation-01.mdx` | 60→99% | Ch4-5(沈下・斜面)まるごと追加、安全率値修正 |
| 第4編 基礎後半 | -67 | `04-foundation-02.mdx` | 97→100% | 参考文献43件追加 |
| 第5編 外郭前半 | -68 | `05-outer-facilities-01.mdx` | 67→95% | 2.3.4〜2.5(+908行)追加 |
| 第5編 外郭後半 | -69 | `05-outer-facilities-02.mdx` | 99% | フォーマット修正4件 |
| 第6編 係留前半 | -70 | `06-mooring-01.mdx` | 98% | 3.5.15欠落サブセクション追加 |
| 第6編 係留後半 | -71 | `06-mooring-02.mdx` | 98% | キャプション/数式フォーマット統一 |
| 第7編 水域 | -101 | `07-water-area.mdx` | 100% | — |
| 第8編 輸送 | -102 | `08-transport.mdx` | 100% | — |
| 第9編 用地 | -103 | `09-port-land.mdx` | 100% | — |
| 第10編 種苗 | -104 | `10-seedling.mdx` | 100% | — |
| 第11編 養殖 | -105 | `11-land-aquaculture.mdx` | 100% | — |
| 第12編 養殖作業 | -106 | `12-aquaculture-work.mdx` | 100% | — |
| 第13編 荷さばき | -107 | `13-sorting.mdx` | 100% | — |
| 第14編 配送 | -108 | `14-distribution.mdx` | 99→100% | 茸→葺き誤字修正 |
| 第15編 倉庫 | -109 | `15-warehouse.mdx` | 98→99% | 茸→葺き誤字修正 |
| 第16編 製氷冷凍 | -110 | `16-ice-cold.mdx` | 97→99% | 茸→葺き、所要→所定 |
| 第17編 加工場 | -111 | `17-processing.mdx` | 98→99% | 茸→葺き、等の脱字 |
| 第18編 仲卸 | -112 | `18-wholesale.mdx` | 100% | — |
| 第19編 直売所 | -113 | `19-direct-sales.mdx` | 100% | — |
| 第20編 発電 | -114 | `20-power-generation.mdx` | 100% | — |
| 第21編 浄化 | -115 | `21-purification.mdx` | 100% | — |
| 第22編 環境整備 | -116 | `22-environment.mdx` | 99→100% | 漁業→漁港、災害対策整備→基本、11x→1lx |
| 第23編 防風 | -117 | `23-windbreak.mdx` | 99→100% | が→か助詞修正 |
| 第24編 集落前半 | -118 | `24-settlement-01.mdx` | 95→97% | caption→text-center、参考文献フォーマット |
| 第24編 集落後半 | -119 | `24-settlement-02.mdx` | 96→98% | 参考文献フォーマット |
| 第25編 魚礁 | -120 | `25-fish-reef.mdx` | 95→100% | 式タグに「式 」prefix追加(51件) |
| 第26編 増殖礁 | -121 | `26-propagation-reef.mdx` | 100% | — |
| 第27編 養殖礁 | -122 | `27-aquaculture-reef.mdx` | 97→99% | 参考文献フォーマット、誤字 |
| 第28編 推進施設 | -123 | `28-promotion.mdx` | 100% | — |
| 第29編 環境保全 | -124 | `29-conservation.mdx` | 98→99% | 法律名修正 |

**未抽出の図**: 図 2-4-4(2), 2-4-8, 2-4-11, 2-5-12~14, 2-12-8（PDFからの画像抽出が必要）

### ダウンロード時の注意

PDFダウンロードにはUser-AgentとRefererヘッダーが必要：

```bash
curl -s -L -o _sources/fishery-port/{filename}.pdf \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Referer: https://www.jfa.maff.go.jp/j/gyoko_gyozyo/g_thema/sekkei_kaitei.html" \
  "https://www.jfa.maff.go.jp/j/gyoko_gyozyo/g_thema/attach/pdf/{filename}.pdf"
```

## サイドバー登録

`src/lib/sidebar.ts` の `portSidebar` に追加済み。新しいファイルは items 配列に追記する。
```

## 注意事項

- PDFのページ数が多い場合（100ページ超）は章単位で分割する
- 図表が多い編はOCR精度に注意し、`/verify-content` で原本と照合する
- 数式を含む設計条件・基礎編は特にKaTeX変換の確認が必要
- `_sources/fishery-port/` はgitignore対象なのでPDFはリポジトリに含まれない
