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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-danger)] mb-4">
          検索中にエラーが発生しました: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-card-content hover:opacity-90 transition-opacity"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-muted)]">
          キーワードを入力して検索してください
        </p>
      </div>
    );
  }

  if (results.posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-body)] mb-2">
          「{query}」に一致する記事が見つかりませんでした
        </p>
        <p className="text-sm text-[var(--ink-muted)]">
          別のキーワードで検索してみてください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-sm text-[var(--ink-muted)]">
          「{query}」の検索結果: {results.total}件
        </p>
      </div>

      <div className="grid gap-4">
        {results.posts.map((post) => (
          <article
            key={post.id}
            className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft p-6 hover:border-[var(--accent)] hover:shadow-card-hover transition-all"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2 hover:text-[var(--accent)] transition-colors">
                <Link href={post.path}>{post.title}</Link>
              </h3>

              {post.excerpt && (
                <p
                  className="mb-3 line-clamp-2 text-sm leading-relaxed text-[var(--ink-body)] [&_mark]:rounded-card-inline [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:dark:bg-yellow-800/60"
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                />
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-fill)] px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
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
