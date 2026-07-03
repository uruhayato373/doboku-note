"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchPagination } from "@/components/search/SearchPagination";
import { SearchZeroState } from "@/components/search/SearchZeroState";
import { type CategoryDef } from "@/lib/categories";
import { type PopularDoc } from "@/lib/popular";

interface SearchPageClientProps {
  categories: CategoryDef[];
  popular: PopularDoc[];
}

export default function SearchPageClient({ categories, popular }: SearchPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const {
    query,
    setQuery,
    category,
    results,
    isLoading,
    error,
    updateSearchQuery,
    changePage,
    resetSearch,
  } = useSearch();

  // URLの ?q= パラメータから初期検索を実行
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q.trim()) {
      setQuery(q);
      updateSearchQuery({ q });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    updateSearchQuery({ q: searchQuery });
    // 検索クエリを URL(?q=) に同期する。
    // (1) GA4 拡張計測「サイト内検索」が ?q= を含む pageview から検索イベントを自動生成する
    // (2) 検索結果が共有/ブックマーク/戻る操作可能になる（UX 改善）
    // router.replace + scroll:false で履歴汚染とスクロールジャンプを避ける。
    const qs = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : "";
    router.replace(`${pathname}${qs}`, { scroll: false });
  };

  const handleCategoryChange = (newCategory: string) => {
    updateSearchQuery({ category: newCategory });
  };

  return (
    <>
      {/* 検索ボックス */}
      <div className="mb-4">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="キーワードを入力して検索..."
          onSearch={handleSearch}
        />
      </div>

      {/* フィルター（インライン） */}
      <div className="mb-8">
        <SearchFilters
          category={category}
          onCategoryChange={handleCategoryChange}
          onReset={resetSearch}
        />
      </div>

      {/* 検索結果 */}
      {error && (
        <div className="bg-[var(--color-danger-fill)] border border-[var(--color-danger)] rounded-sm p-4 mb-6">
          <p className="text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {query.trim() ? (
        <>
          <SearchResults
            results={results}
            isLoading={isLoading}
            error={error}
            query={query}
          />

          {/* ページネーション */}
          {results.totalPages > 1 && (
            <SearchPagination
              currentPage={results.page}
              totalPages={results.totalPages}
              onPageChange={changePage}
            />
          )}
        </>
      ) : (
        <SearchZeroState categories={categories} popular={popular} />
      )}
    </>
  );
}
