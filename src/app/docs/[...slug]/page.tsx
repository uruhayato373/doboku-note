import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import PageShell from '@/components/layout/PageShell';
import ArticleHeader from '@/components/ui/ArticleHeader/ArticleHeader';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryLabel } from '@/lib/categories';
import { classifyDoc, getGroupLabel } from '@/lib/doc-classifier';
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
import { MDXProvider } from '@mdx-js/react';
import { extractHeadings } from '@/lib/toc';
import { resolvePlacement } from '@/lib/magazine-placement';
import { getMagazine, buildMagazineUrl, type NoteMagazine } from '@/lib/note-magazines';
import MagazineTopBanner from '@/components/ui/MagazineTopBanner';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import ArticleFooter from '@/components/ui/ArticleFooter/ArticleFooter';
import ArticleSidebar from '@/components/ui/ArticleSidebar/ArticleSidebar';
import { extractReferencesSection } from '@/lib/extract-references';
import type { Pluggable } from 'unified';
import { resolveDocsCareerSidebarAd } from '@/config/affiliate-creatives';
import type React from 'react';



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

async function SafeMDXRemote({
  source,
  components,
}: {
  source: string;
  components: React.ComponentProps<typeof MDXProvider>['components'];
}) {
  let content: React.ReactElement;
  try {
    // Compile once and use the result directly (avoid double compilation)
    ({ content } = await compileMDX({ source, options: mdxOptions, components }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MDX compile error:', message.slice(0, 200));
    return (
      <div className="p-4 border border-[var(--color-warn)] rounded-sm bg-[var(--color-warn-fill)]">
        <p className="text-[var(--color-warn)] font-semibold">
          このページのコンテンツにフォーマットエラーがあります。
        </p>
        <p className="text-[var(--color-warn)] text-sm mt-1">
          管理者に報告してください。
        </p>
      </div>
    );
  }
  return <>{content}</>;
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

function normalizeFaqs(faqs: DocMeta['faqs']) {
  if (!Array.isArray(faqs)) return [];
  return faqs.flatMap((faq) => {
    const q = 'q' in faq ? faq.q : faq.question;
    const a = 'a' in faq ? faq.a : faq.answer;
    return q.trim() && a.trim() ? [{ q, a }] : [];
  });
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

  // SEOタイトル: frontmatter の seoTitle を <title>（検索結果）に使用。
  // 資格名・キーワード・「｜…キーワード集」接尾辞を保持する（画像の無い検索面で効くため）。
  const seoTitle = doc.meta.seoTitle || doc.meta.title;
  const title: string | { absolute: string } = { absolute: seoTitle };
  // OGP/Twitter カードのタイトル文字は seoTitle ではなく素の title を使う。
  // カード画像が資格名 kicker を表示するため、seoTitle の資格名重複＋接尾辞はカード上で冗長。
  // H1 と同じ自然な title に揃え、検索 <title> とソーシャルカードの役割を分離する。
  const ogTitle = doc.meta.title;

  const description = doc.meta.description || doc.meta.title;

  const publishedTime = toISOStringSafe(doc.meta.publishedAt);
  const modifiedTime = toISOStringSafe(
    doc.meta.lastRewrittenAt ||
    doc.meta.updatedAt ||
    doc.meta.publishedAt
  );

  // 幽霊ページ（公開60日以上 impressions=0 等）は frontmatter noindex:true で
  // 検索インデックスから除外。follow:true で内部リンク資産（回遊・トピック権威）は保持。
  // sitemap.xml からの除外は generate-sitemap.mjs 側で同フラグを参照。
  const isNoindex = doc.meta.noindex === true;

  return {
    title,
    description,
    ...(isNoindex && { robots: { index: false, follow: true } }),
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
  const faqs = normalizeFaqs(doc.meta.faqs);
  const publishedAt = doc.meta.publishedAt || doc.meta.created;
  const updatedAt = doc.meta.updatedAt || doc.meta.dateModified;
  const authorDates = {
    ...(publishedAt ? { publishedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(doc.meta.lastRewrittenAt ? { lastRewrittenAt: doc.meta.lastRewrittenAt } : {}),
  };

  // Load MDX components
  const components = await getAllComponents(doc);

  // Fetch category articles (metadata only)
  const categoryArticles = category
    ? (await getDocsMetaByCategory(category)).filter(d => !d.tags?.includes('模範論文') && !d.hideFromCategory)
    : [];

  // Determine page classification for navigation cards
  const docGroup = classifyDoc(doc.meta);
  const hasCategoryNavCard = category === 'pe-comprehensive-management' || category === 'civil-construction-1' || category === 'civil-construction-2';
  const showPillarNav = category === 'pe-comprehensive-management' && docGroup === 'keyword';
  const sectionStr = doc.meta.section as string | undefined;

  // note 有料マガジン CTA の配置を解決。
  // published: false や noteUrl 空のマガジンは getMagazine() で防御的に弾く。
  const magazinePlacement = resolvePlacement(slugStr, docGroup);
  type RenderableSlot = { slot: (typeof magazinePlacement.inline)[number]; magazine: NoteMagazine };
  const filterRenderable = (
    slots: ReadonlyArray<(typeof magazinePlacement.inline)[number]>,
  ): RenderableSlot[] =>
    slots
      .map((s) => ({ slot: s, magazine: getMagazine(s.magazineId) }))
      .filter((x): x is RenderableSlot => x.magazine !== null);
  // note 有料マガジン CTA は「画像オンリーで記事末尾に一括表示」に統一（2026-06-26）。
  // 旧 inline（本文末・テキスト）と sidebar（画像）を 1 セットに統合し、記事末尾で画像オンリー描画する。
  // サイドバーからは note を外し、最上部の転職アフィリのインプレッションを確保する。
  const footerMagazines = [
    ...filterRenderable(magazinePlacement.inline),
    ...filterRenderable(magazinePlacement.sidebar),
  ].filter(
    (x, i, arr) => arr.findIndex((y) => y.slot.magazineId === x.slot.magazineId) === i,
  );
  // サイドバー用 note CTA（2026-07 再配置）。記事末尾集約（footerMagazines）は維持しつつ、
  // その優先順リストから sidebarImageUrl を持つ先頭 1 枚（TOC 非表示 docGroup は 2 枚）を
  // 転職枠の直下に再掲する。utmContent に -sb を付けて記事末尾クリックと GA4 で分離計測。
  // career-only 記事は footerMagazines が空 → 自動で非表示（転職一本方針を継承）。
  const sidebarNoteMax =
    docGroup === 'pastExam' || docGroup === 'primary' || docGroup === 'secondary' ? 2 : 1;
  const sidebarNoteMagazines = footerMagazines
    .filter((x) => x.magazine.sidebarImageUrl)
    .slice(0, sidebarNoteMax)
    .map((x) => ({ ...x, slot: { ...x.slot, utmContent: `${x.slot.utmContent}-sb` } }));
  // 記事冒頭 CTA（二次系高 intent ページのみ placement.top で設定）。getMagazine() ゲートを
  // 通すため未公開マガジン（会員ラボ等）は自動非表示。末尾の画像カードと重複してよい。
  const topSlot = magazinePlacement.top;
  const topMagazine = topSlot ? getMagazine(topSlot.magazineId) : null;
  // サイドバー転職枠の creative（slug ハッシュ A/B: 建設JOBs ↔ ビルドジョブ/GKS）。
  const careerSidebarAd = resolveDocsCareerSidebarAd(category ?? '', slugStr);

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
    <PageShell
      variant="article"
      className="pb-16"
      beforeHeader={<StructuredData type="article" docMeta={doc.meta} />}
    >
        {/* Editorial Container: max-width 1280px + responsive padding（モバイル ≤576px はカードフルブリードのため padding 0） */}
        <div className="max-w-[1280px] mx-auto zenn-sp:px-[25px] zenn-tablet:px-10 flex gap-[32px] relative">

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 py-10">
            {/* Editorial article card: 12px radius, soft border + shadow。1280 化に伴い desktop は px-16 で本文行長を抑える */}
            <article className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft py-12 px-12 zenn-desktop:px-16 overflow-hidden transition-colors duration-300 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:py-[35px] max-zenn-sp:px-5 max-zenn-tiny:px-[14px]">
              {/* 記事ヘッダー: breadcrumb + H1 + description リード + byline を集約 */}
              <ArticleHeader
                title={doc.meta.title}
                category={category}
                categoryLabel={category ? getCategoryLabel(category) : null}
                groupLabel={category ? getGroupLabel(category, docGroup) : null}
                description={doc.meta.description}
                publishedAt={doc.meta.publishedAt || doc.meta.created}
                updatedAt={doc.meta.updatedAt || doc.meta.dateModified}
              />
              {/* 記事冒頭 CTA（二次系高 intent ページのみ・1 行テキスト）。未公開は topMagazine=null で非表示 */}
              {topSlot && topMagazine && (
                <MagazineTopBanner
                  url={buildMagazineUrl(topMagazine, topSlot.utmContent)}
                  title={topMagazine.shortTitle ?? topMagazine.title}
                  price={topMagazine.price}
                  badge={topMagazine.badge}
                  trackLabel={topSlot.utmContent}
                />
              )}
              {/* MDX Content — 先頭の # H1 は server-side で描画済みのため strip。
                  参考資料セクションは extractReferencesSection で抽出済みのため strippedContent を渡す */}
              <div className="prose-blog prose-base">
                <SafeMDXRemote source={stripLeadingH1(strippedContent)} components={components} />
              </div>
              <MetaRow
                variant="footer"
                tags={doc.meta.tags as string[] | undefined}
                publishedAt={doc.meta.publishedAt || doc.meta.created}
                updatedAt={doc.meta.updatedAt || doc.meta.dateModified}
                category={category}
              />
            </article>

            <ArticleFooter
              references={references}
              category={category}
              docGroup={docGroup}
              slugStr={slugStr}
              sectionStr={sectionStr}
              meta={doc.meta}
              categoryArticles={categoryArticles}
              footerMagazines={footerMagazines}
              faqs={faqs}
              hasCategoryNavCard={hasCategoryNavCard}
              authorDates={authorDates}
            />
          </main>

          <ArticleSidebar
            careerSidebarAd={careerSidebarAd}
            noteMagazines={sidebarNoteMagazines}
            headings={headings}
            category={category}
            docGroup={docGroup}
            slugStr={slugStr}
            sectionStr={sectionStr}
            categoryArticles={categoryArticles}
            hasCategoryNavCard={hasCategoryNavCard}
            showPillarNav={showPillarNav}
          />
        </div>
    </PageShell>
  );
}
