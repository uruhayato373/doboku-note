# コンポーネント配置ガイド

`src/components/` の現行ディレクトリ構造と配置判断。理想の設計論ではなく、実際にこのリポジトリで採用されている配置ルールを記す。

## 現在の構造

```
src/components/
├── GoogleAnalytics.tsx      # ルート直下（layout に組み込む計測タグ・単体で完結）
├── category/                # /category ページ専用（CategorySections, CategoryViews 等）
├── home/                    # トップページ専用セクション
├── icons/                   # 汎用アイコン（CategoryIcons 等。above-fold の Header は
│                             # 独自 inline SVG を使い lucide-react を読み込まない — LCP 対策）
├── layout/                  # サイト全体のチェック（Header.tsx, Footer.tsx）
├── providers/                # Context プロバイダー（ThemeProvider.tsx）
├── search/                   # 検索 UI（Pagefind クライアント）
├── seo/                       # SEO 専用コンポーネント（構造化データ等）
└── ui/                        # 資格・ページ横断で再利用する UI コンポーネント（52 サブディレクトリ + 数個の単体 .tsx）
```

`blog/`・`mdx/` は存在しない（過去の設計案の残骸を記載していた旧版 README を削除）。MDX 用コンポーネントは `ui/` に置き、`src/lib/component-loader/index.ts` の `commonLoaders` から動的 import で読み込む。

## 配置判断

- **`ui/` に置く条件**: 複数の記事種別・複数資格で再利用される、または MDX から呼ばれる。1 コンポーネント = 1 フォルダ（`ComponentName/ComponentName.tsx`）が基本。関連 CSS Modules・README・型もフォルダ内に置く
- **機能フォルダ（`category/` `home/` `search/`）に置く条件**: 特定ページ・特定機能でのみ使う。他ページから import されない
- **単体 `.tsx`（フォルダを作らない）で良い条件**: 単一ファイルで完結し、専用 CSS・テスト・サブコンポーネントを持たない小さいコンポーネント（`ui/BackToTopButton.tsx`・`ui/TableOfContents.tsx` 等）

## import の実際

**barrel（`index.ts`）は前提にしない。** `ui/` 配下の各フォルダの `index.ts` は re-export だけの薄いファイルだが、実際の呼び出し元（ページ・他コンポーネント・`component-loader`）はほぼ全て `@/components/ui/ComponentName/ComponentName` のように実体ファイルを直接 import している。`src/components/ui/index.ts`（全コンポーネントの集約 barrel）も含め、多くの `index.ts` は Knip の Unused files 検出に出る。新規コンポーネントを追加するときも、barrel を経由させることを前提に設計しない（既存の直接 import 方針に合わせる）。

## 命名規則

- コンポーネント: PascalCase（`ArticleImage.tsx`）
- フォルダ: コンポーネント名と同じ PascalCase（`ArticleImage/`）
- ファイル名とコンポーネント名を一致させる

## 各コンポーネント固有の詳細

個々のコンポーネントの props・デザイン仕様・使用ルールは、そのコンポーネント自身の `README.md`（存在するもの）または実装コメントを参照する。全コンポーネント横断のデザイントークン・レイアウトプリミティブは [`.claude/knowledge/design-system/design-system.md`](../../.claude/knowledge/design-system/design-system.md) が単一の真実源。
