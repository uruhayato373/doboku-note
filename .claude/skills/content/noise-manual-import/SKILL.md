---
name: noise-manual-import
description: >
  騒音評価マニュアルPDFをMDX変換する。Use when user asks to [騒音マニュアル, /noise-manual-import].
---

# /noise-manual-import — 騒音に係る環境基準の評価マニュアル PDF→MDX変換

## 概要

環境省「騒音に係る環境基準の評価マニュアル」（一般地域編・道路に面する地域編）のPDFをダウンロードし、MDXに変換してdoboku-noteに取り込むスキル。

## 使い方

```
/noise-manual-import               # 変換状況を確認し、未変換の次のセクションを1件変換
/noise-manual-import general       # 一般地域編を変換
/noise-manual-import road          # 道路に面する地域編を変換
/noise-manual-import status        # 変換状況を確認
/noise-manual-import verify        # 既存MDXをPDFと照合（/verify-content相当）
```

## ソース情報

- **ソースページ**: https://www.env.go.jp/air/noise/manual/index.html
- **発行**: 環境省（平成27年10月）

### PDFリスト

| 文書 | ファイル名 | URL | サイズ |
|---|---|---|---|
| 一般地域編 | 900400599.pdf | https://www.env.go.jp/content/900400599.pdf | 744KB |
| 道路に面する地域編 | 900400600.pdf | https://www.env.go.jp/content/900400600.pdf | 2,827KB |

## 出力先

```
content/environment/noise-evaluation/
├── general/                  # 一般地域編
│   ├── img/                  # 図（スクリーンショット）
│   └── *.mdx
└── road/                     # 道路に面する地域編
    ├── img/                  # 図（スクリーンショット）
    └── *.mdx
```

## 文書の特徴と変換上の注意

### 一般地域編（744KB — 比較的短い）

- 章立て: はじめに → 評価の手順 → 騒音の把握方法 → 評価方法
- 図は少なめ（評価フロー図、地域分類の概念図程度）
- 表が多い（基準値一覧、地域類型、測定条件等）
- 数式はほぼなし

### 道路に面する地域編（2,827KB — ボリューム大）

- 章立て: はじめに → 評価方法 → 騒音等の測定方法 → 参考資料
- **図が多い**（測定配置図、断面図、フローチャート、グラフ等）
- 表が多い（基準値、車種区分、測定結果整理様式等）
- 参考資料として告示・答申の全文を含む（テキスト変換）
- 数式は等価騒音レベルの算出式程度

### 共通の注意点

- 下付き文字が多用される: L<sub>Aeq,T</sub>、L<sub>A5</sub> 等 → MDXでは `<sub>` タグを使用
- 「解説」ブロックが頻出 → `> **解説**` の blockquote 形式で変換
- 環境基準の基準値（dB）は正確に転記すること
- 告示・答申の条文番号は欠落させないこと

## 変換手順

### Step 1: PDFダウンロード

```bash
mkdir -p _sources/environment/noise-evaluation
curl -s -L -o _sources/environment/noise-evaluation/general.pdf \
  "https://www.env.go.jp/content/900400599.pdf"
curl -s -L -o _sources/environment/noise-evaluation/road.pdf \
  "https://www.env.go.jp/content/900400600.pdf"
```

### Step 2: PDF構造の把握・図を含むページの特定

> **注意**: プラットフォームにより利用可能なツールが異なる。Step 2〜3 は macOS / Windows で手順が分岐する。

#### macOS の場合（pdftoppm + magick）

Read ツールでPDFを直接読み取り、目次・章立て・図のページを確認する。

```
- 全体のページ数を確認
- 目次から章・節構成を把握
- 図を含むページを特定（図番号、「図X-X」の記載を探す）
- 表を含むページを特定（「表X-X」の記載を探す）
```

#### Windows の場合（PyMuPDF + Pillow）

Read ツールのPDF読み取りは内部で pdftoppm を使うため、Windows では失敗する。代わりに PyMuPDF (fitz) を使う。

```python
import fitz

doc = fitz.open('_sources/environment/noise-evaluation/road.pdf')
print(f'Total pages: {len(doc)}')

# 図を含むページを特定（「図」を含む行を検索）
for i, page in enumerate(doc):
    text = page.get_text()
    if '図' in text:
        lines = [l.strip() for l in text.split('\n') if '図' in l and l.strip()]
        for l in lines[:3]:
            print(f'  p{i+1}: {l[:80]}')
```

> **注意**: PyMuPDF のテキスト抽出は日本語が文字化けすることがある。その場合は、ページをPNG画像化して Read ツールで目視確認する。

### Step 3: 図の抽出とトリミング

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
| 解像度 | **150 dpi** | 200dpiだとA4が2339px→複数画像閲覧時に2000px制限に抵触 |
| /tmp名 | グループ番号を付与 | `/tmp/ne{章番号}g{グループ番号}-` で衝突回避 |
| 並列実行 | 全グループ同時起動 | Agent tool を1メッセージに複数含めて並列化 |
| mode | `bypassPermissions` | サブエージェントの権限確認を省略して高速化 |

サブエージェントへのプロンプトには以下を含めること：
- PDFファイルパス
- 抽出対象の図リスト（ページ番号、図番号、おおまかな内容）
- 出力先ディレクトリ
- 命名規則（下記参照）
- 解像度は **150 dpi** を指定（200dpiは使わない）
- /tmp 名にグループ番号を含めること
- トリミング手順（下記参照）

#### macOS の場合（pdftoppm + magick）

```bash
# imgディレクトリ作成
mkdir -p content/environment/noise-evaluation/general/img
mkdir -p content/environment/noise-evaluation/road/img

# 図を含むページをPNGに変換（ページ番号は1始まり）
# ★ サブエージェントでは必ず 150dpi を使用
pdftoppm -png -r 150 -f {ページ番号} -l {ページ番号} \
  _sources/environment/noise-evaluation/{general|road}.pdf /tmp/ne{章番号}g{グループ番号}

# Read ツールでPNG画像を目視確認し、図の範囲を特定

# 確認した座標でトリミング
magick /tmp/noise-tmp-{ページ}.png -crop {幅}x{高さ}+{x}+{y} +repage \
  /tmp/fig-test.png

# 再度 Read ツールで切り出し結果を目視確認
# → 問題があれば座標を調整して再トリミング

# 確認OKなら正式保存
cp /tmp/fig-test.png content/environment/noise-evaluation/{general|road}/img/{出力名}.png
```

#### Windows の場合（PyMuPDF + Pillow）

```python
import fitz
from PIL import Image
import os

os.makedirs('content/environment/noise-evaluation/road/img', exist_ok=True)

doc = fitz.open('_sources/environment/noise-evaluation/road.pdf')

# 1. 図を含むページをPNG化
fig_pages = [11, 15, 18, 28, 30, 33, 34, 38, 42, 43, 44]
for p in fig_pages:
    page = doc[p - 1]  # 0-indexed
    pix = page.get_pixmap(dpi=200)
    pix.save(f'/tmp/road-p{p:02d}.png')

# 2. Read ツールで /tmp/road-pXX.png を目視確認し、図の座標を特定

# 3. Pillow でトリミング（座標は目視で特定した値）
img = Image.open('/tmp/road-p11.png')
fig = img.crop((left, top, right, bottom))
fig.save('/tmp/fig-test.png')

# 4. Read ツールでトリミング結果を目視確認
#    → テキスト混入・図の切れがあれば座標を調整して再実行
#    → 1回で決まることは稀。2〜3回の反復調整を想定する

# 5. 確認OKなら正式保存
fig.save('content/environment/noise-evaluation/road/img/fig-01-01.png')
```

#### 共通の注意事項

- **トリミングは反復作業** — 1回で正確な座標が決まることは稀。必ず Read ツールで結果を確認し、2〜3回調整する
- **キャプション（図番号・タイトル）はPNG画像に含めない** — MDX側のみに記述
- **図の注釈テキスト（告示の～、(注)～等）は図の一部として含める**

**図の命名規則：**
- `fig-{章番号}-{連番}.png` 例: `fig-02-01.png`（第2章の図1）
- 表のキャプション画像（複雑な表で画像化する場合）: `tbl-{章番号}-{連番}.png`

### Step 4: テキスト抽出・MDX変換

**コンテキスト節約のため、MDX変換もサブエージェント（Agent tool）に委任する。**

メインコンテキストでは：
1. PDFを読んで全体構造を把握（章立て・ページ範囲・図の参照箇所）
2. 変換計画を作成（どのページ範囲 → どのMDXファイル）
3. Agent toolでサブエージェントを起動し、以下を渡す：
   - PDFファイルパス + 対象ページ範囲
   - 出力MDXファイルパス
   - Step 3で抽出済みの図ファイル一覧（パスと図番号の対応）
   - 下記の変換ルール（表・数式・見出し・図埋め込みルール）
   - frontmatter の内容
4. サブエージェントがPDF読み取り → MDX生成 → ファイル書き出しを完結させる
5. メインには結果（成功/失敗、生成行数、注意点）のみが返る

**複数章がある場合は並列でサブエージェントを起動する。**

サブエージェントへのプロンプトには以下の変換ルールを含めること：

Read ツールでPDFを20ページずつ読み取り、MDXに変換する。

#### 見出し
- 章（「1. はじめに」等） → `## 見出し`（h2）
- 節（「1.1 目的」等） → `### 見出し`（h3）
- 項（「(1) 〇〇」等） → `#### 見出し`（h4）

#### 「解説」ブロック
本マニュアル特有のパターン。本文の後に「解説」が続く形式。

```mdx
本文テキスト（規定・要件）。

> **解説**
>
> 解説の内容をblockquoteで記述する。
> 段落間は `>` の空行で区切る。
```

#### 下付き文字
騒音レベルの記号に多用される。

```mdx
等価騒音レベル（L<sub>Aeq,T</sub>）
時間率騒音レベル（L<sub>A5</sub>、L<sub>A50</sub>、L<sub>A95</sub>）
```

#### 表
- Markdownテーブル記法に変換
- 表タイトルは `**表X-X タイトル**` の太字で記述

```mdx
**表3-1 建物による反射音補正値**

| 測定地点と建物の外壁面との位置関係 | 当該建物による反射音補正値 |
|---|---|
| 測定地点が建物の外壁面の直前1～2mの位置にある場合 | -2dB |
```

#### 図の埋め込み
- Step 3で抽出したPNGスクリーンショットを埋め込む
- **PNG画像にはキャプション（図番号・タイトル）を含めない** — 図の枠・内容のみ
- **キャプションはMDX側のみに記述する**（重複禁止）
- **Markdown画像記法を使用する**（`<img>` タグは Next.js で相対パスが解決されないため使わない）

```mdx
![図 2-1 評価の手順](./img/fig-02-01.png)
```

#### 数式
等価騒音レベルの算出式等。

```mdx
<div className="scroll-equation">

$$
L_{Aeq,T} = 10 \log_{10} \left[ \frac{1}{T} \int_0^T 10^{L_A(t)/10} dt \right] \text{ (dB)}
$$

</div>
```

### Step 5: frontmatter付与

```yaml
---
title: "騒音に係る環境基準の評価マニュアル（{一般地域編|道路に面する地域編}）{章タイトル}"
description: "{章の要約、120文字以内}"
source:
  - title: "騒音に係る環境基準の評価マニュアル（一般地域編）"
    author: "環境省"
    date: "平成27年10月"
    url: "https://www.env.go.jp/air/noise/manual/index.html"
  - title: "騒音に係る環境基準の評価マニュアル（道路に面する地域編）"
    author: "環境省"
    date: "平成27年10月"
    url: "https://www.env.go.jp/air/noise/manual/index.html"
---
```

### Step 6: サイドバー更新

`src/lib/sidebar.ts` の `environmentSidebar` にドキュメントIDを追加する。

```typescript
export const environmentSidebar: SidebarItem[] = [
  'environment/noise-evaluation/general/01',  // 一般地域編（単体リンク）
  {
    type: 'category',
    label: '騒音に係る環境基準の評価マニュアル（道路に面する地域編）',
    link: {
      type: 'doc',
      id: 'environment/noise-evaluation/road/intro',
    },
    items: [
      'environment/noise-evaluation/road/intro',
      'environment/noise-evaluation/road/evaluation',
      'environment/noise-evaluation/road/measurement',
    ],
  },
];
```

### Step 7: 品質チェック

1. **図の確認**: 全ての図がPNGとして抽出され、MDXから正しく参照されているか
2. **表の確認**: Markdownテーブルとして正しく構造化されているか
3. **下付き文字**: `<sub>` タグが正しく閉じているか
4. **基準値の確認**: dB値が原典と一致しているか（環境基準値は法的根拠があるため誤差厳禁）
5. **構文チェック**: `/check-mdx` でMDX構文エラーがないか
6. **残骸除去**: `/clean-pdf-artifacts` でPDF変換残骸を除去

## ファイル分割の方針

### 一般地域編（短い → 1ファイル）
- `general/01.mdx` — 全章を1ファイルに収録

### 道路に面する地域編（長い → 章ごとに分割）
- `road/intro.mdx` — 1. はじめに（用語定義、対象騒音、評価区間）
- `road/evaluation.mdx` — 2. 評価方法（面的評価の手順）
- `road/measurement.mdx` — 3. 騒音等の測定方法（測定機器、配置、交通条件）
- 参考資料は `measurement.mdx` の末尾に含める（分量に応じて別ファイルも検討）

## 変換の判断基準

### テキストとして変換するもの
- 本文テキスト・解説
- 箇条書き
- 表（基準値一覧、車種区分等）→ Markdownテーブル
- 数式（等価騒音レベル等）→ KaTeX
- 告示・答申の条文 → blockquote

### PNGスクリーンショットにするもの
- 測定配置図（マイクロホン位置、道路断面等）
- 評価手順のフローチャート
- グラフ（騒音レベル変動図等）
- 地域区分の概念図
- 測定結果整理様式（表3-5、表3-6 — 複雑な罫線を含む帳票）

### 判断基準
- Markdownで正確に再現できるか？ → Yes: テキスト変換 / No: PNG
- **情報の正確性を最優先**。無理にテキスト化して情報が欠落するよりPNGの方が良い

## 進捗管理

```bash
# 変換済みファイル数
ls content/environment/noise-evaluation/**/*.mdx 2>/dev/null | wc -l
# 抽出済み画像数
ls content/environment/noise-evaluation/**/img/*.png 2>/dev/null | wc -l
```

### 変換済み（2026-03-18更新）

| ファイル | 内容 | 図 | ソースPDF |
|---|---|---|---|
| `general/01.mdx` | 一般地域編（全章） | 2枚（fig-1-1, fig-3-1） | `_sources/.../general.pdf` |
| `road/intro.mdx` | 道路に面する地域編 1. はじめに | 4枚（fig-01-01〜04） | `_sources/.../road.pdf` |
| `road/evaluation.mdx` | 道路に面する地域編 2. 評価方法 | 4枚（fig-02-01〜04） | 同上 |
| `road/measurement.mdx` | 道路に面する地域編 3. 測定方法 + 参考資料 | 4枚（fig-03-01〜04） | 同上 |

### 道路に面する地域編 — 全図一覧とPDFページ対応

| 図番号 | PDFページ | 内容 | 画像ファイル | 対応MDX |
|---|---|---|---|---|
| 図1-1 | p.11 | 評価範囲等の概念図 | `fig-01-01.png` | `intro.mdx` |
| 図1-2 | p.11 | 幹線交通の評価範囲概念図 | `fig-01-02.png` | `intro.mdx` |
| 図1-3 | p.15 | 改正検則の経過措置 | `fig-01-03.png` | `intro.mdx` |
| 図1-4 | p.18 | 評価区間及び評価範囲の概念図 | `fig-01-04.png` | `intro.mdx` |
| 図2-1 | p.28 | 複数評価区間の建物概念図 | `fig-02-01.png` | `evaluation.mdx` |
| 図2-2 | p.30 | 騒音発生強度の把握方法選定フロー | `fig-02-02.png` | `evaluation.mdx` |
| 図2-3 | p.33 | 道路に面する地域の評価の流れ | `fig-02-03.png` | `evaluation.mdx` |
| 図2-4 | p.34 | 幹線交通の評価の流れ | `fig-02-04.png` | `evaluation.mdx` |
| 図3-1 | p.38 | 観測時間と実測時間の関係 | `fig-03-01.png` | `measurement.mdx` |
| 図3-2 | p.42 | 反射を避ける測定点配置例 | `fig-03-02.png` | `measurement.mdx` |
| 図3-3 | p.43 | 反射音除外の事例 | `fig-03-03.png` | `measurement.mdx` |
| 図3-4 | p.44 | 騒音レベル把握の測定点配置例 | `fig-03-04.png` | `measurement.mdx` |

### 次にやるべきこと

1. `/verify-content` で欠落・誤変換を検出・修正
2. 表3-5、表3-6（測定結果整理様式）の欠落を補完

## 参照

- `src/styles/globals.css` — スタイル定義
- `src/lib/sidebar.ts` — サイドバー定義（environmentSidebar）
- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用変換ルール
- `.claude/skills/content/verify-content/SKILL.md` — 照合検証
- `.claude/skills/content/fishery-port-import/SKILL.md` — 類似スキル（図抽出の参考）
