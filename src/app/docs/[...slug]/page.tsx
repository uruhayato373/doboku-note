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
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard';
import { resolvePlacement } from '@/lib/magazine-placement';
import { getMagazine, buildMagazineUrl, type NoteMagazine } from '@/lib/note-magazines';
import PastExamBacklinks from '@/components/ui/PastExamBacklinks/PastExamBacklinks';
import BookCard from '@/components/ui/BookCard/BookCard';
import BookSection from '@/components/ui/BookSection/BookSection';
import RelatedTextbooks from '@/components/ui/RelatedTextbooks/RelatedTextbooks';
import TextbookNav from '@/components/ui/TextbookNav/TextbookNav';
import AuthorCard from '@/components/ui/AuthorCard/AuthorCard';
import FAQCard from '@/components/ui/FAQCard/FAQCard';
import ExternalReferences from '@/components/ui/ExternalReferences/ExternalReferences';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import { generateHeadingId } from '@/lib/toc';
import { extractReferencesSection } from '@/lib/extract-references';
import type { Pluggable } from 'unified';

/**
 * 1級土木 一次系ページ（textbook / 一次過去問）右サイドバーのアフィリエイト バナー。
 * 独学サポート（A8.net）の 300×250 creative。テスト配置（2026-05-22〜）。
 * creative 情報の真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
 */
const CIVIL_SIDEBAR_AD = {
  href: 'https://px.a8.net/svt/ejp?a8mat=4B3VR8+FAQ04A+4ASS+66H9D',
  imageSrc: 'https://www27.a8.net/svt/bgt?aid=260521604925&wid=002&eno=01&mid=s00000020062001038000&mc=1',
  pixelSrc: 'https://www10.a8.net/0.gif?a8mat=4B3VR8+FAQ04A+4ASS+66H9D',
  alt: '独学サポート 1級土木施工管理技士講座',
  width: 300,
  height: 250,
} as const;

/**
 * SAT 通信講座（A8.net）の 300×250 creative。A8 配信のブランド汎用バナー（級非依存）。
 * SAT は技術士・1級/2級土木施工管理 すべての講座を提供しているため、PE 系全種類 +
 * 1級土木 guide / secondary（textbook / primary は既存 CIVIL_SIDEBAR_AD と住み分け）+
 * 2級土木 primary / secondary（2級に独学サポート相当が無いため primary も SAT）に配置。
 * 2026-05-25 新規追加、2026-05-29 2級横断配置（専用 creative 無しのため同一 creative 流用・alt 中立化）。
 * creative 情報の真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
 */
const SAT_SIDEBAR_AD = {
  href: 'https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y22UQ+5TRO+5YZ75',
  imageSrc: 'https://www29.a8.net/svt/bgt?aid=260516555420&wid=001&eno=01&mid=s00000027186001003000&mc=1',
  pixelSrc: 'https://www14.a8.net/0.gif?a8mat=4B3RUZ+6Y22UQ+5TRO+5YZ75',
  alt: 'SAT 通信講座（技術士・土木施工管理）',
  width: 300,
  height: 250,
} as const;

/**
 * SAT 1級土木施工管理講座（A8.net）の商品リンク（記事末 CTA 用、教材セット画像）。
 * 1級土木 guide / textbook / primary の記事末 BookCard 直下に配置。
 * 2026-05-25 新規追加。mat: 4B3RUZ+6Y23MI+5TRO+BWGDT, pixel: www17.a8.net
 */
const SAT_DOBOKU_PRODUCT = {
  href: 'https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y23MI+5TRO+BWGDT&a8ejpredirect=https%3A%2F%2Fwww.sat-co.info%2Fec%2Fdobokusekou',
  imageSrc: 'https://www.sat-co.info/ec/images/1doboku1_kyouzai_260416.png',
  pixelSrc: 'https://www17.a8.net/0.gif?a8mat=4B3RUZ+6Y23MI+5TRO+BWGDT',
  alt: 'SAT 1級土木施工管理講座 教材セット',
} as const;

/**
 * 1級土木 記事末用：SAT 商品リンク CTA カード。BookCard 2冊の直下に配置し、
 * 「書籍 + 通信講座」のセット訴求でインプレッション最大化。
 * civil × guide / textbook / primary で使用（secondary は既存独学サポート CourseAffiliate 維持）。
 */
function CivilSatProductCTA() {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">通信講座という選択肢</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        e ラーニングで体系的に学習を進めたい場合に。教材セット＋オンライン講座＋質問対応。
      </p>
      <div className="not-prose relative overflow-hidden rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 shadow-card-content">
        <span
          className="absolute right-2 top-2 z-10 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: 'var(--color-ink-muted)' }}
          aria-label="広告"
        >
          PR
        </span>
        <a
          href={SAT_DOBOKU_PRODUCT.href}
          rel="nofollow sponsored noopener"
          target="_blank"
          className="block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAT_DOBOKU_PRODUCT.imageSrc}
            alt={SAT_DOBOKU_PRODUCT.alt}
            loading="lazy"
            className="block h-auto w-full"
          />
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SAT_DOBOKU_PRODUCT.pixelSrc}
        width={1}
        height={1}
        alt=""
        aria-hidden
        style={{ position: 'absolute', left: '-9999px' }}
      />
    </div>
  );
}

/**
 * 施工管理 転職支援サービス（A8.net）の 300×250 creative。記事末「資格取得後のキャリア」用。
 * 1級 guide（過去問=SAT との住み分けで guide=転職）+ 2級 primary / secondary に配置。
 * 2026-05-29 新規追加。creative 情報の真実源: docs/project/04_運営/02_アフィリエイト提携状況.md
 */
const CIVIL_CAREER_AD = {
  href: 'https://px.a8.net/svt/ejp?a8mat=4B3VR8+F0LMU2+4R40+TSBE9',
  imageSrc: 'https://www29.a8.net/svt/bgt?aid=260521604908&wid=002&eno=01&mid=s00000022176005003000&mc=1',
  pixelSrc: 'https://www15.a8.net/0.gif?a8mat=4B3VR8+F0LMU2+4R40+TSBE9',
  alt: '施工管理 転職支援サービス',
  width: 300,
  height: 250,
} as const;

/**
 * 記事末用：施工管理 転職 CTA カード（資格取得後のキャリア導線）。
 * 300×250 をネイティブサイズで中央寄せ（引き伸ばさない）。PR表示・計測ピクセル同梱。
 * 1級 guide / 2級 primary・secondary で使用（過去問の SAT 商品CTA とは docGroup で住み分け）。
 */
function CivilCareerCTA() {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">資格取得後のキャリア</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        施工管理の実務経験＋資格は転職市場で高く評価されます。今の市場価値を把握したいときに。
      </p>
      <div className="not-prose relative inline-block overflow-hidden rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 shadow-card-content">
        <span
          className="absolute right-2 top-2 z-10 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: 'var(--color-ink-muted)' }}
          aria-label="広告"
        >
          PR
        </span>
        <a
          href={CIVIL_CAREER_AD.href}
          rel="nofollow sponsored noopener"
          target="_blank"
          className="block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CIVIL_CAREER_AD.imageSrc}
            alt={CIVIL_CAREER_AD.alt}
            width={CIVIL_CAREER_AD.width}
            height={CIVIL_CAREER_AD.height}
            loading="lazy"
            className="block h-auto"
          />
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CIVIL_CAREER_AD.pixelSrc}
        width={1}
        height={1}
        alt=""
        aria-hidden
        style={{ position: 'absolute', left: '-9999px' }}
      />
    </div>
  );
}

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
    ? (await getDocsMetaByCategory(category)).filter(d => !d.tags?.includes('模範論文') && !(d as any).hideFromCategory)
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
  const inlineMagazines = filterRenderable(magazinePlacement.inline);
  const sidebarMagazines = filterRenderable(magazinePlacement.sidebar);
  // 自社の有料マガジン (price あり = 模範論文/予想/テンプレ) がサイドバーに出るページでは
  // アフィリエイト (SAT/独学サポート) を非表示にしてカニバリ回避。
  // 精読ガイド (tankan, price なし) のみのページ (secondary / hub 等) はアフィリと併存させる。
  const sidebarHasPaidMagazine = sidebarMagazines.some(({ magazine }) => Boolean(magazine.price));

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
                {/* 参考書籍（アフィリエイト・補完ポジション。記事末の最下部に配置） */}
                <div className="mt-8">
                  <BookSection caption="総監対策の定番キーワード集。択一の幅広い出題範囲をカバーしたいときに。">
                    <BookCard asin="4274234746" />
                  </BookSection>
                </div>
              </>
            )}

            {/* PE past-exam: 参考書籍（アフィリエイト・補完ポジション） */}
            {category === 'pe-comprehensive-management' && docGroup === 'pastExam' && (
              <div className="mt-8">
                <BookSection caption="令和8年度の予想問題と模試で直前対策を仕上げたいときに。">
                  <BookCard asin="4798076546" />
                </BookSection>
              </div>
            )}

            {/* Civil primary/secondary: 関連テキスト章 (過去問→教材、1級・2級共通) */}
            {(category === 'civil-construction-1' || category === 'civil-construction-2') && (docGroup === 'primary' || docGroup === 'secondary') && (
              <div className="mt-8">
                <RelatedTextbooks currentMeta={doc.meta} categoryArticles={categoryArticles} />
              </div>
            )}

            {/* 参考書籍（Civil 第二次検定: アフィリエイト・補完ポジション。
                過去問解説集（4886154557）+ 経験記述70パターン（4816378561）の固定ペア。） */}
            {category === 'civil-construction-1' && docGroup === 'secondary' && (
              <div className="mt-8">
                <BookSection caption="過去問演習と経験記述70パターンで二次対策を固めたいときに。">
                  <BookCard asin="4886154557" />
                  <BookCard asin="4816378561" />
                </BookSection>
              </div>
            )}

            {/* 参考書籍（Civil 2級 primary: アフィリエイト・補完ポジション。
                両用テキスト（4816378383・一次&二次 徹底図解）+ 一次特化対策書（4770329784・第一次検定）のペア。
                SAT 商品CTA（1級教材写真）は級ミスマッチ回避のため2級では呼ばない → サイドバーバナーに集約。） */}
            {category === 'civil-construction-2' && docGroup === 'primary' && (
              <>
                <div className="mt-8">
                  <BookSection caption="両用1冊で全体像をつかみ、一次特化の対策書で第一次検定を仕上げたいときに。">
                    <BookCard asin="4816378383" />
                    <BookCard asin="4770329784" />
                  </BookSection>
                </div>
                <CivilCareerCTA />
              </>
            )}

            {/* 参考書籍（Civil 2級 secondary: アフィリエイト・補完ポジション。
                両用テキスト（4816378383）+ 二次特化テキスト&過去問題集（4911687207・第二次検定）のペア。） */}
            {category === 'civil-construction-2' && docGroup === 'secondary' && (
              <>
                <div className="mt-8">
                  <BookSection caption="両用1冊で全体像をつかみ、二次特化のテキスト＆過去問で第二次検定を仕上げたいときに。">
                    <BookCard asin="4816378383" />
                    <BookCard asin="4911687207" />
                  </BookSection>
                </div>
                <CivilCareerCTA />
              </>
            )}

            {/* Civil 2級 guide（キャリア記事）: 転職CTAのみ。書籍は付けない（2級 guide=転職 / 過去問=SAT の住み分け）。 */}
            {category === 'civil-construction-2' && docGroup === 'guide' && (
              <CivilCareerCTA />
            )}

            {/* Civil textbook: 前後章ナビ + 過去問逆引き（1級・2級共通） */}
            {(category === 'civil-construction-1' || category === 'civil-construction-2') && docGroup === 'textbook' && (
              <>
                <div className="mt-8">
                  <TextbookNav currentSlug={slugStr} categoryArticles={categoryArticles} />
                </div>
                <div className="mt-8">
                  <PastExamBacklinks category={category} currentSlug={slugStr} />
                </div>
                {/* 参考書籍（Civil textbook: アフィリエイト・補完ポジション。
                    合格ガイド（4798176834・両用）+ 第1次徹底図解（4816378243・一次特化、R6追加分野対応）の固定ペア。） */}
                <div className="mt-8">
                  <BookSection caption="両用1冊で全体像をつかみ、一次特化テキストで R6 追加分野まで押さえたいときに。">
                    <BookCard asin="4798176834" />
                    <BookCard asin="4816378243" />
                  </BookSection>
                </div>
                <CivilSatProductCTA />
              </>
            )}

            {/* 参考書籍（Civil primary: アフィリエイト・補完ポジション。
                一次過去問ページ。過去問マスター解説集（4297154099・解説重視）+ 地域開発研究所 第一次解説集（4886154530・7年分演習量）の固定ペア。） */}
            {category === 'civil-construction-1' && docGroup === 'primary' && (
              <>
                <div className="mt-8">
                  <BookSection caption="解説重視と過去7年の演習量の両軸で一次過去問を仕上げたいときに。">
                    <BookCard asin="4297154099" />
                    <BookCard asin="4886154530" />
                  </BookSection>
                </div>
                <CivilSatProductCTA />
              </>
            )}

            {/* 参考書籍（Civil guide: アフィリエイト・補完ポジション。
                guide 4ページ（strategy / earthwork / concrete / law）の主要流入ページに配置。
                合格テキスト1冊 + 一次過去問1冊の固定ペア。
                記事末CTA は guide=転職 / 過去問=SAT の住み分けで CivilCareerCTA（SAT サイドバーは別途常設）。
                例外: guide-textbooks は自前で全ラインナップを BookCard 配置するため自動 BookSection は出さない。） */}
            {category === 'civil-construction-1' && docGroup === 'guide' && (
              <>
                {slugStr !== 'civil-construction-1-guide-textbooks' && (
                  <div className="mt-8">
                    <BookSection caption="まずは1冊で全体像をつかみ、過去問演習で出題傾向に慣れる王道ペア。">
                      <BookCard asin="4798176834" />
                      <BookCard asin="4297154099" />
                    </BookSection>
                  </div>
                )}
                <CivilCareerCTA />
              </>
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

            {/* 参考書籍（PE ガイド: アフィリエイト・補完ポジション。
                R8 予想ページは予想模試本、それ以外は受験万全対策本） */}
            {category === 'pe-comprehensive-management' && docGroup === 'guide' && (
              <div className="mt-8">
                <BookSection
                  caption={
                    slugStr.includes('r8-essay')
                      ? '令和8年度の予想問題と模試で直前対策を仕上げたいときに。'
                      : '総監受験を申込書から口頭試験まで通して押さえたいときに。'
                  }
                >
                  <BookCard asin={slugStr.includes('r8-essay') ? '4798076546' : '4526084263'} />
                </BookSection>
              </div>
            )}

            {/* よくある質問（frontmatter faqs を持つ記事のみ表示） */}
            {Array.isArray((doc.meta as any).faqs) && (doc.meta as any).faqs.length > 0 && (
              <div className="mt-8">
                <FAQCard faqs={(doc.meta as any).faqs} />
              </div>
            )}

            {/* note 有料マガジン CTA (inline)。slug + docGroup から配置を解決。
                inlineMobileOnly が true の場合は PC 非表示 (sidebar 側で出る)。
                ハブ系 (pillar / pattern-essay / r0X-secondary / essay-exam-strategy) は PC でも表示。 */}
            {inlineMagazines.length > 0 && (
              <div className={`mt-8 space-y-3 ${magazinePlacement.inlineMobileOnly ? 'zenn-desktop:hidden' : ''}`}>
                {inlineMagazines.map(({ slot, magazine }) => (
                  <MagazineInlineCard
                    key={slot.magazineId}
                    url={buildMagazineUrl(magazine, slot.utmContent)}
                    title={magazine.title}
                    description={magazine.description}
                    imageUrl={magazine.imageUrl}
                    badge={magazine.badge}
                    {...(magazine.price ? { price: magazine.price } : {})}
                  />
                ))}
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
              {/* note 有料マガジン CTA (sidebar)。配置解決済みのマガジンを画像オンリーで上部に並べる。
                  文言・価格はバナー画像 (sidebarImageUrl, 300×250) に焼き込む方針。 */}
              {sidebarMagazines.length > 0 && (
                <div className="mb-3 space-y-3">
                  {sidebarMagazines.map(({ slot, magazine }) =>
                    magazine.sidebarImageUrl ? (
                      <MagazineSidebarCard
                        key={slot.magazineId}
                        href={buildMagazineUrl(magazine, slot.utmContent)}
                        imageUrl={magazine.sidebarImageUrl}
                        alt={magazine.shortTitle ?? magazine.title}
                      />
                    ) : null,
                  )}
                </div>
              )}
              {/* 汎用キーワードページ (個別キーワード辞書ページ): 単一マガジン直送ではなく
                  note 有料教材まとめ /links へ誘導する画像バナー。hub/essay 等は上の
                  コンテキスト一致マガジンが出るため、ここは sidebarMagazines 空のときのみ。 */}
              {category === 'pe-comprehensive-management' &&
                docGroup === 'keyword' &&
                sidebarMagazines.length === 0 && (
                  <div className="mb-3">
                    <MagazineSidebarCard
                      href="/links"
                      imageUrl="/images/magazines/links-hub-sidebar.webp"
                      alt="note 有料教材まとめ"
                      external={false}
                    />
                  </div>
                )}
              {/* アフィリエイト サイドバー（2026-05-25 以降: 上部配置でインプレッション最大化）:
                  自社マガジン CTA を最上位に維持しつつ、TOC・ナビカードより上に配置。
                  - 1級土木 textbook / primary: 独学サポート（経験記述添削特化・1級専用）
                  - PE keyword/guide/pastExam + 1級土木 guide / secondary + 2級土木 primary / secondary: SAT（総合講座）
                  住み分けは docGroup で排他。2級は独学サポート相当が無いため primary も SAT 側。
                  2級 secondary はマガジン公開後 sidebarHasPaidMagazine=true で自動抑制 → primary に SAT 残存。 */}
              {/* アフィリエイトは自社の有料マガジン CTA が出ているページでは非表示にしてカニバリ回避
                  (!sidebarHasPaidMagazine = 有料マガジンなしのページで表示。精読ガイドのみの
                  secondary / hub 等はアフィリと併存)。 */}
              {category === 'civil-construction-1' &&
                (docGroup === 'textbook' || docGroup === 'primary') &&
                !sidebarHasPaidMagazine && (
                  <div className="mb-3">
                    <SidebarAdBanner {...CIVIL_SIDEBAR_AD} />
                  </div>
                )}
              {((category === 'pe-comprehensive-management' &&
                (docGroup === 'keyword' || docGroup === 'guide' || docGroup === 'pastExam')) ||
                (category === 'civil-construction-1' &&
                  (docGroup === 'guide' || docGroup === 'secondary')) ||
                (category === 'civil-construction-2' &&
                  (docGroup === 'primary' || docGroup === 'secondary'))) &&
                !sidebarHasPaidMagazine && (
                  <div className="mb-3">
                    <SidebarAdBanner {...SAT_SIDEBAR_AD} />
                  </div>
                )}
              {docGroup !== 'pastExam' && <TableOfContents headings={headings} />}
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
