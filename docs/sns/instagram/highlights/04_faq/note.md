# 04_faq「FAQ」ハイライト 投稿手順

## 位置づけ

- 戦略 v7.1 §2 Highlight 4 種目「FAQ」
- 受験相談の定型回答 5 件（DM 問合せの省力化 + 信頼性訴求）
- 6 枚構成: cover → Q1〜Q5

## Q5 件の内訳

| # | Q | 主題 |
|---|---|---|
| Q1 | 総監とは？ | 技術士の最上位区分、5 管理のトレードオフ |
| Q2 | 6 ヶ月で間に合う？ | 学習時間目安、択一 3 ヶ月・記述 6 ヶ月 |
| Q3 | 建設部門必須？ | 他部門技術士取得が前提、建設部門経由が最多 |
| Q4 | 過去問は何年分？ | H21〜R07 を 640 問網羅、iOS アプリ化計画 |
| Q5 | 口頭試験どう対策？ | 経歴整合・5 管理現場応用・想定問答 50 本 |

## 着地点ルール

| スライド | リンクスタンプ着地点 |
|---|---|
| 01-cover | （任意） |
| 02-q1 (総監とは？) | `https://doboku-note.com/docs/pe-comprehensive-management-keyword-2026`（総監ハブ） |
| 03-q2 (学習計画) | サイトの学習計画ガイドページ（あれば） or サイトトップ |
| 04-q3 (建設部門) | サイトの技術士入門ガイド or サイトトップ |
| 05-q4 (過去問範囲) | `https://doboku-note.com/docs/pe-comprehensive-management-keyword-2026`（年度別過去問索引） |
| 06-q5 (口頭試験) | note の口頭試験対策（E-4）or サイトトップ |

直接 note 有料は **06_materials のみ**に集約する（系統 C 二段ロケット原則）。FAQ は **サイト着地が原則**。

## 投稿フロー

```
1. 6 枚 PNG 確認
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir docs/sns/instagram/highlights/04_faq
       ↓
2. Stories 6 枚を順番に連投
   - 各 Q スライドにリンクスタンプ（該当キーワードページ or サイトトップ）
       ↓ 24h 以内
3. ハイライト名「FAQ」に追加
   - 並び順: プロフィール一行目の右端（信頼性訴求の最終ピース）
```

## 更新タイミング

- DM 問合せの頻出質問が変わったら入れ替え（半年に 1 度）
- 試験制度改定時は必須見直し（特に Q1 / Q3）
- body の文言を変更する場合は slide-data.json を編集 → 再生成

## SoT 参照

| 情報 | 参照先 |
|---|---|
| 総監の制度・5 管理の定義 | `.claude/knowledge/reference/content-principles.md` / 文科省総監キーワード集 |
| 過去問範囲 | `src/config/exam-questions.json` |
| 口頭試験対策 | `.local/r2/posts/pe-comprehensive-management/oral-exam/article.mdx`（あれば）/ note E-4 |

## UTM 設計

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=faq
&utm_content=q{1-5}
```

各 Q に `utm_content=q1`〜`q5` を付与し、どの質問がクリックされたかを分析。
