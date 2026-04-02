"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDateSafely } from "@/lib/utils";
import { Post } from "@/types/blog";

/**
 * BlogCardコンポーネントの表示バリエーション
 * @typedef {'default' | 'compact' | 'featured' | 'sidebar'} BlogCardVariant
 * - `default`: 標準的なカード表示（画像 + コンテンツ）
 * - `compact`: コンパクトな表示（横並びレイアウト）
 * - `featured`: フィーチャー表示（大きな画像 + 詳細情報）
 * - `sidebar`: サイドバー用表示（LatestPostsのデザイン）
 */
type BlogCardVariant = "default" | "compact" | "featured" | "sidebar";

/**
 * BlogCardコンポーネントのプロパティ
 * @interface BlogCardProps
 */
interface BlogCardProps {
  /** ブログ記事のデータ */
  post: Post;
  /** 表示バリエーション（デフォルト: 'default'） */
  variant?: BlogCardVariant;
}

/**
 * BlogCardコンポーネント
 *
 * ブログ記事を表示するカードコンポーネントです。
 * 3つのバリエーション（default、compact、featured）をサポートし、
 * 用途に応じて最適な表示形式を選択できます。
 *
 * @component
 * @param {BlogCardProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} BlogCardコンポーネント
 *
 * @example
 * ```tsx
 * // デフォルトバリエーション
 * <BlogCard post={articleData} />
 *
 * // コンパクトバリエーション（関連記事一覧など）
 * <BlogCard post={articleData} variant="compact" />
 *
 * // フィーチャーバリエーション（注目記事など）
 * <BlogCard post={articleData} variant="featured" />
 *
 * // サイドバーバリエーション（最新記事一覧など）
 * <BlogCard post={articleData} variant="sidebar" />
 * ```
 *
 * @since 1.0.0
 * @author カッコム開発チーム
 */
export default function BlogCard({ post, variant = "default" }: BlogCardProps) {
  /**
   * OGP画像のパスを生成
   * 記事IDに基づいてOGP画像のパスを構築
   */
  const ogpImagePath = `/images/ogp/${post.id}.png`;

  // サイドバーバリアント（LatestPostsのオリジナルデザイン）
  if (variant === "sidebar") {
    return (
      <Link
        href={`/blog/${post.id}`}
        className="block group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 transition-colors duration-200"
      >
        <div className="flex items-start space-x-3">
          {/* サムネイル画像 */}
          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <Image
              src={`/images/ogp/${post.id}-thumbnail.png`}
              alt={post.title}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              quality={90}
              priority={false}
              sizes="64px"
              style={{
                imageRendering: "crisp-edges",
                objectFit: "cover",
              }}
            />
          </div>

          {/* 記事情報 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2 leading-tight transition-colors">
              {post.title}
            </h4>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200">
                {post.category}
              </span>
              {post.subCategory && (
                <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {post.subCategory}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // コンパクトバリアント
  if (variant === "compact") {
    return (
      <Link
        href={`/blog/${post.id}`}
        className="group block bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600"
      >
        <div className="flex items-start space-x-4 p-4">
          {/* サムネイル画像 */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <Image
              src={ogpImagePath}
              alt={post.title}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              sizes="80px"
            />
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {post.title}
            </h3>
            <p
              className="text-xs text-gray-500 dark:text-gray-400 mb-2"
              suppressHydrationWarning
            >
              {formatDateSafely(post.date)}
            </p>
            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200">
              {post.category}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // フィーチャーバリアント
  if (variant === "featured") {
    return (
      <Link
        href={`/blog/${post.id}`}
        className="group block bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600"
      >
        {/* OGP画像 */}
        <div className="relative w-full h-64 overflow-hidden">
          <Image
            src={ogpImagePath}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="100vw"  // 親要素の幅いっぱいに表示
          />

          {/* カテゴリバッジ */}
          <div className="absolute top-4 left-4">
            <span className="inline-block px-4 py-2 text-sm font-semibold rounded text-white bg-primary-500 dark:bg-primary-600">
              {post.category}
            </span>
          </div>

          {/* サブカテゴリバッジ */}
          {post.subCategory && (
            <div className="absolute top-4 right-4">
              <span className="inline-block px-3 py-2 text-sm font-medium rounded bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300">
                {post.subCategory}
              </span>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="p-8">
          {/* メタ情報 */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span suppressHydrationWarning>{formatDateSafely(post.date)}</span>
          </div>

          {/* タイトル */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 line-clamp-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {post.title}
          </h3>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    );
  }

  // デフォルトバリアント
  return (
    <Link
      href={`/blog/${post.id}`}
      className="group block bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600"
    >
      {/* OGP画像 */}
      <div className="relative w-full h-48 overflow-hidden">
        <Image
          src={ogpImagePath}
          alt={post.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="100vw"  // 親要素の幅いっぱいに表示
        />

        {/* カテゴリバッジ */}
        <div className="absolute top-3 left-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded text-white bg-primary-500 dark:bg-primary-600">
            {post.category}
          </span>
        </div>

        {/* サブカテゴリバッジ */}
        {post.subCategory && (
          <div className="absolute top-3 right-3">
            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300">
              {post.subCategory}
            </span>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        {/* メタ情報 */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span suppressHydrationWarning>{formatDateSafely(post.date)}</span>
        </div>

        {/* タイトル */}
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {post.title}
        </h3>
      </div>
    </Link>
  );
}
