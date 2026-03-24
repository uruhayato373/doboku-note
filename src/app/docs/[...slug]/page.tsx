import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TableOfContents from '@/components/layout/TableOfContents';
import MobileSidebarDrawer from '@/components/layout/MobileSidebarDrawer';
import MobileTableOfContents from '@/components/layout/MobileTableOfContents';
import {
  getDocBySlug,
  getAllSlugs,
  compileMdxContent,
  extractHeadings,
  getDocTitle,
  getDocTitleMap,
  extractDocIds,
} from '@/lib/content';
import {
  sidebars,
  findSidebarForPath,
  getPrevNext,
  getGeneratedIndexSlugs,
  getSidebarItemPath,
  buildBreadcrumbs,
  SidebarItem,
} from '@/lib/sidebar';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { slugToPath } from '@/lib/url';
import SourceCard from '@/components/content/SourceCard';
import type { SourceMeta } from '@/lib/content';
import matter from 'gray-matter';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// Generate static params for all docs + generated-index pages
export async function generateStaticParams() {
  const docSlugs = getAllSlugs();
  const generatedIndexes = getGeneratedIndexSlugs();

  const params = [
    ...docSlugs.map((slug) => ({ slug })),
    ...generatedIndexes.map((gi) => ({ slug: gi.slug.split('/').filter(Boolean) })),
  ];

  return params;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  const generatedIndex = getGeneratedIndexSlugs().find(
    (gi) => gi.slug === slug.join('/')
  );

  if (doc) {
    const { data } = matter(doc.content);
    return {
      title: data.title || slug[slug.length - 1],
      description: data.description,
    };
  }

  if (generatedIndex) {
    return {
      title: generatedIndex.title,
    };
  }

  return { title: slug.join('/') };
}

// Generated index page component
function GeneratedIndexPage({
  title,
  items,
}: {
  title: string;
  items: SidebarItem[];
}) {
  return (
    <div className="markdown">
      <h1>{title}</h1>
      <div className="grid gap-3 mt-6">
        {items.map((item, i) => {
          if (typeof item === 'string') {
            const parts = item.split('/');
            const label = getDocTitle(item);
            const href =
              parts[parts.length - 1] === 'index'
                ? '/docs/' + parts.slice(0, -1).join('/')
                : '/docs/' + item;
            return (
              <Link
                key={i}
                href={href}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all no-underline text-gray-700 hover:text-primary"
              >
                {label}
              </Link>
            );
          }
          if (item.type === 'category') {
            const linkPath = getSidebarItemPath(item);
            return (
              <Link
                key={i}
                href={linkPath || '#'}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all no-underline text-gray-700 hover:text-primary"
              >
                <span className="font-semibold">{item.label}</span>
                <span className="text-sm text-gray-400 ml-2">
                  ({item.items.length} items)
                </span>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const currentPath = slugToPath(slug);

  // Check if this is a generated-index page
  const generatedIndex = getGeneratedIndexSlugs().find(
    (gi) => gi.slug === slug.join('/')
  );

  // Try to find the doc
  const doc = getDocBySlug(slug);

  if (!doc && !generatedIndex) {
    notFound();
  }

  // Find the sidebar for this page
  const sidebarResult = findSidebarForPath(
    currentPath,
    sidebars
  );
  const sidebarItems = sidebarResult?.items || [];

  // Build title map for sidebar and prev/next labels
  const docIds = extractDocIds(sidebarItems);
  const titleMap = getDocTitleMap(docIds);

  // Get prev/next navigation (with titles)
  const { prev, next } = getPrevNext(currentPath, sidebarItems, titleMap);

  // Build breadcrumbs
  const breadcrumbItems = buildBreadcrumbs(currentPath, sidebarItems, sidebarResult?.sidebarId, titleMap);

  // Render content
  let content: React.ReactNode;
  let headings: { depth: number; text: string; id: string }[] = [];
  let sources: SourceMeta[] = [];

  if (doc) {
    content = await compileMdxContent(doc);
    const { data, content: rawContent } = matter(doc.content);
    headings = extractHeadings(rawContent);
    if (data.source) {
      sources = Array.isArray(data.source) ? data.source : [data.source];
    }
  } else if (generatedIndex) {
    content = (
      <GeneratedIndexPage title={generatedIndex.title} items={generatedIndex.items} />
    );
  }

  return (
    <div className="flex max-w-[1400px] mx-auto">
      {/* Sidebar */}
      <Sidebar items={sidebarItems} titleMap={titleMap} />
      <MobileSidebarDrawer items={sidebarItems} titleMap={titleMap} />

      {/* Main Content */}
      <main className="flex-grow min-w-0 px-6 py-8 max-w-4xl">
        <Breadcrumbs items={breadcrumbItems} />
        {sources.length > 0 && <SourceCard sources={sources} />}
        {headings.length > 0 && <MobileTableOfContents headings={headings} />}
        <article className="markdown">{content}</article>

        {/* Prev / Next Navigation */}
        {(prev || next) && (
          <nav className="flex justify-between mt-12 pt-6 border-t border-gray-200">
            {prev ? (
              <Link
                href={prev.path}
                className="text-sm text-blue-600 hover:underline no-underline"
              >
                <span aria-hidden="true">&larr;</span> {prev.label}
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={next.path}
                className="text-sm text-blue-600 hover:underline no-underline"
              >
                {next.label} <span aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </main>

      {/* Table of Contents */}
      <TableOfContents headings={headings} />
    </div>
  );
}
