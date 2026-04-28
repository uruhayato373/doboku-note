import Link from 'next/link';
import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import peChaptersData from '@/config/pe-chapters.json';
import type { PeChapter } from '@/config/pe-chapters';

const PE_CHAPTERS: PeChapter[] = peChaptersData.chapters;

export const metadata: Metadata = {
  title: '総合技術監理 キーワード索引 | doboku-note',
  description: '技術士・総合技術監理部門のキーワード集 2026（5 管理 × 26 セクション）の全キーワード索引。経済性管理・人的資源管理・情報管理・安全管理・社会環境管理の体系で整理。',
  alternates: {
    canonical: 'https://doboku-note.com/sitemap-keywords',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * PE セクション別ツリー表示
 * キーワード集の5管理体系に基づきキーワードをグルーピング
 */
function PeSectionTree({ keywordDocs }: { keywordDocs: DocMeta[] }) {
  const keywordsBySection = new Map<string, DocMeta[]>();
  const unmapped: DocMeta[] = [];
  for (const doc of keywordDocs) {
    const sec = doc.section as string | undefined;
    if (sec) {
      if (!keywordsBySection.has(sec)) keywordsBySection.set(sec, []);
      keywordsBySection.get(sec)!.push(doc);
    } else {
      unmapped.push(doc);
    }
  }

  return (
    <div className="space-y-10">
      {PE_CHAPTERS.map(chapter => {
        const hasContent = chapter.sections.some(sec =>
          keywordsBySection.has(sec.id)
        );
        if (!hasContent) return null;

        return (
          <div key={chapter.id}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              {chapter.title}
            </h2>
            <div className="space-y-3 ml-2">
              {chapter.sections.map(sec => {
                const keywords = keywordsBySection.get(sec.id) || [];
                if (keywords.length === 0) return null;

                return (
                  <div key={sec.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{sec.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">({keywords.length} 件)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-2 mt-2">
                      {keywords
                        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
                        .map(kw => (
                          <Link
                            key={kw.slug}
                            href={`/docs/${kw.slug}`}
                            className="text-base px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {kw.title}
                          </Link>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {unmapped.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">その他</h2>
          <div className="flex flex-wrap gap-2 ml-2">
            {unmapped
              .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
              .map(kw => (
                <Link
                  key={kw.slug}
                  href={`/docs/${kw.slug}`}
                  className="text-base px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {kw.title}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function SitemapKeywordsPage() {
  const allDocs = await getDocsMetaByCategory('pe-comprehensive-management');
  const keywordDocs = allDocs.filter(d =>
    d.published !== false && d.group === 'keyword'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        <div className="border-b border-[var(--rule-soft)] py-10 sm:py-12 px-4 sm:px-6 lg:px-10 bg-[var(--paper)]">
          <div className="max-w-[1280px] mx-auto">
            <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
              <span aria-hidden className="opacity-60">›</span>
              <Link href="/category/pe-comprehensive-management" className="hover:text-[var(--accent)] transition-colors">総合技術監理</Link>
              <span aria-hidden className="opacity-60">›</span>
              <span>キーワード索引</span>
            </nav>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full mb-4">
              SITEMAP
            </div>
            <h1 className="font-serif font-black tracking-tight text-[var(--ink)] text-[32px] sm:text-[40px] md:text-[48px] leading-[1.2] mb-3">
              総合技術監理 キーワード索引
            </h1>
            <p className="text-[16px] leading-[1.9] text-[var(--ink-body)] max-w-[60ch]">
              <a href="https://www.mext.go.jp/b_menu/shingi/gijyutu/gijyutu7/toushin/1411203_00007.htm" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">文部科学省「総合技術監理 キーワード集 2026」</a>に基づき、5 管理（経済性 / 人的資源 / 情報 / 安全 / 社会環境）× 26 セクションの体系で整理した全キーワードの索引です。
            </p>
            <div className="mt-5 flex gap-4 flex-wrap font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
              <span>{keywordDocs.length.toLocaleString()} keywords</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12 text-[17px] leading-[1.9]">
          <PeSectionTree keywordDocs={keywordDocs} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
