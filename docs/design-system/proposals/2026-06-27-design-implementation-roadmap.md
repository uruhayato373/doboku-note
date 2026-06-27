# 2026-06-27 デザイン改善 実装ロードマップ

> [!done]
> **実装完了（2026-06-27）**: Phase 0-5 + コンポーネント層 token 化を PR #284-#290 で実施・本番 deploy 済み。Phase 0 で挙げたデッドコード整理（`docs/reviews/code/2026-06-27-dead-code-candidates.md`）も `bbbc39ab8` + PR #284 で完結。本ロードマップは実装記録として保持する。

目的: 分散していたレビュー・提案・handoff を統合し、デザイン改善で「何を、どの順番で、どこまでやるか」を一つの実装順序に整理する。

参照元:

- `docs/design-system/proposals/2026-06-27-all-pages-design-review.md`
- `docs/design-system/proposals/2026-06-27-docs-template-improvement.md`
- `docs/reviews/weekly/2026-W26.md`
- `docs/handoffs/_archive/2026-06-27-design-precheck-review.md`

---

## 結論

最初にやるべきことは `/links` の個別改修ではなく、全ページの土台を揃える **Phase 0: 共通 PageShell 整備**。

理由:

- ページごとに `max-w-[1280px]` / `max-w-[1200px]` / `max-w-5xl` / `max-w-[880px]` / `max-w-[780px]` / `max-w-[760px]` が混在している。
- Hero / PageHeader の有無や高さがページごとに違い、同じサイトに見えにくい。
- `primary-*` / `gray-*` / `blue-*` / `cyan-*` の旧 Tailwind 色指定が残っている。
- PC 右サイドバーの sticky 固定が docs/category で読中に追従している。

したがって、実装順は以下で確定する。

1. Phase 0: 共通 PageShell / PageHeader / token / sticky 解除
2. Phase 1: Docs 記事テンプレート
3. Phase 2: Category + Search
4. Phase 3: Links Action Hub
5. Phase 4: Tools
6. Phase 5: About + Legal + 404

---

## 採用する設計原則

### 統一感の作り方

統一感は「全ページを同じレイアウトにする」ことではなく、以下を揃えることで作る。

- 外枠幅
- 上部構造
- 余白
- 見出し
- カード
- CTA
- 色 token
- 右サイドバーを置く/置かない判断基準

### 幅の基準

| 用途 | 基準 |
|---|---|
| Site shell | `max-w-[1280px]` + `px-4 sm:px-6 lg:px-10` |
| Article shell | `max-w-[1200px]` から始め、必要なら `1280px` へ寄せる |
| Content rail | `max-w-[780px]`〜`860px` を内側 rail として使う |
| Sidebar | `300px` |

単カラムページでもページ全体の外枠は変えない。読み幅だけ内側の content rail で制御する。

### Hero / PageHeader

- Hero はトップページ専用。
- 下層ページは原則 `PageHeader` に統一する。
- `/links` も大型 Hero ではなく、薄い `PageHeader` + action grid にする。
- `/about` / Tools / Legal / Search も同じ上部構造に寄せる。

### 右サイドバー

右サイドバーは以下に限定する。

- `/docs/[slug]`
- `/category/[slug]`

以下には追加しない。

- `/links`
- `/search`
- `/about`
- `/privacy`
- `/terms`
- `/tools`

理由:

- `/search`: 検索入力と結果比較への集中が最優先。
- `/links`: 試験選択カード・教材ブロックを全幅で大きく見せる方がクリックにつながる。
- `/about`: 著者・編集方針・資格は本文そのものなので、右に逃がさない。

PC 右サイドバーの `sticky` 固定は一旦解除する。必要なら後で「目次だけ軽く sticky に戻す」案を検討する。

---

## Phase 0: 共通 PageShell 整備

目的: 各ページを触る前に、サイト全体の見え方を揃える。

優先度: 最優先

対象:

- `src/app/links/page.tsx`
- `src/app/search/SearchPageClient.tsx`
- `src/app/about/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/tools/**`
- `src/app/docs/[...slug]/page.tsx`
- `src/app/category/[slug]/page.tsx`
- 共通 UI components

やること:

1. `PageShell` を作る。
   - 外枠: `max-w-[1280px]`
   - padding: `px-4 sm:px-6 lg:px-10`
   - variant: `default` / `article` / `content`

2. `PageHeader` を作る。
   - breadcrumb
   - label
   - h1
   - lead
   - optional actions
   - 下層ページの Hero を置き換える

3. `SectionBlock` / `SectionCard` を作る。
   - section 間余白を統一
   - カード radius / border / shadow を editorial token に統一
   - カード内カードを避ける

4. token を揃える。
   - `primary-*` / `gray-*` / `blue-*` / `cyan-*` を減らす
   - `var(--accent)` / `var(--accent-fill)` / `var(--paper)` / `var(--rule-soft)` / `var(--ink*)` へ寄せる

5. デッドコード候補を整理する。
   - 詳細: `docs/reviews/code/2026-06-27-dead-code-candidates.md`
   - `src/components/icons/CategoryIcons.tsx`: `React` import が未使用。
   - `src/lib/mdx-callout-parser.ts`: `replace` callback の `match` 引数が未使用。
   - `ResolvedPlacement.inlineMobileOnly`: 返り値に残るが呼び出し側で読まれていない。
   - `src/lib/component-loader/common.ts` / `specific.ts`: `commonLoaders` と二重管理。`AuthorCallout` は一覧にあるが loader にない。
   - `getAllAvailableComponentNames()`: repo 内の参照が見当たらない。必要なら `commonLoaders` から導出し、不要なら削除する。
   - `src/components/search/SidebarSearch.tsx`: repo 内の参照が見当たらない。
   - `src/components/layout/SidebarNav.tsx` / `GeneratedIndexPage.tsx` / `src/lib/sidebar.ts`: 相互に依存する旧ナビ系だが、外部からの参照が見当たらない。
   - `src/components/home/ReferenceCardLink.tsx`: barrel export されているが使用箇所が見当たらない。
   - `src/components/providers/ErrorBoundary.tsx`: `BlogErrorBoundary` / `withErrorBoundary` / `ImageWithFallback` の使用箇所が見当たらない。

6. PC 右サイドバーの sticky を解除する。
   - `src/components/ui/ArticleSidebar/ArticleSidebar.tsx`
   - `src/app/category/[slug]/page.tsx`

7. Footer / Privacy / Terms の収益表記を確認する。
   - Amazon アソシエイト表記を残すか削るか、実態に合わせて同時調整する。

完了条件:

- 下層ページの上部が `PageHeader` で揃っている。
- ページ外枠が原則 `max-w-[1280px]` に揃っている。
- 単カラムページは content rail で読み幅を制御している。
- docs/category の右サイドバーが追従しない。
- token 混在が目立つ主要ページから消えている。
- デッドコード候補について、削除するか残す理由が明確になっている。

検証:

```bash
npm run type-check
npm run lint
npm test
```

スクリーンショット確認:

- `/`
- `/docs/[slug]`
- `/category/[slug]`
- `/search`
- `/links`
- `/about`
- `/tools`

---

## Phase 1: Docs 記事テンプレート

目的: 長文記事を「試験対策の学習シート」として読みやすくする。

対象:

- `src/app/docs/[...slug]/page.tsx`
- `src/components/ui/ArticleSidebar/ArticleSidebar.tsx`
- `src/components/ui/ArticleFooter/ArticleFooter.tsx`
- 新規 `ArticleHeader`
- 新規 `ArticleFooterSection`

やること:

1. `ArticleHeader` を追加する。
   - breadcrumb
   - h1
   - description
   - category / group / section / updated などの meta
   - mobile での折り返し確認

2. 記事末を区画化する。
   - 参考資料
   - 復習・関連学習
   - 有料教材
   - FAQ / 転職 CTA
   - 関連記事
   - 著者

3. サイドバー密度を調整する。
   - 並び順はまず現状維持
   - sticky は解除済みの前提
   - `AuthorSidebarCard` を必要なら圧縮
   - TOC の視認性を改善

完了条件:

- 記事冒頭で「どの試験・どの段階・何を解決するか」が分かる。
- 記事末の次アクションが区画ごとに判断できる。
- CTA が本文途中を邪魔しない。

---

## Phase 2: Category + Search

目的: 学習ハブと検索導線を editorial token で揃え、目的に集中できる構成にする。

### Category

対象:

- `src/app/category/[slug]/page.tsx`
- `src/components/category/CategoryViews.tsx`
- `src/components/category/CategorySections.tsx`

やること:

- `CategoryHeader` / `CategoryContent` / `CategorySidebar` に薄く分割する。
- 人気記事は「はじめに読む」ブロックとして位置づける。
- 右サイドバーは残すが sticky は戻さない。
- `gray/blue` 系直指定を token 化する。

### Search

対象:

- `src/app/search/SearchPageClient.tsx`
- `src/components/search/**`

やること:

- Search UI を editorial token に統一する。
- 検索前ゼロステートを追加する。
  - 人気キーワード
  - 試験別入口
  - 最近読まれている記事
- 右サイドバーは追加しない。
- 結果カードを `SearchResultCard` または `DocCard` 相当へ寄せる。

完了条件:

- Category は学習ハブとして情報優先度が整理されている。
- Search は検索入力・絞り込み・結果比較に集中できる。
- 両ページの上部と外枠が Phase 0 のルールに揃っている。

---

## Phase 3: Links Action Hub

目的: `/links` を「文字中心のリンク集」から「試験選択 + 教材選択」のアクションハブへ変える。

対象:

- `src/app/links/page.tsx`
- `src/lib/note-magazines.ts`
- 既存 `MagazineSidebarCard` 系コンポーネント

やること:

1. `LinksHero` ではなく、下層共通 `PageHeader` を使う。
   - 主役は著者紹介ではなく「受験する試験を選ぶ」こと。

2. `ExamActionGrid` を作る。
   - 試験別カードを大きく配置
   - 各カードに `無料ガイド` / `note教材` の2アクション
   - 外部リンクだけ icon を付ける

3. `FeaturedProductRail` を作る。
   - 総監の全部入りなど主力商品を短い説明 + 表紙/画像 + 価格 + CTA で見せる
   - テキストカードだけにしない

4. `SupportLinks` を作る。
   - 運営者
   - SNS
   - About
   - 必要な補助情報だけ下部へ集約

5. UTM を整理する。
   - 既存 UTM は維持
   - `utm_content` を `exam-card-free-*` / `exam-card-paid-*` / `featured-product-*` のようにクリック位置が分かる命名へ寄せる

完了条件:

- ファーストビューで受験試験を選べる。
- 無料導線と有料教材導線が視覚的に区別できる。
- 文字を読まなくても主アクションが分かる。
- サイト全体の外枠・PageHeader・カード文法に揃っている。

---

## Phase 4: Tools

目的: 無料ツール群を同じ操作文法に揃え、カテゴリ/記事からの補助導線として使いやすくする。

対象:

- `/tools`
- `/tools/kakomon-quiz`
- `/tools/juken-shikaku`
- `/tools/keiken-charcount`

やること:

- `ToolPageHeader` は作らず、共通 `PageHeader` の tool variant で足りるか確認する。
- Tools 一覧に「使うタイミング」を追加する。
- Quiz 結果画面に「次にやること」を3択で出す。
- 受験資格判定のルート選択を segmented/card 選択へ寄せる。
- 文字数カウンターの controls を整理し、注意書きを折りたたみまたは要点先出しにする。

完了条件:

- Tools 系ページの幅・上部・フォーム余白が揃っている。
- 入力から結果までの視線移動が短い。

---

## Phase 5: About + Legal + 404

目的: 低リスクページを共通テンプレートへ寄せ、信頼感と復帰導線を整える。

対象:

- `/about`
- `/privacy`
- `/terms`
- `/contact`
- `not-found`

やること:

- About は信頼形成に絞る。
- 対応試験一覧は簡潔にし、詳細はカテゴリへ送る。
- Privacy / Terms を共通 legal layout に統一する。
- Terms 末尾の問い合わせリンクは `/contact` へ揃える。
- 404 に `検索する` と `資格一覧へ` を追加する。

完了条件:

- About / Legal / Contact が同じ外枠・PageHeader・SectionCard で見える。
- 法務ページは華美ではなく、仕様書風に読める。
- 404 から検索・カテゴリへ復帰できる。

---

## 実装前に残る判断

実装に入る前に確認したいもの:

1. Header に `/links` を明示的に入れるか。
2. Footer / Privacy / Terms の Amazon アソシエイト表記を残すか削るか。
3. Search ゼロステートに出す人気キーワードの候補。
4. `/sitemap-keywords` はページ内検索まで入れるか、Phase 0 では token 統一だけにするか。
5. `/docs/[slug]` の article shell を `1200px` 維持にするか、site shell の `1280px` へ寄せるか。

---

## やらないこと

初回実装では以下をやらない。

- 全ページを一気に作り替える。
- `/links` だけ先に大改修する。
- `/search` / `/links` / `/about` に右サイドバーを追加する。
- 下層ページにトップページ級の大型 Hero を増やす。
- 目次だけ sticky に戻す判断を Phase 0 で行う。
- AIDesigner を明示なしに使う。

---

## 推奨ブランチ単位

1. `design/page-shell-foundation`
   - PageShell / PageHeader / SectionBlock / SectionCard
   - width / hero / token の基礎整理
   - sticky 解除

2. `design/docs-template`
   - ArticleHeader
   - ArticleFooterSection
   - docs sidebar density

3. `design/category-search`
   - Category 分割
   - Search token / zero state

4. `design/links-action-hub`
   - Links Action Hub
   - UTM content 整理

5. `design/tools-legal-polish`
   - Tools / About / Legal / Contact / 404

---

## 検証方針

各ブランチで最低限:

```bash
npm run type-check
npm run lint
```

UI 影響が大きいブランチでは追加:

```bash
npm test
```

スクリーンショット確認:

- desktop: 1280px 以上
- tablet
- mobile

必ず確認するページ:

- `/`
- `/docs/[slug]`
- `/category/[slug]`
- `/search`
- `/links`
- `/about`
- `/tools`
- `/privacy`
- `/terms`

---

## 位置づけ

このドキュメントを、デザイン改善実装のメインロードマップとする。

詳細レビューは `2026-06-27-all-pages-design-review.md` と `2026-06-27-docs-template-improvement.md` に残すが、実装順の判断は本ドキュメントを優先する。
