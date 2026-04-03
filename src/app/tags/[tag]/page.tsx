import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getAllPosts } from "@/lib/mdx";
import Posts from "@/components/blog/Posts";
import tags from "@/config/tags.json";

// ビルド時にデータを生成
export async function generateStaticParams() {
  return tags.map((tagInfo) => ({
    tag: tagInfo.slug,
  }));
}

// メタデータの生成
export async function generateMetadata({ params }: { params: { tag: string } }) {
  const slug = params.tag;
  const tagInfo = tags.find((t) => t.slug === slug);
  const tagName = tagInfo ? tagInfo.name : decodeURIComponent(slug);
  const postCount = getAllPosts().filter((post) => post.tags.includes(tagName)).length;

  return {
    title: `#${tagName} の記事 - カッコム`,
    description: `タグ「${tagName}」に関連する記事一覧です。40代からの公務員・会社員向けの実践的な情報をお届けします。`,
    keywords: [tagName, "タグ", "記事一覧", "40代", "公務員", "会社員"],
    // 記事数が3件未満のタグページはnoindexでクロールバジェットを節約
    ...(postCount < 3 && {
      robots: { index: false, follow: true },
    }),
  };
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const slug = params.tag;
  const tagInfo = tags.find((t) => t.slug === slug);
  const tagName = tagInfo ? tagInfo.name : decodeURIComponent(slug);
  const posts = getAllPosts().filter((post) => post.tags.includes(tagName));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              #{tagName}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              タグ「{tagName}」に関連する記事一覧です。{posts.length}
              件の記事が見つかりました。
            </p>
          </div>

          {/* Posts Grid */}
          {posts.length > 0 ? (
            <Posts posts={posts} />
          ) : (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                  🔍
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                  タグ「{tagName}」に関連する記事は見つかりませんでした。
                </div>
                <a
                  href="/blog"
                  className="inline-block bg-gradient-to-r from-primary-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  すべての記事を見る
                </a>
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="text-center mt-12">
            <a
              href="/blog"
              className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              すべての記事を見る
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}