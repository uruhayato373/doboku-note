/**
 * カテゴリナビカード
 * PE・Civil 両カテゴリのグループナビゲーションを
 * ページの分類に応じて右サイドバーまたは記事末尾に表示する。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { classifyDoc, type DocGroupKey } from '@/lib/doc-classifier';
import { buildPastExamNavData } from '@/components/ui/PastExamNav/exam-nav-utils';
import type { PastExamNavData } from '@/components/ui/PastExamNav/exam-nav-utils';
import peChaptersData from '@/config/pe-chapters.json';

interface CategoryNavCardProps {
  variant: 'sidebar' | 'mobile';
  category: string;
  currentSlug: string;
  docGroup: DocGroupKey;
  categoryArticles: DocMeta[];
}

/* ─── 共通: セルリンク ─── */
function CellLink({ slug, label, currentSlug }: { slug: string | undefined; label: string; currentSlug: string }) {
  if (!slug) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  if (slug === currentSlug) return <span className="font-bold text-gray-900 dark:text-gray-100">{label}</span>;
  return (
    <Link href={`/docs/${slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
      {label}
    </Link>
  );
}

/* ━━━ 試験概要カード ━━━ */
function GuideCard({ variant, currentSlug, categoryArticles }: { variant: 'sidebar' | 'mobile'; currentSlug: string; categoryArticles: DocMeta[] }) {
  const guides = categoryArticles
    .filter((m) => classifyDoc(m) === 'guide')
    .sort((a, b) => {
      const oa = (a as any).guide_order ?? 999;
      const ob = (b as any).guide_order ?? 999;
      return oa - ob;
    });

  if (guides.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title="試験概要">
        <ul className="space-y-1.5">
          {guides.map((g) => (
            <li key={g.slug}>
              {g.slug === currentSlug ? (
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{g.sidebar_label || g.title}</span>
              ) : (
                <Link href={`/docs/${g.slug}`} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                  {g.sidebar_label || g.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title="試験概要">
      <ul className="space-y-2">
        {guides.map((g) => (
          <li key={g.slug} className={`rounded-lg border px-4 py-3 transition-colors ${g.slug === currentSlug ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
            {g.slug === currentSlug ? (
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{g.title}</span>
            ) : (
              <Link href={`/docs/${g.slug}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {g.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </MobileWrapper>
  );
}

/* ━━━ 過去問カード ━━━ */
function PastExamCard({ variant, currentSlug, categoryArticles, category }: { variant: 'sidebar' | 'mobile'; currentSlug: string; categoryArticles: DocMeta[]; category: string }) {
  const data = buildPastExamNavData(category, categoryArticles);
  if (!data || data.years.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title="過去問">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-1 pr-2 font-medium text-gray-500 dark:text-gray-400 text-xs" />
              <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">{data.col1Header}</th>
              <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">{data.col2Header}</th>
              {data.col3Header && <th className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 text-xs">{data.col3Header}</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={isCurrent ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}>
                  <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{year.label}</td>
                  <td className="py-1.5 px-1 text-center"><CellLink slug={year.col1?.slug} label={data.col1Header} currentSlug={currentSlug} /></td>
                  <td className="py-1.5 px-1 text-center"><CellLink slug={year.col2?.slug} label={data.col2Header} currentSlug={currentSlug} /></td>
                  {data.col3Header && <td className="py-1.5 px-1 text-center"><CellLink slug={year.col3?.slug} label={data.col3Header} currentSlug={currentSlug} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title="過去問一覧">
      <div className="overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">年度</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">{data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">{data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`}</th>
              {data.col3Header && <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第2次検定</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                  <td className={`py-3 px-4 text-gray-900 dark:text-gray-100 ${isCurrent ? 'font-bold' : 'font-medium'}`}>{year.label}</td>
                  <td className="py-3 px-4 text-center"><CellLink slug={year.col1?.slug} label={data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`} currentSlug={currentSlug} /></td>
                  <td className="py-3 px-4 text-center"><CellLink slug={year.col2?.slug} label={data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`} currentSlug={currentSlug} /></td>
                  {data.col3Header && <td className="py-3 px-4 text-center"><CellLink slug={year.col3?.slug} label="第2次検定" currentSlug={currentSlug} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MobileWrapper>
  );
}

/* ━━━ セクション別解説カード ━━━ */
function SectionCard({ variant, currentSlug, currentSection }: { variant: 'sidebar' | 'mobile'; currentSlug: string; currentSection: string | undefined }) {
  const chapters = peChaptersData.chapters;
  const currentChapterId = currentSection?.split('.')[0];

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title="セクション別解説">
        <ul className="space-y-2">
          {chapters.map((ch) => {
            const isCurrentChapter = ch.id === currentChapterId;
            return (
              <li key={ch.id}>
                <div className={`text-xs font-semibold mb-1 ${isCurrentChapter ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {ch.title}
                </div>
                {isCurrentChapter && (
                  <ul className="space-y-0.5 ml-2">
                    {ch.sections.map((sec) => {
                      const isCurrentSection = sec.id === currentSection;
                      return (
                        <li key={sec.id}>
                          <span className={`text-xs ${isCurrentSection ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                            {sec.id} {sec.title}
                            {sec.keywords && <span className="text-gray-400 dark:text-gray-500 ml-1">({sec.keywords.length})</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title="セクション別解説">
      <div className="space-y-4">
        {chapters.map((ch) => {
          const isCurrentChapter = ch.id === currentChapterId;
          return (
            <div key={ch.id}>
              <h3 className={`text-sm font-bold mb-2 ${isCurrentChapter ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {ch.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ch.sections.map((sec) => {
                  const isCurrentSection = sec.id === currentSection;
                  return (
                    <span
                      key={sec.id}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        isCurrentSection
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 font-bold text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {sec.id} {sec.title}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </MobileWrapper>
  );
}

/* ─── ラッパー（デザイン統一） ─── */
function SidebarWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="border rounded bg-white dark:bg-[#0d223a] dark:border-[#2a3a4e]"
      style={{ borderColor: '#e4edf4', borderRadius: '4px', padding: '16px 16px 20px' }}
    >
      <div
        className="text-gray-900 dark:text-[#ecf5ff]"
        style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function MobileWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

/* ━━━ リンクリストカード（汎用） ━━━ */
function LinkListCard({ variant, title, currentSlug, docs }: { variant: 'sidebar' | 'mobile'; title: string; currentSlug: string; docs: DocMeta[] }) {
  if (docs.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title={title}>
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.slug}>
              {d.slug === currentSlug ? (
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.sidebar_label || d.title}</span>
              ) : (
                <Link href={`/docs/${d.slug}`} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                  {d.sidebar_label || d.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title={title}>
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.slug} className={`rounded-lg border px-4 py-3 transition-colors ${d.slug === currentSlug ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
            {d.slug === currentSlug ? (
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.title}</span>
            ) : (
              <Link href={`/docs/${d.slug}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {d.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </MobileWrapper>
  );
}

/* ━━━ メインコンポーネント ━━━ */
export default function CategoryNavCard({ variant, category, currentSlug, docGroup, categoryArticles }: CategoryNavCardProps) {
  if (category === 'pe-comprehensive-management') {
    const currentDoc = categoryArticles.find((m) => m.slug === currentSlug);
    const currentSection = currentDoc?.section as string | undefined;

    switch (docGroup) {
      case 'guide':
        return <GuideCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} />;
      case 'pastExam':
        return <PastExamCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} category={category} />;
      case 'keyword':
        return <SectionCard variant={variant} currentSlug={currentSlug} currentSection={currentSection} />;
      default:
        return null;
    }
  }

  if (category === 'civil-construction-1') {
    switch (docGroup) {
      case 'guide': {
        const guides = categoryArticles.filter((m) => classifyDoc(m) === 'guide');
        return <LinkListCard variant={variant} title="試験ガイド" currentSlug={currentSlug} docs={guides} />;
      }
      case 'primary':
        return <PastExamCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} category={category} />;
      case 'secondary': {
        const secondaryDocs = categoryArticles.filter((m) => classifyDoc(m) === 'secondary');
        return <LinkListCard variant={variant} title="第2次検定" currentSlug={currentSlug} docs={secondaryDocs} />;
      }
      case 'textbook': {
        const textbooks = categoryArticles
          .filter((m) => classifyDoc(m) === 'textbook')
          .sort((a, b) => ((a as any).textbook_order ?? 999) - ((b as any).textbook_order ?? 999));
        return <LinkListCard variant={variant} title="テキスト" currentSlug={currentSlug} docs={textbooks} />;
      }
      default:
        return null;
    }
  }

  return null;
}
