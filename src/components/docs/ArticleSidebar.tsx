import { articleSidebarPlan, type ArticleSidebarInput } from '@/lib/article-sidebar-plan';
import type { RailGroup } from '@/lib/article-sidebar-continuation';
import RailStack, { type RailItem } from '@/components/ui/RailStack/RailStack';
import type { RailKind } from '@/lib/rail-kinds.mjs';
import { ArticleBanner, articleRailSlot, articleImagePlacements } from '@/components/ui/ArticleAffiliateBanners/ArticleAffiliateBanners';
import type { ResolvedPlacements } from '@/lib/affiliate-placement';
import { RAIL_AFFILIATE_MAX } from '@/lib/rail-continuation';
import AuthorProfile from '@/components/ui/AuthorProfile/AuthorProfile';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import { categoryNavCards, categoryNavKinds } from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';
import { SidebarProduct } from '@/components/ui/SidebarDiscovery';
import RelatedTools from '@/components/ui/RelatedTools';
import RailFollow from '@/components/ui/RailFollow/RailFollow';
import { followToc } from '@/components/docs/follow-toc';
import type { TocHeading } from '@/lib/toc';


/** 記事右欄の上の束。目次は本文上部、年度別の設問ナビはここに残す。 */
export function buildArticleSidebarCards({
  sidebarMokuji,
  headings,
  category,
  docGroup,
  slugStr,
  content,
  sectionStr,
  categoryArticles,
  hasCategoryNavCard,
  showPillarNav,
  showTableOfContents,
}: ArticleSidebarInput) {
  const p = { sidebarMokuji, headings, category, docGroup, slugStr, content, sectionStr, categoryArticles, hasCategoryNavCard, showPillarNav, showTableOfContents };
  const navigation = category ? categoryNavCards({ variant: 'sidebar', category, currentSlug: slugStr, docGroup, categoryArticles }) : [];
  const categoryKinds = category ? categoryNavKinds({ variant: 'sidebar', category, currentSlug: slugStr, docGroup, categoryArticles }) : [];
  return articleSidebarPlan(p).map((card): RailItem => {
    switch (card.kind) {
      case 'author': return { kind: 'author', node: <AuthorProfile variant="sidebar" /> };
      case 'hub': return { kind: 'note', node: <HubCtaBanner cta={sidebarMokuji!} placement="article-sidebar" /> };
      case 'product': return { kind: 'note', node: <SidebarProduct category={category!} doc={categoryArticles.find(d => d.slug === slugStr)!} placement="article-sidebar" content={content} /> };
      case 'questions': return { kind: 'questions', node: <ExamQuestionNav headings={headings} /> };
      case 'category': return { kind: categoryKinds[card.index!] ?? 'nav', node: navigation[card.index!]! };
      case 'pillar': return { kind: 'nav', node: <PillarNavCard variant="sidebar" currentSection={sectionStr} /> };
      case 'tools': return { kind: 'nav', node: <RelatedTools category={category!} slug={slugStr} compact /> };
    }
  });
}

/**
 * 上の束（転職バナーは先頭から 2 つまで）も下の組（回遊カード・1 組目と 3 組目に AdSense）も上詰めで並べ、最後に追従ブロック（現在地の目次＋AdSense 1 枠）を置く。
 * 入れ物は RailStack（右の欄の唯一の入れ物）。followHeadings が空なら追従ブロックは広告だけ（年度別の過去問は設問ナビが上の束にある）。
 */
export default function ArticleSidebar({ cards, groups = [], placements, questionSeries = false, followHeadings = [] }: { cards: RailItem[]; groups?: RailGroup[]; placements: ResolvedPlacements; questionSeries?: boolean; followHeadings?: TocHeading[] }) {
  // 転職バナーは上の束の先頭から 2 つまで（RAIL_AFFILIATE_MAX）。ピクセルの計画（DocPage の articleImagePlacements）と同じ数にする
  const images = articleImagePlacements(placements, [], Math.min(cards.length, RAIL_AFFILIATE_MAX));
  const items = cards.flatMap((card, index): RailItem[] => [
    ...(index < RAIL_AFFILIATE_MAX ? [{ kind: 'career' as const, node: <ArticleBanner placement={images.find(image => image.placement.slot === articleRailSlot(index))?.placement} kind="rail" /> }] : []),
    card,
  ]);
  return <RailStack
    items={items}
    groups={groups}
    follow={<RailFollow toc={followToc(followHeadings)} />}
    cardData={{ 'data-article-sidebar-card': '' }}
    data={{ 'data-article-sidebar-cards': cards.length + groups.filter(group => group.card).length, 'data-article-question-series': questionSeries || undefined }}
  />;
}
