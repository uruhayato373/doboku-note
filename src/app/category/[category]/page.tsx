import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getPostsByCategory } from "@/lib/mdx";
import BlogCard from "@/components/ui/BlogCard";
import CategoryHeader from "@/components/ui/CategoryHeader";
import { getCategoryIcon } from "@/components/icons/CategoryIcons";
import categoriesConfig from "@/config/categories.json";
import { notFound } from "next/navigation";
import { CategoriesConfig } from "@/types/category";

const categories = categoriesConfig as CategoriesConfig;

export async function generateStaticParams() {
  return Object.keys(categories).map((category) => ({
    category: encodeURIComponent(category),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);
  const categoryConfig = categories[category];

  if (!categoryConfig) {
    return {
      title: "カテゴリが見つかりません | カッコム",
    };
  }

  return {
    title: `${category} | カッコム`,
    description: `${categoryConfig.subtitle}に関する記事一覧`,
  };
}

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);
  const categoryConfig = categories[category];

  if (!categoryConfig) {
    notFound();
  }

  const posts = getPostsByCategory(category);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryHeader
            title={category}
            subtitle={categoryConfig.subtitle}
            icon={getCategoryIcon(categoryConfig.icon)}
            variant={categoryConfig.variant}
          />

          {/* Posts Grid */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-12">
                <div className="text-primary-400 dark:text-primary-500 text-6xl mb-4">
                  📝
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                  このカテゴリの記事はまだありません。
                </div>
                <a
                  href="/blog"
                  className="inline-block bg-gradient-to-r from-primary-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1"
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
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg font-medium hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1"
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
