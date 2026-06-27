# コンポーネント管理・分類ベストプラクティス

## 現在の構造分析

```
src/components/
├── 共通コンポーネント (ルートレベル)
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── blog/ (ブログ機能)
├── layout/ (レイアウト系)
├── mdx/ (MDXコンポーネント)
├── search/ (検索機能)
├── seo/ (SEO関連)
└── ui/ (再利用可能UIコンポーネント)
```

## 推奨される分類方法

### 1. 階層構造の原則

#### Tier 1: 機能別フォルダ (Feature-based)
- `blog/` - ブログ関連の全コンポーネント
- `search/` - 検索機能関連
- `auth/` - 認証関連
- `dashboard/` - ダッシュボード機能

#### Tier 2: 技術的分類
- `ui/` - 再利用可能なUIコンポーネント (Button, Modal, Form等)
- `layout/` - レイアウト構造コンポーネント
- `providers/` - Contextプロバイダー類

#### Tier 3: 特殊用途
- `mdx/` - MDXカスタムコンポーネント
- `seo/` - SEO専用コンポーネント
- `icons/` - アイコンコンポーネント

### 2. ファイル命名規則

```
# 良い例
Button.tsx
UserProfile.tsx
ArticleCard.tsx

# 避けるべき例  
button.tsx
userprofile.tsx
article-card.tsx
```

### 3. フォルダ構造のベストプラクティス

#### 単一責任の原則
```
components/
├── ui/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   └── Modal/
│       ├── Modal.tsx
│       ├── ModalHeader.tsx
│       ├── ModalBody.tsx
│       └── index.ts
```

#### 機能別グループ化
```
components/
├── blog/
│   ├── components/ (blog内部でのみ使用)
│   │   ├── BlogCard.tsx
│   │   └── CommentForm.tsx
│   ├── containers/ (ページレベルコンポーネント)
│   │   ├── BlogPost.tsx
│   │   └── BlogList.tsx
│   └── hooks/ (blog機能専用hooks)
│       └── useBlogData.ts
```

### 4. 改善提案

#### 現在の構造を改善する手順

1. **プロバイダー類の整理**
   ```
   providers/
   └── ThemeProvider.tsx
   ```

2. **共通レイアウトの統合**
   ```
   layout/
   ├── Header.tsx
   ├── Footer.tsx
   └── MainLayout.tsx
   ```

3. **UI コンポーネントの拡充**
   ```
   ui/
   ├── DataTable/
   ├── Button/
   ├── Input/
   └── ThemeToggle.tsx
   ```

### 5. インデックスファイルの活用

各フォルダにindex.tsを配置して、インポートを簡潔に：

```typescript
// components/ui/index.ts
export { default as Button } from './Button/Button';
export { default as DataTable } from './DataTable';
export { default as ThemeToggle } from './ThemeToggle';

// 使用時
import { Button, DataTable, ThemeToggle } from '@/components/ui';
```

### 6. 判断基準

#### UI フォルダに入れる条件
- 複数の機能で再利用される
- プロジェクト固有のデザインシステム
- 汎用的なインターフェース要素

#### 機能別フォルダに入れる条件
- 特定の機能でのみ使用される
- ビジネスロジックと密結合
- その機能の文脈でのみ意味を持つ

### 7. 禁止事項

- ❌ ルートレベルに機能特化コンポーネントを配置
- ❌ 深すぎる階層 (3階層以下に制限)
- ❌ 単一ファイルのためだけのフォルダ作成
- ❌ 曖昧なフォルダ名 (utils/, common/, shared/等)

### 8. 命名コンベンション

#### フォルダ名
- kebab-case: `blog-post/`
- または camelCase: `blogPost/`
- 一貫性を保持する

#### コンポーネント名
- PascalCase: `BlogPost.tsx`
- ファイル名とコンポーネント名を一致させる

### 9. 今後の拡張指針

1. **Atomic Design の部分採用**
   ```
   ui/
   ├── atoms/ (Button, Input, Icon)
   ├── molecules/ (SearchBox, NavItem)
   └── organisms/ (Header, Sidebar)
   ```

2. **TypeScript 型定義の整理**
   ```
   types/
   ├── components.ts
   ├── api.ts
   └── common.ts
   ```

3. **テストファイルの配置**
   - コンポーネントと同じディレクトリに配置
   - または `__tests__/` フォルダを作成

## まとめ

良いコンポーネント構造は以下を実現します：
- 開発者が迷わずにコンポーネントを見つけられる
- 新しい機能追加時の配置が明確
- リファクタリングや削除が安全
- チーム開発での一貫性