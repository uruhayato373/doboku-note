"use client";

import Link from "next/link";
import { SearchResult } from "@/hooks/useSearch";

interface SearchResultsProps {
  results: SearchResult;
  isLoading: boolean;
  error?: string | null;
  query: string;
}

export function SearchResults({
  results,
  isLoading,
  error,
  query,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-sm h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">
          検索中にエラーが発生しました: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-500 text-white rounded-sm hover:bg-primary-600 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          キーワードを入力して検索してください
        </p>
      </div>
    );
  }

  if (results.posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          「{query}」に一致する記事が見つかりませんでした
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          別のキーワードで検索してみてください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          「{query}」の検索結果: {results.total}件
        </p>
      </div>

      <div className="grid gap-6">
        {results.posts.map((post) => (
          <article
            key={post.id}
            className="border border-gray-200 dark:border-gray-700 rounded-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary-600 dark:hover:text-primary-400">
                <Link href={post.path}>{post.title}</Link>
              </h3>

              {post.excerpt && (
                <p
                  className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800/60 [&_mark]:rounded-sm [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                />
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
