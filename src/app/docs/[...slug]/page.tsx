import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocTitleMap } from '@/lib/docs';
import { generateDynamicSidebar } from '@/lib/sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GeneratedIndexPage from '@/components/layout/GeneratedIndexPage';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryLabel } from '@/lib/categories';
import { Metadata } from 'next';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';
import { compileMDX } from 'next-mdx-remote/rsc';

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkMath, remarkGfm, remarkDirective],
    rehypePlugins: [rehypeKatex],
  },
};

async function SafeMDXRemote({ source, components }: { source: string; components: any }) {
  try {
    // Pre-compile to catch errors before rendering
    await compileMDX({ source, options: mdxOptions });
    return <MDXRemote source={source} components={components} options={mdxOptions} />;
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
  return slugs.map((slug) => ({
    slug: [slug],
  }));
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
  const docTitleMap = await getDocTitleMap();

  // Load MDX components
  const components = await getAllComponents(doc as any);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <div className="flex max-w-[1400px] mx-auto w-full flex-grow">
        {/* Left Sidebar: Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-300">
          <div className="p-4">
            <GeneratedIndexPage
              title={category ? getCategoryLabel(category) : 'ドキュメント'}
              items={sidebar}
              docTitleMap={docTitleMap}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-4xl">
          {/* Breadcrumb-like title section */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {doc.meta.title}
            </h1>
            {doc.meta.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {doc.meta.description}
              </p>
            )}
          </div>

          {/* MDX Content */}
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
            <SafeMDXRemote source={doc.content} components={components} />
          </div>
        </main>

        {/* Right Sidebar: Table of Contents (placeholder) */}
        <aside className="hidden xl:block w-56 shrink-0 px-4 py-8">
          {/* ToC would be rendered here in future */}
        </aside>
      </div>

      <Footer />
    </div>
  );
}
