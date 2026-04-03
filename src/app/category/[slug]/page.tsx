import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsByCategory } from '@/lib/docs';

export async function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map(cat => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) {
    return {
      title: 'カテゴリが見つかりません | doboku-note',
    };
  }
  return {
    title: `${cat.label} | doboku-note`,
    description: cat.subtitle,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);

  if (!cat) {
    notFound();
  }

  const allDocs = await getDocsByCategory(slug);
  const docs = allDocs.filter(d => d.meta.published !== false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow">
        {/* Category Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {cat.label}
            </h1>
            <p className="text-lg text-gray-600">{cat.subtitle}</p>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                このカテゴリにはまだコンテンツがありません。
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {docs.map(doc => (
                <Link
                  key={doc.meta.slug}
                  href={`/docs/${doc.meta.slug}`}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col gap-3 h-full">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                      {doc.meta.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 flex-grow">
                      {doc.meta.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {(doc.meta.tags || []).slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.meta.tags && doc.meta.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{doc.meta.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-16 pt-12 border-t border-gray-200">
            <p className="text-center text-gray-500">
              全 {docs.length} 件のコンテンツが登録されています
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
