"use client";

import { SidebarSearch } from "@/components/search/SidebarSearch";
import { Post } from "@/types/blog";
import RelatedPosts from "./RelatedPosts";
import TableOfContents from "./TableOfContents";
import LatestPosts from "./LatestPosts";
import TagList from "./TagList/index";
import AuthorInfo from "./AuthorInfo";

export { RelatedPosts, TableOfContents, LatestPosts, TagList, AuthorInfo };

interface BlogSidebarProps {
  post: Post;
  allPosts: Post[];
}

export default function BlogSidebar({ post, allPosts }: BlogSidebarProps) {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0">
      <div className="space-y-6">
        {/* 検索ボックス */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <SidebarSearch />
        </div>

        {/* 最新記事 */}
        <LatestPosts allPosts={allPosts} currentPostId={post.id} />

        {/* 関連記事 */}
        <RelatedPosts currentPost={post} allPosts={allPosts} />

        {/* タグ一覧 */}
        <TagList tags={post.tags} />

        {/* 著者情報 */}
        <AuthorInfo />

        {/* 目次 */}
        <TableOfContents headings={post.headings} />
      </div>
    </aside>
  );
}
