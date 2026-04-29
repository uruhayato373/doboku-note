# docs/sns-drafts/ — SNS 投稿素材ディレクトリ

doboku-note の SNS 投稿素材（X / Instagram Carousel / YouTube Shorts）を管理するディレクトリ。

- 最終更新: 2026-04-29（v1: 初版・ディレクトリ新設）
- 関連 Issue: [#161 SNS 自動投稿基盤 Umbrella](https://github.com/uruhayato373/doboku-note/issues/161) / [#165 IG Carousel MVP](https://github.com/uruhayato373/doboku-note/issues/165) / [#166 YT Shorts MVP](https://github.com/uruhayato373/doboku-note/issues/166)
- 親戦略: [07_SNS集客戦略.md v5](../project/07_SNS集客戦略.md) / [26_Instagram投稿自動化アーキテクチャ.md v3](../project/26_Instagram投稿自動化アーキテクチャ.md) / [27_5チャネル動線設計.md](../project/27_5チャネル動線設計.md)

## note-drafts との違い

| 軸 | note-drafts | sns-drafts |
|---|---|---|
| 消費スタイル | 腰を据えて読む（5〜15 分） | 短時間・スワイプ消費（30 秒〜2 分） |
| 長さ | 1,500〜5,000 字 | 1 ツイート 280 字 / 1 スライド 50〜80 字 / 1 動画 30〜60 秒 |
| 主フォーマット | 記事 HTML（Markdown / note エディタ） | テキスト投稿 / 画像カルーセル / 縦型動画 |
| バイラル性 | 低（検索流入が主） | 高（シェア・保存・RT がコンバージョン） |
| HTML 依存 | あり（details タグ等） | なし（SNS ネイティブ構造） |

クイズ・1問1答系コンテンツは SNS の方が圧倒的に適している（note は HTML 非対応のため `<details>` 折りたたみが機能しない）。

## ディレクトリ命名規約

```
docs/sns-drafts/
└── {NNN}-{日本語テーマ}/     # 3 桁連番 + ハイフン + テーマ名（日本語 OK）
    ├── source.md             # 元素材（真実源）
    ├── x.md                  # X 用原稿
    ├── instagram-carousel.md # IG Carousel 用原稿
    └── youtube-shorts/       # YT Shorts スクリプト群
        ├── 01-{slug}-script.md
        ├── 02-{slug}-script.md
        └── ...
```

**命名例**:
- `001-択一1問1答-20問/`
- `002-記述式テーマ別解法/`
- `003-過去問速解-経済性管理/`

## ファイル別の役割

### source.md — 元素材（真実源）

各媒体ファイルの派生元となる、フルテキストの知識・問題・解答・解説をまとめたファイル。

```markdown
# {テーマ名} — 元素材

## 概要

- テーマ: ...
- 問題数: ...
- 対象分野: ...

## Q1. {問題タイトル}

**問題文**: ...

**選択肢**:
(1) ...
(2) ...
(3) ...
(4) ...

**正答**: (N)

**解説**: ...

**関連キーワード**: [キーワード名](https://doboku-note.com/docs/{slug})

---

## 派生媒体

- [X 用原稿](./x.md)
- [Instagram Carousel 用原稿](./instagram-carousel.md)
- [YouTube Shorts スクリプト](./youtube-shorts/)
```

### x.md — X 用原稿

1 ツイート = 1 ブロック（`---` で区切り）。問題本文 + 4択 + 「答えはリプライツリー」+ UTM 付きリンク + ハッシュタグを含む。

**UTM フォーマット**（27_5チャネル動線設計.md §4 準拠）:
- `utm_source=x&utm_medium=organic&utm_campaign={campaign-name}`

```markdown
## Tweet 01: Q1 {問題タイトル}

【総監択一クイズ #{NN}】{管理分野}

{問題文（150 字以内）}

(1) ...
(2) ...
(3) ...
(4) ...

↓ 答えはリプライツリーに

詳しい解説: https://doboku-note.com/docs/{slug}?utm_source=x&utm_medium=organic&utm_campaign={campaign}

#{ハッシュタグ1} #{ハッシュタグ2} #{ハッシュタグ3}

--- リプライ ---

正答: ({N}) {答え}

{解説 100 字以内}

---
```

### instagram-carousel.md — IG Carousel 用原稿

カルーセル 1 投稿 = スライド 10 枚（表紙 1 + Q+A 4 セット + CTA 1）。
解像度: 1080×1350 (4:5 portrait)。

**UTM フォーマット**（27_5チャネル動線設計.md §4 準拠）:
- `utm_source=instagram&utm_medium=carousel&utm_campaign={type-id}`

```markdown
## Carousel 01: {テーマ} {管理分野} クイズ 4 問パック

**公開予定**: 2026-XX-XX {曜} 07:00

### Slide 1: 表紙
- メイン: 「{タイトル}」
- サブ: 「保存して何度も解こう」
- 図解指定: ...

### Slide 2: Q1 {問題タイトル}
- 問題文（IG 用・絵文字あり・80 字以内）
- 4 択

### Slide 3: A1 {問題タイトル}
- 正答 + 解説（100 字以内）

（Slide 4〜9: Q2/A2 ... Q4/A4 同パターン）

### Slide 10: CTA
- 「doboku-note で全問解説を見る」
- CTA リンク（UTM 付き）

**キャプション（投稿本文）**:
{キャプション本文 + ハッシュタグ（30 個以内）}
```

### youtube-shorts/{NN}-{slug}-script.md — YT Shorts スクリプト

1 ファイル = 1 動画（30〜45 秒）。ナレーション原稿（VOICEVOX 用）+ 字幕テキスト + サムネ案。

**UTM フォーマット**（27_5チャネル動線設計.md §4 準拠）:
- 概要欄: `utm_source=youtube&utm_medium=shorts&utm_campaign={slug}`

```markdown
# YT Shorts {NN}: {管理分野} Q{N} {問題タイトル}

**尺**: {秒数}秒目安
**公開予定**: 2026-XX-XX {曜} 19:30

## ナレーション原稿（VOICEVOX 用）

[0-5秒] 問題提起
「...」

[5-15秒] 問題提示
「...」

[15-18秒] 沈黙（考える時間）

[18-23秒] 答え発表
「正解は ({N}) ...。」

[23-38秒] 解説
「...」

[38-43秒] CTA
「...」

## 字幕テキスト（タイミング付き）

| 秒 | 字幕 |
|---|---|
| 0-5 | ... |

## サムネ案

- メイン: 「Q{N} {問題タイトル}」+ 4 択画像
- 文字大、視認性最優先

## 概要欄テンプレ

{title}（技術士総合技術監理部門）

{description}

▼ 詳細解説（doboku-note）
https://doboku-note.com/docs/{slug}?utm_source=youtube&utm_medium=shorts&utm_campaign={slug}

#技術士 #技術士総監 #総合技術監理 #{管理分類}
```

## 自動投稿基盤との関係

### Phase 1: 手書き → 目視投稿（現在）

本ディレクトリが主役。各媒体ファイルの原稿を人間が確認し、各 SNS に手動（または `/social-post` スキル経由）で投稿する。

```
docs/sns-drafts/{NNN}-{テーマ}/
  source.md → 人間が確認 → 各媒体ファイルに手動転記 → SNS に手動投稿
```

### Phase 2: キュー化 → 半自動投稿（実装予定）

`.claude/config/sns/queue.json`（将来実装）から本ディレクトリの素材を参照し、スキル（ig-post-create / yt-shorts-create / social-post）が自動で投稿を生成・投稿する。

```json
{
  "queue": [
    {
      "id": "001-q1",
      "source": "docs/sns-drafts/001-択一1問1答-20問/source.md",
      "channels": ["x", "instagram-carousel", "youtube-shorts"],
      "scheduled_at": "2026-05-01T07:00:00+09:00"
    }
  ]
}
```

**実装 Issue**: #165（IG Carousel MVP）/ #166（YT Shorts MVP）が基盤を担う。

## 現在のディレクトリ一覧

| ディレクトリ | 問題数 | 対象分野 | 状態 |
|---|---|---|---|
| [001-択一1問1答-20問](./001-択一1問1答-20問/) | 20 問 | 5 管理 × 4 問 | 完成 |
