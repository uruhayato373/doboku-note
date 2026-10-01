---
name: design-system-phase0
description: デザイン改善ロードマップ全6フェーズ(Phase 0-5)完了・全ページ PageShell+editorial token 統一(PR #284-290)。2026-06-28 ドキュメントを単一 SSOT docs/design-system/design-system.md へ統合(旧 principles/quick-reference/prohibited+検討案39件は削除=git履歴に保全)・page-design-builder Generator エージェント新設(Evaluator=/design-review)
metadata: 
  node_type: memory
  type: project
  originSessionId: f3592716-b8c4-4005-9d7f-86b059a731f2
---

2026-06-27 デザイン改善実装。実装プラン＝`/Users/minamidaisuke/.claude/plans/docs-design-system-docs-handoffs-dreamy-frost.md`（提案群 `docs/design-system/proposals/2026-06-27-*` の実行版）。

**Phase 0（共通PageShell基盤）完了**。worktree `/Users/minamidaisuke/doboku-note-design-shell`・branch `design/page-shell-foundation`（origin/develop の7コミット先・**未push/未PR**）。

- 新プリミティブ: `src/components/layout/{PageShell,PageHeader,SectionBlock}.tsx` ＋ `src/components/ui/SectionCard/SectionCard.tsx`（editorial token・SectionCard は MetaCard 互換）。
- 全下層ページを移行: terms/contact/tools+3・home/privacy/sitemap-keywords・about/search・docs/category。docs/category は `PageShell variant="article"`、**右サイドバー sticky 解除**、**docs 外枠 1200→1280**(判断②)。
- Header に「教材」(/links) nav 追加(判断③)。Amazon アフィリ表記を Footer/privacy から除去(判断①)。
- デッドコード9ファイル＋`inlineMobileOnly`＋component-loader registry二重管理を除去。
- 検証: type-check/lint/test(94/97)/dev-smoke/目視/**full build(webpack) 1030+docs prerender OK**。

**未確認**: privacy §5b で Amazon は消したが「もしもアフィリエイト」記載は保持。実ASPがA8(career banner=a8mat)なら もしも も陳腐化の可能性→要ユーザー確認。[[affiliate-career-only]]

**Phase 0 完了・merge済**: PR #284 を develop へ merge-commit(4587aa69b)で統合。privacy アフィリ開示は特定ASP名を外し汎用化済。Vercel check は落ちるが**stale統合**(本番=Cloudflare・GH Actions build=pass・PR限定preview)で無視可。

**Phase 1**: branch `design/docs-template`(Phase0 merge後は develop+1コミット)・**PR #285 オープン**。
- 1a 完了: `ArticleHeader`(breadcrumb+H1+description リード+byline)新設。
- **1b/1c は現物確認で見送り**: ArticleFooter は既に自己完結 MetaCard の積層(各ブロック固有見出し＋自己非表示)、note教材は画像オンリー方針→区画化(見出し追加)は重複/空罫線/方針違反。サイドバーは ad最上部(唯一ピクセル源)・author上(E-E-A-T)が意図的順序。どちらも明確な不具合なしのため未実装。ユーザーが具体要望を出せば再開。

**Phase 2 完了・PR #286 オープン**: branch `design/category-search`(develop起点)。
- 2a: search 4コンポーネント(SearchResults/Box/Filters/Pagination)を editorial token 化＋結果カードを editorial 化。意味色(error red/mark yellow)保持。
- 2b: `CategorySections.tsx`(5過去問テーブル) + `CategoryViews.tsx`(textbook見出し/キーワードCTA) + category page 空fallback を token 化(border→rule-soft/link→accent/hover→accent-fill)。`SearchZeroState` 新設(検索語未入力時=試験別入口[全カテゴリ]+よく読まれている記事[GA4上位6]、server で getAllCategories/getPopularDocs 配線)。
- **見送り判断(現物確認)**: カテゴリの Header/Content/Sidebar 分割=単一利用+既token cleanでchurnのみ(§2)。「人気記事=はじめに読む」は PopularShowcase が既に該当(§8)。「人気KW」専用リストは真実源無で捏造回避→記事集約。
- 残 gray はサイドバー chrome(MetaCard系・別トラック)で Phase 2 外。type-check/lint/dev-smoke OK。

**Phase 3 完了・PR #287 オープン**: branch `design/links-action-hub`。
- /links を `PageShell variant="default"` へ移行(手書き chrome 撤去=全ページ PageShell 統一の完了)。内側コンテンツ不変。
- **現物確認(§8)**: /links は 2026-06-26 改訂で既に Exam Action Hub(試験別パネル=ExamActionGrid相当/essay-complete-pack accent=FeaturedProduct相当/運営者+SNS=SupportLinks相当)。残差は PageShell 統合のみ。
- **見送り**: lucide除去=20ファイル共通標準で不整合化のため維持(§7)。ヒーロー著者要素=bio着地点ゆえ適切。UTMリネーム=分析継続性リスク+Plan「既存維持」。

**Phase 4+5 完了・PR #288 オープン**(ロードマップ最終): branch `design/tools-legal-polish`。
- about/privacy/sitemap-keywords の内部旧パレット(primary/cyan/neutral/gray/amber)を editorial token へ全置換(残 legacy 色 0)。2色→accent mono 統一。privacy amber Cookie 注記→accent-fill 強調。404 に「記事を検索」+「ホーム(資格一覧)へ」2導線追加。
- **見送り**: tools UX 拡張(使うタイミング/quiz次アクション/segmented)=content/挙動変更で射程外 deferred(§2)。Terms CTA は既に /contact(§8)。対応試験簡潔化=削除リスクで色token化のみ。

**ロードマップ全6フェーズ完了**(Phase 0-5・PR #284/285/286/287/288)+**コンポーネント層全面 token 化(PR #289)**。全ページ+全 UI コンポーネントが PageShell+editorial token に統一。**全部 main へ deploy 済(本番稼働)**。

**PR #289 = 総仕上げ**: src/components/ui/** の旧パレットを全置換(35ファイル・装飾24はサブエージェント並列移行/意味色・基底11は手動)。MetaCard 基底を paper+rule-soft(SectionCard 同一 chrome)化で 12+消費先一括統一。意味色は --color-warn/--color-danger へ正規化。**意図的に保持**: ExamFields 5管理色・PdcaCycle PDCA 4色SVG(ドメイン意味色)、mark黄・Sunアイコン黄(iconographic)。残 legacy 色=この意図分のみ。

**tools UX は実装不要と判明(§8)**: 「使うタイミング」=index descがカバー/「Quiz次にやること」=FunnelLinks既存/segmented化=working フォームで gap なし。

**視覚 QA(Playwright)実施 + 仕上げ完了(PR #290・deploy 済)**:
- Playwright で本番/preview を light/dark 検証。token 移行は健全(dark で白背景0・rule-soft が light のまま=0)。
- **検出した既存事象を修正**: dark で color クラス無しの bare border(Callout border-l/prose table/hr 計33箇所)が Tailwind 既定 gray-200 のまま暗転しない → globals.css base layer に `*,::before,::after{border-color:var(--rule-soft)}` を追加し既定 border を theme-aware 化(light は gray-200≈rule-soft で不変)。
- **dead-code レビュー完結**: 大型候補は Phase 0f(#284)済、残る未使用 local 2件(CategoryIcons の React import/mdx-callout-parser の match)を除去（レビュー記録 doc は完了後 2026-06-28 削除＝git 履歴）。
- **Playwright artifact 注意**: `.dark` クラス付与と同一 evaluate 内で getComputedStyle すると style 再計算ラグで誤値(白/light)が出る → 別 evaluate or 二重 rAF で再測定して確定すること。

**design 改善は完全完了**。worktree dev/build は [[worktree-dev-turbopack-symlink]] 参照。Vercel check は stale で無視(本番=Cloudflare・GH Actions build=正)。次の余地: PageHeader/SectionBlock の更なる活用。

**2026-06-28 SSOT 統合 + デザイン Generator 新設**（コミット develop）:
- 旧 melta-ui 系 doc(principles/quick-reference/prohibited)が editorial 実装と乖離していたため、現行思想を **`docs/design-system/design-system.md` 1 ファイルへ統合**＝デザイン唯一の真実源。トークンは二系統(editorial `--accent/--paper/--ink/--rule`＝ページ/prose、`--color-*`＝SVG 図版+Tailwind semantic)・レイアウト体系(PageShell/PageHeader/SectionCard/ArticleHeader・幅1280/rail・右サイドバー規則)・記事 prose・5原則・禁止・**更新手順**・ツーリングを集約。
- 旧 3 doc と検討案(2026-05-25 page-redesign・2026-06-27 proposals)は一旦 _archive へ退避後、役目終了のため**削除**(2026-06-28・39件・active 参照ゼロ・git 履歴に保全 `git log --diff-filter=D -- docs/design-system/`)。README は薄い索引化。
- 旧 doc を指す約12参照(CLAUDE.md・design-review skill・svg 系 skill/agent・check-mdx・svg-tokens.json・image-policy・iOS・SNS plan)を design-system.md へ張替え(check-doc-refs 通過、既存 BookCard 1件は無関係で別途)。
- **page-design-builder** エージェント新設(Generator・model sonnet)＝design-system.md 準拠でページ/レイアウト/UI を実装、採点は `/design-review`(Evaluator) に委ねる Generator/Evaluator 分離。agents-registry 61件へ。SVG 図版・IG/note カバーは対象外(別サブシステム)。
- IG カルーセル(`instagram-carousel.md`)・note カバー(`note-cover.md`)は別サブシステムとして統合せず据え置き(design-system.md §9 でリンク参照)。
- (2026-06-28 後続) デッドコード/未使用 deps/knip 整理を別途完遂（未使用 export/型 除去・de-export・未使用 deps 9件除去・knip 段階導入）。関連の dead-code レビュー記録と knip handoff は役目終了で削除。詳細とハマりどころ → [[knip-dead-code-audit]]。
