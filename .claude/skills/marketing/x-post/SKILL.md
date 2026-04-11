# /x-post — X（旧Twitter）投稿テキスト生成

既存コンテンツ（過去問・キーワードページ）からX投稿用テキストを生成する。

## 使い方

```
/x-post question pe-comprehensive-management-h30-primary 1
/x-post keyword business-continuity-plan
/x-post keyword business-continuity-plan --long
```

### 引数

| 位置 | 説明 | 例 |
|---|---|---|
| 1 | タイプ: `question` or `keyword` | `question` |
| 2 | slug（`pe-comprehensive-management-` プレフィックスは省略可） | `h30-primary` |
| 3 | 問題番号（question時のみ、1〜40） | `1` |
| `--long` | 280字版（デフォルトは140字版） | |

## 生成ルール

### 過去問（question）

1. 対象ファイル: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`
2. 指定された問題番号のH2見出しと問題文を読む
3. 以下のフォーマットで生成:

```
【総監 {年度} {設問番号}】
{問題のテーマを1文で要約。答えを明かさず興味を引く問いかけ}

正答・解説はこちら
https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監 #技術士試験
```

**ポイント:**
- 正答番号は投稿に含めない（サイトに来てもらうため）
- 問題文をそのまま貼らない（長すぎる）。テーマを要約して問いかけ形式にする
- 年度表記: `h30-primary` → `H30`, `r07-primary` → `R07`

### キーワード（keyword）

1. 対象ファイル: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`
2. frontmatterのtitleと、本文の冒頭セクションを読む
3. 以下のフォーマットで生成:

**140字版（デフォルト）:**
```
【総監キーワード】{タイトル}

{概念の本質を1〜2文で。試験での重要性に触れる}

https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監
```

**280字版（--long）:**
```
【総監キーワード】{タイトル}

{概念の本質を2〜3文で説明}

{試験での出題ポイントや関連する管理分野を1文}

詳しい解説・過去問での出題例はこちら
https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監 #{関連タグ}
```

## 出力

- テキストをそのまま表示する（ユーザーがコピーしてXに貼る想定）
- URLはフルパスで出力（Xがog:imageを自動取得してカード表示する）
- 文字数をカウントして表示: `(XXX文字 / 280文字)`

## 禁止事項

- 正答番号を投稿テキストに含めない
- 問題文の全文を貼らない
- 絵文字を使わない（ハッシュタグの # は除く）
- 「いいね・RT お願いします」等のエンゲージメント乞いを入れない

## slugの省略記法

`pe-comprehensive-management-` プレフィックスは省略可能:
- `/x-post question h30-primary 1` → `pe-comprehensive-management-h30-primary` として処理
- `/x-post keyword business-continuity-plan` → `pe-comprehensive-management-business-continuity-plan` として処理
