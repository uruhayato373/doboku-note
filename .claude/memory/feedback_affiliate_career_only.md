---
name: feedback_affiliate_career_only
description: "アフィリは転職一本(ビルドジョブ/建設JOBs/DXコンサル・GKSは09-28終了)・講座/教材/添削/書籍は2026-06-25廃止・例外=自社ココナラ出品へのA8リンク(09-24)。creativeを新スロットへ昇格するときは同一matのピクセルを監査(1ページ1発火)"
metadata:
  type: feedback
---

## アフィリは転職のみ（2026-06-25 ユーザー判断・PR #272）
**講座/教材/添削（SAT・独学サポート）と書籍（BookCard）アフィリを完全廃止**。サイトに残すアフィリは**転職のみ**（GKS/ビルドジョブ/DXコンサル）。
- **Why**: 講座/添削/書籍は「学習にお金を払う財布」を取りに行くが、その財布は note 有料商品（模範論文・過去問解説・経験記述添削）と同一でカニバる。note 有料は月¥114k の実証済みエンジン、講座/書籍アフィリはクリック≒0・収益実質0だった。転職は「キャリアの財布」で note と別＝競合しない。関連 [[project_revenue_diagnosis_2026_06]]
- **How to apply**: 学習・受験意図ページ＝**note CTA が独占**（講座/教材/添削/書籍アフィリを置く提案をしない。私自身このセッションで一度誤提案して撤回）。キャリア意図ページ（年収・転職・市場価値）＝転職アフィリ（CareerAffiliate / AffiliateSlot・配置は `config/affiliate-placements.json`）。
- **2026-10-07〜（運営者指示・EXP-017）**: 転職アフィリは学習・実務・公的基準・トップ・ツールの面にも出す。禁じるのは講座/教材/添削/書籍の**外部**アフィリで、転職は財布が別なので学習ページに出してよい。「学習ページだから転職広告を外す」提案をしない。
- 撤去済み: CourseAffiliate/SchoolAffiliate/DokugakuBanner/SatTextLink/DokugakuKeikenLink/BookCard/BookSection、SCHOOL_SAT/HOME_AFFILIATE、affiliate-flags.ts/affiliate-books.json。真実源 `docs/project/04_運営/02_アフィリエイト提携状況.md`。書籍台帳 book-list.md は歴史資料化。
- **PR#272 はコンポーネント撤去のみで prose の再提案を取りこぼしていた**（2026-06-27 発見）: 記事本文に「添削サービスも選択肢」「通信講座(SAT)」「スタディング/アガルート実名」「対策手段の選び方＝3手段」等が7ページ残存→全削除し、穴は note 模範論文/完成答案＋勉強仲間/職場の有資格者の目で埋める表現へ統一。除外2件＝studying.jp 出典引用(vta-method)・自己啓発の試験コンテンツ(self-development)。
- **対象外で残る正当ケース**: 過去問・試験制度の説明で「通信講座/講座」が登場するもの（self-development の自己啓発分類等）は試験コンテンツなので消さない。判定は「学習導線で講座/添削を**推奨**しているか」。
- **再発防止の推奨（未実装）**: prose レベルの廃止アフィリ語（添削サービス/通信講座推奨/スタディング/アガルート/SAT）を検知する CI ガード（check-affiliate-mats は creative 資産専用で prose を見ない）。grep: `添削サービス|スタディング|アガルート`。
- **例外（2026-09-24 ユーザー決定）**: ココナラの A8 プログラム（s00000012624009・会員登録¥100）で、**自社のココナラ出品ページへ送るリンクだけ**をアフィリ化してよい（自社出品への送客なので note とカニバらない）。当サイトの出品カテゴリの購入は A8 成果対象外（登録¥100のみ）。特典付与は否認条件。PR 表記・`rel=sponsored`・1ページ1ピクセルは他のアフィリと同じ。実装は backlog DN-0283（自動モードの安全判定で一度止まった）。

## creative を新スロットへ昇格するときは同一 mat の既存ピクセルを監査（1ページ1発火・2026-06-02）
A8.net creative を別スロット（記事末→サイドバー等）へ移動/昇格する時は、同一 mat のピクセルが他の場所で既に発火していないか監査する。同一 mat のピクセルが1ページで2回発火すると「1ページ1発火」規律違反＝無効インプレッション扱いのリスク。
- **事例**: GKS 転職バナー（mat `4B3VR8+F0LMU2+4R40+TSBE9`）を土木サイドバーへ昇格した際、(1)記事末 `CivilCareerCTA` が同 mat バナーで重複→該当 docGroup で撤去 (2)civil-1 secondary 9ページ（r03〜r07 + theme past-problems）の本文インライン `CareerAffiliate` が同 mat の `trackingPixelUrl`（www10）を持っていた→ href のみ化（サイドバーを唯一のピクセル源に）。**pixel URL の www 番号が違っても mat が同じなら同一 creative 扱い**。
- **How to apply**: 配置変更前に `grep -rl "trackingPixelUrl\|<対象mat>" .local/r2/posts/<vertical>/<docGroup>-*` で既存ピクセルを洗い出し、新スロット追加後に各ページ種別で「同 mat ピクセルが1個だけ」になるよう調整。真実源 `docs/project/04_運営/02_アフィリエイト提携状況.md`。配置ロジック `src/app/docs/[...slug]/page.tsx`、テキストリンクカードは component-loader 系でなく page.tsx 直書き or `SchoolAffiliate`/`CareerAffiliate`/`CourseAffiliate`。
