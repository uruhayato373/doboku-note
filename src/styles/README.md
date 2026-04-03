# doboku-note スタイルシート

このディレクトリには、doboku-noteの全てのCSSスタイルシートが含まれています。

## ファイル構成

### `globals.css`
- グローバルスタイル
- 基本タイポグラフィ
- カスタムコンポーネント
- アニメーション
- レスポンシブデザイン
- ダークモード対応

### `blog-headings.css`
- ブログ記事専用の見出しスタイル
- カテゴリ別の色分け
- 箇条書きスタイル
- 表のスタイリング
- レスポンシブ対応

### `list-styles.css`
- リストコンポーネント用のカスタムスタイル
- box28、modern、minimalスタイル
- バリアント別の色分け
- ダークモード対応

### `linkcard.css`
- LinkCardコンポーネント専用スタイル
- タイトルのカスタムスタイリング
- カテゴリ別の色分け
- レスポンシブ対応
- フォントサイズ・ウェイトのバリエーション

### `index.css`
- 全てのCSSファイルをインポートするインデックスファイル
- 一括読み込み用

## 使用方法

### 全スタイルを読み込む場合
```tsx
import '../styles/index.css';
```

### 個別のスタイルを読み込む場合
```tsx
import '../styles/globals.css';
import '../styles/blog-headings.css';
import '../styles/list-styles.css';
import '../styles/linkcard.css';
```

### レイアウトファイルでの使用例
```tsx
// src/app/layout.tsx
import "../styles/globals.css";
```

### ブログ記事ページでの使用例
```tsx
// src/app/blog/[id]/page.tsx
import "../../../styles/blog-headings.css";
import "../../../styles/list-styles.css";
```

### LinkCardコンポーネントでの使用例
```tsx
// LinkCardコンポーネントを使用する場合
import "../styles/linkcard.css";
```

## スタイルの追加・修正

新しいスタイルを追加する場合は、適切なファイルに追加するか、新しいファイルを作成してください。

### 新しいスタイルファイルを作成する場合
1. `src/styles/`ディレクトリに新しいCSSファイルを作成
2. `src/styles/index.css`にインポート文を追加
3. 使用するページでインポート

### 例：新しいコンポーネントスタイル
```css
/* src/styles/component-styles.css */
.my-component {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-md;
}
```

```css
/* src/styles/index.css に追加 */
@import './component-styles.css';
```

## ベストプラクティス

1. **命名規則**: ファイル名は用途を明確に表現
2. **コメント**: 各セクションに適切なコメントを追加
3. **レスポンシブ**: モバイルファーストのアプローチ
4. **ダークモード**: 全てのスタイルでダークモード対応
5. **パフォーマンス**: 必要最小限のスタイルのみ読み込み

## トラブルシューティング

### スタイルが適用されない場合
1. インポートパスが正しいか確認
2. CSSファイルが正しい場所にあるか確認
3. ブラウザのキャッシュをクリア

### スタイルの競合が発生する場合
1. より具体的なセレクタを使用
2. `!important`の使用は避ける
3. CSSの優先順位を確認 