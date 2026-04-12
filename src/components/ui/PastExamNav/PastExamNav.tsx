import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { buildPastExamNavData } from './exam-nav-utils';
import type { PastExamNavData, ExamYear } from './exam-nav-utils';

interface PastExamNavProps {
  variant: 'sidebar' | 'mobile';
  category: string;
  currentSlug: string;
  categoryArticles: DocMeta[];
}

function CellLink({ slug, label, currentSlug }: { slug?: string; label: string; currentSlug: string }) {
  if (!slug) {
    return <span className="text-gray-300 dark:text-gray-600">—</span>;
  }
  if (slug === currentSlug) {
    return <span className="font-bold text-gray-900 dark:text-gray-100">{label}</span>;
  }
  return (
    <Link
      href={`/docs/${slug}`}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
    >
      {label}
    </Link>
  );
}

function SidebarVariant({ data, currentSlug }: { data: PastExamNavData; currentSlug: string }) {
  return (
    <div
      className="border rounded bg-white dark:bg-[#0d223a] dark:border-[#2a3a4e]"
      style={{ borderColor: '#e4edf4', borderRadius: '4px', padding: '16px 16px 20px' }}
    >
      <div
        className="text-gray-900 dark:text-[#ecf5ff]"
        style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}
      >
        過去問
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-1 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs" />
            <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">
              {data.col1Header}
            </th>
            <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">
              {data.col2Header}
            </th>
            {data.col3Header && (
              <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">
                {data.col3Header}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.years.map((year) => {
            const isCurrentYear =
              year.col1?.slug === currentSlug ||
              year.col2?.slug === currentSlug ||
              year.col3?.slug === currentSlug;
            return (
              <tr
                key={year.yearCode}
                className={isCurrentYear ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}
              >
                <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                  {year.label}
                </td>
                <td className="py-1.5 px-1 text-center">
                  <CellLink slug={year.col1?.slug} label={data.col1Header} currentSlug={currentSlug} />
                </td>
                <td className="py-1.5 px-1 text-center">
                  <CellLink slug={year.col2?.slug} label={data.col2Header} currentSlug={currentSlug} />
                </td>
                {data.col3Header && (
                  <td className="py-1.5 px-1 text-center">
                    <CellLink slug={year.col3?.slug} label={data.col3Header} currentSlug={currentSlug} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileVariant({ data, currentSlug }: { data: PastExamNavData; currentSlug: string }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        過去問一覧
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">年度</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                {data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                {data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`}
              </th>
              {data.col3Header && (
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  第2次検定
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrentYear =
                year.col1?.slug === currentSlug ||
                year.col2?.slug === currentSlug ||
                year.col3?.slug === currentSlug;
              return (
                <tr
                  key={year.yearCode}
                  className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
                    isCurrentYear
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <td className={`py-3 px-4 text-gray-900 dark:text-gray-100 ${isCurrentYear ? 'font-bold' : 'font-medium'}`}>
                    {year.label}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CellLink
                      slug={year.col1?.slug}
                      label={data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`}
                      currentSlug={currentSlug}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CellLink
                      slug={year.col2?.slug}
                      label={data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`}
                      currentSlug={currentSlug}
                    />
                  </td>
                  {data.col3Header && (
                    <td className="py-3 px-4 text-center">
                      <CellLink slug={year.col3?.slug} label="第2次検定" currentSlug={currentSlug} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PastExamNav({ variant, category, currentSlug, categoryArticles }: PastExamNavProps) {
  const data = buildPastExamNavData(category, categoryArticles);
  if (!data || data.years.length === 0) return null;

  if (variant === 'sidebar') {
    return <SidebarVariant data={data} currentSlug={currentSlug} />;
  }
  return <MobileVariant data={data} currentSlug={currentSlug} />;
}
