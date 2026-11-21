import { articleSidebarPlan, type ArticleSidebarInput } from '@/lib/article-sidebar-plan';
import type { RailGroup } from '@/lib/article-sidebar-continuation';
import RailStack, { type RailItem } from '@/components/ui/RailStack/RailStack';
import type { RailKind } from '@/lib/rail-kinds.mjs';
import { ArticleBanner, articleRailSlot, articleImagePlacements } from '@/components/docs/ArticleAffiliateBanners';
import type { ResolvedPlacements } from '@/lib/affiliate-placement';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import { categoryNavCards, categoryNavKinds } from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';
import { SidebarProduct } from '@/components/ui/SidebarDiscovery';
import RelatedTools from '@/components/ui/RelatedTools';


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
      case 'author': return { kind: 'author', node: <AuthorSidebarCard /> };
      case 'hub': return { kind: 'note', node: <HubCtaBanner cta={sidebarMokuji!} placement="article-sidebar" /> };
      case 'product': return { kind: 'note', node: <SidebarProduct category={category!} doc={categoryArticles.find(d => d.slug === slugStr)!} placement="article-sidebar" content={content} /> };
      case 'questions': return { kind: 'questions', node: <ExamQuestionNav headings={headings} /> };
      case 'category': return { kind: categoryKinds[card.index!] ?? 'nav', node: navigation[card.index!]! };
      case 'pillar': return { kind: 'nav', node: <PillarNavCard variant="sidebar" currentSection={sectionStr} /> };
      case 'tools': return { kind: 'nav', node: <RelatedTools category={category!} slug={slugStr} compact /> };
    }
  });
}

/** 上の束も下の組（回遊カード＋転職バナー、2 組目は AdSense）も上詰めで並べる。入れ物は RailStack（右の欄の唯一の入れ物）。 */
export default function ArticleSidebar({ cards, groups = [], placements, questionSeries = false }: { cards: RailItem[]; groups?: RailGroup[]; placements: ResolvedPlacements; questionSeries?: boolean }) {
  const images = articleImagePlacements(placements, [], cards.length);
  const items = cards.flatMap((card, index): RailItem[] => [
    { kind: 'career', node: <ArticleBanner placement={images.find(image => image.placement.slot === articleRailSlot(index))?.placement} kind="rail" /> },
    card,
  ]);
  return <RailStack
    items={items}
    groups={groups}
    cardData={{ 'data-article-sidebar-card': '' }}
    data={{ 'data-article-sidebar-cards': cards.length + groups.filter(group => group.card).length, 'data-article-question-series': questionSeries || undefined }}
  />;
}
