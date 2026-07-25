# NoteLink

doboku-note から **note.com 記事**へリンクするときの唯一の正規コンポーネント。

## なぜ専用コンポーネントなのか

note 記事リンクはかつて 3 パターン（生 markdown / `<LinkCard>` / `<Callout type="reference">`）に分裂していた。`<NoteLink>` に一本化することで、サイト全体のリンク表現を統一し、`siteName` 文言のドリフトや note.com OGP bot ブロックへの対処漏れを構造的に防ぐ。

## props

| prop | 必須 | 説明 |
|---|---|---|
| `url` | ✓ | note 記事の URL |
| `title` | ✓ | note 記事のタイトル |
| `description` | | 記事の要約（2 行で line-clamp） |
| `imageSrc` | ✓ | サイト制作画像（`/images/note-links/*.webp`） |
| `kind` | | `article`（既定）または `product` |
| `price` | | `kind="product"` のとき必須 |

note.com のカバー画像や OGP は使用しない。画像内にタイトル・価格を焼き込まず、変更される情報は HTML で表示する。

## 使用例

```mdx
<NoteLink
  url="https://note.com/dobokunote/n/nc360aaa381b0"
  title="総監記述式 出題傾向の変遷マップ｜H21〜R07 17年分を3期に区分して読み解く完全ガイド"
  description="17年分を実験期・転換期・定着期の3期に区分し、各期の特徴と学習配分の根拠を解説（無料公開）。"
  imageSrc="/images/note-links/pe-comprehensive-study.webp"
/>
```

## 設計

カード画像はサイト側で制作し `public/images/note-links/` に保存する。note.com の OGP 取得結果やカバー変更に表示を依存させない。

## 真実源・関連

- 使い分けルール: `.claude/knowledge/reference/content-authoring.md`「リンク系コンポーネントの使い分け」
- CI: `npm run check-note-link-cards`
- サイト管理画像: `public/images/note-links/`
