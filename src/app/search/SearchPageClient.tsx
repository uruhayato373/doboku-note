"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchPagination } from "@/components/search/SearchPagination";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const {
    query,
    setQuery,
    category,
    setCategory,
    tags,
    setTags,
    sortBy,
    setSortBy,
    results,
    isLoading,
    error,
    updateSearchQuery,
    changePage,
    resetSearch,
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);

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

  const handleFilterChange = (filterType: string, value: string | string[]) => {
    switch (filterType) {
      case "category":
        setCategory(value as string);
        updateSearchQuery({ category: value as string });
        break;
      case "tags":
        setTags(value as string[]);
        updateSearchQuery({ tags: value as string[] });
        break;
      case "sortBy":
        setSortBy(value as "relevance");
        updateSearchQuery({ sortBy: value as "relevance" });
        break;
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 検索ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              記事検索
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              キーワードを入力して記事を探す
            </p>
          </div>

          {/* 検索ボックス */}
          <div className="mb-4">
            <SearchBox
              placeholder="キーワードを入力して検索..."
              onSearch={handleSearch}
            />
          </div>

          {/* フィルター（インライン） */}
          <div className="mb-8">
            <SearchFilters
              category={category}
              tags={tags}
              sortBy={sortBy}
              onFilterChange={handleFilterChange}
              onReset={resetSearch}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
          </div>

          {/* 検索結果 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
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
        </div>
      </div>
      <Footer />
    </>
  );
}
