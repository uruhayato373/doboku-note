import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';

interface RelatedArticlesProps {
  articles: DocMeta[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-label="関連記事"
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8"
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>関連記事</span>
      </h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/docs/${article.slug}`}
            className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-2 h-full">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                {article.title}
              </h3>
              {article.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 flex-grow">
                  {article.description}
                </p>
              )}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {article.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {article.tags.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      +{article.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
