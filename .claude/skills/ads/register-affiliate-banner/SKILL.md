アフィリエイトバナー広告を登録し、ブログ記事末尾にタグベースで自動表示させる。

## 用途

- A8.net 等で取得したバナー広告コードを登録したいとき
- 既存カテゴリにバナーを追加したいとき
- 新しいカテゴリを作成してバナーを登録したいとき
- 記事内に手動でバナーを配置したいとき

## 引数

ユーザーから以下を確認すること:

- **バナーHTMLコード**: A8.net 等から取得した `<a><img></a><img>` 形式のコード（必須）
- **サービス名/ジャンル**: 広告主のサービス内容（カテゴリ判定に使用）
- **配置方法**: 自動（タグベース）/ 手動（特定記事内）/ 両方

## 仕組み

### 自動表示（記事末尾）

```
記事の tags → TAG_AFFILIATE_MAP → AffiliateCategory → AFFILIATE_BANNERS → ランダム選択
```

- PC: 同一カテゴリのバナーを最大2つ横並び表示
- モバイル: 1つだけ表示
- コンポーネント: `ArticleAffiliateBanner`（`apps/web/src/features/blog/components/article-affiliate-banner.tsx`）

### 手動配置（記事内）

article.md に `<affiliate-banner>` タグを記述:

```html
<affiliate-banner
  src="バナー画像URL"
  href="クリックURL"
  tracking="計測ピクセルURL"
  width="幅"
  height="高さ"
  label="導線テキスト（任意）"
></affiliate-banner>
```

- コンポーネント: `md-content.tsx` 内のカスタム要素
- PRバッジ + 中央配置で表示

## 手順

### Phase 1: バナーコードの解析

1. ユーザーが提供した HTML コードから以下を抽出:

```
<a href="[クリックURL]" rel="nofollow">
  <img ... width="[幅]" height="[高さ]" src="[バナー画像URL]">
</a>
<img ... src="[計測ピクセルURL]">
```

| 項目 | 抽出元 |
|---|---|
| `href` | `<a>` タグの `href` 属性 |
| `src` | 1つ目の `<img>` の `src` 属性 |
| `tracking` | 2つ目の `<img>`（1×1ピクセル）の `src` 属性 |
| `width` / `height` | 1つ目の `<img>` の `width` / `height` 属性 |

### Phase 2: カテゴリ判定

2. サービス内容から適切な `AffiliateCategory` を判定:

| カテゴリ | 対象サービス例 |
|---|---|
| `labor` | 転職、求人、キャリア |
| `housing` | 引越し、不動産、住宅 |
| `population` | マッチングアプリ、婚活、結婚相談所 |
| `economy` | 投資、証券、保険、節約、家計管理 |
| `health` | フィットネス、健康食品、医療 |
| `energy` | 電力、ガス、ウォーターサーバー |
| `tourism` | 旅行、ホテル予約、車査定 |
| `furusato` | ふるさと納税 |

3. 既存カテゴリに該当しない場合は新規カテゴリを作成:
   - `AffiliateCategory` 型に追加
   - `TAG_AFFILIATE_MAP` にタグマッピングを追加
   - `AFFILIATE_THEME` にテーマカラーを追加

### Phase 3: バナー登録

4. `apps/web/src/features/ads/constants/affiliate-category.ts` の `AFFILIATE_BANNERS` にバナーを追加:

```typescript
export const AFFILIATE_BANNERS: Partial<Record<AffiliateCategory, AffiliateBannerConfig[]>> = {
  // 既存カテゴリに追加する場合は配列に push
  economy: [
    { /* 既存バナー */ },
    {
      src: "バナー画像URL",
      href: "クリックURL",
      tracking: "計測ピクセルURL",
      width: 300,
      height: 250,
    },
  ],
};
```

5. 必要に応じて `TAG_AFFILIATE_MAP` にタグを追加（記事のタグ一覧は以下で確認）:

```bash
cat .local/r2/blog/*/article.md | grep -E "^  - " | sed "s/^  - //" | sort | uniq -c | sort -rn
```

### Phase 4: 手動配置（オプション）

6. 特定記事に手動バナーを配置する場合、article.md に `<affiliate-banner>` タグを挿入
7. 配置推奨位置: まとめセクションの後、関連記事の前

### Phase 5: 検証

8. 型チェック: `npx tsc --noEmit -p apps/web/tsconfig.json`
9. ブラウザで対象カテゴリの記事を確認
   - 記事末尾にバナーが表示されるか
   - PC で2列表示されるか（同カテゴリ2つ以上の場合）
   - リロードでランダム切り替えされるか（同カテゴリ2つ以上の場合）

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `apps/web/src/features/ads/constants/affiliate-category.ts` | カテゴリ定義・タグマッピング・バナー設定 |
| `apps/web/src/features/blog/components/article-affiliate-banner.tsx` | 記事末尾のバナー表示コンポーネント |
| `apps/web/src/features/blog/components/md-content.tsx` | 記事内 `<affiliate-banner>` のレンダリング |
| `apps/web/src/app/blog/[slug]/page.tsx` | ブログ記事ページ（バナーコンポーネント配置） |

## バナーサイズの推奨

| サイズ | 推奨配置 | 備考 |
|---|---|---|
| 300×250 / 320×250 | 記事末尾（自動） | 控えめで広告感が弱い。モバイルにも最適 |
| 300×300 | 記事末尾（自動） | 正方形。PC2列表示で収まりが良い |
| 670×340 | 記事内（手動） | コンテンツ幅にフィット。導線テキスト付きで使用 |
| 468×60 | 非推奨 | バナーブラインドネスが強い |
