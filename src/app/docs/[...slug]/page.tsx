import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocsMetaByCategory } from '@/lib/docs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryLabel } from '@/lib/categories';
import { classifyDoc } from '@/lib/doc-classifier';
import { generateDynamicSidebar } from '@/lib/dynamic-sidebar';
import SidebarNav from '@/components/layout/SidebarNav';
import SectionKeywords from '@/components/ui/SectionKeywords';
import { Metadata } from 'next';
import { getOgpImageUrl } from '@/lib/r2-image-loader';
import StructuredData from '@/components/seo/StructuredData';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
// remarkDirective removed: :::directive syntax is handled by parseCallouts() in mdx-callout-parser.ts
import rehypeKatex from 'rehype-katex';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import rehypeExternalLinks from 'rehype-external-links';
import { compileMDX } from 'next-mdx-remote/rsc';
import { extractHeadings } from '@/lib/toc';
import TableOfContents from '@/components/ui/TableOfContents';
import RelatedArticles from '@/components/ui/RelatedArticles/RelatedArticles';
import { selectRelatedArticles } from '@/lib/related-articles';
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

  // SEOタイトル: カテゴリ・グループに応じたサフィックスを付与
  const group = classifyDoc(doc.meta);
  const isCemKeywordOrSection =
    doc.meta.category === 'pe-comprehensive-management' &&
    (group === 'keyword' || group === 'section');
  const isCemPastExam =
    doc.meta.category === 'pe-comprehensive-management' &&
    group === 'pastExam';

  let title: string | { absolute: string };
  let ogTitle: string;

  if (isCemPastExam) {
    // 過去問: 「技術士 総監 R07 択一式 過去問【解答解説付き】」
    const hasDetails = (doc.meta.description || '').includes('解答解説') ||
      (doc.meta.tags || []).includes('択一式') ||
      (doc.meta.tags || []).includes('past-questions');
    const suffix = hasDetails ? '【解答解説付き】' : '';
    title = { absolute: `${doc.meta.title}${suffix}` };
    ogTitle = `${doc.meta.title}${suffix}`;
  } else if (isCemKeywordOrSection) {
    // キーワード/セクション: テンプレート無効化して独自サフィックス
    title = { absolute: `${doc.meta.title}｜技術士 総監キーワード` };
    ogTitle = `${doc.meta.title}｜技術士 総監キーワード`;
  } else {
    // その他: テンプレート（"%s | doboku-note"）に任せる
    title = doc.meta.title;
    ogTitle = doc.meta.title;
  }

  const description = doc.meta.description || doc.meta.title;

  return {
    title,
    description,
    alternates: {
      canonical: `/docs/${slugStr}`,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: `/docs/${slugStr}`,
      type: 'article',
      siteName: 'doboku-note',
      images: [{
        url: getOgpImageUrl(slugStr),
        width: 1200,
        height: 630,
        alt: doc.meta.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [getOgpImageUrl(slugStr)],
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

  const category = doc.meta.category;

  // Load MDX components
  const components = await getAllComponents(doc as any);

  // Fetch related articles (metadata only)
  const categoryArticles = category
    ? await getDocsMetaByCategory(category)
    : [];
  const relatedArticles = selectRelatedArticles(doc.meta, categoryArticles);

  // Generate sidebar for category navigation
  const sidebarItems = category
    ? await generateDynamicSidebar(category)
    : [];

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
        {/* コンテンツ中央 + 左サイドバー + 右TOC */}
        <div className="max-w-[1400px] mx-auto flex relative">

          {/* Left Sidebar: Category Navigation */}
          {sidebarItems.length > 0 && (
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-20 py-12 pl-6 max-h-[calc(100vh-5rem)] overflow-y-auto">
                <SidebarNav
                  title={getCategoryLabel(category!)}
                  items={sidebarItems}
                  currentSlug={slugStr}
                />
              </div>
            </aside>
          )}

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

            {/* 関連記事 */}
            {relatedArticles.length > 0 && (
              <div className="max-w-[780px] mx-auto mt-8">
                <RelatedArticles articles={relatedArticles} />
              </div>
            )}

            {/* 同セクションのキーワード（CEM keyword/section ページのみ） */}
            {doc.meta.category === 'pe-comprehensive-management' && doc.meta.section && (
              <div className="max-w-[780px] mx-auto mt-8">
                <SectionKeywords
                  currentSlug={slugStr}
                  section={doc.meta.section as string}
                />
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
