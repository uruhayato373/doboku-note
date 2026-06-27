import { Suspense } from "react";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import { getAllCategories } from "@/lib/categories";
import { getAllDocsMeta } from "@/lib/docs";
import { getPopularDocs } from "@/lib/popular";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  // ゼロステート（検索語未入力時）の回遊導線用データを server で用意。
  // 試験別入口 = 全カテゴリ、よく読まれている記事 = GA4 上位（データ無しは graceful 非表示）。
  const categories = getAllCategories();
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
        <SearchPageClient categories={categories} popular={popular} />
      </Suspense>
    </PageShell>
  );
}
