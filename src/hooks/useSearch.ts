"use client";

import { useState, useCallback } from "react";
import type {
  SearchQuery,
  SearchResult,
  SearchIndexEntry,
} from "@/lib/search/search-client";

// re-export types for consumers
export type { SearchQuery, SearchResult, SearchIndexEntry };

export function useSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance">(
    "relevance"
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [results, setResults] = useState<SearchResult>({
    posts: [],
    total: 0,
    page: 1,
    totalPages: 0,
    query: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 検索実行
  const executeSearch = useCallback(async (searchQuery: SearchQuery) => {
    if (!searchQuery.q.trim()) {
      setResults({ posts: [], total: 0, page: 1, totalPages: 0, query: "" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 動的インポートでバンドルサイズを抑制
      const { search } = await import("@/lib/search/search-client");
      const data = await search(searchQuery);
      setResults(data);
    } catch (err) {
      console.error("検索エラー:", err);
      setError(
        err instanceof Error ? err.message : "検索中にエラーが発生しました"
      );
      setResults({
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0,
        query: searchQuery.q,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 検索候補の取得
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { getSuggestions } = await import("@/lib/search/search-client");
      const results = await getSuggestions(input, 5);
      setSuggestions(results);
    } catch (err) {
      console.error("検索候補取得エラー:", err);
      setSuggestions([]);
    }
  }, []);

  // 検索クエリの更新
  const updateSearchQuery = useCallback(
    (updates: Partial<SearchQuery>) => {
      const newQuery: SearchQuery = {
        q: query,
        category,
        tags,
        sortBy,
        page: 1,
        limit,
        ...updates,
      };

      if (updates.q !== undefined) setQuery(updates.q);
      if (updates.category !== undefined) setCategory(updates.category);
      if (updates.tags !== undefined) setTags(updates.tags);
      if (updates.sortBy !== undefined) setSortBy(updates.sortBy);
      if (updates.page !== undefined) setPage(updates.page);

      executeSearch(newQuery);
    },
    [query, category, tags, sortBy, limit, executeSearch]
  );

  // ページ変更
  const changePage = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > results.totalPages) return;

      setPage(newPage);
      executeSearch({
        q: query,
        category,
        tags,
        sortBy,
        page: newPage,
        limit,
      });
    },
    [
      query,
      category,
      tags,
      sortBy,
      limit,
      results.totalPages,
      executeSearch,
    ]
  );

  // リセット
  const resetSearch = useCallback(() => {
    setQuery("");
    setCategory("");
    setTags([]);
    setSortBy("relevance");
    setPage(1);
    setResults({ posts: [], total: 0, page: 1, totalPages: 0, query: "" });
    setError(null);
    setSuggestions([]);
  }, []);

  return {
    query,
    category,
    tags,
    sortBy,
    page,
    limit,
    results,
    isLoading,
    error,
    suggestions,

    setQuery,
    setCategory,
    setTags,
    setSortBy,
    updateSearchQuery,
    changePage,
    resetSearch,
    executeSearch,
    fetchSuggestions,
  };
}
