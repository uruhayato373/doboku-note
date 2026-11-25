import { notFound } from 'next/navigation';
import { getDoc, getAllDocsMeta, getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import PageShell from '@/components/layout/PageShell';
import QuestionJumpNav from '@/components/docs/QuestionJumpNav';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import ArticleHeader from '@/components/ui/ArticleHeader/ArticleHeader';
import { getAllComponents } from '@/lib/component-loader';
import { getCategoryHubPath, getCategoryLabel } from '@/lib/categories';
import { getCategoryJumps } from '@/lib/category-jumps';
import { classifyDoc, getGroupLabel, isCareerDoc } from '@/lib/doc-classifier';
import { Metadata } from 'next';
import { NOT_FOUND_TITLE, normalizeMetaDescription } from '@/lib/metadata';
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
import rehypeScrollableFocus from '@/lib/rehype-scrollable-focus';
import rehypeExternalLinks from 'rehype-external-links';
import { MDXProvider } from '@mdx-js/react';
import SafeMdx from '@/components/mdx/SafeMdx';
import { resolveHubCta } from '@/lib/hub-cta';
import { resolveOffsiteCta } from '@/lib/offsite-cta';
import { getMagazine, buildMagazineUrl } from '@/lib/note-magazines';
import MagazineHeroCta from '@/components/ui/MagazineHeroCta/MagazineHeroCta';
import MagazineTopBanner from '@/components/ui/MagazineTopBanner';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import ArticleFooter from '@/components/docs/ArticleFooter';
import TableOfContents from '@/components/docs/TableOfContents';
import ArticleSidebar, { buildArticleSidebarCards } from '@/components/docs/ArticleSidebar';
import MidArticleCta from '@/components/ui/MidArticleCta/MidArticleCta';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';
import { lawsOfArticle } from '@/lib/article-laws';
import type { Pluggable } from 'unified';
import { articleSidebarContinuation } from '@/lib/article-sidebar-continuation';
import { RAIL_AFFILIATE_MAX } from '@/lib/rail-continuation';
import { articleSidebarInput } from '@/lib/article-sidebar-plan';
import { planArticleCtas } from '@/lib/article-cta-plan';
import { remarkArticleBanners } from '@/lib/article-inline-slots.mjs';
import { ArticleBanner, articleImagePlacements, articlePixelCandidates } from '@/components/ui/ArticleAffiliateBanners/ArticleAffiliateBanners';
import ArticleAffiliatePixels from './ArticleAffiliatePixels';
import AdSlot from '@/components/ads/AdSlot';
import { CTA_STACK_CLASS } from '@/lib/cta-stack';
import { affiliateSlotPreview } from '@/lib/affiliate-slot-preview.mjs';
import type React from 'react';
import { getPublicDocPath } from '@/lib/content-routes';
import { externalLinkRel } from '@/lib/external-link-rel';



type ArticleInlineSlot = { line: number; slot: string; afterLabel: string };

/**
 * MDX コンパイルオプションを組み立てる。midCtaPositions が空でないときのみ
 * rehypeMidCta を rehypePlugins 末尾に追加し、本文中間に <midslot> を挿入する（1〜3 個）。
 */
function buildMdxOptions(midCtaPositions?: readonly number[], inline: ArticleInlineSlot[] = []) {
  const rehypePlugins: Pluggable[] = [
    rehypeHeadingIds,
    rehypeKatex,
    rehypeScrollableFocus,
    rehypeExamReferences,
    // 本文中の外部リンク。note.com だけ referrer を渡す（判定は external-link-rel.ts に集約）
    [rehypeExternalLinks, { target: '_blank', rel: (el) => externalLinkRel(String(el.properties?.href ?? '')) }] satisfies Pluggable,
  ];
  if (midCtaPositions && midCtaPositions.length > 0) {
    rehypePlugins.push([rehypeMidCta, { positions: midCtaPositions }] satisfies Pluggable);
  }
  return {
    blockJS: false as const,
    blockDangerousJS: true as const,
    mdxOptions: {
      remarkPlugins: [remarkMath, remarkGfm, [remarkArticleBanners, { insertAt: inline }] as Pluggable],
      rehypePlugins,
    },
  };
}

/**
 * コンパイル本体とエラー境界は SafeMdx（standards の章記事と共有）へ移した。
 * ここに残すのは docs 固有のプラグイン構成（KaTeX・見出し ID・中間 CTA）を options へ束ねる薄い層だけ。
 */
function SafeMDXRemote({
  source,
  components,
  midCtaPositions,
  inline,
}: {
  source: string;
  components: React.ComponentProps<typeof MDXProvider>['components'];
  midCtaPositions?: readonly number[] | undefined;
  inline: ArticleInlineSlot[];
}) {
  return <SafeMdx source={source} components={components} options={buildMdxOptions(midCtaPositions, inline)} />;
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

/** Metadata shared by the canonical exam/practice/standards route wrappers. */
export async function buildDocMetadata(slugStr: string): Promise<Metadata> {
  const doc = await getDoc(slugStr);

  if (!doc) {
    return {
      title: NOT_FOUND_TITLE,
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

  const description = normalizeMetaDescription(doc.meta.description || doc.meta.title);

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
  const publicPath = getPublicDocPath(slugStr);

  return {
    title,
    description,
    ...(isNoindex && { robots: { index: false, follow: true } }),
    alternates: {
      canonical: publicPath,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: publicPath,
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

/** Render a logical MDX document at its canonical public route. */
export async function renderDocPage(slugStr: string) {
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
  const relatedArticles = getAllDocsMeta().filter(
    (d) => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory,
  );

  // Determine page classification for navigation cards
  const docGroup = classifyDoc(doc.meta);
  const hasCategoryNavCard = Boolean(category);
  const sectionStr = doc.meta.section as string | undefined;

  // note 有料マガジン CTA の配置を解決。
  // published: false や noteUrl 空のマガジンは getMagazine() で防御的に弾く。
  // career 記事（tags: [career]）には note 二次 CTA を置かない。判定は真実源の isCareerDoc。
  const articlePlan = planArticleCtas(doc, relatedArticles);
  const { magazinePlacement, careerPlacements, references, headings, isQuestionSeries } = articlePlan;
  // note 有料マガジン導線は「もくじタイル」（L2 索引）を全 HUB 資格の記事末尾＋サイドバーに 1 枚ずつ
  // 統一表示する（2026-07 統一）。従来の個別マガジンタイル（inline を先頭 3 誌 cap）はページ個別配線に
  // 依存し、未配線ページ（総監 guide 等）が空白になる不整合を生んでいたため廃止した。
  // 個別マガジンへの導線は記事内（冒頭 CTA=placement.top・中間 CTA=MidCta・MDX 内 <MagazineCard>）が担う。
  // タイルの中身は resolveHubCta に一任: 平時=L2 もくじ、直前期 6 週間=売れ筋商品直リンク（seasonal）。
  // resolveHubCta は非 HUB 資格（一次・concrete・reference）に null を返すため、それらは自然に非表示。
  // career タグ記事は転職一本方針を継承し note もくじを出さない（転職テキスト CTA と二重化させない）。
  const showMokuji = Boolean(category) && !isCareerDoc(doc.meta);
  // 1級土木の教科書・一次過去問は第1次検定の学習中の読者なので、もくじタイルを一次の見出しにする（hub-cta.ts mokujiFirstStage）
  const hubStage = category === 'civil-construction-1' && (docGroup === 'textbook' || docGroup === 'primary') ? 'first' as const : undefined;
  const footerMokuji =
    showMokuji && category ? resolveHubCta(category, { utmSuffix: 'footer', stage: hubStage }) : null;
  // 読書中サイドバー（PC）にも同じもくじを併掲（utm -docs-sb で面分離）。2026-07-06 に一旦撤去したが、
  // 全ページ統一の一環で復活し、カテゴリ hub（sidebar -sb + mobile -mob）と同じ二面構成に揃える。

  // 外部チャネル（ココナラ添削）CTA。施工経験記述・総監記述系の高適合ページのみ非空。
  // 商品の listed 状態は offsite-cta.ts 側で判定（未 listed は自動非表示）。
  const offsiteCta = resolveOffsiteCta(slugStr);
  // 記事冒頭 CTA（二次系高 intent ページのみ placement.top で設定）。getMagazine() ゲートを
  // 通すため未公開・退役したマガジンは自動非表示。末尾の画像カードと重複してよい。
  const topSlot = magazinePlacement.top;
  const topMagazine = topSlot ? getMagazine(topSlot.magazineId) : null;
  // 転職アフィリエイトをどの面に出すか（案件 × 面 × カテゴリ × キャリア記事 × 期間）は config/affiliate-placements.json の
  // ルールが決める（src/lib/affiliate-placement.ts）。記事の長さで枠を出すか・何枠かはこのページが決める。


  const articleLawList = lawsOfArticle(doc.content, doc.meta.explainsLaw);
  const showTableOfContents = !isQuestionSeries && headings.some((h) => h.level === 2);

  const { body, inlineCareerAd, careerMidCard, midSlot, endNoteSlot, midKinds, effectiveMidPositions, renderedCareerSlots, inline } = articlePlan;
  const midSlots = midKinds.map(kind => () => {
    if (kind === 'note' && midSlot) return <MidArticleCta mode="note" id={midSlot.magazineId} utmContent={`${midSlot.utmContent}-mid`} scopeNotice={magazinePlacement.scopeNotice} />;
    return <MidArticleCta mode="career" card={careerMidCard!} managedPixels />;
  });
  // 多列データ表（ふるい分け 9 列・圧縮試験 5 列等）はモバイル 375px で画面外へはみ出し、
  // 右端の列が読めない（2026-07-14 実機確認）。SVG/画像化は「9 列を 375px に収める」制約が
  // 同じで解決にならず、テキスト選択・SEO 索引・読み上げを失うため却下。横スクロールできる
  // ラッパーで包むだけにする（データ・アクセシビリティを保ったまま全列へ到達できる）。
  // 手書き <CareerAffiliate program=…> が 1 記事に 2 つある記事（2級の過去問 50 本・2026-10-11 実測）で同じ案件のカードが
  // 2 枚出ていた。1 記事 1 枚＝最初の 1 つだけ描き、2 つ目以降は出さない（本文中間・記事末の「同じ広告を 2 度出さない」と同じ）。
  // MDX は書き換えない（202 か所の手書きをそのまま残す）。
  let inlineCareerCardsRendered = 0;
  const baseComponents = {
    ArticleInlineBanner: ({ slot }: { slot: string }) => <ArticleBanner placement={careerPlacements[slot]} kind="inline" />,
    ...components,
    table: (p: React.ComponentProps<'table'>) => (
      <div className="table-scroll">
        <table {...p} />
      </div>
    ),
    // MDX 本文に手書きした <CareerAffiliate> へ、現在の slug を自動で渡す。
    // slug が無いと悩み別 CTA が解決できず既定文言に倒れる（既存 168 箇所を書き換えずに配線する）。
    CareerAffiliate: (p: React.ComponentProps<typeof CareerAffiliate>) => {
      if (p.program && inlineCareerCardsRendered++ > 0) return null;
      return <CareerAffiliate slug={slugStr} inlineCard={inlineCareerAd} {...p} managedPixels />;
    },
  };
  const componentsWithMid =
    midSlots.length > 0
      ? {
          ...baseComponents,
          midslot: (p: { 'data-mid-index'?: string }) => {
            const idx = Number(p?.['data-mid-index'] ?? 0);
            const Render = midSlots[idx] ?? midSlots[0]!;
            return <Render />;
          },
        }
      : baseComponents;

  const sidebarInput = articleSidebarInput(doc.meta, articlePlan, categoryArticles);
  const sidebarCards = buildArticleSidebarCards(sidebarInput);
  const sidebarGroups = articleSidebarContinuation(sidebarInput, doc.meta, relatedArticles, body.length);
  const images = articleImagePlacements(careerPlacements, inline.map(s => s.slot), Math.min(sidebarCards.length, RAIL_AFFILIATE_MAX));
  const pixels = articlePixelCandidates(careerPlacements, renderedCareerSlots, images);

  return (
    <PageShell
      variant="article"
      className="pb-16"
      beforeHeader={<StructuredData type="article" docMeta={doc.meta} />}
    >
        {/* 2カラムシェル（max-w-1280 / gap-10 / サイドバー w-[316px] の真実源）。gutter=flush-mobile で
            ≤576px は外周 0（記事カードをフルブリードさせる）。サイドバーは aside prop へ集約。 */}
        <TwoColumnShell
          gutter="flush-mobile"
          stretchAside
          aside={
            <ArticleSidebar cards={sidebarCards} groups={sidebarGroups} placements={careerPlacements} questionSeries={isQuestionSeries} followHeadings={showTableOfContents ? headings : []} />
          }
        >
            {/* Editorial article card: 12px radius, soft border + shadow。
                横 padding = タブレット40(px-10) / デスクトップ44(zenn-desktop:px-11)。
                ≤576px は角丸・左右枠を外し px = var(--article-gutter-sp)（設問カード details のフルブリード相殺と連動） */}
            <article className="bg-(--paper) border border-(--rule-soft) rounded-card-section shadow-soft py-12 px-10 zenn-desktop:px-11 overflow-hidden transition-colors duration-300 max-zenn-sp:rounded-none max-zenn-sp:border-x-0 max-zenn-sp:py-[35px] max-zenn-sp:px-(--article-gutter-sp)">
              {/* 記事ヘッダー: breadcrumb + H1 + description リード + byline を集約 */}
              <ArticleHeader
                title={doc.meta.title}
                category={category}
                categoryLabel={category ? getCategoryLabel(category) : null}
                groupLabel={category ? getGroupLabel(category, docGroup) : null}
                groupHref={category && getCategoryJumps(category).some((j) => j.href === `#sec-${docGroup}`) ? `${getCategoryHubPath(category)}#sec-${docGroup}` : null}
                description={doc.meta.description}
                publishedAt={doc.meta.publishedAt || doc.meta.created}
                updatedAt={doc.meta.updatedAt || doc.meta.dateModified}
              />
              {showTableOfContents && (
                <div className="mb-6">
                  <TableOfContents headings={headings} variant="mobile" />
                </div>
              )}
              {/* 年度別過去問: 問1へのリンクと折りたたみ番号一覧（5 問以上） */}
              {isQuestionSeries && <QuestionJumpNav headings={headings} />}
              {/* 記事冒頭 CTA。全ページで小さめ表示（左に小さな表紙・右に商品名とボタン）。752×376 の画像が最初の画面の
                  4 割を占めて本文の書き出しを押し下げていた（2026-11-15 運営者指摘）。未公開は非表示 */}
              {topSlot && topMagazine && (
                <MagazineTopBanner
                  scopeNotice={magazinePlacement.scopeNotice}
                  magazineId={topSlot.magazineId}
                  url={buildMagazineUrl(topMagazine, topSlot.utmContent)}
                  title={topMagazine.shortTitle ?? topMagazine.title}
                  price={topMagazine.price}
                  badge={topMagazine.badge}
                  trackLabel={topSlot.utmContent}
                  compact
                />
              )}
              {/* MDX Content — 先頭の # H1 は server-side で描画済みのため strip。
                  参考資料セクションは extractReferencesSection で抽出済みのため strippedContent を渡す */}
              {/* 年度別過去問は画面外の本文を描かない（スマホの INP 対策・DN-0814。CSS は globals.css の prose-blog） */}
              <div className="prose-blog" data-offscreen-render={isQuestionSeries ? 'skip' : undefined}>
                <SafeMDXRemote
                  source={body}
                  components={componentsWithMid}
                  midCtaPositions={effectiveMidPositions}
                  inline={inline}
                />
              </div>
              {endNoteSlot && <MagazineHeroCta id={endNoteSlot.magazineId}
                utmContent={`${endNoteSlot.utmContent}-end`} placement="article-end"
                scopeNotice={magazinePlacement.scopeNotice} />}
              <MetaRow
                variant="footer"
                tags={doc.meta.tags as string[] | undefined}
                publishedAt={doc.meta.publishedAt || doc.meta.created}
                updatedAt={doc.meta.updatedAt || doc.meta.dateModified}
              />
            </article>

            <ArticleAffiliatePixels key={slugStr} candidates={affiliateSlotPreview() ? [] : pixels} />
            <ArticleFooter
              endBanner={careerPlacements['article-end'] ?? null}
              imageBanner={<ArticleBanner placement={careerPlacements['article-banner-end']} kind="end" />}
              references={references}
              laws={articleLawList}
              category={category}
              docGroup={docGroup}
              slugStr={slugStr}
              sectionStr={sectionStr}
              meta={doc.meta}
              categoryArticles={categoryArticles}
              relatedArticles={relatedArticles}
              footerMokuji={footerMokuji}
              offsiteCta={offsiteCta}
              faqs={faqs}
              hasCategoryNavCard={hasCategoryNavCard}
              authorDates={authorDates}
            />
            <div className="mt-10 max-zenn-sp:px-(--article-gutter-sp)"><AdSlot slot="endMultiplex" className={CTA_STACK_CLASS} /></div>
        </TwoColumnShell>
    </PageShell>
  );
}
