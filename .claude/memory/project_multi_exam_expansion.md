---
name: 複数資格対応URL設計の実装
description: 1級土木施工管理技士専用サイトから複数資格対応への展開設計と実装
type: project
---

## 決定事項

**2026-04-01:** 複数土木系資格対応のためのURL設計を案A（分野最上位）で確定し実装完了。

### 設計の基本方針

- 共通コンテンツ（複数資格で共用）は `/docs/general/{分野}/` に配置
- 試験特化コンテンツ（過去問・試験対策）は `/docs/exam/{exam-id}/` に配置
- 複数資格対応記事は frontmatter の `exams: string[]` で関連を宣言
- URL移行不要（既存の `content/` 構成がすでに案Aに近い）

### 対象資格と優先順位

Phase 1（完了・既存）
- 1級土木施工管理技士（civil-construction-1）- 年51,193人
- 技術士建設部門（pe）- 年14,094人
- RCCM（rccm）- 小規模

Phase 2（2026年実装予定）
- コンクリート技士（concrete-engineer）- 年9,000人
- コンクリート主任技師（concrete-chief-engineer）- 年3,156人
- 測量士（surveying）- 年3,717人

Phase 3（2027年以降）
- 2級土木施工管理技士（civil-construction-2）- 年26,000人推定
- 測量士補（surveying-assistant）- 年13,363人
- 技術士他部門

### コンテンツ重複率

- 1級土木 ↔ 技術士建設：35-40%
- 1級土木 ↔ コンクリート技士：20-25%
- 1級土木 ↔ 測量士：10-15%
（重複率30-40%は「分野最上位」設計が最適）

## 実装内容

### 1. `src/lib/content.ts` 修正
- `DocMeta` インターフェースに `exams?: string[]` を追加
- optional のため既存ファイルへの後方互換性維持

### 2. `docs/00_プロジェクト管理/07_URL設計ガイドライン.md` 新規作成
- 資格識別子テーブル（8資格）
- コンテンツ配置ルール（共通 vs 試験特化）
- コンクリート技士の具体的配置例
- SEO保護ルール
- frontmatter 記述仕様
- サイドバー追加時の手順

### 3. `CLAUDE.md` 更新
- ディレクトリ構成を実態の `content/` ベースに修正（旧：docs/ ベース）
- サイト構成テーブルに未実装の新資格カテゴリを追記
- URL設計ルールの新セクション追加

## 検証結果

```
✓ Build successful (Compiled in 24.9s)
✓ Static page generation: 156/156 pages
✓ TypeScript: No errors
✓ Sitemap: 154 URLs
```

## 将来の拡張時の手順（参考）

1. `content/exam/{新exam-id}/` ディレクトリ作成
2. `src/lib/sidebar.ts` にサイドバー定数追加＆登録
3. 共通コンテンツ MDX に `exams: [...]` 追記
4. 必要に応じて `navbarItems` に追加

すべて `07_URL設計ガイドライン.md` に詳細記載済み。

**Why:** 複数資格対応により、単一試験向けから複数資格をカバーするプラットフォーム型へのスケーリングが可能になる。重複コンテンツを排除しながらSEO効率を維持する設計。

**How to apply:** 新資格コンテンツ追加時は、ガイドラインの資格識別子テーブルと配置ルールに従う。既存URL変更禁止。
