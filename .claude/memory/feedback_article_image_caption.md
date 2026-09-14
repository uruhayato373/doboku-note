---
name: ArticleImage の caption は使わない
description: MDX の <ArticleImage> コンポーネントで caption 属性を設定しない。alt のみ設定し、図の説明は本文で行う
type: feedback
originSessionId: 146ec031-5f4b-4b02-831d-36ee7a958228
---
`<ArticleImage>` に `caption="図: ..."` を書かない。`alt` 属性のみ設定する。

**Why:** `.claude/content-principles.md` 141 行目で明文化された共通ルール。caption に図の内容を書くと本文と重複して冗長になる。ユーザーが明示的に「共通ルール化した」と繰り返し指摘済み。

**How to apply:**
- MDX 記事に新規 SVG/画像を挿入するとき、`<ArticleImage src="..." alt="..." />` のみ使う
- `/create-svg` や `/illustrate-concept` の実行時、既存 skill テンプレに caption が残っていても **使わない**
- 他のスキル例・既存記事に caption が残っていても、それは古い記事。真実源は content-principles.md
- 新規作成時はまず `.claude/content-principles.md` を確認してからコンテンツ生成する習慣にする
