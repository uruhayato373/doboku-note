import { getAllPosts } from "@/lib/mdx";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import tagsData from "@/config/tags.json";

const getSlugByName = (name: string) => {
  const tagInfo = tagsData.find((t) => t.name === name);
  return tagInfo ? tagInfo.slug : name;
};

export default function TagsPage() {
  const posts = getAllPosts();
  const tagCounts: { [key: string]: number } = {};

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      if (tagCounts[tag]) {
        tagCounts[tag]++;
      } else {
        tagCounts[tag] = 1;
      }
    });
  });

  const sortedTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              タグ一覧
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              すべてのタグと、それぞれに関連する記事の数を確認できます。
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 md:p-12">
            <div className="flex flex-wrap gap-4 justify-center">
              {sortedTags.map(([tag, count]) => (
                <Link
                  key={tag}
                  href={`/tags/${getSlugByName(tag)}`}
                  className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md transform hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="font-semibold text-lg">{tag}</span>
                  <span className="ml-3 bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {sortedTags.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                  📂
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                  まだタグがありません。
                </div>
                <a
                  href="/blog"
                  className="inline-block bg-gradient-to-r from-primary-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  記事を探す
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}