import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocTitleMap } from '@/lib/docs';
import { getSidebar } from '@/lib/sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GeneratedIndexPage from '@/components/layout/GeneratedIndexPage';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllComponents } from '@/lib/component-loader';
import { Metadata } from 'next';

/**
 * Generate static params for all documentation pages.
 * Creates pages for all MDX files in content/ directory.
 */
export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({
    slug,
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
  const doc = getDoc(slug);

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
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);

  if (!doc) {
    notFound();
  }

  // Determine sidebar ID based on doc category
  // Currently all exam docs use examSidebar
  const sidebarId = slug[0] === 'exam' ? 'examSidebar' : 'generalSidebar';
  const sidebar = getSidebar(sidebarId);
  const docTitleMap = getDocTitleMap();

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
              title="1級土木施工管理技士"
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
            <MDXRemote source={doc.content} components={components} />
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
