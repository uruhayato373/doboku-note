"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchPagination } from "@/components/search/SearchPagination";
import { SearchZeroState } from "@/components/search/SearchZeroState";
import { getAllCategories, type CategoryDef } from "@/lib/categories";
import { type PopularDoc } from "@/lib/popular";
import { type ExamData } from "@/components/home";

interface SearchPageClientProps {
  images: Record<string, string>;
  examCards: ExamData[];
  otherCategories: CategoryDef[];
  popular: PopularDoc[];
}

export default function SearchPageClient({ images, examCards, otherCategories, popular }: SearchPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = searchParams.get("q")?.trim() ?? "";
  const requestedCategory = searchParams.get("category") ?? "";
  const category = getAllCategories().some(c => c.visible !== false && c.slug === requestedCategory) ? requestedCategory : "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
  } = useSearch({ q, category, page });

  // 存在しないページ番号で空結果に迷い込まないよう、取得後に最終ページへ戻す。
  useEffect(() => {
    if (!isLoading && results.query === q && results.page === page && results.totalPages > 0 && page > results.totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      if (results.totalPages === 1) params.delete("page");
      else params.set("page", String(results.totalPages));
      router.replace(`${pathname}?${params}`, { scroll: false });
    }
  }, [isLoading, results, q, page, searchParams, router, pathname]);

  const navigate = (next: { q: string; category: string; page: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries({ q: next.q.trim(), category: next.category, page: next.page > 1 ? String(next.page) : "" })) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const suffix = params.toString();
    router.push(`${pathname}${suffix ? `?${suffix}` : ""}`, { scroll: false });
  };
  const handleSearch = (searchQuery: string) => navigate({ q: searchQuery, category, page: 1 });
  const handleCategoryChange = (newCategory: string) => {
    navigate({ q, category: newCategory, page: 1 });
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
          hasQuery={!!q}
          onReset={() => { setQuery(""); navigate({ q: "", category: "", page: 1 }); }}
        />
      </div>

      {/* 検索結果 */}
      {error && (
        <div className="mb-6 rounded-card-content border border-[var(--color-danger)] bg-[var(--color-danger-fill)] p-4">
          <p className="text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {q ? (
        /* Pagefind の遅延ロード中はスピナー → 結果でレイアウトが伸びる（PSI 実測 CLS 0.58）ため、
           結果領域の高さを先に確保して下のフッターが跳ねないようにする。 */
        <div className="min-h-[60vh]">
          <SearchResults images={images}
            results={results}
            isLoading={isLoading}
            error={error}
            query={q}
          />

          {/* ページネーション */}
          {results.totalPages > 1 && (
            <SearchPagination
              currentPage={results.page}
              totalPages={results.totalPages}
              onPageChange={(nextPage) => navigate({ q, category, page: nextPage })}
            />
          )}
        </div>
      ) : (
        <SearchZeroState examCards={examCards} otherCategories={otherCategories} popular={popular} />
      )}
    </>
  );
}
