---
name: social-post
description: >
  既存 MDX コンテンツ（過去問・キーワード）を元に note.com / X（旧Twitter）向け投稿テキストを生成する統合スキル。
  note は analysis / guide / keywords / desumasu、X は question / keyword のタイプ別。
  Use when user asks to [note 記事, note ドラフト, X 投稿, ツイート生成, ですます化, /social-post].
---

# /social-post — note / X 投稿テキスト生成

doboku-note の既存コンテンツを活用して note.com / X 向けの投稿テキストを生成する統合スキル。旧 `/note-post` `/x-post` `/note-desumasu` を一本化。

## 使い方

```
/social-post note analysis                          # 過去問分析記事
/social-post note guide {テーマ}                    # 学習ガイド記事
/social-post note keywords {N}                      # キーワードまとめ記事
/social-post note desumasu {article-path}           # 既存 note 下書きをですます化
/social-post x question {slug} {問題番号}            # X 過去問投稿（140字）
/social-post x keyword {slug} [--long]              # X キーワード投稿（140字 / 280字）
```

## note 投稿タイプ

### 1. note analysis — 過去問分析記事

17 年分 680 問のデータを分析し、出題傾向を記事にする。

**データソース**: `.local/r2/posts/pe-comprehensive-management/{h21..r07}-primary/article.mdx`
**分析内容**:
- 5 管理分野（経済性・人的資源・情報・安全・社会環境）の出題比率
- 毎年出る頻出テーマのランキング
- 年度別の出題傾向変化

**構成**:
1. リード文（総監択一式の概要、17 年分分析した旨）
2. 分析結果（表・グラフ代替のテキスト）
3. 管理分野別の傾向と対策ポイント
4. doboku-note への誘導リンク（全過去問の解答解説はこちら）

### 2. note guide — 学習ガイド記事

特定テーマの概要を解説し、詳細は doboku-note へ誘導。

**構成**:
1. テーマの重要性（なぜ試験で問われるか）
2. 基本概念の要約（doboku-note の既存キーワードページから抽出）
3. 過去の出題例（1〜2 問の要約、正答は伏せる）
4. 「詳しい解説と過去問演習はこちら→ doboku-note.com」

### 3. note keywords — キーワードまとめ記事

頻出キーワードを N 個紹介する記事。

**構成**:
1. 「まず覚えるべきキーワード N 選」のリード
2. 各キーワード: 名称 + 1〜2 文の説明 + 関連する管理分野
3. 各キーワードの末尾に doboku-note のリンク
4. まとめ（学習の進め方）

### note 投稿の共通ルール

- **ペルソナ**: doboku-note と同じ（実務経験 10 年以上の技術者）
- **文字数目安**: 無料記事 2,000〜3,000 字 / 有料記事 4,000〜6,000 字
- **画像指示**: `[画像: ○○の図を挿入]` のプレースホルダーを入れる
- **リンク**: 本文中に 2〜3 箇所 + 末尾にまとめリンク
- **冒頭に「この記事でわかること」を 3 行で**
- **末尾に doboku-note の URL と簡単な紹介文**
- **正答番号は記事に含めてよい**（note は完結型コンテンツ、ただし全問は載せない）
- **誘導は自然に**。「宣伝」ではなく「詳しくはこちら」の形

### 4. note desumasu — ですます調変換

`docs/note-drafts/{NN-タイトル}/article.md` の note 下書きを、親しみやすい ですます調 に変換する。v3 合格体験者ポジション戦略（運営者が 2026-07 受験予定）と note 媒体の特性（個人の体験・思考の共有が期待される）を踏まえ、「伴走者」トーンを演出する。

#### 適用判断

| コンテンツ | 文体 | 適用 |
|---|---|---|
| サイト本体の教科書・キーワード・過去問解説 | だ・である調 | 適用しない |
| note 下書き（有料販売予定の戦略・学習法）| ですます調 | **本タイプで変換** |
| note 下書きの企画書（00_企画立案 等）| — | 対象外 |

#### 変換ルール

**ですます化する対象**:
- 地の文（通常の段落）
- 箇条書きの説明文（項目自体は体言止めなら維持）
- H2/H3 配下の本文
- 締めの段落

**そのまま残す対象**:
- `# H1` タイトル
- 引用ブロック `> この記事でわかること` 内の体言止めリスト
- コード・URL・数値・英字・数式・年度表記（R07, H30 等）
- 体言止めで終わる箇条書き項目
- 引用ブロック内の専門用語の引用・条文
- 公式・定義（「A とは B である」が専門用語定義の場合は許容）

**変換パターン例**:

| before | after |
|---|---|
| 〜だ。 | 〜です。 |
| 〜である。 | 〜です。 |
| 〜だった。 | 〜でした。 |
| 〜なければならない。 | 〜する必要があります。 |
| 〜してはならない。 | 〜しない方がいいでしょう。 |
| 〜するべきだ。 | 〜するのが現実的です。／〜することをおすすめします。 |
| 〜することだ。 | 〜することです。 |
| 〜と考えた。 | 〜と考えました。 |
| 〜してほしい。 | 〜してみてください。 |
| 〜ではない。 | 〜ではありません。 |

**親しみやすさの表現**（多用すると冗長になるので 1 記事に 5〜10 箇所程度）:
- 〜していきましょう
- 〜してみてください
- 〜してみましょう
- 〜おすすめします
- 〜が現実的です
- 〜ではないでしょうか
- 〜と感じています（個人の経験を語る場面）

#### 作業手順

1. **Read**: 対象ファイルを読み込む
2. **Write で上書き**: 既存構造・見出し階層・箇条書き・改行構造は維持し、地の文のみ置換
3. **検証**:
   - `grep -cE "だ。|である。"` が 0 件（意図的引用を除く）
   - `grep -E "なければならない|してはならない"` が 0 件
   - `grep $'�'` が 0 件（文字化け U+FFFD 無し）
4. **例外の報告**: 意図的に残した箇所（条文引用・公式定義）があれば、完了報告で理由を明記

## X 投稿タイプ

### 1. x question — 過去問投稿

**手順**:
1. 対象ファイル: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`
2. 指定された問題番号の H2 見出しと問題文を読む
3. 以下のフォーマットで生成:

```
【総監 {年度} {設問番号}】
{問題のテーマを1文で要約。答えを明かさず興味を引く問いかけ}

正答・解説はこちら
https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監 #技術士試験
```

**ポイント**:
- 正答番号は投稿に含めない（サイトに来てもらうため）
- 問題文をそのまま貼らない（長すぎる）。テーマを要約して問いかけ形式にする
- 年度表記: `h30-primary` → `H30`, `r07-primary` → `R07`

### 2. x keyword — キーワード投稿

**手順**:
1. 対象ファイル: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`
2. frontmatter の title と本文の冒頭セクションを読む
3. 以下のフォーマットで生成:

**140 字版（デフォルト）**:
```
【総監キーワード】{タイトル}

{概念の本質を1〜2文で。試験での重要性に触れる}

https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監
```

**280 字版（--long）**:
```
【総監キーワード】{タイトル}

{概念の本質を2〜3文で説明}

{試験での出題ポイントや関連する管理分野を1文}

詳しい解説・過去問での出題例はこちら
https://doboku-note.com/docs/pe-comprehensive-management-{slug}

#技術士 #総監 #{関連タグ}
```

### X 投稿の共通ルール

- テキストをそのまま表示する（ユーザーがコピーして X に貼る想定）
- URL はフルパスで出力（X が og:image を自動取得してカード表示する）
- 文字数をカウントして表示: `(XXX文字 / 280文字)`
- **禁止**:
  - 正答番号を投稿テキストに含めない
  - 問題文の全文を貼らない
  - 絵文字を使わない（ハッシュタグの # は除く）
  - 「いいね・RT お願いします」等のエンゲージメント乞いを入れない

### slug の省略記法

`pe-comprehensive-management-` プレフィックスは省略可能:
- `/social-post x question h30-primary 1` → `pe-comprehensive-management-h30-primary` として処理
- `/social-post x keyword business-continuity-plan` → `pe-comprehensive-management-business-continuity-plan` として処理

## サイト URL

- トップ: `https://doboku-note.com`
- カテゴリ: `https://doboku-note.com/category/pe-comprehensive-management`
- 個別記事: `https://doboku-note.com/docs/pe-comprehensive-management-{slug}`

## ハーネス設計上の位置づけ

- **Generator（model: sonnet）** — テキスト生成・変換は定型作業
- **別エージェント評価は不要** — note は人間チェックで公開前に推敲、X は短文で即投稿

## 旧スキルからの移行

- `/note-post analysis` → `/social-post note analysis`
- `/note-post guide {テーマ}` → `/social-post note guide {テーマ}`
- `/note-post keywords {N}` → `/social-post note keywords {N}`
- `/note-desumasu {path}` → `/social-post note desumasu {path}`
- `/x-post question {slug} {num}` → `/social-post x question {slug} {num}`
- `/x-post keyword {slug} [--long]` → `/social-post x keyword {slug} [--long]`
