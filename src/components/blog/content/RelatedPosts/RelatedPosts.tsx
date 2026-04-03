import { getAllPosts } from "@/lib/mdx";
import type { Post } from "@/types/blog";
import BlogCard from "@/components/ui/BlogCard";
import { getRelatedPosts } from "@/lib/related-posts-scorer";

interface RelatedPostsProps {
  currentPost: Post;
  maxPosts?: number;
}

export default function RelatedPosts({
  currentPost,
  maxPosts = 6,
}: RelatedPostsProps) {
  const allPosts = getAllPosts();

  // 関連記事を取得（スコア計算はライブラリで実行）
  const relatedPosts = getRelatedPosts(currentPost, allPosts, maxPosts);

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <div className="px-8 py-2 border-b border-gray-100 dark:border-gray-700">
      <section className="mt-8 pt-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            関連記事
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {relatedPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
