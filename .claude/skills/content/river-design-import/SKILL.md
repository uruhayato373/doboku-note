---
name: river-design-import
description: >
  河川砂防技術基準PDFをMDX変換する。Use when user asks to [河川砂防, /river-design-import].
---

# /river-design-import — 河川砂防技術基準（設計編）技術資料 PDF→MDX変換

## 概要

国土交通省「河川砂防技術基準 設計編」の**技術資料**PDFをダウンロードし、MDXに変換してdoboku-noteに取り込むスキル。改定本文は対象外。

## 使い方

```
/river-design-import              # 変換状況を確認し、未変換の次の技術資料を1件変換
/river-design-import 1-1          # 第1章第1節 技術資料を変換
/river-design-import status       # 変換状況を確認
/river-design-import verify       # 既存MDXをPDFと照合（/verify-content相当）
```

## ソース情報

- **ソースページ**: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/index.html
- **発行**: 国土交通省 水管理・国土保全局
- **統合版**: 令和8年1月時点

### 技術資料PDFリスト（11件）

| # | 節 | タイトル | ファイル名 | URL | 状態 |
|---|---|---|---|---|---|
| 1 | 1-1 | 設計編第1章第1節技術資料 | sekkei_gijutsushiryou_01_01.pdf | [URL][1] | 未着手 |
| 2 | 1-2 | 設計編第1章第2節技術資料 | 1-2_g.pdf | [URL][2] | 完了 |
| 3 | 1-3 | 設計編第1章第3節技術資料 | gijutsu_sekkei_01-03.pdf | [URL][3] | 未着手 |
| 4 | 1-4 | 設計編第1章第4節技術資料 | sekkei_gijutsushiryou_01_04.pdf | [URL][4] | 未着手 |
| 5 | 1-6 | 設計編第1章第6節技術資料 | sekkei_gijutsushiryou_01_06.pdf | [URL][5] | 未着手 |
| 6 | 1-7 | 設計編第1章第7節技術資料 | sekkei_gijutsushiryou_01_07.pdf | [URL][6] | 未着手 |
| 7 | 1-8 | 設計編第1章第8節技術資料 | 1-8_g.pdf | [URL][7] | 未着手 |
| 8 | 1-9 | 設計編第1章第9節技術資料 | 1-9_g.pdf | [URL][8] | 未着手 |
| 9 | 1-10 | 設計編第1章第10節技術資料 | 1-10_g.pdf | [URL][9] | 未着手 |
| 10 | 2 | 設計編第2章技術資料 | 2_g.pdf | [URL][10] | 未着手 |
| 11 | 4 | 設計編第4章技術資料 | gijutsu_sekkei_04.pdf | [URL][11] | 未着手 |

[1]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/sekkei_gijutsushiryou_01_01.pdf
[2]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/1-2_g.pdf
[3]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/gijutsu_sekkei_01-03.pdf
[4]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/sekkei_gijutsushiryou_01_04.pdf
[5]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/sekkei_gijutsushiryou_01_06.pdf
[6]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/sekkei_gijutsushiryou_01_07.pdf
[7]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/1-8_g.pdf
[8]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/1-9_g.pdf
[9]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/1-10_g.pdf
[10]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/2_g.pdf
[11]: https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/pdf/gijutsu_sekkei_04.pdf

### 第1章の節タイトル（参考）

| 節 | タイトル |
|---|---|
| 1-1 | 総説 |
| 1-2 | 堤防 |
| 1-3 | 高規格堤防 |
| 1-4 | 水制 |
| 1-5 | （欠番） |
| 1-6 | 床止め |
| 1-7 | 堰 |
| 1-8 | 樋門・樋管 |
| 1-9 | 水門 |
| 1-10 | トンネル構造による河川 |

## 出力先

```
content/river/river-design/
├── img/                     # 図（スクリーンショット）
├── 01-01-general.mdx        # 第1章第1節 総説
├── 01-02-levee.mdx          # 第1章第2節 河川堤防
├── 01-03-revetment.mdx      # 第1章第3節 護岸
├── 01-04-groyne.mdx         # 第1章第4節 水制
├── 01-06-ground-sill.mdx    # 第1章第6節 床止め
├── 01-07-weir.mdx           # 第1章第7節 堰
├── 01-08-culvert.mdx        # 第1章第8節 樋門・樋管
├── 01-09-sluice-gate.mdx    # 第1章第9節 水門
├── 01-10-pump-station.mdx   # 第1章第10節 排水機場
├── 02-dam.mdx               # 第2章 ダム
└── 04-erosion-control.mdx   # 第4章 砂防設備
```

## 文書の特徴と変換上の注意

### 全般

- **技術資料**は改定本文の補足的解説であり、計算例・図表・参考文献を多く含む
- 河川構造物の設計に関する具体的な数式・計算手法が多い
- 断面図・構造図・フローチャートが頻出
- 表が多い（設計条件一覧、材料規格、許容応力度表等）

### 変換上の注意

- 数式が非常に多い → KaTeX で正確に変換（分数、積分、Σ、添え字多用）
- 構造図・断面図は PNG スクリーンショットにする（Markdown で再現不可）
- 表は Markdown テーブルで変換するが、複雑な結合セルは PNG にする
- 「解説」「参考」「補足」等のブロックが多い → blockquote 形式
- ページ数が多いPDFは章・節単位でMDXファイルを分割する

## 変換手順

### Step 1: PDFダウンロード

```bash
mkdir -p _sources/river/river-design
curl -s -L -o _sources/river/river-design/{節番号}_g.pdf \
  "{PDFのURL}"
```

### Step 2: PDF構造の把握

#### macOS の場合
Read ツールでPDFを直接読み取り、目次・章立て・図のページを確認する。

#### Windows の場合（PyMuPDF + Pillow）

```python
import fitz

doc = fitz.open('_sources/river/river-design/{節番号}_g.pdf')
print(f'Total pages: {len(doc)}')

# 図を含むページを特定
for i, page in enumerate(doc):
    text = page.get_text()
    if '図' in text:
        lines = [l.strip() for l in text.split('\n') if '図' in l and l.strip()]
        for l in lines[:3]:
            print(f'  p{i+1}: {l[:80]}')
```

> **注意**: PyMuPDF のテキスト抽出は日本語が文字化けすることがある。その場合はページをPNG化して Read ツールで目視確認する。

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
| /tmp名 | グループ番号を付与 | `/tmp/rv{節番号}g{グループ番号}-` で衝突回避 |
| 並列実行 | 全グループ同時起動 | Agent tool を1メッセージに複数含めて並列化 |
| mode | `bypassPermissions` | サブエージェントの権限確認を省略して高速化 |

サブエージェントへのプロンプトには以下を含めること：
- PDFファイルパス
- 抽出対象の図リスト（ページ番号、図番号、おおまかな内容）
- 出力先ディレクトリ（content/river/river-design/img/）
- 命名規則（下記参照）
- 解像度は **150 dpi** を指定（200dpiは使わない）
- /tmp 名にグループ番号を含めること
- トリミング手順（下記参照）

#### macOS の場合（pdftoppm + magick）

```bash
mkdir -p content/river/river-design/img

# ★ サブエージェントでは必ず 150dpi を使用
pdftoppm -png -r 150 -f {ページ} -l {ページ} \
  _sources/river/river-design/{節番号}_g.pdf /tmp/rv{節番号}g{グループ番号}

# Read ツールで目視確認 → magick でトリミング
magick /tmp/river-tmp-{ページ}.png -crop {幅}x{高さ}+{x}+{y} +repage \
  content/river/river-design/img/{出力名}.png
```

#### Windows の場合（PyMuPDF + Pillow）

```python
import fitz
from PIL import Image
import os

os.makedirs('content/river/river-design/img', exist_ok=True)

doc = fitz.open('_sources/river/river-design/{節番号}_g.pdf')

# ページをPNG化
page = doc[ページ番号 - 1]
pix = page.get_pixmap(dpi=200)
pix.save('/tmp/river-tmp.png')

# Read ツールで目視確認 → Pillow でトリミング
img = Image.open('/tmp/river-tmp.png')
fig = img.crop((left, top, right, bottom))
fig.save('/tmp/fig-test.png')
# Read ツールで再確認（2〜3回の反復調整を想定）
fig.save('content/river/river-design/img/{出力名}.png')
```

#### 共通の注意事項

- **トリミングは反復作業** — 1回で正確な座標が決まることは稀。必ず Read ツールで結果を確認し、2〜3回調整する
- **キャプション（図番号・タイトル）はPNG画像に含めない** — MDX側のみに記述
- **Markdown画像記法を使用する**（`<img>` タグは Next.js で `preprocessMdx` により自動的にパス解決される）

**図の命名規則：**
- `fig-{節番号}-{連番}.png` 例: `fig-01-02-01.png`（第1章第2節の図1）
- `tbl-{節番号}-{連番}.png`（複雑な表を画像化する場合）

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

**複数章・節がある場合は並列でサブエージェントを起動する。**

サブエージェントへのプロンプトには以下の変換ルールを含めること：

Read ツール（macOS）またはPyMuPDF（Windows）でPDFを読み取り、MDXに変換する。

#### 見出し
- 章（「第1章 河川」等） → `## 見出し`（h2）
- 節（「第1節 総説」等） → `### 見出し`（h3）
- 項（「1.1 適用範囲」等） → `#### 見出し`（h4）

#### 数式（多い）

```mdx
<div className="scroll-equation">

$$
\sigma = \frac{M}{I} \cdot y
$$

</div>
```

- 上付き・下付き文字が多い: $\sigma_{max}$, $K_s$, $H_{1/3}$ 等
- 分数・積分・Σ が頻出
- 単位は `\text{}` で囲む: `\text{kN/m}^2`

#### 表
- Markdownテーブル記法に変換
- 表タイトルは `**表X-X タイトル**` の太字で記述
- セル結合を含む複雑な表はPNG画像にする

#### 図の埋め込み

```mdx
<img src="./img/fig-01-02-01.png" width="600" className="center-image" />
<p className="text-center">図 1-2-1 堤防の標準断面</p>
```

#### 「参考」「補足」ブロック

```mdx
> **参考**
>
> 参考内容をblockquoteで記述する。
```

### Step 5: frontmatter付与

```yaml
---
title: "河川砂防技術基準（設計編）技術資料 第1章第{N}節 {節タイトル}"
description: "{内容の要約、120文字以内}"
source:
  - title: "河川砂防技術基準 設計編 技術資料"
    author: "国土交通省 水管理・国土保全局"
    url: "https://www.mlit.go.jp/river/shishin_guideline/gijutsu/gijutsukijunn/sekkei/index.html"
---
```

### Step 6: サイドバー更新

`src/lib/sidebar.ts` の `riverSidebar` にドキュメントIDを追加する。

```typescript
{
  type: 'category',
  label: '河川砂防技術基準（設計編）技術資料',
  items: [
    'river/river-design/01-01-general',
    'river/river-design/01-02-levee',
    'river/river-design/01-03-revetment',
    // ...
  ],
},
```

### Step 7: 品質チェック

1. **図の確認**: 全ての図がPNGとして抽出され、MDXから正しく参照されているか
2. **表の確認**: Markdownテーブルとして正しく構造化されているか
3. **数式の確認**: KaTeX でレンダリングエラーがないか（全角括弧→半角、`\\` の正確性）
4. **基準値の確認**: 設計定数・許容値が原典と一致しているか（設計基準は誤差厳禁）
5. **構文チェック**: `/check-mdx` でMDX構文エラーがないか
6. **画像同期**: `npm run sync-images` で public/content に反映されているか

## 変換の判断基準

### テキストとして変換するもの
- 本文テキスト・解説・参考
- 箇条書き
- 表（設計条件、材料規格等）→ Markdownテーブル
- 数式 → KaTeX
- 設計手順のフローテキスト

### PNGスクリーンショットにするもの
- 構造断面図（堤防断面、護岸構造等）
- フローチャート（設計手順の流れ図）
- グラフ（応力分布図、流量曲線等）
- 複雑な表（セル結合、斜線ヘッダ等）
- 配置図・平面図

### 判断基準
- Markdownで正確に再現できるか？ → Yes: テキスト変換 / No: PNG
- **設計基準値の正確性を最優先**。無理にテキスト化して値が欠落するよりPNGの方が良い

## 進捗管理

各技術資料の変換は以下のステータスで管理する:

| ステータス | 意味 |
|---|---|
| 未着手 | まだ取りかかっていない |
| DL済み | PDFダウンロード完了 |
| 構造把握 | 目次・図表ページ特定完了 |
| 図抽出中 | 図のトリミング作業中 |
| 変換中 | MDX変換作業中 |
| レビュー | 品質チェック中 |
| 完了 | 変換・検証完了 |

### 変換優先順位

実務での参照頻度・検索需要を考慮した優先順位:

| 優先度 | 節 | 理由 |
|---|---|---|
| ★★★ | 1-2 河川堤防 | 最も基本的な河川構造物。検索需要が最も高い |
| ★★★ | 1-3 護岸 | 堤防と並ぶ基本構造物。施工管理技士でも出題頻度高 |
| ★★★ | 1-8 樋門・樋管 | 実務で頻繁に参照。設計計算の参考需要大 |
| ★★☆ | 1-7 堰 | 河川横断工作物の設計で重要 |
| ★★☆ | 1-9 水門 | 樋門と関連。セットで参照されることが多い |
| ★★☆ | 1-10 排水機場 | 内水対策の設計で需要あり |
| ★★☆ | 2 ダム | ボリューム大だが専門性が高い |
| ★☆☆ | 1-1 総説 | 概論的内容。個別構造物の後で良い |
| ★☆☆ | 1-4 水制 | 参照頻度は低め |
| ★☆☆ | 1-6 床止め | 参照頻度は低め |
| ★☆☆ | 4 砂防設備 | 砂防カテゴリと重複する可能性あり |

## 参照

- `src/styles/globals.css` — スタイル定義
- `src/lib/sidebar.ts` — サイドバー定義（riverSidebar）
- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用変換ルール
- `.claude/skills/content/noise-manual-import/SKILL.md` — 類似スキル（騒音評価マニュアル）
- `.claude/skills/content/fishery-port-import/SKILL.md` — 類似スキル（漁港設計参考図書）
- `.claude/skills/content/verify-content/SKILL.md` — 照合検証
