import Link from "next/link";
import Image from "next/image";
import { getPost } from "@/lib/mdx";
import type { Post } from "@/types/blog";

/**
 * RelatedArticleCardコンポーネントのプロパティ
 */
interface RelatedArticleCardProps {
  /** 記事ID（スラッグ） */
  id: string;
}

/**
 * RelatedArticleCardコンポーネント
 *
 * 記事IDを渡すと自動的にデータを取得し、
 * OGP画像・タイトル・説明を横長レイアウトで表示するコンポーネントです。
 * 「合わせて読みたい」などの関連記事表示に使用します。
 *
 * @component
 * @param {RelatedArticleCardProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element | null} RelatedArticleCardコンポーネント
 *
 * @example
 * ```tsx
 * <RelatedArticleCard id="real-estate-investment-practical-guide" />
 * ```
 *
 * @since 1.0.0
 * @author カッコム開発チーム
 */
export default function RelatedArticleCard({ id }: RelatedArticleCardProps) {
  // 記事データを取得（サーバーサイドで実行）
  const post: Post | null = getPost(id);

  // 記事が見つからない場合は非表示
  if (!post) {
    return null;
  }

  /**
   * OGP画像のパスを生成
   * 記事IDに基づいてOGP画像のパスを構築
   */
  const ogpImagePath = `/images/ogp/${post.id}.png`;

  return (
    <div className="relative bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-blue-500 dark:border-blue-400 hover:border-blue-600 dark:hover:border-blue-300 my-8 pt-8 pb-3 px-3">
      {/* 右上のタイトル */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className="bg-blue-500 text-white text-sm font-bold px-3 pt-3 pb-1 h-10 leading-6 inline-flex items-center">
          合わせて読みたい
        </span>
      </div>

      <Link
        href={`/blog/${post.id}`}
        className="group block no-underline"
      >
        <div className="flex">
          {/* 左側: OGP画像 */}
          <div className="flex-shrink-0 w-48 h-32 overflow-hidden">
            <Image
              src={ogpImagePath}
              alt={post.title}
              width={192}
              height={128}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="192px"
            />
          </div>

          {/* 右側: タイトル・説明 */}
          <div className="flex-1 p-4 flex flex-col justify-center">
            {/* タイトル */}
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors no-underline">
              {post.title}
            </div>

            {/* 説明文 */}
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {post.description}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
