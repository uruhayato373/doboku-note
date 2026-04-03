"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchPagination } from "@/components/search/SearchPagination";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const {
    query,
    setQuery,
    category,
    setCategory,
    subCategory,
    setSubCategory,
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
        updateSearchQuery({ category: value as string, subCategory: "" });
        break;
      case "subCategory":
        setSubCategory(value as string);
        updateSearchQuery({ subCategory: value as string });
        break;
      case "tags":
        setTags(value as string[]);
        updateSearchQuery({ tags: value as string[] });
        break;
      case "sortBy":
        setSortBy(value as "relevance" | "date" | "readTime");
        updateSearchQuery({
          sortBy: value as "relevance" | "date" | "readTime",
        });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            記事検索
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            カッコムの記事からお探しの情報を見つけましょう
          </p>
        </div>

        {/* 検索ボックス */}
        <div className="max-w-2xl mx-auto mb-8">
          <SearchBox
            placeholder="キーワードを入力して検索..."
            onSearch={handleSearch}
          />
        </div>

        {/* フィルターと結果 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* フィルターサイドバー */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <SearchFilters
                category={category}
                subCategory={subCategory}
                tags={tags}
                sortBy={sortBy}
                onFilterChange={handleFilterChange}
                onReset={resetSearch}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              />
            </div>
          </div>

          {/* 検索結果 */}
          <div className="lg:col-span-3">
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
      </div>
    </div>
  );
}
