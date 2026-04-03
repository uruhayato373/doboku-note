import { notFound } from "next/navigation";
import { getPost, getAllPostIds, getAllPosts } from "@/lib/mdx";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogSidebar from "@/components/blog/sidebar";
import ArticleContent from "@/components/blog/content";

import { getPostSeoData } from "@/lib/metadata";
import { Metadata } from "next";
import { getAllComponents } from "@/lib/component-loader";

// 静的パラメータの生成
export async function generateStaticParams() {
  const postIds = await getAllPostIds();
  return postIds.map((id) => ({
    id,
  }));
}

// 動的メタデータの生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: "記事が見つかりません",
      description: "指定された記事は存在しません。",
    };
  }

  return getPostSeoData(post);
}

export default async function BlogPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  // 記事に基づいて動的にコンポーネントを取得
  const components = await getAllComponents(post);
  const allPosts = await getAllPosts();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      {/* 構造化データ */}
      {/* <StructuredData type="article" post={post} /> */}

      <main className="flex-grow py-6 sm:py-12">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
          {/* 2カラムレイアウト */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
            {/* メインコンテンツ */}
            <ArticleContent post={post} components={components} />

            {/* 右側サイドバー */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <BlogSidebar post={post} allPosts={allPosts} />
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
