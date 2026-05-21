# BookCard

もしもアフィリエイト「かんたんリンク」（cardlink）の書籍カードを MDX で表示するコンポーネント。

## 使い方

```mdx
<BookCard asin="4274234746" />
```

`asin` で `src/config/affiliate-books.json` の payload を参照し、もしも公式の
かんたんリンクカード（Amazon / 楽天 / Yahoo ボタン付き）を描画する。

## Props

| Prop | 必須 | 説明 |
|---|---|---|
| `asin` | 必須 | 書籍の ASIN。`src/config/affiliate-books.json` のキーと一致させる |

## 仕組み

- かんたんリンクは **JavaScript 型**（`dn.msmstatic.com/site/cardlink/bundle.js`）。
  MDX への生スニペット直貼りは next-mdx-remote で動かないため、本コンポーネントが
  `next/script` 経由で公式 bundle.js を読み込み `msmaflink(payload)` を呼ぶ。
- クリック URL の成果計測はもしも公式 JS が `a_id` 等から生成する。
  payload 内の `u_url` は素の商品 URL のため、**自前で `<a>` 化してはいけない**
  （成果が計上されない）。
- `'use client'` コンポーネント。`Script` は `strategy="lazyOnload"`。

## 書籍の追加手順

1. もしもアフィリエイト管理画面で対象書籍の「かんたんリンク」を生成。
2. 出力スニペット内 `msmaflink({ ... })` の `{ ... }`（payload JSON）をコピー。
3. `src/config/affiliate-books.json` に `"{ASIN}": { ...payload }` として追加。
4. MDX で `<BookCard asin="{ASIN}" />`。

## 配置原則

- メイン導線「ここだけで合格できる」の**補完ポジション**。
- 記事末・hub 末の参考書籍セクションに配置。**ファーストビュー禁止**。
- ステマ規制（2023-10〜）対応として「PR」表示を内蔵。

詳細: `docs/project/04_運営/02_アフィリエイト提携状況.md` / `docs/reference/book-list.md`
