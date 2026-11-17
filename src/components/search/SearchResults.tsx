"use client";

import ArticleThumbRow from "@/components/ui/RelatedArticles/ArticleThumbRow";
import { getCategoryLabel } from "@/lib/categories";
import { docKindLabelFromPath } from "@/lib/doc-kind";
import { type SearchResult } from "@/lib/search/search-client";
import type { CardImage } from "@/lib/site-thumbnail";
import AdSlot from "@/components/ads/AdSlot";
import { withFeedAds } from "@/lib/feed-ads";

interface SearchResultsProps {
  images?: Record<string, CardImage>;
  results: SearchResult;
  isLoading: boolean;
  error?: string | null;
  query: string;
}

export function SearchResults({
  images = {},
  results,
  isLoading,
  error,
  query,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--accent)"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-(--color-danger) mb-4">
          検索中にエラーが発生しました: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="focus-ring rounded-card-content bg-(--accent) px-4 py-2 text-(--paper) transition-opacity hover:opacity-90"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-(--ink-muted)">
          キーワードを入力して検索してください
        </p>
      </div>
    );
  }

  if (results.posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-(--ink-body) mb-2">
          「{query}」に一致する記事が見つかりませんでした
        </p>
        <p className="text-sm text-(--ink-muted)">
          別のキーワードで検索してみてください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-sm text-(--ink-muted)">
          「{query}」の検索結果: {results.total}件
        </p>
      </div>

      <div className="grid gap-4" data-cta="nav" data-cta-label="search-results">
        {withFeedAds(results.posts, { key: 'search', first: 5, max: 1 }).map((e) => {
          if (e.kind === 'ad') return <AdSlot as="div" key={e.key} slot="inFeedThumb" className="card-surface-section p-4 sm:p-6" />;
          const post = e.item;
          return (
          <ArticleThumbRow
            key={post.id}
            variant="feed"
            framed
            href={post.path}
            title={post.title}
            image={images[post.path.replace(/\/$/, "")]}
            eyebrow={`${getCategoryLabel(post.category)} · ${docKindLabelFromPath(post.path, post.category)}`}
            caption={post.excerpt && <span className="[&_mark]:rounded-card-inline [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-800/60 dark:[&_mark]:text-warn" dangerouslySetInnerHTML={{ __html: post.excerpt }} />}
            meta={post.tags && post.tags.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-2">
                {post.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-(--accent-fill) px-2.5 py-0.5 font-mono text-[11px] text-(--accent)">#{tag}</span>
                ))}
              </span>
            )}
          />
          );
        })}
      </div>
    </div>
  );
}
