# URL設計ガイドライン

最終更新: 2026-04-01

複数の土木系資格試験に対応するサイトのURL構成と、コンテンツ配置ルールを定義します。

---

## 基本方針（案A：分野最上位）

- **共通コンテンツ**（複数資格に跨る学習素材）: `/docs/general/` または分野別パスに配置
- **試験特化コンテンツ**（特定資格の過去問・試験対策）: `/docs/exam/{exam-id}/` に配置
- **複数資格対応記事**: ファイルを複製せず、frontmatter の `exams: string[]` で関連を宣言

この設計により、コンテンツ重複を最小化しながら複数資格への対応を実現します。

---

## 資格識別子（exam-id）定義表

| 資格名 | exam-id | 検索需要 | 実装状況 |
|---|---|---|---|
| **1級土木施工管理技士** | `civil-construction-1` | 51,193人（2025年一次） | ✅ 運用中 |
| 2級土木施工管理技士 | `civil-construction-2` | 26,000人（推定） | ⏳ 未実装 |
| **技術士（建設部門）** | `pe` | 14,094人（2025年一次） | ✅ 運用中（ナビ外） |
| RCCM | `rccm` | 小規模 | ✅ 運用中（ナビ外） |
| **コンクリート技士** | `concrete-engineer` | 9,000人 | ⏳ 未実装 |
| **コンクリート主任技師** | `concrete-chief-engineer` | 3,156人（2024年） | ⏳ 未実装 |
| **測量士** | `surveying` | 3,717人 | ⏳ 未実装 |
| 測量士補 | `surveying-assistant` | 13,363人（2025年） | ⏳ 未実装 |

---

## コンテンツ配置ルール

### 共通コンテンツ（general）

複数の資格試験で出題される、汎用的な技術的基礎コンテンツ。

| 対象 | 配置パス | 関連資格 | 備考 |
|---|---|---|---|
| **コンクリート工**（技術解説） | `content/general/civil-general/concrete/` | civil-construction-1, concrete-engineer, pe | 既存・活用継続 |
| **測量**（技術解説） | `content/general/civil-general/surveying/` | civil-construction-1, surveying, pe | 既存・活用継続 |
| **土工**（技術解説） | `content/general/civil-general/earthwork/` | civil-construction-1, pe | 既存 |
| **基礎工**（技術解説） | `content/general/civil-general/foundation/` | civil-construction-1, pe | 既存 |
| **建設機械** | `content/general/civil-general/construction-machinery/` | civil-construction-1, pe | 既存 |
| **解体工事** | `content/general/civil-general/demolition/` | civil-construction-1 | 既存 |
| **施工管理・法規** | `content/general/construction-management/` | 全試験共通 | 既存 |

### 試験特化コンテンツ（exam）

特定の資格試験の過去問、出題傾向分析、試験対策ガイド、受験者向けの学習支援。

| 資格 | 配置パス | 内容例 | 実装状況 |
|---|---|---|---|
| 1級土木施工管理技士 | `content/exam/civil-construction-1/` | guide/, primary/（第1次問題集）, secondary/（第2次問題集） | ✅ 既存 |
| 技術士（建設部門） | `content/exam/pe/` | primary-guide/, soil-foundation/, concrete-points/ | ✅ 既存 |
| RCCM | `content/exam/rccm/` | 概要ページ | ✅ 既存 |
| コンクリート技士・主任技師 | `content/exam/concrete-engineer/` | guide/, past-questions/ | ⏳ 新設予定 |
| 測量士 | `content/exam/surveying/` | guide/, past-questions/, practice/ | ⏳ 新設予定 |

---

## 具体例：コンクリート技士対応

### 共通コンテンツ（既存ファイルの流用・更新）

```markdown
content/general/civil-general/concrete/
├── concrete-overview.mdx     # frontmatter に exams: [civil-construction-1, concrete-engineer, pe] を追記
├── materials.mdx             # 同上
├── mix-design.mdx            # 同上
├── construction.mdx          # 同上
├── durability.mdx            # 同上
└── products.mdx              # 同上
```

### 試験特化コンテンツ（新規作成）

```markdown
content/exam/concrete-engineer/
├── index.mdx                  # 試験概要・対策ポータル
├── guide/
│   ├── strategy.mdx           # 得点戦略・勉強計画
│   ├── selection-strategy.mdx # 選択科目の選び方
│   └── timeline.mdx           # 受験スケジュール
└── past-questions/
    ├── r05.mdx                # 過去問（令和5年度）
    ├── r04.mdx
    ├── r03.mdx
    └── r02.mdx
```

### frontmatter 記述例

```yaml
---
title: コンクリートの概説
description: コンクリートの定義、構成材料、基本性質について
exams:
  - civil-construction-1
  - concrete-engineer
  - pe
---
```

---

## SEO保護ルール

### 既存URLは変更しない

- 現在サイトに公開されているページのパスは、検索ランキングやバックリンク価値のため絶対に変更しない
- 既存ドメイン: `/docs/general/`, `/docs/exam/civil-construction-1/`, `/docs/exam/pe/`, `/docs/exam/rccm/`

### コンテンツの移動は原則禁止

- ファイルをディレクトリ間で移動する必要が生じた場合は、Cloudflare Pages の `public/_redirects` で 301 redirect を設定して URL を維持する

### 過去問ファイルの命名規則

- 年号で区切る: `r05.mdx`（令和5年度）, `r04.mdx`（令和4年度）
- 出題段階を区切る（試験が二段階の場合）: `r05-a.mdx`（第1次）, `r05-b.mdx`（第2次）

---

## frontmatter フィールド仕様

### 新フィールド: `exams`

```yaml
exams: string[]
```

- **型**: 文字列配列
- **必須**: いいえ（optional）
- **デフォルト**: `undefined`
- **用途**: 記事が対応する資格試験の識別子リスト
- **取りうる値**: 上記「資格識別子定義表」の `exam-id` 列の値

**記述例**

```yaml
---
title: コンクリート工概説
exams:
  - civil-construction-1
  - concrete-engineer
  - pe
---
```

### 既存フィールド（参考）

| フィールド | 型 | 必須 | 用途 |
|---|---|---|---|
| `title` | string | ✅ | ページタイトル |
| `description` | string | ❌ | メタディスクリプション |
| `sidebar_label` | string | ❌ | サイドバー表示名 |
| `sidebar_position` | number | ❌ | サイドバー内の並び順 |
| `id` | string | ❌ | doc ID の明示指定 |
| `toc_min_heading_level` | number | ❌ | TOCに表示する最小見出し |
| `toc_max_heading_level` | number | ❌ | TOCに表示する最大見出し |
| `source` | SourceMeta \| SourceMeta[] | ❌ | 出典情報（title/author/date/url） |
| `draft` | boolean | ❌ | 非公開フラグ |

---

## サイドバー追加時の手順

新しい資格対応を追加する際に、サイドバーをナビバーに表示させる場合の手順です。

### 1. サイドバー定数の作成（`src/lib/sidebar.ts`）

```ts
export const concreteEngineerSidebar: Sidebar = [
  {
    type: 'category',
    label: 'コンクリート技士試験',
    link: { type: 'generated-index', slug: 'exam/concrete-engineer' },
    items: [
      'exam/concrete-engineer/index',
      {
        type: 'category',
        label: '対策ガイド',
        items: [
          'exam/concrete-engineer/guide/strategy',
          'exam/concrete-engineer/guide/timeline',
        ],
      },
      {
        type: 'category',
        label: '過去問',
        items: [
          'exam/concrete-engineer/past-questions/r05',
          'exam/concrete-engineer/past-questions/r04',
        ],
      },
    ],
  },
];
```

### 2. `sidebars` オブジェクトに登録

```ts
export const sidebars: SidebarConfig = {
  examSidebar,
  generalSidebar,
  concreteEngineerSidebar,  // ← 追加
};
```

### 3. ナビバーに追加（`navbarItems` の修正）

```ts
const navbarItems: NavbarItem[] = [
  // ...既存項目...
  {
    label: 'コンクリート技士',
    href: '/docs/exam/concrete-engineer',
  },
];
```

---

## トラブルシューティング

### サイドバーが表示されない場合

- `sidebars` オブジェクトに登録されているか確認
- ファイルパスが正確か確認（`content/` の相対パス）
- `npm run build` を実行して、`generateStaticParams` が新コンテンツを認識しているか確認

### `exams` フィールドが型チェックでエラーになる場合

- `src/lib/content.ts` で `DocMeta` に `exams?: string[]` が定義されているか確認
- TypeScript キャッシュをクリア: `rm -rf .next/`
- `npm run build` で再ビルド

---

## 将来の拡張（Phase 2以降）

このガイドラインに従うことで、以下の資格対応が段階的に可能になります。

**Phase 2（2026年内）**
- コンクリート技士・主任技師
- 測量士

**Phase 3（2027年以降）**
- 2級土木施工管理技士
- 技術士（他部門）
- その他土木系資格

各フェーズでのコンテンツ追加は、既存URL に影響を与えず、このガイドラインのルールに従うだけで実現できます。
