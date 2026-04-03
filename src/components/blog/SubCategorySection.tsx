import React from "react";
import { Post } from "@/types/blog";
import BlogCard from "@/components/ui/BlogCard";

interface SubCategorySectionProps {
  title: string;
  description: string;
  icon: string; // SVGパスを文字列として受け取る
  posts: Post[];
  className?: string;
}

/**
 * サブカテゴリセクションコンポーネント
 *
 * 特定のサブカテゴリに属する記事を表示するセクションです。
 * アイコン、タイトル、説明文、記事一覧を含みます。
 *
 * @component
 * @param {SubCategorySectionProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element | null} 記事がない場合はnullを返す
 */
export default function SubCategorySection({
  title,
  description,
  icon,
  posts,
  className = "",
}: SubCategorySectionProps) {
  // 記事がない場合は表示しない
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className={`mb-16 ${className}`}>
      {/* セクションヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <svg
          className="w-8 h-8 text-primary-600 dark:text-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icon}
          />
        </svg>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
            {description}
          </p>
        </div>
      </div>

      {/* 記事グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
