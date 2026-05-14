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
| `coverImage` | | カバー画像パス（`/images/note-covers/` 配下推奨）。省略時はテキストカード |

`siteName="note（dobokunote）"` と `category="note 解説記事"` は内部でプリセット。

## 使用例

```mdx
<NoteLink
  url="https://note.com/dobokunote/n/nc360aaa381b0"
  title="総監記述式 出題傾向の変遷マップ｜H21〜R07 17年分を3期に区分して読み解く完全ガイド"
  description="17年分を実験期・転換期・定着期の3期に区分し、各期の特徴と学習配分の根拠を解説（無料公開）。"
  coverImage="/images/note-covers/trend-map-cover.webp"
/>
```

## 設計

`LinkCard/LinkCardClient.tsx`（props 直描画・サーバーフェッチなし）をラップする薄い層。`LinkCard.tsx` 本体の `getLinkMetadata` サーバーフェッチは経由しない ―― note.com は bot UA をブロックするため OGP 自動取得が機能せず、`coverImage` を明示指定するのが前提。

## 真実源・関連

- 使い分けルール: `.claude/reference/content-authoring.md`「リンク系コンポーネントの使い分け」
- 検出: `/check-mdx --rules note-link`（`lint-mdx-mobile.mjs` ルール 8-3）が `<NoteLink>` 外の note リンクを警告
- 共有カバー画像置き場: `public/images/note-covers/`
