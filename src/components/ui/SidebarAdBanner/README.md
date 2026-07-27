# SidebarAdBanner

docs ページ右サイドバーに表示するアフィリエイト バナー（ディスプレイ枠）。

## 使い方

`src/app/docs/[...slug]/page.tsx` の `<aside>` 内でサーバーコンポーネントとして直接描画する（MDX コンポーネントではない）。

```tsx
<SidebarAdBanner
  href="https://px.a8.net/svt/ejp?a8mat=..."
  imageSrc="https://www27.a8.net/svt/bgt?aid=...&mid=...&mc=1"
  alt="独学サポート 1級土木施工管理技士講座"
  width={300}
  height={250}
  pixelSrc="https://www10.a8.net/0.gif?a8mat=..."
/>
```

## Props

| Prop | 必須 | 説明 |
|---|---|---|
| `href` | 必須 | アフィリエイトリンク URL |
| `imageSrc` | 必須 | バナー画像 URL |
| `alt` | 必須 | バナーの代替テキスト |
| `width` / `height` | 必須 | バナー実寸（CLS 防止）。画像は `w-full` で枠に合わせて縮小される |
| `pixelSrc` | 任意 | A8.net 計測ピクセル URL（creative ごとに配信ドメインが異なるため URL を丸ごと渡す） |

## 自動付与される属性

- `rel="nofollow sponsored noopener"` / `target="_blank"`
- 「PR」バッジ（消費者庁ステマ規制 2023-10〜 対応）
- `loading="lazy"`

## 配置原則

- 右サイドバーはデスクトップ（≥993px）のみ表示。モバイルには出ない
- アフィは補完ポジション。owned 商品（note 有料マガジン CTA）より下に置く
- 詳細・配置スコープ: `.claude/knowledge/reference/affiliate-operations.md`
