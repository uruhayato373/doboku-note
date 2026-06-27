"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchPagination } from "@/components/search/SearchPagination";

export default function SearchPageClient() {
  const searchParams = useSearchParams();
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

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
  );
}
