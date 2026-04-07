import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs } from '@/lib/docs';
import { generateDynamicSidebar } from '@/lib/sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SidebarNav from '@/components/layout/SidebarNav';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryLabel } from '@/lib/categories';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const StructuredData = dynamic(() => import('@/components/seo/StructuredData'));
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
// remarkDirective removed: :::directive syntax is handled by parseCallouts() in mdx-callout-parser.ts
import rehypeKatex from 'rehype-katex';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import rehypeExternalLinks from 'rehype-external-links';
import { compileMDX } from 'next-mdx-remote/rsc';
import { extractHeadings } from '@/lib/toc';
import TableOfContents from '@/components/ui/TableOfContents';
import type { Pluggable } from 'unified';

const mdxOptions = {
  blockJS: false as const,
  blockDangerousJS: true as const,
  mdxOptions: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [
      rehypeHeadingIds,
      rehypeKatex,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }] satisfies Pluggable,
    ] as Pluggable[],
  },
};

async function SafeMDXRemote({ source, components }: { source: string; components: any }) {
  try {
    // Compile once and use the result directly (avoid double compilation)
    const { content } = await compileMDX({ source, options: mdxOptions, components });
    return <>{content}</>;
  } catch (error: any) {
    console.error('MDX compile error:', error?.message?.slice(0, 200));
    return (
      <div className="p-4 border border-yellow-300 dark:border-yellow-700 rounded bg-yellow-50 dark:bg-yellow-900/20">
        <p className="text-yellow-700 dark:text-yellow-400 font-semibold">
          このページのコンテンツにフォーマットエラーがあります。
        </p>
        <p className="text-yellow-600 dark:text-yellow-500 text-sm mt-1">
          管理者に報告してください。
        </p>
      </div>
    );
  }
}

/**
 * Generate static params for all documentation pages.
 * Creates pages for all MDX files in .local/r2/posts/ directory.
 * Slugs are flattened (e.g., 'civil-construction-1-guide-strategy').
 */
export async function generateStaticParams() {
  const slugs = await getAllDocSlugs();
  const params: { slug: string[] }[] = [];

  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc) {
      params.push({ slug: [slug] });
    }
  }

  return params;
}

/**
 * Generate metadata for each documentation page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = slug?.[0];
  if (!slugStr) {
    return {
      title: 'ページが見つかりません',
      description: 'このページは存在しません。',
    };
  }
  const doc = await getDoc(slugStr);

  if (!doc) {
    return {
      title: 'ページが見つかりません',
      description: 'このページは存在しません。',
    };
  }

  return {
    title: `${doc.meta.title} | doboku-note`,
    description: doc.meta.description || doc.meta.title,
    alternates: {
      canonical: `/docs/${slugStr}`,
    },
    openGraph: {
      title: doc.meta.title,
      description: doc.meta.description || doc.meta.title,
      url: `/docs/${slugStr}`,
      type: 'article',
      siteName: 'doboku-note',
      images: [{
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: doc.meta.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: doc.meta.title,
      description: doc.meta.description || doc.meta.title,
      images: ['/images/og-default.png'],
    },
  };
}

/**
 * Documentation page component.
 * Displays a single MDX document with sidebar navigation.
 * Uses flattened slug structure: /docs/{slug}
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugStr = slug?.[0];
  if (!slugStr) {
    notFound();
  }
  const doc = await getDoc(slugStr);

  if (!doc) {
    notFound();
  }

  // Generate sidebar dynamically based on the document's category
  const category = doc.meta.category;
  const sidebar = await generateDynamicSidebar(category);

  // Load MDX components
  const components = await getAllComponents(doc as any);

  // Extract headings for Table of Contents
  const headings = extractHeadings(
    doc.content,
    doc.meta.toc_min_heading_level ?? 2,
    doc.meta.toc_max_heading_level ?? 4,
  );

  return (
    <>
    <StructuredData type="article" docMeta={doc.meta} />
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <div className="flex-grow w-full">
        {/* Zenn-style: コンテンツ中央 + 右TOC */}
        <div className="max-w-[1200px] mx-auto flex relative">

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* カテゴリナビ（パンくず的） */}
            {category && (
              <div className="max-w-[780px] mx-auto mb-6">
                <a
                  href={`/category/${category}`}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>←</span>
                  <span>{getCategoryLabel(category)}</span>
                </a>
              </div>
            )}

            <article className="max-w-[780px] mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-10 lg:p-12 overflow-hidden transition-colors duration-300">
              {/* MDX Content — title comes from the # heading in MDX */}
              <div className="prose-blog prose-base md:prose-lg">
                <SafeMDXRemote source={doc.content} components={components} />
              </div>
            </article>

            {/* 前後ナビ（カテゴリ内） */}
            {sidebar.length > 0 && (
              <div className="max-w-[780px] mx-auto mt-8">
                <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                  <summary className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors select-none list-none">
                    <span className="flex items-center gap-2">
                      <span>📚</span>
                      <span>{getCategoryLabel(category || '')}</span>
                      <span className="text-gray-400">— {sidebar.length}件</span>
                    </span>
                  </summary>
                  <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-700">
                    <SidebarNav
                      title=""
                      items={sidebar}
                      currentSlug={slugStr}
                    />
                  </div>
                </details>
              </div>
            )}
          </main>

          {/* Right Sidebar: Table of Contents (Zenn-style) */}
          <aside className="hidden xl:block w-[280px] shrink-0">
            <div className="sticky top-20 py-12 pr-6">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
}
