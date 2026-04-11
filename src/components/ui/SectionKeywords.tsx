import Link from 'next/link';
import peChaptersData from '@/config/pe-chapters.json';

interface SectionKeywordsProps {
  currentSlug: string;
  section: string;
}

/**
 * 同セクション内のキーワードリンク一覧。
 * pe-chapters.json のデータを使って自動生成。
 */
export default function SectionKeywords({ currentSlug, section }: SectionKeywordsProps) {
  const chapterId = section.split('.')[0];
  const chapter = peChaptersData.chapters.find(c => c.id === chapterId);
  if (!chapter) return null;

  const sec = chapter.sections.find(s => s.id === section);
  if (!sec || !sec.keywords) return null;

  // 現在のページを除外
  const currentSlugSuffix = currentSlug.replace('pe-comprehensive-management-', '');
  const others = sec.keywords.filter(k => k.slug !== currentSlugSuffix);
  if (others.length === 0) return null;

  return (
    <section
      aria-label="同じセクションのキーワード"
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8"
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {sec.title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {chapter.title} &mdash; セクション {section}
      </p>
      <div className="flex flex-wrap gap-2">
        {others.map(kw => (
          <Link
            key={kw.slug}
            href={`/docs/pe-comprehensive-management-${kw.slug}`}
            className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {kw.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
