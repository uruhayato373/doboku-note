# SEO総合レビュー: doboku-note

**レビュー日**: 2026-04-08
**対象サイト**: https://doboku-note.com
**レビュー視点**: SEO専門家 + 連続Webサイト起業家
**技術スタック**: Next.js 16 (SSG) + MDX + Cloudflare Pages

---

## 1. エグゼクティブサマリー

### 総合SEOスコア: 58/100

技術基盤は堅実（SSG、構造化データ、サイトマップ、canonical）だが、**コンテンツ品質の致命的問題**がサイト全体のSEOポテンシャルを大幅に制限している。732ページ中509ページ（69.5%）がスタブ（内容準備中）であり、Googleのthin contentポリシーに抵触するリスクが高い。

### Top 3: 既に実現できていること

| # | 評価ポイント | 詳細 |
|---|---|---|
| 1 | **完全SSG + Cloudflare Pages** | 全735 URLがビルド時にプリレンダリング済み。JSなしで完全にクローラブル。CDNエッジ配信でTTFBも良好 |
| 2 | **構造化データ（JSON-LD）の多層実装** | WebSite（SearchAction付き）+ Organization + TechArticle + Quiz（過去問自動判定）の4種。`StructuredData.tsx`で一元管理 |
| 3 | **試験2種×過去問+キーワードの独自URL体系** | `/docs/{flat-slug}` のフラット設計で、1級土木と技術士総監の両コンテンツを一元管理。競合で両試験をカバーするサイトは存在しない |

### Top 3: 致命的な問題

| # | 問題 | 影響 | 緊急度 |
|---|---|---|---|
| 1 | **509ページがthin content** | サイト全体の品質スコア低下、インデックス除外リスク、AdSense審査不合格リスク | 即座に対応 |
| 2 | **580ページにmeta descriptionなし** | SERP表示でGoogleが自動生成→CTR低下、ブランド訴求機会の損失 | 今週中 |
| 3 | **`_headers`ファイルなし** | キャッシュ制御なし（リピート訪問の速度低下）、セキュリティヘッダーなし（Lighthouse減点） | 今週中 |

### 起業家視点での総評

> **現状は「基礎工事は完璧だが、建物の7割が足場だけ」の状態。**
>
> 技術的SEO基盤（SSG、構造化データ、サイトマップ、canonical URL）は競合6社より優れている。しかし509のスタブページが「コンテンツ農場」と誤認されるリスクがある。
>
> **最優先アクション**: スタブページを非公開にしてサイト品質を守りつつ、試験シーズン（7月）に向けて高頻出キーワードから優先的にコンテンツを充填する。これにより「量」ではなく「質」でGoogleの信頼を獲得し、ドメインオーソリティを育てる。

---

## 2. テクニカルSEO監査

### 2.1 クロール・インデックス

| 項目 | 状態 | 詳細 |
|---|---|---|
| サイトマップ | OK | `scripts/generate-sitemap.mjs` で自動生成。735 URL。優先度分け（ガイド0.8 / 過去問0.7 / キーワード0.6） |
| robots.txt | OK | `public/robots.txt` — `Allow: /` + サイトマップ参照 |
| Canonical URL | OK | `metadataBase: new URL("https://doboku-note.com")` + ページ別 `alternates.canonical` |
| 404ページ | OK | `src/app/not-found.tsx` — 日本語メッセージ + トップへ誘導 |
| error.tsx | **未実装** | ランタイムエラー時にNext.jsデフォルトエラーページが表示される。クローラーが500系を検出するリスク |
| robots meta | OK | `index: true, follow: true` + `max-image-preview: large` |

**問題: サイトマップにスタブページが含まれている**

`generate-sitemap.mjs` はビルド後の `out/` ディレクトリからHTMLファイルを列挙するため、`published: true` のスタブページもすべてサイトマップに含まれる。Googleにthin contentページをクロール依頼していることになる。

```
対象ファイル: scripts/generate-sitemap.mjs
修正方針: frontmatterの published フラグまたは最小行数チェックでフィルタリング
```

### 2.2 Core Web Vitals & パフォーマンス

#### 画像最適化

**重大度: High**

```javascript
// next.config.mjs (line 5)
images: { unoptimized: true }
```

`output: 'export'` （静的エクスポート）ではNext.js Image Optimizationが使えないため、画像は元サイズのままR2から配信される。WebP/AVIF変換なし、srcset生成なし。

- **影響**: LCP（Largest Contentful Paint）の悪化。特に過去問ページの図版（`.local/r2/posts/civil-construction-1/primary/img/`）が大きい
- **修正案**: 
  - A) Cloudflare Image Resizing（有料プラン）で自動最適化
  - B) ビルド時に `sharp`（既にdependenciesに存在）でWebP変換スクリプトを実行
  - C) `ArticleImage` コンポーネント（`src/components/ui/ArticleImage/ArticleImage.tsx`）に `sizes` prop を追加

#### キャッシュ制御

**重大度: Critical**

`public/_headers` ファイルが存在しない。Cloudflare Pagesのデフォルトキャッシュに依存しており、以下が未設定:

- 静的アセット（`/_next/static/*`）の長期キャッシュ
- 画像ファイルの中期キャッシュ
- HTMLのキャッシュ無効化（再デプロイ時の即時反映）
- セキュリティヘッダー（CSP, HSTS, X-Frame-Options）

```
作成すべきファイル: public/_headers
推奨内容:

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=604800

/search-index.json
  Cache-Control: public, max-age=3600, must-revalidate
```

#### フォント読み込み

```typescript
// src/app/layout.tsx (lines 15-27)
const inter = Inter({ subsets: ["latin"], display: "swap", preload: true });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], display: "swap", preload: true });
```

- `next/font/google` によるセルフホスティング — 外部リクエストなし（Good）
- `display: "swap"` — FOIT防止（Good）
- Noto Sans JP の `subsets: ["latin"]` は next/font が日本語グリフを自動ダウンロードするため実質的な問題なし

#### バンドルサイズ

| ライブラリ | サイズ（概算） | 読み込み方式 | 影響 |
|---|---|---|---|
| Mermaid | ~500KB | `dynamic import`（クライアント） | 図を使うページのみ。OK |
| KaTeX CSS | ~30KB | ビルド時レンダリング | サーバーサイド処理。OK |
| MiniSearch | ~15KB + インデックス376KB | クライアント（検索ページのみ） | 検索ページのFCP影響。許容範囲 |
| Recharts | ~200KB | `dynamic import` | 使用ページのみ。OK |

コンポーネントローダー（`src/lib/component-loader/index.ts`）がMDX内容を解析して必要なコンポーネントのみ動的インポートしている点は優秀。

### 2.3 構造化データ監査

**ファイル**: `src/components/seo/StructuredData.tsx`

| スキーマ | 実装 | 状態 | 改善点 |
|---|---|---|---|
| WebSite + SearchAction | line 107-119 | OK | — |
| Organization | line 121-137 | OK | logo画像を追加すべき |
| TechArticle | line 79-102 | **部分的** | `datePublished` が `(docMeta as any).created` 依存 — 732ページ中87ページのみ有効。645ページで `undefined` が出力 |
| Quiz | line 26-44 | OK | `past-questions` タグで自動判定 |
| **BreadcrumbList** | **未実装** | **欠如** | 視覚的パンくず（`← カテゴリ名`）は存在するがJSON-LDなし。リッチリザルト機会損失 |
| **FAQPage** | **未実装** | **欠如** | 試験対策コンテンツはQ&A形式が多く、FAQリッチリザルトの絶好の機会 |
| **HowTo** | **未実装** | 低優先 | 勉強法ガイドページに適用可能 |

**BreadcrumbList の追加（推奨）**:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://doboku-note.com" },
    { "@type": "ListItem", "position": 2, "name": "技術士 総合技術監理部門", "item": "https://doboku-note.com/category/pe-comprehensive-management" },
    { "@type": "ListItem", "position": 3, "name": "フォロワーシップ" }
  ]
}
```

対象ファイル: `src/components/seo/StructuredData.tsx` に `breadcrumb` type を追加

### 2.4 モバイル & アクセシビリティ

| 項目 | 状態 | 詳細 |
|---|---|---|
| `lang="ja"` | OK | `layout.tsx` の `<html>` タグ |
| viewport | OK | Next.js自動挿入 |
| レスポンシブデザイン | OK | Tailwind CSS ブレイクポイント全域 |
| モバイルナビ | OK | ドロワーメニュー + ESCキー対応 |
| alt属性 | OK | `ArticleImage` コンポーネントで必須prop |
| ARIA | OK | ヘッダーメニューボタンに `aria-expanded`, `aria-haspopup` |
| セマンティクスHTML | OK | `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>` |

---

## 3. オンページSEO監査

### 3.1 メタタグ

#### タイトルタグ

```typescript
// src/lib/metadata.ts (line 12-15)
title: {
  default: "doboku-note - 土木系資格試験 専門技術ノート",
  template: "%s | doboku-note",
}

// src/app/docs/[...slug]/page.tsx (line 102)
title: `${doc.meta.title} | doboku-note`
```

- テンプレート方式でブランド名が末尾に付く — OK
- ただしドキュメントページは `template` を使わず直接文字列結合している — 動作は同じだが保守性の観点で `template` に統一推奨

#### Meta Description

**重大度: Critical**

```typescript
// src/app/docs/[...slug]/page.tsx (line 103)
description: doc.meta.description || doc.meta.title
```

732ページ中580ページ（79.2%）に `description` frontmatterがない。これらはすべてタイトルがmeta descriptionにフォールバックする。

**影響**:
- Googleは同一文言のtitle/descriptionを低品質と判定する傾向
- 検索結果でGoogleが自動スニペットを生成 → ブランドメッセージのコントロール不能
- CTR（クリック率）が最大30%低下する可能性（industry benchmark）

**修正案**:
1. コンテンツのあるページ（223ページ）: 最初の段落から自動抽出するスクリプト
2. スタブページ（509ページ）: 先に非公開化、コンテンツ作成時に description も同時記載

### 3.2 見出し構造

- H1: MDXコンテンツの `# タイトル` から — テンプレートではなくコンテンツ側で管理（Good）
- TOC: H2〜H4を `src/lib/toc.ts` で抽出。`toc_min/max_heading_level` frontmatterで制御可能
- 見出しID: `src/lib/rehype-heading-ids.ts` で日本語対応のID生成 — フラグメントリンク対応（Good）
- 過去問ページ: `toc_max_heading_level: 2` で設問番号のみTOC表示（Good）

### 3.3 内部リンク構造

#### 現状の内部リンク手段

| 手段 | 実装場所 | カバー範囲 |
|---|---|---|
| カテゴリパンくず | `docs/[...slug]/page.tsx` line 181-191 | 記事 → カテゴリ |
| 関連記事カード | `RelatedArticles.tsx` + `related-articles.ts` | 同カテゴリ内4記事 |
| カテゴリページ一覧 | `category/[slug]/page.tsx` | カテゴリ → 全記事 |
| ヘッダーナビ | `Header.tsx` | トップ → カテゴリ |
| フッターリンク | `Footer.tsx` | トップ → カテゴリ / 静的ページ |
| RelatedKeywords | MDX内コンポーネント | キーワード間相互リンク |

#### 欠けている内部リンク

1. **カテゴリ間リンク**: 1級土木と技術士総監で共通するトピック（品質管理、安全管理など）の相互リンクがない。トピカルオーソリティの損失
2. **ピラーページ**: 5管理分野（経済性・人的資源・情報・安全・社会環境）のまとめページが不在。各キーワードページへの放射状リンク構造がない
3. **パンくず**: 「← カテゴリ名」は1階層のみ。技術士コンテンツは「ホーム > 技術士総監 > 安全管理 > キーワード名」の3-4階層が理想
4. **検索へのリンク**: ヘッダーナビに検索ページ（`/search`）へのリンクなし

### 3.4 画像SEO

| 項目 | 状態 | 詳細 |
|---|---|---|
| alt属性 | OK | `ArticleImage` コンポーネントで必須 |
| ファイル名 | OK | R2パス構造（`/posts/{slug}/img/{descriptive-name}`） |
| 遅延読み込み | OK | `loading="lazy"` （SVG）、Next.js Image（非SVG） |
| WebP/AVIF | **未対応** | `unoptimized: true` のため元フォーマットのまま配信 |
| sizes属性 | **未設定** | `ArticleImage` に `sizes` prop なし。CLS悪化リスク |
| figcaption | 対応済み | キャプション表示あり |

### 3.5 OGP画像

**重大度: Medium**

```typescript
// src/app/docs/[...slug]/page.tsx (line 113-118)
images: [{
  url: '/images/og-default.png',
  width: 1200,
  height: 630,
  alt: doc.meta.title,
}]
```

全732ページが同一の `og-default.png` を使用。SNSでシェアされた際にすべて同じ見た目になり、差別化できない。

**修正案**:
- A) Cloudflare Workers + `@vercel/og` 互換のEdge関数で動的生成
- B) ビルド時に `satori` + `sharp` で各ページのタイトルを含むOG画像を生成
- C) 短期的には主要カテゴリ別のOG画像（2-3種）を用意

---

## 4. コンテンツ戦略

### 4.1 コンテンツインベントリ

| 指標 | 数値 |
|---|---|
| 総MDXファイル数 | 732 |
| PE総合技術監理 | 676 |
| 1級土木施工管理技士 | 56 |
| スタブページ（"内容準備中"） | 509（全体の69.5%） |
| description あり | 152（全体の20.8%） |
| created 日付あり | 87（全体の11.9%） |
| published: false | 2 |
| サイトマップURL数 | 735 |

### 4.2 Thin Contentの危機

**重大度: Critical — サイト全体のランキングに影響**

509ページが以下のようなスタブ状態:

```mdx
---
title: "多面評価（360度評価）"
category: pe-comprehensive-management
section: "2.3"
tags:
  - 総合技術監理
  - keyword
published: true
---

# 多面評価（360度評価）

（内容準備中）
```

これらは `published: true` でサイトマップにも含まれているため、Googleが積極的にクロールする。

**Googleのthin content判定基準**:
- ページの大部分がboilerplate（テンプレート）で実質的な独自コンテンツがない
- 同パターンの大量ページが存在する（509ページが同一パターン）
- ユーザーに価値を提供しない

**起業家としての判断**:

> 509ページを即座に非公開（`published: false`）にする。これは「サイト縮小」ではなく「品質防衛」。
>
> - インデックスされたthin contentがドメイン全体の評価を下げるリスクは、509ページ分のロングテール流入機会より遥かに大きい
> - コンテンツが準備でき次第、バッチ（20-30ページ単位）で再公開する
> - 試験シーズン（7月）までに高頻出キーワード100ページを優先充填

### 4.3 E-E-A-T（経験・専門性・権威性・信頼性）

| E-E-A-T要素 | 現状 | 改善策 |
|---|---|---|
| **Experience** | 弱 | 著者の資格保有・実務経験の記載なし。`/about` ページに経歴を追加 |
| **Expertise** | 中〜強 | 既存コンテンツ（戦略ガイド、過去問解析）は専門性が高い。5管理体系の構造はMEXTキーワード集と整合 |
| **Authoritativeness** | 弱 | 外部被リンク戦略なし。SNS（`@doboku_note`）のみ。業界サイト・教育機関からの引用なし |
| **Trustworthiness** | 中 | プライバシーポリシー・利用規約あり。HTTPS。`ads.txt` 設定済み。ただし匿名運営 |

**起業家としてのE-E-A-T強化策**:

1. **著者プロフィールの具体化**: `/about` ページに「保有資格」「実務年数」「合格体験」を追加。匿名でも「1級土木施工管理技士合格者が運営」は書ける
2. **構造化データの著者情報**: `Organization` → `Person`（or 両方）に変更し、`sameAs` にSNSリンクを追加
3. **外部権威の引用**: コンテンツ内で国土交通省、文部科学省、建設業振興基金の公式資料を明示的に引用・リンク
4. **被リンク獲得**: 技術士会、施工管理技士の勉強コミュニティへの寄稿・紹介依頼

### 4.4 ピラー・クラスターモデル（提案）

現在の構造はフラットすぎる。以下のピラー・クラスター構造を提案:

```
[ピラーページ] 技術士総監 安全管理 完全ガイド
  ├── [クラスター] 安全管理の基本概念 (safety-control)
  ├── [クラスター] システム安全 (system-safety)
  ├── [クラスター] 安全文化 (safety-culture)
  ├── [クラスター] レジリエンス (resilience)
  ├── [クラスター] 労働安全衛生法 (occupational-safety)
  ├── [クラスター] ...全安全管理キーワード
  └── [クラスター] 過去問: 安全管理分野

[ピラーページ] 1級土木 第2次検定 完全攻略
  ├── [クラスター] コンクリート工 (concrete/basics)
  ├── [クラスター] 土工 (earthwork/basics)
  ├── [クラスター] 施工計画 (construction-plan/basics)
  ├── [クラスター] 品質管理 (quality-management/basics)
  └── [クラスター] 経験記述 (experience-writing/guide)
```

ピラーページは各管理分野の概要 + 全クラスターへのリンクを持つ。これにより:
- Googleがサイトの専門性構造を理解しやすくなる
- 内部リンクジュースがピラーに集約され、重要ページのランキングが上がる
- ユーザーの学習動線が明確になる（直帰率低下）

### 4.5 ロングテールキーワード戦略

**起業家視点: ヘッドタームは避け、ロングテールで勝つ**

競合分析（`docs/reviews/competitor-audit/`）から、以下のヘッドタームは大手が独占:

| キーワード | 支配サイト | doboku-noteの勝率 |
|---|---|---|
| "1級土木施工管理技士 勉強法" | CIC, Agaroot, SAT | 低（広告費投下サイト） |
| "1級土木 合格率" | 建設業振興基金, CIC | 低（公式情報） |
| "技術士 総監 過去問" | pejp.net, kakomonn.com | 中（20年の蓄積に勝てない） |

**doboku-noteが勝てるロングテール**:

| キーワード例 | 競合状況 | 理由 |
|---|---|---|
| "技術士 総監 [具体キーワード名] 解説" | 低競合 | kope.info以外に体系的キーワード解説サイトなし |
| "1級土木 令和7年 問題A No.XX 解説" | 中競合 | 最新年度はインデックスが早い者勝ち |
| "総合技術監理 経済性管理 計算問題" | 低競合 | 計算問題の詳細解説は鹿夫ブログ程度 |
| "1級土木 第2次検定 経験記述 [工種]" | 低〜中 | 具体的な工種別テンプレートは希少 |
| "技術士 総監 セクション3.1 出題傾向" | 極低競合 | セクション別分析は市場に存在しない |

---

## 5. 競合優位性分析

### 5.1 doboku-noteの競争優位

競合分析レポート（`docs/reviews/competitor-audit/2026-04-04_civil-construction-1.md`, `2026-04-05_pe-comprehensive-management.md`）を基に評価。

#### 独自の強み（Moat）

1. **両試験一元カバー**: 1級土木（56ページ）+ 技術士総監（676ページ）を同一サイトで提供。競合14サイト中、両方を同等に扱うサイトはゼロ
2. **セクション-キーワードマッピング**: frontmatterの `section` フィールドで5管理26セクションにキーワードを構造化。MEXTキーワード集の体系を完全にWeb化する試みは唯一
3. **技術的優位**: SSG + MDX + Cloudflare Pages の構成は、WordPress系競合（pejp.net, kope.info, certlabo.com）より表示速度・SEO技術面で優位
4. **全文検索**: MiniSearch + `Intl.Segmenter` による日本語全文検索。競合にはクイズ検索（kakomonn.com）はあるがフリーテキスト検索はない

#### 競合に劣る点

| 領域 | 競合の優位 | doboku-noteの対策 |
|---|---|---|
| ドメインパワー | kakomonn.com（50資格横展開）、pejp.net（20年運営） | ロングテール特化で正面衝突を避ける |
| コンテンツ量（実質） | pejp.net: 25年分過去問 / sekou-kanri.com: 18年分 | 509スタブの充填を最優先 |
| インタラクティブ性 | kakomonn.com: クイズモード+解答履歴 | Phase 2のiOSアプリで対応 |
| 著者信頼性 | kope.info, coolangeng.com: 実名技術士 | E-E-A-T強化（著者プロフィール追加） |
| 動画コンテンツ | coolangeng.com: YouTube 20本シリーズ | 現時点では対応不要。テキスト最適化を優先 |

### 5.2 戦略的ポジショニング

```
        [専門性: 高]
             |
   kope.info |  ★ doboku-note（目標位置）
             |
             |
[狭い]-------+--------[広い] ← カバー範囲
             |
 coolangeng  |  pejp.net
             |
        [専門性: 低]

現在位置: 技術基盤は目標位置だが、コンテンツ充填率が31%のため実質的にはkope.infoより下
```

---

## 6. ビジネスインパクト優先度

### 工数/効果マトリクス

```
[効果: 高]
  |
  |  P0: スタブ非公開化     P3: description追加
  |  P1: _headers作成       P4: datePublished追加
  |  P5: GA4有効化確認
  |
  |  P2: BreadcrumbList     P6: 動的OG画像
  |  P7: FAQPage schema     P8: 画像最適化
  |
  |                         P9: RSS/Atom
  |                         P10: ピラーページ
  |
[効果: 低]
  |
  +---- [工数: 小] ---- [工数: 中] ---- [工数: 大] ---->
```

### 優先度別アクションリスト

#### P0: スタブページ非公開化（効果: 最高 / 工数: 小）

**ビジネスインパクト**: thin contentペナルティの予防。AdSense審査合格の前提条件。サイト全体の品質シグナル改善。

```bash
# 509ファイルの published: true → published: false を一括変換
# 対象: .local/r2/posts/pe-comprehensive-management/ 配下で「内容準備中」を含むファイル
```

- 対象ファイル: 509 MDXファイル
- 工数: 1時間（スクリプト実行 + ビルド確認）
- リスク: サイトマップURL数が735→226に減少。短期的にインデックス数は減るが、品質改善効果が上回る

#### P1: `_headers` ファイル作成（効果: 高 / 工数: 極小）

**ビジネスインパクト**: Lighthouse Performance/Security スコア改善。リピート訪問の体感速度向上。

- 作成ファイル: `public/_headers`
- 工数: 30分

#### P2: BreadcrumbList 構造化データ（効果: 高 / 工数: 小）

**ビジネスインパクト**: Google検索結果にパンくずリストが表示され、CTR向上。サイト構造の理解促進。

- 修正ファイル: `src/components/seo/StructuredData.tsx`
- 工数: 2-3時間

#### P3: description の一括追加（効果: 高 / 工数: 中）

**ビジネスインパクト**: SERP CTR 10-30%改善（industry average）。ブランドメッセージのコントロール回復。

- 対象: コンテンツのある223ページ（スタブ除く）
- 方法: MDXの最初の段落（H1直後〜最初のH2）から120-160文字を自動抽出するスクリプト
- 工数: 半日（スクリプト開発 + 目視確認）

#### P4: datePublished / dateModified の追加（効果: 中〜高 / 工数: 中）

**ビジネスインパクト**: 構造化データの `datePublished` が有効になり、Google検索結果に日付が表示される。フレッシュネスシグナル。

- 対象: 645ページ（`created` フィールドなし）
- 方法: gitログまたはファイル作成日から `created` を自動挿入
- 修正ファイル: 645 MDXファイルのfrontmatter + `StructuredData.tsx` のfallback改善
- 工数: 半日

#### P5: GA4有効化の確認（効果: 高（enabler）/ 工数: 極小）

**ビジネスインパクト**: これなしでは全ての改善効果を計測できない。SEO改善のPDCAが回らない。

- 確認事項: Cloudflare Pages の環境変数に `NEXT_PUBLIC_GA_ID=G-8VXJ1RL1HG` が設定されているか
- 関連ファイル: `src/components/GoogleAnalytics.tsx`（コード自体は実装済み）
- 工数: 15分

#### P6: 動的OG画像生成（効果: 中 / 工数: 中）

**ビジネスインパクト**: SNSシェア時の視認性向上。Twitter/LINEでの差別化。

- 工数: 1-2日

#### P7: FAQPage スキーマ（効果: 中 / 工数: 小）

**ビジネスインパクト**: FAQ rich resultsでSERP占有面積拡大。

- 対象: ガイドページ、キーワード解説ページ
- 工数: 3-4時間

#### P8: 画像最適化パイプライン（効果: 中 / 工数: 中〜大）

**ビジネスインパクト**: LCP改善 → Core Web Vitals改善 → ランキングシグナル改善。

- 方法: ビルド時 `sharp` でWebP変換、またはCloudflare Image Resizing
- 工数: 1-2日

#### P9: RSS/Atom フィード（効果: 低〜中 / 工数: 小）

**ビジネスインパクト**: フィードリーダー経由の定期読者獲得。他サイトからの自動引用促進。

- 作成ファイル: `scripts/generate-rss.mjs`（サイトマップ生成と同様のパターン）
- 工数: 2-3時間

#### P10: ピラーページ作成（効果: 中 / 工数: 大）

**ビジネスインパクト**: トピカルオーソリティの確立。内部リンク構造の最適化。ヘッドターム狙い。

- 作成: 5管理分野のピラーページ（5ページ）+ 1級土木分野別ピラー（4-5ページ）
- 工数: 各ページ2-3時間 × 10ページ = 3-4日

---

## 7. 実装ロードマップ

### 試験シーズンを考慮したタイムライン

```
2026年
4月 ─── [Phase 1: 緊急対応] ──────────
         P0 スタブ非公開化
         P1 _headers作成
         P5 GA4有効化確認

4-5月 ── [Phase 2: 基盤強化] ──────────
         P2 BreadcrumbList schema
         P3 description一括追加
         P4 datePublished追加
         P7 FAQPage schema

5-6月 ── [Phase 3: コンテンツ充填] ────
         高頻出キーワード100ページ充填
         ピラーページ5ページ作成
         キーワード→過去問バックリンク強化

7月 ──── [試験シーズン開始] ────────────
         1級土木 第1次検定
         技術士 筆記試験
         → 最新年度過去問の即座公開でSEO獲得

8-9月 ── [Phase 4: 高度化] ────────────
         P6 動的OG画像
         P8 画像最適化
         P9 RSS/Atom
         残りキーワード充填

10月 ─── [1級土木 第2次検定] ──────────
         → 第2次検定コンテンツの強化

11月〜 ─ [Phase 5: 収益化] ────────────
         AdSense本格導入
         アフィリエイト（書籍・講座）
         note有料記事
```

### Phase 1: 緊急対応（今週中）

| タスク | 対象ファイル | 完了基準 |
|---|---|---|
| P0: スタブ509ページを `published: false` に | `.local/r2/posts/pe-comprehensive-management/*/article.mdx` | サイトマップURLが226以下に |
| P1: `_headers` ファイル作成 | `public/_headers` | Lighthouse Security スコア改善 |
| P5: GA4環境変数確認 | Cloudflare Pages 管理画面 | GA4リアルタイムでページビュー確認 |

### Phase 2: 基盤強化（2週間）

| タスク | 対象ファイル | 完了基準 |
|---|---|---|
| P2: BreadcrumbList schema | `src/components/seo/StructuredData.tsx` | Google Rich Results Testで検証OK |
| P3: description自動抽出 | スクリプト + 223 MDXファイル | 公開ページの description 充填率100% |
| P4: datePublished追加 | スクリプト + MDXファイル | StructuredData で datePublished が全ページ有効 |
| P7: FAQPage schema | `src/components/seo/StructuredData.tsx` | ガイドページで FAQ rich result 表示 |
| `error.tsx` 作成 | `src/app/error.tsx` | ランタイムエラー時にカスタムエラーページ表示 |

### Phase 3: コンテンツ充填（4-6週間、試験シーズン前）

| タスク | 数量 | 完了基準 |
|---|---|---|
| 高頻出キーワード充填 | 100ページ | 各ページ300文字以上 + description + 過去問バックリンク |
| ピラーページ作成 | 5ページ（5管理分野） | 各ページ1000文字以上 + 全クラスターへのリンク |
| 1級土木ガイド拡充 | 3-5ページ | 第2次検定の工種別テンプレート |

### Phase 4-5: 高度化・収益化（試験シーズン後）

- 動的OG画像、画像最適化、RSS/Atom
- AdSense実装、アフィリエイト開始
- 残りキーワードページの充填

---

## 8. 技術的な修正コード例

### 8.1 `_headers` ファイル

```
# public/_headers

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=604800

/search-index.json
  Cache-Control: public, max-age=3600, must-revalidate

/*.html
  Cache-Control: public, max-age=3600, must-revalidate
```

### 8.2 BreadcrumbList 構造化データ（追加案）

```typescript
// src/components/seo/StructuredData.tsx に追加

function generateBreadcrumbSchema(docMeta: DocMeta, baseUrl: string) {
  const items = [
    { name: "ホーム", url: baseUrl },
  ];

  if (docMeta.category) {
    items.push({
      name: getCategoryLabel(docMeta.category),
      url: `${baseUrl}/category/${docMeta.category}`,
    });
  }

  items.push({ name: docMeta.title, url: "" }); // 最後の項目はURLなし

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      ...(item.url ? { "item": item.url } : {}),
    })),
  };
}
```

### 8.3 スタブページ一括非公開スクリプト（案）

```bash
# 「内容準備中」を含むMDXファイルの published: true → published: false
find .local/r2/posts/pe-comprehensive-management -name "article.mdx" \
  -exec grep -l "内容準備中" {} \; | \
  xargs sed -i '' 's/^published: true$/published: false/'
```

---

## 9. KPI・効果測定

### 改善前のベースライン（推定）

| 指標 | 現在推定値 | 目標（3ヶ月後） | 目標（6ヶ月後） |
|---|---|---|---|
| インデックス数 | 735（うち509 thin） | 226（品質ページのみ） | 350（充填分込み） |
| オーガニック流入/月 | 計測不能（GA4未確認） | 計測開始 | 500 UU/月 |
| 平均CTR | 不明 | 3%（description改善後） | 5%（リッチリザルト込み） |
| Lighthouse Performance | 未測定 | 85+ | 90+ |
| 構造化データエラー | datePublished未定義多数 | 0エラー | 0エラー |

### 効果測定の方法

1. **Google Search Console**: インデックスカバレッジ、検索パフォーマンス（クリック・表示・CTR・順位）
2. **Google Analytics 4**: ページビュー、セッション、直帰率、ユーザーフロー
3. **Lighthouse CI**: Performance, Accessibility, Best Practices, SEO スコアの継続監視
4. **Rich Results Test**: 構造化データの検証
5. **Core Web Vitals Report**（Search Console内）: LCP, FID, CLS の実測値

---

## 10. まとめ: SEO専門家 × 起業家の結論

### SEO専門家として

doboku-noteの技術的SEO基盤は、日本の資格試験対策サイト市場で上位水準にある。SSG + 構造化データ + canonical + サイトマップの組み合わせは教科書的に正しい。しかし **コンテンツ品質**（509スタブ、580 description欠如）が技術基盤のポテンシャルを完全に相殺している。技術を活かすにはコンテンツが必要。

### 連続起業家として

3つの戦略的判断が必要:

1. **「量より質」への転換**: 735ページの見かけの規模を捨て、226ページの品質サイトとして再出発する勇気。Googleは騙せない
2. **試験シーズンに間に合わせる**: 4月→7月の3ヶ月で「公開できるページ数」を最大化する。1日3-5ページの充填ペースで100ページ追加が現実的ターゲット
3. **収益化は品質確立後**: AdSenseもアフィリエイトも、十分なコンテンツ品質とトラフィック実績の後。焦った収益化はGoogleポリシー違反リスク

**最も重要な一歩**: 今日中にスタブページを非公開にし、GA4が動いていることを確認する。この2つだけで、サイトのSEO健全性は劇的に改善する。
