import { MDXRemote } from "next-mdx-remote/rsc";
import { Post } from "@/types/blog";
import ArticleHeader from "./ArticleHeader";
import RelatedPosts from "./RelatedPosts";
import AuthorCallout from "./AuthorCallout";
import SNSShare from "./SNSShare";

export { ArticleHeader };
export { RelatedPosts };
export { AuthorCallout };
export { SNSShare };

interface BlogPostContentProps {
  post: Post;
  components: Record<string, React.ComponentType<any>>;
}

export default function ArticleContent({
  post,
  components,
}: BlogPostContentProps) {
  // カテゴリに応じたクラス名を生成
  const categoryClass =
    post.category === "イケオジ" ? "category-ikeoji" : "category-shigodeki";

  return (
    <article className="flex-1 max-w-4xl sm:mx-auto">
      {/* 記事コンテンツ全体を白いカードで囲む */}
      <div className="bg-white dark:bg-gray-800 dark:shadow-gray-800/50 sm:border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* 記事ヘッダー */}
        <ArticleHeader post={post} />

        

        {/* 記事本文 - 見出しスタイルを適用 */}
        <div
          className={`px-4 sm:px-8 pb-2 prose prose-base dark:prose-invert max-w-none prose-blog blog-content ${categoryClass}`}
        >
          <MDXRemote
            source={post.content}
            components={components}
            options={{
              mdxOptions: {
                remarkPlugins: [],
                rehypePlugins: [],
              },
              parseFrontmatter: false,
            }}
          />
        </div>

        {/* SNSシェアボタン */}
        <div className="px-4 sm:px-2 pt-2">
          <SNSShare 
            title={post.title}
            variant="extended"
          />
        </div>

        {/* 関連記事セクション */}
        <RelatedPosts currentPost={post} />
      </div>
    </article>
  );
}
