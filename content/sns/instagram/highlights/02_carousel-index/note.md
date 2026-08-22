# 02_carousel-index「カルーセル目次」ハイライト 投稿手順

## 位置づけ

- 戦略 v7.1 §2 Highlight 2 種目「カルーセル目次」
- 5 管理別の代表 Carousel 投稿への入口
- 7 枚構成: cover → 5 管理 (経済性 / 人的資源 / 情報 / 安全 / 社会環境) → cta

## 着地点ルール（重要：実投稿後に URL 確定）

| スライド | 管理分野 | リンクスタンプ着地点 |
|---|---|---|
| 01-cover | 目次案内 | （任意） |
| 02-eco | 経済性管理 | 経済性管理の代表 Carousel 投稿 URL（投稿後に追記） |
| 03-hr | 人的資源管理 | 人的資源管理の代表 Carousel 投稿 URL |
| 04-info | 情報管理 | 情報管理の代表 Carousel 投稿 URL |
| 05-safe | 安全管理 | 安全管理の代表 Carousel 投稿 URL |
| 06-env | 社会環境管理 | 社会環境管理の代表 Carousel 投稿 URL |
| 07-cta | 全カルーセル | `https://instagram.com/doboku_note/`（自プロフィール） |

**注意**: 各管理の Carousel URL は **実投稿後** に取得して追記する。投稿前は `[TBD]` プレースホルダーで埋めておき、月次レビューで更新。

## 投稿フロー

```
1. 7 枚 PNG 確認
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/02_carousel-index
       ↓
2. Stories 7 枚を順番に連投（01 → ... → 07）
   - 各管理スライドにリンクスタンプ（カルーセル投稿 URL、未投稿なら省略）
       ↓ 24h 以内
3. ハイライト名「カルーセル目次」に追加
   - 並び順: プロフィール一行目の中央（重要な発見動線）
```

## 更新タイミング

- **新しい代表 Carousel 投稿を出すたび**にリンクスタンプ更新
- 四半期に 1 度、5 管理ごとの「代表」を見直し（インプレッション・保存数で選別）
- body の管理代表トピック（費用便益分析・PFI 等）を新規キーワードに差し替える場合は slide-data.json を編集 → 再生成

## SoT 参照

| 情報 | 参照先 |
|---|---|
| 5 管理の定義 | `.claude/knowledge/reference/content-principles.md` |
| 各管理の代表キーワード | `src/config/management-pillars.json`（または `pillar-exam-questions.json`） |
| カルーセル投稿の SoT | `content/sns/instagram/{exam}/exam-packs/<year>/pack-NN/`（過去問パック）/ ig-carousel-writer 経由のキーワードパック |

## UTM 設計

各管理スライドのリンクスタンプ URL に付与：

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=carousel-index
&utm_content={eco|hr|info|safe|env}
```

`utm_content` で 5 管理別の経路分析が可能。
