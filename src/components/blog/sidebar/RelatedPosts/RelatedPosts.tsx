import Link from "next/link";
import { getRelatedPosts } from "@/lib/related-posts-scorer";
import BlogCard from "@/components/ui/BlogCard";
import type { Post } from "@/types/blog";

/**
 * サイドバー用関連記事コンポーネントのプロパティ
 * @interface SidebarRelatedPostsProps
 */
interface SidebarRelatedPostsProps {
  /** 現在の記事データ */
  currentPost: Post;
  /** 全記事データの配列 */
  allPosts: Post[];
  /** 表示する関連記事の最大数（デフォルト: 3） */
  maxPosts?: number;
}

/**
 * サイドバー用関連記事コンポーネント
 *
 * 現在の記事に関連する記事を表示するサイドバーコンポーネントです。
 * BlogCardのcompactバリエーションを使用して一貫性のあるデザインを提供します。
 *
 * @component
 * @param {SidebarRelatedPostsProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} サイドバー用関連記事コンポーネント
 *
 * @example
 * ```tsx
 * <RelatedPosts
 *   currentPost={currentArticle}
 *   allPosts={allArticles}
 *   maxPosts={3}
 * />
 * ```
 *
 * @since 1.0.0
 * @author カッコム開発チーム
 */
export default function RelatedPosts({
  currentPost,
  allPosts,
  maxPosts = 5,
}: SidebarRelatedPostsProps) {
  /**
   * 関連記事を取得
   * getRelatedPosts関数を使用してスコア計算による関連記事を取得
   */
  const relatedPosts = getRelatedPosts(currentPost, allPosts, maxPosts);

  // 関連記事が見つからない場合の表示
  if (relatedPosts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          関連記事
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          関連記事が見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        関連記事
      </h3>

      {/* 関連記事一覧 */}
      <div className="space-y-3">
        {relatedPosts.map((post) => (
          <BlogCard key={post.id} post={post} variant="sidebar" />
        ))}
      </div>

      {/* 記事一覧へのリンク */}
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-right">
          <Link
            href="/blog"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium transition-colors"
          >
            すべての記事を見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
