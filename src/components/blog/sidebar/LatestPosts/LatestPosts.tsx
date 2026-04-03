import Link from "next/link";

import BlogCard from "@/components/ui/BlogCard/BlogCard";
import { getLatestPosts } from "@/lib/latest-posts";
import { Post } from "@/types/blog";

interface LatestPostsProps {
  allPosts: Post[];
  currentPostId?: string;
}

export default function LatestPosts({
  allPosts,
  currentPostId,
}: LatestPostsProps) {
  // 最新の記事を取得（現在の記事を除く）
  const latestPosts = getLatestPosts(allPosts, currentPostId, 5);

  if (latestPosts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        最新記事
      </h3>
      <div className="space-y-4">
        {latestPosts.map((post) => (
          <BlogCard key={post.id} post={post} variant="sidebar" />
        ))}
      </div>

      {/* 記事一覧へのリンク */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-right">
          <Link
            href="/blog"
            className="inline-block text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium transition-colors"
          >
            すべての記事を見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
