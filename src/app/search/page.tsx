import { Suspense } from "react";
import { getPublicDocPath } from "@/lib/content-routes";
import { getCardImage } from "@/lib/site-thumbnail";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import IndexRail, { indexRailData } from "@/components/layout/IndexRail";
import SearchRailAd from "@/components/search/SearchRailAd";
import { getAllDocsMeta } from "@/lib/docs";
import { buildPageMetadata } from "@/lib/metadata";
import SearchPageClient, { SearchPageFallback } from "./SearchPageClient";

// 検索結果ページはクエリ依存で無数の URL を生む（薄い/重複ページ）ため noindex,follow。
// 固有 title と self canonical を持たせ、root の汎用 title / homepage canonical 継承を断つ。
// sitemap からは generate-sitemap.mjs 側で既に除外済み。
export const metadata: Metadata = buildPageMetadata({
  title: "サイト内検索",
  description:
    "doboku-note のサイト内検索。1級土木施工管理技士・技術士の過去問解説・キーワードページをキーワードで探せます。",
  path: "/search",
  noindex: true,
});

export default function SearchPage() {
  // ゼロステート（検索語未入力時）の回遊導線用データを server で用意。
  // 試験別入口 = トップページと同じ資格カード（写真背景・DN-0079③で横展開）＋
  // 資格に紐づかない残りカテゴリ（civil-practice 等）はシンプルカードで併記。
  // よく読まれている記事 = GA4 上位（データ無しは graceful 非表示）。href まで server で解決する
  // （client 側で content-routes を読むと doc-meta-index が /search のチャンクへ入る・DN-0684）。
  const { exams: examCards, others: otherCategories, popular, categories } = indexRailData();
  const images = Object.fromEntries(getAllDocsMeta().filter(d => d.published !== false && (d.group === "guide" || d.category === "civil-practice")).map(d => [getPublicDocPath(d.slug), getCardImage(d)]));

  const header = (
    <PageHeader
      variant="inline"
      titleSize="lg"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Search" }]}
      title="記事検索"
      lead="キーワードを入力して記事・キーワードページを探す"
      className="mb-6"
    />
  );
  // 右の欄（PC ≥993px）。広告は検索語があり結果があるときだけ（SearchRailAd）。
  // 中身はサーバーで組む（client で組むと RailStack の下の部品が /search のチャンクへ入る・DN-0684）。
  const aside = <IndexRail ad={<SearchRailAd />} popular={popular} categories={categories} label="search" />;

  return (
    <PageShell variant="default">
      <Suspense fallback={<SearchPageFallback examCards={examCards} otherCategories={otherCategories} popular={popular} header={header} aside={aside} />}>
        <SearchPageClient images={images} examCards={examCards} otherCategories={otherCategories} popular={popular} header={header} aside={aside} />
      </Suspense>
    </PageShell>
  );
}
