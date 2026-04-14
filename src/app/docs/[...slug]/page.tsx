import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocsMetaByCategory } from '@/lib/docs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryLabel } from '@/lib/categories';
import { classifyDoc, getGroupLabel } from '@/lib/doc-classifier';
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
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PastExamBacklinks from '@/components/ui/PastExamBacklinks/PastExamBacklinks';
import KeywordsInExam from '@/components/ui/KeywordsInExam/KeywordsInExam';
import RelatedTextbooks from '@/components/ui/RelatedTextbooks/RelatedTextbooks';
import TextbookNav from '@/components/ui/TextbookNav/TextbookNav';
import AuthorCard from '@/components/ui/AuthorCard/AuthorCard';
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
    group === 'keyword';
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

  // Fetch category articles (metadata only)
  const categoryArticles = category
    ? await getDocsMetaByCategory(category)
    : [];

  // Determine page classification for navigation cards
  const docGroup = classifyDoc(doc.meta);
  const hasCategoryNavCard = category === 'pe-comprehensive-management' || category === 'civil-construction-1';

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

      <div className="flex-grow w-full pb-16">
        {/* Zenn Container_wide: max-width 1200px + responsive padding */}
        <div className="max-w-[1200px] mx-auto px-[14px] zenn-tiny:px-5 zenn-sp:px-[25px] zenn-tablet:px-10 flex gap-[30px] relative">

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 py-10">
            {/* Zenn View_main: rounded 4px + 1px border + py-10 px-10 / モバイル full-bleed */}
            <article className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-[4px] py-10 px-10 overflow-hidden transition-colors duration-300 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:py-[35px] max-zenn-sp:px-5 max-zenn-tiny:px-[14px]">
              {/* パンくず（カード内、タイトル上）: カテゴリ名 › グループ名 */}
              {category && (
                <div className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                  <a
                    href={`/category/${category}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {getCategoryLabel(category)}
                  </a>
                  <span className="mx-1">›</span>
                  <span>{getGroupLabel(category, docGroup)}</span>
                </div>
              )}
              {/* MDX Content — title comes from the # heading in MDX */}
              <div className="prose-blog prose-base md:prose-lg">
                <SafeMDXRemote source={doc.content} components={components} />
              </div>
            </article>

            {/* 記事末尾の情報（ページ種別ごとの構成は docs/project/article-footer-design.md 参照） */}

            {/* PE keyword: 過去問逆引き + 同セクションキーワード */}
            {category === 'pe-comprehensive-management' && docGroup === 'keyword' && (
              <>
                <div className="mt-8">
                  <PastExamBacklinks category={category} currentSlug={slugStr} />
                </div>
                {doc.meta.section && (
                  <div className="mt-8">
                    <SectionKeywords
                      currentSlug={slugStr}
                      section={doc.meta.section as string}
                    />
                  </div>
                )}
              </>
            )}

            {/* PE past-exam: 扱われたキーワード一覧 */}
            {category === 'pe-comprehensive-management' && docGroup === 'pastExam' && (
              <div className="mt-8">
                <KeywordsInExam
                  currentSlug={slugStr}
                  categoryArticles={categoryArticles}
                  category={category}
                />
              </div>
            )}

            {/* Civil primary: 関連テキスト章 */}
            {category === 'civil-construction-1' && docGroup === 'primary' && (
              <div className="mt-8">
                <RelatedTextbooks currentMeta={doc.meta} categoryArticles={categoryArticles} />
              </div>
            )}

            {/* Civil textbook: 前後章ナビ */}
            {category === 'civil-construction-1' && docGroup === 'textbook' && (
              <div className="mt-8">
                <TextbookNav currentSlug={slugStr} categoryArticles={categoryArticles} />
              </div>
            )}

            {/* guide/secondary: カテゴリナビカード（モバイル） */}
            {hasCategoryNavCard && category && (docGroup === 'guide' || docGroup === 'secondary' || docGroup === 'textbook') && (
              <div className="mt-8 zenn-desktop:hidden">
                <CategoryNavCard
                  variant="mobile"
                  category={category}
                  currentSlug={slugStr}
                  docGroup={docGroup}
                  categoryArticles={categoryArticles}
                />
              </div>
            )}

            {/* 執筆者・最終更新日（全記事共通・E-A-T 強化） */}
            <AuthorCard
              publishedAt={(doc.meta as any).publishedAt || (doc.meta as any).created}
              updatedAt={(doc.meta as any).updatedAt}
            />
          </main>

          {/* Right Sidebar: Zenn 300px, visible at ≥993px (zenn-desktop) */}
          <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10">
            {hasCategoryNavCard && category && (
              <div className="mb-3">
                <CategoryNavCard
                  variant="sidebar"
                  category={category}
                  currentSlug={slugStr}
                  docGroup={docGroup}
                  categoryArticles={categoryArticles}
                />
              </div>
            )}
            <div className="sticky top-6">
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
