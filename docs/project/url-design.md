# URL設計ガイドライン

最終更新: 2026-04-03

2試験（1級土木施工管理技士・技術士（総合技術監理部門））に特化したサイトの URL 構成と、コンテンツ配置ルールを定義します。

---

## 基本方針：フラット URL 設計

**すべてのコンテンツは `/docs/{slug}` の単一レベルで管理します。**

```
.local/r2/posts/{slug}/article.mdx  →  /docs/{slug}

例：
  .local/r2/posts/civil-construction-1-guide/article.mdx  
    → /docs/civil-construction-1-guide
  
  .local/r2/posts/cem-section-3-1/article.mdx  
    → /docs/cem-section-3-1
```

カテゴリ・タグによるグループ化は frontmatter で実装。サイドバーは `src/lib/dynamic-sidebar.ts` が frontmatter の `category` 値でフィルタ・グループ化します。

---

## 資格識別子（exam-id）と category の対応

| 試験名 | exam-id | category（frontmatter） | 実装状況 |
|---|---|---|---|
| **1級土木施工管理技士** | `civil-construction-1` | `civil-construction-1` | ✅ 運用中 |
| **技術士（総合技術監理部門）** | `pe-comprehensive-management` | `pe-comprehensive-management` | ✅ 実装中 |

### 補助カテゴリ（共通コンテンツ）

| 分野 | category | 対応試験 |
|---|---|---|
| 土木工学基礎 | `civil-general` | 1級土木・技術士総監共通 |
| 施工管理・法規 | `construction-management` | 1級土木・技術士総監共通 |
| キーワード・法規 | `keywords-law` | 全試験 |

---

## frontmatter による分類

すべてのコンテンツは以下の frontmatter を持たねばなりません：

```yaml
---
title: "ページタイトル"
description: "50〜160文字の説明"
category: "civil-construction-1"     # 試験または分野
tags: ["guide", "primary"]           # 分類タグ（複数可）
published: true                      # false なら下書き・非表示
---
```

### category の選択肢（Phase 1）

- `civil-construction-1` — 1級土木施工管理技士
- `pe-comprehensive-management` — 技術士総合技術監理技術部門
- `civil-general` — 土木一般知識（両試験共用）
- `construction-management` — 施工管理知識（両試験共用）
- `keywords-law` — キーワード・法規（補助）

### tags の例

- `guide` — 試験ガイド・勉強方法
- `primary` — 第1次試験対策
- `secondary` — 第2次試験対策
- `past-questions` — 過去問
- `keyword` — キーワード解説
- `shared-with-pe` — 複数試験対応コンテンツ

---

## slug の命名規則

slug はファイルシステムのパスから自動生成されます。命名の一貫性を保つため:

- **英数字 + ハイフンのみ**使用（URL安全性のため）
- **snake_case や CamelCase は使わない**
- **試験名を prefix に含める**: `civil-construction-1-{topic}`, `cem-{topic}`
- **深さは最小限**: `posts/slug/article.mdx`（サブディレクトリは img/ のみ）

**例**:
```
.local/r2/posts/civil-construction-1-guide/article.mdx
  → slug: civil-construction-1-guide
  
.local/r2/posts/cem-section-3-1-human-behavior/article.mdx
  → slug: cem-section-3-1-human-behavior
```

---

## SEO保護ルール

### 既存URLは変更しない

- 現在サイトに公開されているページのパス（`/docs/{slug}`）は、検索ランキングやバックリンク価値のため**絶対に変更しない**
- 既存ドメイン: `/docs/civil-construction-1-*`, `/docs/cem-*`, `/docs/general/*`, `/docs/construction-management/*` など

### コンテンツの移動は原則禁止

- ファイルをディレクトリ間で移動する必要が生じた場合は、Cloudflare Pages の `_redirects` で 301 redirect を設定して URL を維持

### 過去問ファイルの命名規則

- 年号で区切る: `civil-construction-1-primary-r05`（令和5年度）
- 出題段階を区切る（2次の場合）: `civil-construction-1-secondary-r05-a`（第1次）

---

## frontmatter フィールド仕様

### 必須フィールド

| フィールド | 型 | 用途 |
|---|---|---|
| `title` | string | ページタイトル |
| `description` | string | メタディスクリプション（50〜160文字） |
| `category` | string | カテゴリ分類（上記の category から選択） |
| `tags` | string[] | 分類タグ（複数可） |
| `published` | boolean | 公開フラグ（false=下書き・非表示） |

### 推奨フィールド

| フィールド | 型 | 用途 |
|---|---|---|
| `sidebar_label` | string | サイドバー表示名（title と異なる場合） |
| `sidebar_position` | number | サイドバー内の並び順 |

---

## サイドバーの自動生成

### 実装

`src/lib/dynamic-sidebar.ts` が frontmatter ベースで自動的にサイドバーを生成します。

```ts
export function generateDynamicSidebar(category: string): SidebarItem[]
```

処理フロー:
1. `getAllDocSlugs()` で全 slug を取得（`.local/r2/posts/` から）
2. `getDoc()` で各ファイルの frontmatter を読み込む
3. `category` でフィルタ
4. `tags` でグループ化
5. `sidebar_position` でソート
6. SidebarItem[] を返す

### ナビバーの登録

`src/config/categories.json` に追加するだけで、ナビバー項目が自動生成されます:

```json
{
  "categories": [
    {
      "label": "1級土木施工管理技士",
      "path": "civil-construction-1",
      "variant": "civil"
    },
    {
      "label": "技術士（総合技術監理部門）",
      "path": "pe-comprehensive-management",
      "variant": "pe"
    }
  ]
}
```

---

## 複数試験対応コンテンツ（共有コンテンツ）

frontmatter に複数カテゴリを参照する方法:

### パターン1: 主要カテゴリ + tags で関連を宣言（推奨）

```yaml
---
title: "コンクリート工概説"
category: "civil-general"           # 主要カテゴリ
tags: ["shared-with-pe"]            # 関連を tags で記載
---
```

この場合、`src/config/categories.json` の `civil-general` に該当ページが表示される。

### パターン2: frontmatter に `relatedCategories` を明示（検討中）

```yaml
---
title: "コンクリート工概説"
category: "civil-general"
relatedCategories: ["pe-comprehensive-management"]
---
```

実装待ち。この機能が完成すれば、複数試験ナビに同一ページを表示可能。

---

## Phase 2 以降の拡張予定

現在は 2試験に特化していますが、Phase 2 以降に以下の試験を追加する可能性があります:

| 試験 | exam-id（予定） | category（予定） | 追加条件 |
|---|---|---|---|
| 2級土木施工管理技士 | `civil-construction-2` | `civil-construction-2` | 1級土木で月間 10,000 UU 達成後 |
| 技術士（建設部門） | `pe-construction` | `pe-construction` | 総監で月間 10,000 UU 達成後 |
| RCCM | `rccm` | `rccm` | 検討中 |
| コンクリート技士 | `concrete-engineer` | `concrete-engineer` | 検討中 |

新資格追加時：
1. `src/config/categories.json` に新エントリを追加
2. `.local/r2/posts/{exam-id}-*/` ディレクトリにコンテンツを配置
3. 各ファイルの frontmatter に正しい `category` を設定

これだけで、ナビバーとサイドバーが自動的に生成されます。コード修正は不要。

---

## コード実装との整合性

このガイドラインは以下のコード実装に基づいています：

- **src/lib/docs.ts**: `getAllDocSlugs()`, `getDoc()` は `.local/r2/posts/` **のみ** をスキャン
- **src/lib/dynamic-sidebar.ts**: frontmatter の `category` でグループ化
- **src/config/categories.json**: ナビバー項目の定義
- **src/components/layout/Header.tsx**: ナビバーレンダリング

**注**: 旧ガイドラインで言及されていた `content/general/`, `content/exam/{exam-id}/` という階層 URL パターンは、コード実装（`.local/r2/posts/` フラット スキャン）と乖離しているため、この版では削除しました。

---

## 参照

- ファイル作成規約: `design.md`
- 設計思想: `design.md`
- コンテンツロードマップ: `roadmap.md`
