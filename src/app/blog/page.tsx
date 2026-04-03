import { getAllPosts } from "@/lib/mdx";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Posts from "@/components/blog/Posts";
import TagList from "@/components/blog/sidebar/TagList/TagList";
import Link from "next/link";
import tagsData from "@/config/tags.json";

const getSlugByName = (name: string) => {
  const tagInfo = tagsData.find((t) => t.name === name);
  return tagInfo ? tagInfo.slug : name;
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags)));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              すべての記事
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              カッコムのすべての記事をここで見つけることができます。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main content */}
            <div className="lg:col-span-3">
              <Posts posts={posts} />
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">タグ</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 15).map((tag) => (
                    <Link
                      key={tag}
                      href={`/tags/${getSlugByName(tag)}`}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                      {tag}
                    </Link>
                  ))}
                  {tags.length > 15 && (
                    <Link
                      href="/tags"
                      className="px-3 py-1 text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                    >
                      もっと見る
                    </Link>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}