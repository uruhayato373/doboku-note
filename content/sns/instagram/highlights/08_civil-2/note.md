# 08_civil-2「2級土木 直前」ハイライト 投稿手順

## 位置づけ

- 2級土木施工管理技術検定 第一次検定（後期）・第二次検定（**2026-10-25**、`config/exam-calendar.json` `exams.civil-construction-2.events.firstLate` / `events.second` が正）直前の受験者向け
- 5 枚構成: 導入 → 無料（サイト） → 経験記述 → 学科記述 → 直前演習（直前総仕上げパック）
- パレット: green（`instagram-carousel-tokens.json` `highlightStories.palettes.08_civil-2`、2級土木の note-cover-tokens 色 `civil-2` と揃える。02_carousel-index の green とは色相を分けた別トーン）

## PNG 生成

```
node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/08_civil-2
```

## 各枚のリンクスタンプ（Business Suite で手動投稿時に貼る）

| # | ファイル | title / 要旨 | リンクスタンプ URL | 文言 |
|---|---|---|---|---|
| 1 | 01-cover.png | 10/25直前（導入・リンクなし） | — | — |
| 2 | 02-free.png | 無料で読める（経験記述の出題傾向と書き方） | `https://doboku-note.com/exam/civil-construction-2/secondary/experience-writing-guide?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil2&utm_content=s2` | 経験記述の出題傾向と書き方は無料で読める |
| 3 | 03-experience.png | 経験記述（自分の工事に置き換える） | `https://note.com/dobokunote/m/m1881a9578027?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil2&utm_content=s3` | 施工経験記述 完成答案集（note） |
| 4 | 04-gakka.png | 学科記述（テーマ別 出る順） | `https://note.com/dobokunote/m/m9a09a8982734?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil2&utm_content=s4` | 学科記述 テーマ別出る順（note） |
| 5 | 05-chokuzen.png | 直前仕上げ（模試・暗記・出題分析） | `https://note.com/dobokunote/m/md3518107aa97?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil2&utm_content=s5` | 直前総仕上げパック（note） |

## 2 枚目のリンク先を記事ページにする理由

- 資格トップ（`/exam/civil-construction-2`）はスマホで note 導線が最下部（89%）にしか無く、リンク先として弱い
- 記事ページ（`/exam/civil-construction-2/secondary/experience-writing-guide`）は冒頭から主力商品・ココナラへ配線済みのため、note 有料教材・添削への回遊が期待できる

## 一覧（土木もくじ）の扱いについて

- ユーザー指示どおり、本ハイライトは「一覧は土木もくじへの案内文のみ」に留める（civil-1 のような専用スライド・専用リンクスタンプは置かない）
- 5 枚目の本文または投稿キャプションに「教材の全体一覧は土木もくじから（プロフィール → note）」と一文だけ添える運用（リンクスタンプは直前パック 1 本のみ、1 枚 1 リンクの原則を優先）
- 土木もくじ URL（参考。本ハイライトのリンクスタンプには使わない）: `https://note.com/dobokunote/n/n4fde0f62dc20`

## 価格の扱い

- 画像・note.md ともに具体的な価格は書かない（変動するため）。真実源は `src/lib/note-magazines.ts` の `price`
  - `civil-2-experience-essay`: ¥1,980（3本セット）
  - `civil-2-gakka-kijutsu`: ¥1,980（5本セット）
  - `civil-2-chokuzen-pack`: ¥2,480（模試3回＋暗記ノート＋出題分析）

## UTM 設計

```
?utm_source=instagram&utm_medium=social&utm_campaign=ig-hl-civil2&utm_content=s1..s5
```

`utm_content` はスライド番号（s1〜s5）で経路追跡。

## 更新タイミング

- 10/25 本試験終了後: ハイライトをアーカイブ or 「過去の直前パック」へ移動、次年度の直前期に向けて日付・リンクを更新
- note マガジンの価格改定・URL 変更時は本体の `src/lib/note-magazines.ts` が真実源。本ファイルの URL（noteId 部分）が変わった場合のみ更新

## 守った禁止事項

- 絵文字なし
- 合格保証表現なし
- 試験の出題を断定しない
