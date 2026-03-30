# MDX → JSON 変換方針

> 作成日: 2026-03-30
> 対象: 1級土木施工管理技士 過去問 iOSアプリ用データ

---

## 元データの現状

### 1次試験（content/exam/civil-construction-1/primary/）

| 項目 | 値 |
|---|---|
| ファイル数 | 14（H26〜R02 × 問題A/B） |
| 総行数 | 18,339行 |
| 推定問題数 | 約960問（年度あたり約68問 × 14ファイル ÷ 2種） |
| 書式統一度 | **高** — 全ファイルで同一フォーマット |

### 2次試験（content/exam/civil-construction-1/secondary/）

| 項目 | 値 |
|---|---|
| ファイル数 | 10（5分野 × basics/past-problems） |
| 総行数 | 7,086行 |
| 形式 | 記述式（4択ではない） |

---

## 変換対象の判断

| 分類 | ファイル数 | アプリ適性 | 対応バージョン |
|---|---|---|---|
| **1次試験 問題A** | 7 | **高** — 4択、書式統一 | **v1.0** |
| **1次試験 問題B** | 7 | **高** — 同上 | **v1.0** |
| 2次試験 記述式 | 10 | 低 — 4択ではない | v2.0（模範解答閲覧モード） |

**v1.0 は1次試験（14ファイル）のみ。2次試験は v2.0 で別UIとして対応。**

---

## 1次試験 MDX の書式パターン

### 標準パターン（大多数）

```mdx
## 問題 No.X

問題文テキスト

**(1)** 選択肢1のテキスト

**(2)** 選択肢2のテキスト

**(3)** 選択肢3のテキスト

**(4)** 選択肢4のテキスト

<details>
<summary>解答・解説</summary>

**正解: (X)**

(1) 選択肢1の解説テキスト...

(2) 選択肢2の解説テキスト...

(3) 選択肢3の解説テキスト...

(4) 選択肢4の解説テキスト...

</details>
```

### 変則パターン

#### A. 表形式の選択肢

一部の問題（各年度1〜3問程度）で、選択肢がMarkdownテーブルで記述されている。

```mdx
## 問題 No.1

問題文...

| | 列A | 列B | 列C |
|---|---|---|---|
| **(1)** | ... | ... | ... |
| **(2)** | ... | ... | ... |
| **(3)** | ... | ... | ... |
| **(4)** | ... | ... | ... |
```

**対応方針**: テーブルをパースし、各行を1つの選択肢として結合する。アプリ側では選択肢を複数行テキストとして表示。

#### B. 図を含む問題

コメント `{/* 図: ... */}` で図が示されている問題がある。

```mdx
{/* 図: 土積曲線（マスカーブ）。横軸に測点... */}
```

**対応方針**:
- 図コメントの総数を棚卸しする
- 図なしで問題が成立するものはテキストのみで変換
- 図がないと解答不能な問題は `"requiresFigure": true` フラグを付与し、v1.0 では出題対象から除外
- 将来的には図を画像化してバンドル同梱

#### C. 数式（KaTeX）

`$$..$$` や `$...$` の数式表記がある（土量変化率、力学公式等）。

```mdx
$$L = \frac{\text{ほぐした土量}(\text{m}^3)}{\text{地山の土量}(\text{m}^3)}$$
```

**対応方針**: JSON に LaTeX 文字列のまま格納し、アプリ側で MathJax/KaTeX のWebView または Swift の `AttributedString` でレンダリング。v1.0 では LaTeX をプレーンテキストに簡易変換（例: `L = ほぐした土量 / 地山の土量`）して対応し、v1.1 で正式レンダリング。

---

## 分野タグの付与方法

### 問題Aの分野マッピング（問題番号→分野）

1級土木施工管理技士 第1次検定 問題Aは、出題範囲が問題番号で固定されている。

| 問題番号 | 分野 | `category` | 選択/必須 |
|---|---|---|---|
| No.1〜No.15 | 土木一般（土工・コンクリ・基礎工） | `civil-general` | 15問中12問選択 |
| No.16〜No.49 | 専門土木（構造物・河川・道路・港湾等） | `specialized` | 34問中10問選択 |
| No.50〜No.61 | 法規（労安法・建設業法・河川法等） | `law` | 12問中8問選択 |

#### 土木一般の細分類（問題文キーワードで機械判定）

| キーワード | `subcategory` |
|---|---|
| 土工、盛土、切土、締固め、土量、トラフィカビリティ | `earthwork` |
| コンクリート、配合、スランプ、セメント、養生、打込み | `concrete` |
| 基礎、杭、支持力、地盤、ボーリング、N値 | `foundation` |
| 測量、TS、GNSS、水準 | `surveying` |

#### 専門土木の細分類

| キーワード | `subcategory` |
|---|---|
| 鋼構造、鋼橋、溶接、ボルト | `steel-structure` |
| 河川、堤防、護岸、水門 | `river` |
| 砂防、地すべり、急傾斜 | `erosion-control` |
| 道路、舗装、アスファルト | `road` |
| ダム、フィルダム、コンクリートダム | `dam` |
| トンネル、NATM、シールド | `tunnel` |
| 海岸、港湾、防波堤 | `port` |
| 鉄道、軌道 | `railway` |
| 上下水道、管路 | `water-supply` |

### 問題Bの分野マッピング

| 問題番号 | 分野 | `category` |
|---|---|---|
| 全問 | 施工管理 | `construction-management` |

問題Bは施工管理が主題だが、細分類はキーワード判定で付与:

| キーワード | `subcategory` |
|---|---|
| 施工計画、仮設、工事用道路 | `planning` |
| 工程、ネットワーク、バーチャート | `schedule` |
| 安全、墜落、クレーン、足場 | `safety` |
| 品質、検査、試験、管理図 | `quality` |
| 環境、騒音、振動、廃棄物 | `environment` |
| 測量 | `surveying` |
| 契約、約款 | `contract` |

---

## JSON スキーマ

```json
{
  "version": "1.0",
  "exam": "civil-construction-1",
  "questions": [
    {
      "id": "r02-a-01",
      "year": "R02",
      "yearLabel": "令和2年度",
      "exam": "primary",
      "section": "A",
      "number": 1,
      "category": "civil-general",
      "subcategory": "earthwork",
      "selectionRule": "15問中12問選択",
      "question": "問題文...",
      "questionFormat": "text",
      "choices": [
        { "id": "1", "text": "選択肢1のテキスト" },
        { "id": "2", "text": "選択肢2のテキスト" },
        { "id": "3", "text": "選択肢3のテキスト" },
        { "id": "4", "text": "選択肢4のテキスト" }
      ],
      "answer": "3",
      "explanations": {
        "summary": "正解の要約（1〜2文）",
        "details": [
          { "choiceId": "1", "text": "選択肢1の解説..." },
          { "choiceId": "2", "text": "選択肢2の解説..." },
          { "choiceId": "3", "text": "選択肢3の解説...", "isCorrect": true },
          { "choiceId": "4", "text": "選択肢4の解説..." }
        ]
      },
      "hasTable": false,
      "hasLatex": false,
      "requiresFigure": false,
      "dobokuNoteUrl": "/docs/exam/civil-construction-1/primary/r02-a"
    }
  ]
}
```

### フィールド説明

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | `{year}-{section}-{number}` 形式の一意ID |
| `year` | string | 年度コード（H26, H27, ..., R01, R02） |
| `yearLabel` | string | 表示用（「令和2年度」等） |
| `exam` | string | `primary`（1次）/ `secondary`（2次） |
| `section` | string | `A` / `B` |
| `number` | number | 問題番号 |
| `category` | string | 大分類（`civil-general` / `specialized` / `law` / `construction-management`） |
| `subcategory` | string | 細分類（`earthwork` / `concrete` / `road` 等） |
| `selectionRule` | string | 選択ルール（「15問中12問選択」等） |
| `question` | string | 問題文（Markdown） |
| `questionFormat` | string | `text` / `table`（表形式の選択肢） |
| `choices` | array | 選択肢配列 |
| `answer` | string | 正解の選択肢ID |
| `explanations.summary` | string | 正解の要約 |
| `explanations.details` | array | 各選択肢の解説 |
| `hasTable` | boolean | 表形式の選択肢を含むか |
| `hasLatex` | boolean | 数式を含むか |
| `requiresFigure` | boolean | 図がないと解答不能か |
| `dobokuNoteUrl` | string | doboku-note上の該当ページURL |

---

## 変換スクリプトの設計

### 入力

```
content/exam/civil-construction-1/primary/*.mdx（14ファイル）
```

### 処理フロー

```
1. MDXファイルを読み込み
2. frontmatter をパース → year, section を抽出
3. `## 問題 No.X` で問題単位に分割
4. 各問題について:
   a. 問題文を抽出（`## 問題 No.X` の次行 〜 最初の `**(1)**` の前まで）
   b. 選択肢を抽出（`**(1)**`〜`**(4)**` または テーブル形式）
   c. <details> 内から正解番号を抽出（`**正解: (X)**`）
   d. <details> 内から各選択肢の解説を抽出
   e. 問題番号とsectionから category を機械割当
   f. 問題文キーワードから subcategory を機械割当
   g. hasTable, hasLatex, requiresFigure フラグを判定
5. JSON に出力
```

### 出力

```
data/questions/civil-construction-1.json（全問まとめ）
data/questions/civil-construction-1/r02-a.json（年度・セクション別、デバッグ用）
```

### 言語

Node.js（TypeScript）。doboku-note のビルド環境と統一。

---

## 変換前にやるべき準備作業

### 1. 図コメントの棚卸し

```bash
grep -c '{/\*.*図' content/exam/civil-construction-1/primary/*.mdx
```

各ファイルの図コメント数を確認し、図なしで問題が成立するか1件ずつ判断する。

### 2. 表形式選択肢の棚卸し

```bash
grep -c '| \*\*(1)\*\*' content/exam/civil-construction-1/primary/*.mdx
```

表形式の問題数を確認し、パーサーのテストケースを準備する。

### 3. 数式の棚卸し

```bash
grep -c '\$\$' content/exam/civil-construction-1/primary/*.mdx
```

数式を含む問題数を確認し、v1.0 でのプレーンテキスト変換ルールを定義する。

### 4. 分野タグの検証

1年度分（R02）を手動でタグ付けし、問題番号→分野の機械割当が正しいか検証する。

---

## 変換品質の検証方法

| 検証項目 | 方法 |
|---|---|
| 問題数の一致 | MDX内の `## 問題 No.` の数 = JSON内の問題数 |
| 正解の一致 | MDX内の `**正解: (X)**` = JSON内の `answer` |
| 選択肢数 | 全問題で `choices.length === 4` |
| 欠損フィールド | `question`, `answer`, `explanations` が空でないこと |
| 分野タグ | R02年度を手動検証し、機械割当の精度を確認 |

---

## 2次試験の対応方針（v2.0）

2次試験は4択ではなく記述式のため、別のデータ構造とUIが必要。

### データ構造（案）

```json
{
  "id": "secondary-earthwork-r02",
  "year": "R02",
  "category": "earthwork",
  "questionType": "essay",
  "question": "問題文...",
  "modelAnswer": "模範解答テキスト...",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
  "relatedTopics": ["盛土の締固め", "品質管理"]
}
```

### UIパターン

- 問題を表示 → 「模範解答を見る」ボタン → 模範解答 + 要点リスト
- 自分の解答をメモ入力 → 模範解答と見比べる機能
- 施工経験記述はテンプレート + 記入例の表示

**v2.0 は 10月の2次試験（R02）前にリリースを目指す。**
