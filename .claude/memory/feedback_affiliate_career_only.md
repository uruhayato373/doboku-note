---
name: affiliate-career-only
description: doboku-noteのアフィリは転職一本(GKS/ビルドジョブ/DXコンサル)。講座/教材/添削/書籍は2026-06-25完全廃止。例外=自社ココナラ出品へのA8リンク(09-24決定)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2321d6c9-3700-412a-98b6-88b6ec7a0409
  modified: 2026-09-23T21:55:50.639Z
---

2026-06-25、ユーザー判断で**講座/教材/添削(SAT・独学サポート)と書籍(BookCard)アフィリを完全廃止**（PR #272）。サイトに残すアフィリは**転職のみ**。

**Why**: 講座/添削/書籍は「学習にお金を払う財布」を取りに行くが、その財布は doboku-note の note 有料商品（模範論文・過去問解説・経験記述添削）と**同一でカニバる**。note 有料は月¥114k の実証済みエンジン、講座/書籍アフィリはクリック≒0・収益実質0だった。転職は「キャリアの財布」で note と別＝競合しない。

**How to apply**:
- 学習・受験意図ページ＝**note CTA が独占**。ここに講座/教材/添削/書籍アフィリを置く提案をしない（私自身このセッション中に一度誤提案して撤回した）。
- キャリア意図ページ（年収・転職・市場価値）＝**転職アフィリ**（CareerAffiliate / SidebarAdBanner）。
- 撤去済み: CourseAffiliate/SchoolAffiliate/DokugakuBanner/SatTextLink/DokugakuKeikenLink/BookCard/BookSection、SCHOOL_SAT/HOME_AFFILIATE、affiliate-flags.ts/affiliate-books.json。
- 真実源は `docs/project/04_運営/02_アフィリエイト提携状況.md`。書籍台帳 book-list.md は歴史資料化。
- **PR#272 はコンポーネント撤去のみで prose の再提案を取りこぼしていた**（2026-06-27 発見）。記事本文に「添削サービスも選択肢」「通信講座(SAT)」「スタディング/アガルート実名」「対策手段の選び方＝3手段」等が7ページ残存→全削除し、穴は note 模範論文/完成答案＋勉強仲間/職場の有資格者の目で埋める表現へ統一。除外2件＝studying.jp出典引用(vta-method)・自己啓発の試験コンテンツ(self-development)。
- **対象外で残る正当ケース**: 過去問・試験制度の説明で「通信講座/講座」が登場するもの（self-development の自己啓発分類等）は試験コンテンツなので消さない。判定は「学習導線で講座/添削を**推奨**しているか」。
- **再発防止の推奨（未実装）**: prose レベルの廃止アフィリ語（添削サービス/通信講座推奨/スタディング/アガルート/SAT）を検知する CI ガード（check-affiliate-mats は creative 資産専用で prose を見ない）。grep: `添削サービス|スタディング|アガルート`。

- **例外（2026-09-24 ユーザー決定）**: ココナラの A8 プログラム（s00000012624009・会員登録 ¥100）で、**自社のココナラ出品ページへ送るリンクだけ**をアフィリ化してよい。自社出品への送客なので note とカニバらない。当サイトの出品カテゴリの購入は A8 の成果対象外（登録 ¥100 のみ）。特典付与は否認条件。PR 表記・`rel=sponsored`・1ページ1ピクセルは他のアフィリと同じ。実装は backlog DN-0283（自動モードの安全判定で一度止まった）。

関連 [[revenue-diagnosis-2026-06]]。
