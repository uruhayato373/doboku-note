import { notFound } from 'next/navigation';
import { getDoc, getAllDocSlugs, getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
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
import rehypeMidCta from '@/lib/rehype-mid-cta';
import rehypeExternalLinks from 'rehype-external-links';
import { compileMDX } from 'next-mdx-remote/rsc';
import { MDXProvider } from '@mdx-js/react';
import { extractHeadings } from '@/lib/toc';
import { resolvePlacement } from '@/lib/magazine-placement';
import { resolveHubCta } from '@/lib/hub-cta';
import { resolveOffsiteCta } from '@/lib/offsite-cta';
import { getMagazine, buildMagazineUrl, type NoteMagazine } from '@/lib/note-magazines';
import MagazineTopBanner from '@/components/ui/MagazineTopBanner';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import ArticleFooter from '@/components/ui/ArticleFooter/ArticleFooter';
import ArticleSidebar from '@/components/ui/ArticleSidebar/ArticleSidebar';
import MidArticleCta from '@/components/ui/MidArticleCta/MidArticleCta';
import { rankRelated } from '@/lib/related-score';
import { extractReferencesSection } from '@/lib/extract-references';
import type { Pluggable } from 'unified';
import {
  resolveDocsCareerSidebarAd,
  resolveCareerArticleEndCard,
  resolvePeConsultingArticleEndCard,
} from '@/config/affiliate-creatives';
import type React from 'react';



/**
 * MDX コンパイルオプションを組み立てる。midCtaPositions が空でないときのみ
 * rehypeMidCta を rehypePlugins 末尾に追加し、本文中間に <midslot> を挿入する（1〜3 個）。
 */
function buildMdxOptions(midCtaPositions?: readonly number[]) {
  const rehypePlugins: Pluggable[] = [
    rehypeHeadingIds,
    rehypeKatex,
    rehypeExamReferences,
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }] satisfies Pluggable,
  ];
  if (midCtaPositions && midCtaPositions.length > 0) {
    rehypePlugins.push([rehypeMidCta, { positions: midCtaPositions }] satisfies Pluggable);
  }
  return {
    blockJS: false as const,
    blockDangerousJS: true as const,
    mdxOptions: {
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins,
    },
  };
}

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
  midCtaPositions,
}: {
  source: string;
  components: React.ComponentProps<typeof MDXProvider>['components'];
  midCtaPositions?: readonly number[] | undefined;
}) {
  let content: React.ReactElement;
  try {
    // Compile once and use the result directly (avoid double compilation)
    ({ content } = await compileMDX({
      source,
      options: buildMdxOptions(midCtaPositions),
      components,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MDX compile error:', message.slice(0, 200));
    return (
      <div className="rounded-card-content border border-[var(--color-warn)] bg-[var(--color-warn-fill)] p-4">
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
  // note 有料マガジン導線は「もくじタイル」（L2 索引）を全 HUB 資格の記事末尾＋サイドバーに 1 枚ずつ
  // 統一表示する（2026-07 統一）。従来の個別マガジンタイル（inline を先頭 3 誌 cap）はページ個別配線に
  // 依存し、未配線ページ（総監 guide 等）が空白になる不整合を生んでいたため廃止した。
  // 個別マガジンへの導線は記事内（冒頭 CTA=placement.top・中間 CTA=MidCta・MDX 内 <MagazineCard>）が担う。
  // タイルの中身は resolveHubCta に一任: 平時=L2 もくじ、直前期 6 週間=売れ筋商品直リンク（seasonal）。
  // resolveHubCta は非 HUB 資格（一次・concrete・reference）に null を返すため、それらは自然に非表示。
  // career タグ記事は転職一本方針を継承し note もくじを出さない（転職テキスト CTA と二重化させない）。
  const showMokuji = Boolean(category) && !doc.meta.tags?.includes('career');
  const footerMokuji =
    showMokuji && category ? resolveHubCta(category, { utmSuffix: 'footer' }) : null;
  // 読書中サイドバー（PC）にも同じもくじを併掲（utm -docs-sb で面分離）。2026-07-06 に一旦撤去したが、
  // 全ページ統一の一環で復活し、カテゴリ hub（sidebar -sb + mobile -mob）と同じ二面構成に揃える。
  const sidebarMokuji =
    showMokuji && category ? resolveHubCta(category, { utmSuffix: 'docs-sb' }) : null;
  // 外部チャネル（ココナラ添削／Brain 自作キット）CTA。施工経験記述・総監記述系の高適合ページのみ非空。
  // 商品の listed 状態は offsite-cta.ts 側で判定（未 listed は自動非表示）。
  const offsiteCta = resolveOffsiteCta(slugStr);
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

  // 記事内（本文中間）CTA。**記事長に応じて 1〜3 枠**を h2 境界に挿入する（2026-07-28 に
  // 1 枠固定から拡張）。1 枠だと長文記事で note と転職カードが枠を奪い合い、どちらかが
  // 出せなかった。枠が複数あれば長文は両方載る（短い記事は従来どおり優先順で 1 つ）。
  // MDX ソースは書き換えず rehypeMidCta が <midslot data-mid-index> を挿し、
  // components の midslot が index で中身を引く。
  const midH2Count = headings.filter((h) => h.level === 2).length;
  const midBodyLen = stripLeadingH1(strippedContent).length;
  const midEligibleGroup =
    docGroup === 'guide' || docGroup === 'pillar' || docGroup === 'textbook';
  const midEnabled = midEligibleGroup && midH2Count >= 5 && midBodyLen >= 8000;

  // 転職ネイティブカード。従来は career タグ記事限定だったが、記事末から本文中間へ移した分
  // 対象を転職アフィリ対象カテゴリ全体へ広げる（学習記事の読者も受験→転職の潜在層）。
  // 既に本文へ手書き inline <CareerAffiliate> がある記事は二重表示になるため除外する。
  const hasInlineCareerCard = /\bCareerAffiliate\b/.test(strippedContent);
  const careerCategory =
    category === 'civil-construction-1' ||
    category === 'civil-construction-2' ||
    category === 'pe-construction' ||
    category === 'concrete-chief-engineer' ||
    category === 'concrete-diagnostician' ||
    category === 'pe-first-stage';
  const careerMidCard =
    !hasInlineCareerCard && midH2Count >= 4 && midBodyLen >= 2500
      ? careerCategory
        ? resolveCareerArticleEndCard(slugStr)
        : category === 'pe-comprehensive-management'
          ? resolvePeConsultingArticleEndCard()
          : null
      : null;

  // 枠数: 記事が長いほど増やす（h2 3 本ごと / 4,000 字ごとの少ない方・上限 3）。
  // 下限ゲート（h2>=4 かつ >=2,500 字）を満たさない記事は 0 枠＝従来と同じ「出さない」。
  const midSlotCapacity =
    midH2Count >= 4 && midBodyLen >= 2500
      ? Math.max(1, Math.min(3, Math.floor(midH2Count / 3), Math.floor(midBodyLen / 4000)))
      : 0;

  // 中身を優先順に用意する（各種別 1 記事 1 回まで＝同じ広告を 2 度出さない）。
  const midRenderers: Array<() => React.ReactElement> = [];
  // 1) note 中間 CTA（収益の主導線＝最優先）。供給源は placement.inline の先頭 1 誌で、
  //    冒頭 CTA と別マガジンのときのみ（同じ商品を 2 度見せない）。
  if (midEnabled) {
    const midNote = filterRenderable(magazinePlacement.inline)[0];
    const midNoteMag = midNote?.magazine;
    const differsFromTop = midNoteMag && (!topSlot || topSlot.magazineId !== midNote.slot.magazineId);
    if (midNoteMag && differsFromTop) {
      // 文言・リンク・キャラのポーズは MagazineHeroCta が note-magazines.ts から id で解決する。
      const midSlot = midNote.slot;
      midRenderers.push(() => (
        <MidArticleCta mode="note" id={midSlot.magazineId} utmContent={`${midSlot.utmContent}-mid`} />
      ));
    }
  }
  // 2) 転職ネイティブカード（1 記事 1 枚まで＝広告密度を抑える）
  if (careerMidCard) {
    const card = careerMidCard;
    midRenderers.push(() => <MidArticleCta mode="career" card={card} />);
  }
  // 3) 関連記事（枠が余ったときの回遊導線）
  if (midEnabled && midRenderers.length < midSlotCapacity) {
    const relatedTop = rankRelated(doc.meta, categoryArticles, 1)[0];
    if (relatedTop) midRenderers.push(() => <MidArticleCta mode="related" doc={relatedTop} />);
  }

  // 実際に使う枠数＝用意できた中身と容量の小さい方。
  const midSlots = midRenderers.slice(0, midSlotCapacity);
  // 位置: h2 境界に均等配分。先頭セクション直後（0）と最終 h2（まとめ）直前は避ける。
  const midPositions = midSlots.map((_, i) =>
    Math.min(
      Math.max(1, Math.round(((i + 1) * midH2Count) / (midSlots.length + 1))),
      midH2Count - 2,
    ),
  );
  const effectiveMidPositions = midSlots.length > 0 ? midPositions : [];
  const componentsWithMid =
    midSlots.length > 0
      ? {
          ...components,
          midslot: (p: { 'data-mid-index'?: string }) => {
            const idx = Number(p?.['data-mid-index'] ?? 0);
            const Render = midSlots[idx] ?? midSlots[0]!;
            return <Render />;
          },
        }
      : components;

  return (
    <PageShell
      variant="article"
      className="pb-16"
      beforeHeader={<StructuredData type="article" docMeta={doc.meta} />}
    >
        {/* 2カラムシェル（max-w-1280 / gap-10 / サイドバー w-72 の真実源）。gutter=flush-mobile で
            ≤576px は外周 0（記事カードをフルブリードさせる）。サイドバーは aside prop へ集約。 */}
        <TwoColumnShell
          gutter="flush-mobile"
          aside={
            <ArticleSidebar
              careerSidebarAd={careerSidebarAd}
              sidebarMokuji={sidebarMokuji}
              headings={headings}
              category={category}
              docGroup={docGroup}
              slugStr={slugStr}
              sectionStr={sectionStr}
              categoryArticles={categoryArticles}
              hasCategoryNavCard={hasCategoryNavCard}
              showPillarNav={showPillarNav}
            />
          }
        >
            {/* Editorial article card: 12px radius, soft border + shadow。
                横 padding = タブレット40(px-10) / デスクトップ44(zenn-desktop:px-11)。
                ≤576px は角丸・左右枠を外し px = var(--article-gutter-sp)（設問カード details のフルブリード相殺と連動） */}
            <article className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft py-12 px-10 zenn-desktop:px-11 overflow-hidden transition-colors duration-300 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:py-[35px] max-zenn-sp:px-[var(--article-gutter-sp)]">
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
                  magazineId={topSlot.magazineId}
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
                <SafeMDXRemote
                  source={stripLeadingH1(strippedContent)}
                  components={componentsWithMid}
                  midCtaPositions={effectiveMidPositions}
                />
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
              footerMokuji={footerMokuji}
              offsiteCta={offsiteCta}
              faqs={faqs}
              hasCategoryNavCard={hasCategoryNavCard}
              authorDates={authorDates}
            />
        </TwoColumnShell>
    </PageShell>
  );
}
