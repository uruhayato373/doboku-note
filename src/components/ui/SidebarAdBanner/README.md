# SidebarAdBanner

300×250 のアフィリエイト バナー（ディスプレイ枠）。名前は旧・記事右サイドバー用の名残で、記事サイドバーの広告は 2026-09-26 に撤去済み。いまは記事末（`ArticleFooter`・`article-end`）とカテゴリ hub（`CategoryPage`・`category-sidebar` / `category-mobile`）で使う。

## 使い方

サーバーコンポーネントとして直接描画する（MDX コンポーネントではない）。案件は配置ルール（`config/affiliate-placements.json`）が決め、呼び出し側が素材を渡す。

```tsx
<SidebarAdBanner
  href="https://px.a8.net/svt/ejp?a8mat=..."
  imageSrc="https://www27.a8.net/svt/bgt?aid=...&mid=...&mc=1"
  alt="ビルドジョブ 建設業界特化の転職エージェント"
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
| `pixelSrc` | 任意 | A8.net 計測ピクセル URL（creative ごとに配信ドメインが異なるため URL を丸ごと渡す）。1 ページ 1 発になるよう呼び出し側が発火源を決める |
| `trackLabel` | 任意 | GA4 のクリックのラベル（例 `BuildJob-endbanner`） |
| `placement` | 任意 | GA4 の `cta_placement`（`article-end` / `category-sidebar` / `category-mobile`） |

## 自動付与される属性

- `rel`（`AFFILIATE_LINK_REL`）と `referrerPolicy`（`AFFILIATE_LINK_REFERRER_POLICY`＝`no-referrer-when-downgrade`・A8 にページの URL を残す）を対で / `target="_blank"`
- 「PR」バッジ（消費者庁ステマ規制 2023-10〜 対応）
- `loading="lazy"`

## 配置原則

- アフィは補完ポジション。owned 商品（note 有料マガジン CTA）より下に置く
- 詳細・配置スコープ: `.claude/knowledge/reference/affiliate-operations.md`
