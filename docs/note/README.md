# note 記事 SSOT

このディレクトリが note.com 記事の唯一の真実源（SSOT）です。

## 構造

```
docs/note/
  {slug}/
    article.md        # 記事本文（YAML frontmatter 付き）
    img/              # 図版（figure-*.png / figure-*.svg）
    covers/           # note カバー画像
  19_note段階投下プラン.md  # 投下スケジュール計画
```

## frontmatter 必須フィールド

```yaml
title: "..."
notePricing: free | paid
noteSeries: "..."
utmCampaign: "..."
published: true | false
```

## ルール

- note.com への反映は手動コピー（HTML 未対応のため Markdown をそのまま貼り付け）
- 公開済み記事は `published: true` で識別
- 投下スケジュールは `docs/note/19_note段階投下プラン.md` を参照
- 図版ポリシーは `docs/reference/note-svg-policy.md` を参照
- 公開前チェックリストは `docs/reference/note-publish-enhancement.md` を参照
