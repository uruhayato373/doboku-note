# 07_civil-1「1級土木 直前」ハイライト 投稿手順

## 位置づけ

- 1級土木施工管理技士 第2次検定（**2026-10-04**、`config/exam-calendar.json` `exams.civil-construction-1.events.second` が正）直前の受験者向け
- 5 枚構成: 導入 → 無料（サイト） → 主力商品（全10組合せ） → 直前演習（直前総仕上げパック） → 全部見る/添削
- パレット: azure（`instagram-carousel-tokens.json` `highlightStories.palettes.07_civil-1`、1級土木の note-cover-tokens 色 `civil-1` と揃える）

## PNG 生成

```
node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/07_civil-1
```

## 各枚のリンクスタンプ（Business Suite で手動投稿時に貼る）

| # | ファイル | title / 要旨 | リンクスタンプ URL | 文言 |
|---|---|---|---|---|
| 1 | 01-cover.png | 10/4直前（導入・リンクなし） | — | — |
| 2 | 02-free.png | 無料で読める（経験記述の出題傾向と書き方） | `https://doboku-note.com/exam/civil-construction-1/secondary/experience-writing-guide?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil1&utm_content=s2` | 経験記述の出題傾向と書き方は無料で読める |
| 3 | 03-combo.png | 全10組合せ（同じ工事で書き分ける） | `https://note.com/dobokunote/m/m74cfd7c695d6?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil1&utm_content=s3` | 全10組合せの模範答案（note） |
| 4 | 04-chokuzen.png | 直前仕上げ（模試・暗記・出題分析） | `https://note.com/dobokunote/m/m7a9b3ad964f6?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil1&utm_content=s4` | 直前総仕上げパック（note） |
| 5 | 05-all.png | 全部見る（教材一覧と添削相談） | `https://note.com/dobokunote/n/n4fde0f62dc20?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil1&utm_content=s5` | 土木もくじ（全教材一覧） |

## 2 枚目のリンク先を記事ページにする理由

- 資格トップ（`/exam/civil-construction-1`）はスマホで note 導線が最下部（89%）にしか無く、リンク先として弱い
- 記事ページ（`/exam/civil-construction-1/secondary/experience-writing-guide`）は冒頭から主力商品・ココナラへ配線済みのため、note 有料教材・添削への回遊が期待できる

## 5 枚目の添削（ココナラ）案内について

- 5 枚目のリンクスタンプは「土木もくじ」（1 枚 1 リンクの原則）
- ココナラの添削・相談は**直リンクせず**、本文テキストで「添削はプロフィールのリンクから（ココナラ）」と案内する
- ココナラ受付は **10/2** まで（10/4 本試験の 2 日前で運営者の添削・確認が間に合う締切）。締切が近づいたら note.md を更新し、締切後は文言を削除するか次回受験期用に書き換える

## 価格の扱い

- 画像・note.md ともに具体的な価格は書かない（変動するため）。真実源は `src/lib/note-magazines.ts` の `price`
  - `civil-1-combo-essay`: ¥3,480（10本セット）
  - `civil-1-chokuzen-pack`: ¥2,980（模試3回＋暗記ノート＋出題分析）
- 価格が変わった場合も本ハイライトの slide-data.json / note.md は修正不要（リンク先の note 側で最新価格が表示される）

## UTM 設計

```
?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil1&utm_content=s1..s5
```

`utm_content` はスライド番号（s1〜s5）で経路追跡。

## 更新タイミング

- 10/4 本試験終了後: ハイライトをアーカイブ or 「過去の直前パック」へ移動、次年度の直前期に向けて日付・リンクを更新
- note マガジンの価格改定・URL 変更時は本体の `src/lib/note-magazines.ts` が真実源。本ファイルの URL（noteId 部分）が変わった場合のみ更新

## 守った禁止事項

- 絵文字なし
- 合格保証表現なし（「全10組合せの模範答案」等、範囲の網羅性のみ訴求）
- 試験の出題を断定しない（「〜が出ても」という条件文で表現、断定形は使わない）
