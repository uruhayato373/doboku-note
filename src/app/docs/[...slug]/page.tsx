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
// 2026-04-26 #84 LCP 改善: katex.min.css は数式を扱う docs ページのみで読み込む。
// 元は src/app/layout.tsx で全ページに注入していたが、render-blocking CSS を home/category/about
// 等から除去するため、MDXRemote + rehype-katex を使うこのファイルのみに局所化。
import 'katex/dist/katex.min.css';
import rehypeHeadingIds from '@/lib/rehype-heading-ids';
import rehypeExamReferences from '@/lib/rehype-exam-references';
import rehypeExternalLinks from 'rehype-external-links';
import { compileMDX } from 'next-mdx-remote/rsc';
import { extractHeadings } from '@/lib/toc';
import TableOfContents from '@/components/ui/TableOfContents';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';
import MagazineSidebarCard from '@/components/ui/MagazineSidebarCard';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard';
import PastExamBacklinks from '@/components/ui/PastExamBacklinks/PastExamBacklinks';
import KeywordsInExam from '@/components/ui/KeywordsInExam/KeywordsInExam';
import RelatedTextbooks from '@/components/ui/RelatedTextbooks/RelatedTextbooks';
import TextbookNav from '@/components/ui/TextbookNav/TextbookNav';
import AuthorCard from '@/components/ui/AuthorCard/AuthorCard';
import FAQCard from '@/components/ui/FAQCard/FAQCard';
import ExternalReferences from '@/components/ui/ExternalReferences/ExternalReferences';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import { generateHeadingId } from '@/lib/toc';
import { extractReferencesSection } from '@/lib/extract-references';
import type { Pluggable } from 'unified';

const mdxOptions = {
  blockJS: false as const,
  blockDangerousJS: true as const,
  mdxOptions: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [
      rehypeHeadingIds,
      rehypeKatex,
      rehypeExamReferences,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }] satisfies Pluggable,
    ] as Pluggable[],
  },
};

/**
 * MDX content の先頭にある単一の `# title` 行（および直後の空行）を削除する。
 * page.tsx 側で frontmatter から server-side に H1 を描画するため、本文 H1 を二重描画させないための前処理。
 * H1 が無い記事（reference-materials 等で `## ` から始まる）はそのまま返す。
 */
function stripLeadingH1(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i]!)) {
    const rest = lines.slice(i + 1);
    while (rest.length > 0 && rest[0]!.trim() === '') rest.shift();
    return [...lines.slice(0, i), ...rest].join('\n');
  }
  return content;
}

async function SafeMDXRemote({ source, components }: { source: string; components: any }) {
  try {
    // Compile once and use the result directly (avoid double compilation)
    const { content } = await compileMDX({ source, options: mdxOptions, components });
    return <>{content}</>;
  } catch (error: any) {
    console.error('MDX compile error:', error?.message?.slice(0, 200));
    return (
      <div className="p-4 border border-yellow-300 dark:border-yellow-700 rounded-sm bg-yellow-50 dark:bg-yellow-900/20">
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
 * frontmatter の日付値を RFC3339 ISO 文字列に正規化する。
 * OGP (article:published_time / article:modified_time) 用。
 * - `'2026-04-14'` → `'2026-04-14T00:00:00.000Z'`
 * - 既に ISO 文字列ならそのまま
 * - 無効な値なら undefined
 */
function toISOStringSafe(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
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

  // SEOタイトル: frontmatter の seoTitle をそのまま使用
  const seoTitle = (doc.meta as any).seoTitle || doc.meta.title;
  const title: string | { absolute: string } = { absolute: seoTitle };
  const ogTitle = seoTitle;

  const description = doc.meta.description || doc.meta.title;

  const publishedTime = toISOStringSafe((doc.meta as any).publishedAt);
  const modifiedTime = toISOStringSafe(
    (doc.meta as any).lastRewrittenAt ||
    (doc.meta as any).updatedAt ||
    (doc.meta as any).publishedAt
  );

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
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
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
    ? (await getDocsMetaByCategory(category)).filter(d => !d.tags?.includes('模範論文'))
    : [];

  // Determine page classification for navigation cards
  const docGroup = classifyDoc(doc.meta);
  const hasCategoryNavCard = category === 'pe-comprehensive-management' || category === 'civil-construction-1';
  const showPillarNav = category === 'pe-comprehensive-management' && docGroup === 'keyword';
  const sectionStr = doc.meta.section as string | undefined;

  // 参考資料セクションを本文から抽出して別カードに切り出す
  // → 本文・TOC の両方から ## 参考資料 が消え、<ExternalReferences> として表示される
  const { strippedContent, references } = extractReferencesSection(doc.content);

  // Extract headings for Table of Contents
  const headings = extractHeadings(
    strippedContent,
    doc.meta.toc_min_heading_level ?? 2,
    doc.meta.toc_max_heading_level ?? 3,
  );

  return (
    <>
    <StructuredData type="article" docMeta={doc.meta} />
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <div className="flex-grow w-full pb-16">
        {/* Editorial Container: max-width 1200px + responsive padding（モバイル ≤576px はカードフルブリードのため padding 0） */}
        <div className="max-w-[1200px] mx-auto zenn-sp:px-[25px] zenn-tablet:px-10 flex gap-[32px] relative">

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 py-10">
            {/* Editorial article card: 12px radius, soft border + shadow */}
            <article className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft py-12 px-12 overflow-hidden transition-colors duration-300 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:py-[35px] max-zenn-sp:px-5 max-zenn-tiny:px-[14px]">
              {/* パンくず（カード内、タイトル上）: mono uppercase tracking-widest */}
              {category && (
                <nav aria-label="breadcrumb" className="mb-6 font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-2">
                  <a
                    href={`/category/${category}`}
                    className="hover:text-[var(--accent)] transition-colors"
                  >
                    {getCategoryLabel(category)}
                  </a>
                  <span aria-hidden className="opacity-60">›</span>
                  <span>{getGroupLabel(category, docGroup)}</span>
                </nav>
              )}
              {/* タイトル: frontmatter から server-side で描画。MDX 内 H1 は下で strip する */}
              <h1
                id={generateHeadingId(doc.meta.title)}
                className="font-serif font-black text-[var(--ink)] leading-[1.25] tracking-tight text-balance [word-break:auto-phrase] m-0 mb-0"
                style={{
                  letterSpacing: '-0.02em',
                }}
              >
                {doc.meta.title}
              </h1>
              {/* タイトル直下 byline: 日付 + 読了時間（タグなし） */}
              <MetaRow
                variant="byline"
                publishedAt={(doc.meta as any).publishedAt || (doc.meta as any).created}
                updatedAt={(doc.meta as any).updatedAt || (doc.meta as any).dateModified}
              />
              {/* MDX Content — 先頭の # H1 は server-side で描画済みのため strip。
                  参考資料セクションは extractReferencesSection で抽出済みのため strippedContent を渡す */}
              <div className="prose-blog prose-base">
                <SafeMDXRemote source={stripLeadingH1(strippedContent)} components={components} />
              </div>
              <MetaRow
                variant="footer"
                tags={doc.meta.tags as string[] | undefined}
                publishedAt={(doc.meta as any).publishedAt || (doc.meta as any).created}
                updatedAt={(doc.meta as any).updatedAt || (doc.meta as any).dateModified}
                category={category}
              />
            </article>

            {/* 参考資料カード（## 参考資料 セクションを抽出したもの。全カテゴリ共通） */}
            {references.length > 0 && (
              <div className="mt-8">
                <ExternalReferences references={references} />
              </div>
            )}

            {/* 記事末尾の情報（ページ種別ごとの構成は docs/project/article-footer-design.md 参照） */}

            {/* PE keyword: 過去問逆引き + 同セクションキーワード */}
            {category === 'pe-comprehensive-management' && docGroup === 'keyword' && (
              <>
                <div className="mt-8">
                  <PastExamBacklinks category={category} currentSlug={slugStr} />
                </div>
                {/* 同セクションのキーワード: モバイル限定（デスクトップではサイドバーの SectionCard で表示済み） */}
                {doc.meta.section && (
                  <div className="mt-8 zenn-desktop:hidden">
                    <SectionKeywords
                      currentSlug={slugStr}
                      section={doc.meta.section as string}
                    />
                  </div>
                )}
                {/* モバイル: 5 管理ピラーナビ（デスクトップではサイドバーで表示済み） */}
                <div className="mt-8 zenn-desktop:hidden">
                  <PillarNavCard variant="mobile" currentSection={sectionStr} />
                </div>
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

            {/* guide/pillar/secondary/textbook: カテゴリナビカード（モバイル） */}
            {hasCategoryNavCard && category && (docGroup === 'guide' || docGroup === 'pillar' || docGroup === 'secondary' || docGroup === 'textbook') && (
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

            {/* よくある質問（frontmatter faqs を持つ記事のみ表示） */}
            {Array.isArray((doc.meta as any).faqs) && (doc.meta as any).faqs.length > 0 && (
              <div className="mt-8">
                <FAQCard faqs={(doc.meta as any).faqs} />
              </div>
            )}

            {/* PE pillar: magazine 訴求カード（FAQ と著者の間に独立セクションで配置） */}
            {category === 'pe-comprehensive-management' && docGroup === 'pillar' && (() => {
              const m = slugStr.match(/^pe-comprehensive-management-(.+)-management-pillar$/);
              const utmContent = m ? `${m[1]}-pillar-bottom` : 'pillar-bottom';
              return (
                <div className="mt-8">
                  <MagazineInlineCard
                    url={`https://note.com/dobokunote/m/m607bf095b02a?utm_source=doboku-note&utm_medium=referral&utm_campaign=note-magazine&utm_content=${utmContent}`}
                    title="doboku-note 連動｜5管理 テキスト精読ガイド"
                    description="サイトの 650+ キーワード解説と連動した試験対策教材。5管理ごとに頻出論点と引っかけパターンを体系化し、各論点から本サイトの詳細解説に直リンク。全約7万字。"
                    imageUrl="/images/magazines/tankan-magazine-cover.webp"
                    badge="note 限定 教材"
                  />
                </div>
              );
            })()}

            {/* PE keyword / keyword-2026: magazine 訴求カード（モバイル限定・PC は右サイドバーで露出） */}
            {category === 'pe-comprehensive-management' &&
              (docGroup === 'keyword' || slugStr === 'pe-comprehensive-management-keyword-2026') && (
                <div className="mt-8 zenn-desktop:hidden">
                  <MagazineInlineCard
                    url="https://note.com/dobokunote/m/m607bf095b02a?utm_source=doboku-note&utm_medium=referral&utm_campaign=note-magazine&utm_content=keyword-mobile"
                    title="doboku-note 連動｜5管理 テキスト精読ガイド"
                    description="サイトの 650+ キーワード解説と連動した試験対策教材。5管理ごとに頻出論点と引っかけパターンを体系化し、各論点から本サイトの詳細解説に直リンク。全約7万字。"
                    imageUrl="/images/magazines/tankan-magazine-cover.webp"
                    badge="note 限定 教材"
                  />
                </div>
              )}

            {/* 執筆者・最終更新日（全記事共通・E-A-T 強化） */}
            <AuthorCard
              publishedAt={(doc.meta as any).publishedAt || (doc.meta as any).created}
              updatedAt={(doc.meta as any).updatedAt || (doc.meta as any).dateModified}
              lastRewrittenAt={(doc.meta as any).lastRewrittenAt}
            />
          </main>

          {/* Right Sidebar: Zenn 300px, visible at ≥993px (zenn-desktop) */}
          <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10">
            <div className="sticky top-6">
              {/* Magazine (PE pillar / keyword / keyword-2026) を最上部に配置 */}
              {category === 'pe-comprehensive-management' &&
                (docGroup === 'pillar' ||
                  docGroup === 'keyword' ||
                  slugStr === 'pe-comprehensive-management-keyword-2026') && (() => {
                  const utmContent = docGroup === 'pillar' ? 'pillar-sidebar' : 'keyword-sidebar';
                  return (
                    <div className="mb-3">
                      <MagazineSidebarCard
                        url={`https://note.com/dobokunote/m/m607bf095b02a?utm_source=doboku-note&utm_medium=referral&utm_campaign=note-magazine&utm_content=${utmContent}`}
                        title="5管理 精読ガイド"
                        description="5管理ごとの頻出論点と引っかけパターンを体系化。約7万字、doboku-note 解説への直リンク付き。"
                        imageUrl="/images/magazines/tankan-magazine-cover.webp"
                        badge="note 限定 教材"
                      />
                    </div>
                  );
                })()}
              <TableOfContents headings={headings} />
              {hasCategoryNavCard && category && (
                <div className="mt-3">
                  <CategoryNavCard
                    variant="sidebar"
                    category={category}
                    currentSlug={slugStr}
                    docGroup={docGroup}
                    categoryArticles={categoryArticles}
                  />
                </div>
              )}
              {showPillarNav && (
                <div className="mt-3">
                  <PillarNavCard variant="sidebar" currentSection={sectionStr} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
}
