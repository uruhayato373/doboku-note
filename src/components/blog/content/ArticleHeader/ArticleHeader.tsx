"use client";

import type { Post } from "@/types/blog";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import SNSShare from "../SNSShare";
import CategoryBadge from "@/components/ui/CategoryBadge/CategoryBadge";
import { ChevronRight, Home } from "lucide-react";

interface ArticleHeaderProps {
  post: Post;
}

export default function ArticleHeader({ post }: ArticleHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div>
      {/* パンくずリスト */}
      <nav
        aria-label="パンくずリスト"
        className="px-4 md:px-6 pt-4 mb-6"
      >
        <ol className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <li>
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>ホーム</span>
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3.5 h-3.5" />
          </li>
          <li>
            <Link
              href={`/category/${encodeURIComponent(post.category)}`}
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {post.category}
            </Link>
          </li>
        </ol>
      </nav>

      {/* タイトル */}
      <div className="px-4 md:px-6 mb-3">
        <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900 dark:text-white leading-tight pb-2 border-b-4 border-primary-500">
          {post.title}
        </h1>
      </div>

      {/* カテゴリバッジ＋メタ情報＋SNSボタン */}
      <div className="px-4 md:px-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          {/* カテゴリバッジ */}
          <div className="scale-90 origin-left">
            <CategoryBadge
              category={post.category}
              subCategory={post.subCategory}
            />
          </div>
          {/* 読了時間 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            読了時間: {Math.ceil(post.content.length / 500)}分
          </div>
          {/* SNSシェアボタン */}
          {mounted && (
            <div className="ml-auto">
              <SNSShare
                title={post.title}
                variant="compact"
                align="end"
                showHeading={false}
                showCopy={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* サムネイル画像 */}
      <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] md:w-[calc(100%+3rem)] -mx-4 sm:-mx-8 md:-mx-6 mb-8">
        <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
          <Image
            src={`/images/ogp/${post.id}.png`}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      </div>
    </div>
  );
}
