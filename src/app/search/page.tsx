import { Suspense } from "react";
import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import { getAllCategories } from "@/lib/categories";
import { getAllDocsMeta } from "@/lib/docs";
import { getPopularDocs } from "@/lib/popular";
import { buildPageMetadata } from "@/lib/metadata";
import { buildExamCards } from "@/lib/home-exam-cards";
import SearchPageClient from "./SearchPageClient";

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
  // よく読まれている記事 = GA4 上位（データ無しは graceful 非表示）。
  const examCards = buildExamCards();
  const examSlugs = new Set(examCards.map((e) => e.slug));
  const otherCategories = getAllCategories().filter(
    (c) => c.visible !== false && !examSlugs.has(c.slug),
  );
  const popular = getPopularDocs(getAllDocsMeta(), 6);

  return (
    <PageShell variant="content" rail="860">
      <PageHeader
        variant="inline"
        titleSize="lg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Search" }]}
        title="記事検索"
        lead="キーワードを入力して記事・キーワードページを探す"
        className="mb-6"
      />
      <Suspense
        fallback={
          <p className="font-mono text-[12px] text-[var(--ink-muted)]">Loading…</p>
        }
      >
        <SearchPageClient examCards={examCards} otherCategories={otherCategories} popular={popular} />
      </Suspense>
    </PageShell>
  );
}
