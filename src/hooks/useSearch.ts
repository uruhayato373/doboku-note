"use client";

import { useState, useEffect } from "react";
import type { SearchResult } from "@/lib/search/search-client";

const emptyResult: SearchResult = { posts: [], total: 0, page: 1, totalPages: 0, query: "" };

/** URLの確定条件で検索し、古いリクエストの応答で新しい結果を上書きしない。 */
export function useSearch({ q, category, page }: { q: string; category: string; page: number }) {
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<SearchResult>(emptyResult);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setQuery(q);
    setError(null);
    setResults(emptyResult);
    setIsLoading(!!q);
    if (!q) return;

    async function run() {
      try {
        const { search } = await import("@/lib/search/search-client");
        const data = await search({ q, category, page, limit: 10 });
        if (active) setResults(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "検索中にエラーが発生しました");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void run();
    return () => { active = false; };
  }, [q, category, page]);

  return { query, setQuery, results, isLoading, error };
}
